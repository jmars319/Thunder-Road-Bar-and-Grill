<?php

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Emailer.php';

/**
 * Lightweight throttled alerting for 5xx errors.
 */
class ErrorAlert {
    private const CACHE_DIR = __DIR__ . '/../cache/error-alerts';

    /**
     * Possibly send an alert if the provided context represents a 5xx error.
     *
     * @param array $context
     */
    public static function maybeSend(array $context): void {
        $status = (int) ($context['status'] ?? 0);
        if ($status < 500) {
            return;
        }

        $throttleMinutes = max(1, Config::getInt('ALERT_THROTTLE_MINUTES', 15));
        $signature = self::buildSignature($context);
        if (!self::shouldSend($signature, $throttleMinutes)) {
            return;
        }

        if (Emailer::sendAlert(array_merge($context, ['signature' => $signature]))) {
            self::markSent($signature);
        }
    }

    private static function buildSignature(array $context): string {
        $parts = [
            $context['status'] ?? '',
            strtoupper($context['method'] ?? 'GET'),
            $context['path'] ?? '',
            substr($context['message'] ?? '', 0, 80)
        ];
        return hash('sha1', implode('|', $parts));
    }

    private static function shouldSend(string $signature, int $throttleMinutes): bool {
        if (!is_dir(self::CACHE_DIR)) {
            @mkdir(self::CACHE_DIR, 0775, true);
        }
        $cacheFile = self::CACHE_DIR . '/' . $signature . '.cache';
        if (!file_exists($cacheFile)) {
            return true;
        }
        $ageSeconds = time() - (int) filemtime($cacheFile);
        return $ageSeconds >= ($throttleMinutes * 60);
    }

    private static function markSent(string $signature): void {
        $cacheFile = self::CACHE_DIR . '/' . $signature . '.cache';
        @touch($cacheFile);
    }
}
