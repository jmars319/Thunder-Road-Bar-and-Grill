<?php

require_once __DIR__ . '/Config.php';

class MediaProfiles {
    private const BASE_PROFILE = [768, 1536, 2304];
    private const HERO_BASE = [1440, 2880];
    private const MENU_BASE = [960, 1920];
    public const HERO_PROFILE = self::HERO_BASE;
    public const MENU_PROFILE = self::MENU_BASE;
    public const DEFAULT_PROFILE = self::BASE_PROFILE;

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
        if (!$category || !is_string($category)) {
            return 'gallery';
        }
        $normalized = strtolower(trim($category));
        if ($normalized === '' || $normalized === 'general') {
            return 'gallery';
        }
        return $normalized;
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
        return array_slice($unique, 0, 3);
    }

    public static function getVariantWidths($category) {
        $normalized = self::normalizeCategory($category);

        if ($normalized === 'hero') {
            return self::HERO_PROFILE;
        }
        if ($normalized === 'menu') {
            return self::MENU_PROFILE;
        }
        $envProfiles = self::getEnvProfiles();
        $envKey = $normalized;
        if ($normalized === 'gallery' && isset($envProfiles['general'])) {
            $envKey = 'general';
        }
        if (isset($envProfiles[$envKey])) {
            $profile = self::sanitizeWidths($envProfiles[$envKey]);
            if (!empty($profile)) {
                return $profile;
            }
        }

        return self::DEFAULT_PROFILE;
    }
}
