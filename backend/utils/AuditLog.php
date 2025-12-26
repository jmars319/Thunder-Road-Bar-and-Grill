<?php

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/RequestContext.php';
require_once __DIR__ . '/Config.php';

class AuditLog
{
    private const META_REDACT_KEYS = [
        'password', 'pass', 'pwd',
        'token', 'access_token', 'refresh_token', 'id_token',
        'api_key', 'apikey', 'secret', 'client_secret',
        'authorization', 'cookie', 'set-cookie',
        'session', 'session_id', 'csrf', 'csrf_token'
    ];

    private const META_MAX_BYTES = 8192;
    private const PRUNE_PROBABILITY = 100; // 1 in 100 chance
    private const PRUNE_BATCH_LIMIT = 1000;
    private const PRUNE_MAX_BATCHES = 3;

    private static bool $pruneAttempted = false;

    /**
     * Record an audit event. Never throws outward; failures are logged quietly.
     */
    public static function record(string $action, array $opts = []): void
    {
        try {
            $db = Database::getInstance();
            $actorType = $opts['actor_type'] ?? 'system';
            $actorId = $opts['actor_id'] ?? null;
            $entityType = $opts['entity_type'] ?? null;
            $entityId = $opts['entity_id'] ?? null;
            $meta = $opts['meta'] ?? null;
            $ip = self::sanitizeIp($opts['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? null));
            $userAgent = self::sanitizeUserAgent($opts['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? null));

            $metaJson = null;
            if ($meta !== null) {
                $cleanMeta = self::sanitizeMeta($meta);
                $metaJson = json_encode($cleanMeta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                if ($metaJson === false) {
                    $metaJson = json_encode(['warning' => 'meta encoding failed']);
                } elseif (strlen($metaJson) > self::META_MAX_BYTES) {
                    $metaJson = json_encode([
                        'note' => 'meta_json_truncated',
                        'original_bytes' => strlen($metaJson),
                    ]);
                }
            }

            $db->query(
                'INSERT INTO audit_log (actor_type, actor_id, ip, user_agent, action, entity_type, entity_id, meta_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $actorType,
                    $actorId,
                    $ip,
                    $userAgent,
                    $action,
                    $entityType,
                    $entityId,
                    $metaJson,
                ]
            );

            self::maybePrune($db);
        } catch (Throwable $e) {
            Logger::warning('AuditLog record failed', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function maybePrune(Database $db): void
    {
        if (self::$pruneAttempted) {
            return;
        }

        $retention = (int) Config::get('AUDIT_LOG_RETENTION_DAYS', 90);
        if ($retention <= 0) {
            return;
        }

        if (random_int(1, self::PRUNE_PROBABILITY) !== 1) {
            return;
        }

        self::$pruneAttempted = true;

        try {
            for ($batch = 0; $batch < self::PRUNE_MAX_BATCHES; $batch++) {
                $deleted = $db->delete(
                    'DELETE FROM audit_log WHERE created_at < (NOW() - INTERVAL ? DAY) LIMIT ?',
                    [$retention, self::PRUNE_BATCH_LIMIT]
                );

                if ($deleted < self::PRUNE_BATCH_LIMIT) {
                    break;
                }
            }
        } catch (Throwable $e) {
            // swallow errors; pruning must never break request flow
        }
    }

    private static function sanitizeIp(?string $ip): ?string
    {
        if ($ip === null) {
            return null;
        }
        $trimmed = trim($ip);
        return $trimmed !== '' ? $trimmed : null;
    }

    private static function sanitizeUserAgent(?string $ua): ?string
    {
        if ($ua === null) {
            return null;
        }
        $ua = trim($ua);
        if ($ua === '') {
            return null;
        }
        if (strlen($ua) > 255) {
            return substr($ua, 0, 252) . '...';
        }
        return $ua;
    }

    private static function sanitizeMeta($value)
    {
        if (is_array($value)) {
            $clean = [];
            foreach ($value as $key => $item) {
                if (is_string($key) && self::shouldRedactKey($key)) {
                    $clean[$key] = '[REDACTED]';
                    continue;
                }
                $clean[$key] = self::sanitizeMeta($item);
            }
            return $clean;
        }

        if (is_object($value)) {
            $clean = [];
            foreach (get_object_vars($value) as $key => $item) {
                if (self::shouldRedactKey($key)) {
                    $clean[$key] = '[REDACTED]';
                    continue;
                }
                $clean[$key] = self::sanitizeMeta($item);
            }
            return $clean;
        }

        if (is_string($value)) {
            $trimmed = trim($value);
            if (self::looksLikeJwt($trimmed)) {
                return '[REDACTED]';
            }
            return $value;
        }

        return $value;
    }

    private static function shouldRedactKey(string $key): bool
    {
        $lower = strtolower($key);
        return in_array($lower, self::META_REDACT_KEYS, true);
    }

    private static function looksLikeJwt(string $value): bool
    {
        return preg_match('/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/', $value) === 1;
    }
}
