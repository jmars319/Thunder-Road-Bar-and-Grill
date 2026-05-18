<?php

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';

class DevPublicSnapshot {
    private static function enabled() {
        return !Config::isProduction() && Config::getBool('DEV_PUBLIC_SNAPSHOTS', true);
    }

    private static function pathFor($name) {
        $safeName = preg_replace('/[^a-z0-9_-]/i', '', (string) $name);
        return dirname(__DIR__, 2) . '/.dev/public-data/' . $safeName . '.json';
    }

    public static function has($name) {
        $path = self::pathFor($name);
        return is_file($path) && filesize($path) > 0;
    }

    public static function respond($name, ?Throwable $reason = null) {
        if (!self::enabled() || !self::has($name)) {
            return false;
        }

        $path = self::pathFor($name);
        $raw = file_get_contents($path);
        if (!is_string($raw)) {
            return false;
        }

        json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Logger::warning('Dev public snapshot is invalid JSON', ['snapshot' => $name]);
            return false;
        }

        Logger::warning('Serving dev public snapshot', [
            'snapshot' => $name,
            'reason' => $reason ? get_class($reason) : 'manual'
        ]);

        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Dev-Public-Snapshot: ' . $name);
        echo $raw;
        return true;
    }
}
