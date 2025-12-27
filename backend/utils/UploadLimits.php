<?php

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';

class UploadLimits {
    private const POST_HEADROOM_BYTES = 1048576; // 1MB headroom so POST body fits
    private static $cache = null;
    private static $warned = false;

    private static function parseIniBytes($value) {
        if ($value === null || $value === '') {
            return 0;
        }
        if (is_numeric($value)) {
            return (int) $value;
        }
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return 0;
        }
        if ($trimmed === '-1') {
            return PHP_INT_MAX;
        }
        $lastChar = strtolower(substr($trimmed, -1));
        $number = (float) $trimmed;
        switch ($lastChar) {
            case 'g':
                $number *= 1024;
                // no break
            case 'm':
                $number *= 1024;
                // no break
            case 'k':
                $number *= 1024;
                break;
            default:
                $number = (float) $trimmed;
        }
        return (int) round($number);
    }

    private static function formatBytes($bytes) {
        if ($bytes <= 0) {
            return '0 bytes';
        }
        $units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
        $base = floor(log($bytes, 1024));
        $base = (int) min($base, count($units) - 1);
        $value = $bytes / pow(1024, $base);
        return sprintf('%s %s', rtrim(rtrim(number_format($value, 2), '0'), '.'), $units[$base]);
    }

    private static function envMaxBytes() {
        $envMax = (int) Config::get('IMAGE_UPLOAD_MAX_BYTES', 0);
        if ($envMax <= 0) {
            $envMax = (int) Config::get('MAX_UPLOAD_SIZE', 0);
        }
        if ($envMax <= 0) {
            $envMax = 15728640; // 15MB default safety net
        }
        return $envMax;
    }

    private static function buildCache() {
        if (self::$cache !== null) {
            return;
        }
        $envMax = self::envMaxBytes();
        $phpUploadIni = ini_get('upload_max_filesize');
        $phpPostIni = ini_get('post_max_size');
        $phpMemoryIni = ini_get('memory_limit');

        $phpUploadBytes = self::parseIniBytes($phpUploadIni);
        $phpPostBytes = self::parseIniBytes($phpPostIni);
        $phpMemoryBytes = self::parseIniBytes($phpMemoryIni);

        $postHeadroom = max(0, $phpPostBytes - self::POST_HEADROOM_BYTES);
        $candidates = array_filter([
            $envMax,
            $phpUploadBytes > 0 ? $phpUploadBytes : null,
            $postHeadroom > 0 ? $postHeadroom : null,
            $phpMemoryBytes > 0 ? $phpMemoryBytes : null
        ]);
        $effective = !empty($candidates) ? min($candidates) : $envMax;

        $effectiveHuman = self::formatBytes($effective);
        self::$cache = [
            'effective_bytes' => $effective,
            'effective_human' => $effectiveHuman,
            'max_bytes' => $effective,
            'max_human' => $effectiveHuman,
            'php_upload_max_filesize' => $phpUploadIni ?: '',
            'php_post_max_size' => $phpPostIni ?: '',
            'php_memory_limit' => $phpMemoryIni ?: '',
            'php_upload_max_bytes' => $phpUploadBytes,
            'php_post_max_bytes' => $phpPostBytes,
            'php_memory_limit_bytes' => $phpMemoryBytes,
            'env_max_upload_bytes' => $envMax,
            'env_max_upload_human' => self::formatBytes($envMax),
            'env_MAX_UPLOAD_SIZE' => $envMax,
            'post_headroom_bytes' => self::POST_HEADROOM_BYTES
        ];

        self::maybeWarn($envMax, $phpUploadBytes, $phpPostBytes);
    }

    private static function maybeWarn($envMax, $phpUploadBytes, $phpPostBytes) {
        if (self::$warned || !Config::isProduction()) {
            return;
        }
        $limiting = [];
        if ($phpUploadBytes > 0 && $envMax > $phpUploadBytes) {
            $limiting[] = sprintf('upload_max_filesize (%s)', self::formatBytes($phpUploadBytes));
        }
        if ($phpPostBytes > 0 && $envMax > $phpPostBytes) {
            $limiting[] = sprintf('post_max_size (%s)', self::formatBytes($phpPostBytes));
        }
        if (!empty($limiting)) {
            Logger::warning('Configured MAX_UPLOAD_SIZE exceeds PHP ini limits', [
                'env_max_upload_bytes' => $envMax,
                'limiting_ini_settings' => $limiting
            ]);
            self::$warned = true;
        }
    }

    public static function getEffectiveUploadCapBytes() {
        self::buildCache();
        return self::$cache['effective_bytes'];
    }

    public static function getLimitsDebugInfo() {
        self::buildCache();
        return self::$cache;
    }
}
