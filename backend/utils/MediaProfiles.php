<?php

require_once __DIR__ . '/Config.php';

class MediaProfiles {
    public const HERO_PROFILE = [1600, 3200, 4800];
    public const MENU_PROFILE = [1440, 2880, 4320];
    public const LOGO_PROFILE = [160, 320, 640];
    public const DEFAULT_PROFILE = [480, 768, 1024, 1600];

    private static $envProfiles;

    private static function getEnvProfiles() {
        if (self::$envProfiles !== null) {
            return self::$envProfiles;
        }
        $raw = Config::get('RESPONSIVE_IMAGE_WIDTH_PROFILES', '{}');
        $decoded = json_decode($raw, true);
        self::$envProfiles = is_array($decoded) ? $decoded : [];
        return self::$envProfiles;
    }

    private static function normalizeCategory($category) {
        return $category && is_string($category)
            ? strtolower(trim($category))
            : 'general';
    }

    private static function sanitizeWidths($widths) {
        if (!is_array($widths)) {
            return [];
        }
        $valid = array_filter(array_map(function ($value) {
            $int = (int) $value;
            return $int > 0 ? $int : null;
        }, $widths));

        $unique = array_values(array_unique($valid));
        sort($unique);
        return $unique;
    }

    public static function getVariantWidths($category) {
        $normalized = self::normalizeCategory($category);

        if ($normalized === 'hero') {
            return self::HERO_PROFILE;
        }
        if ($normalized === 'menu') {
            return self::MENU_PROFILE;
        }
        if ($normalized === 'logo') {
            return self::LOGO_PROFILE;
        }

        $envProfiles = self::getEnvProfiles();
        if (isset($envProfiles[$normalized])) {
            $profile = self::sanitizeWidths($envProfiles[$normalized]);
            if (!empty($profile)) {
                return $profile;
            }
        }

        return self::DEFAULT_PROFILE;
    }
}
