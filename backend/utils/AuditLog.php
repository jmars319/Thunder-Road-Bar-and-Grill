<?php

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/RequestContext.php';

class AuditLog
{
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
            $ip = $opts['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? null);
            $userAgent = $opts['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? null);

            $metaJson = null;
            if ($meta !== null) {
                $metaJson = json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                if ($metaJson === false) {
                    $metaJson = json_encode(['warning' => 'meta encoding failed']);
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
        } catch (Throwable $e) {
            Logger::warning('AuditLog record failed', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
