<?php
/**
 * Configuration Loader
 * 
 * Loads environment variables from .env file and provides configuration access
 */

class Config {
    private static $config = [];
    private static $loaded = false;

    /**
     * Load environment variables from .env file
     */
    public static function load() {
        if (self::$loaded) {
            return;
        }

        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                // Skip comments
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }

                // Parse key=value
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);

                    // Remove quotes if present
                    if (preg_match('/^(["\'])(.*)\\1$/', $value, $matches)) {
                        $value = $matches[2];
                    }

                    // Set environment variable and store in config
                    putenv("$key=$value");
                    $_ENV[$key] = $value;
                    self::$config[$key] = $value;
                }
            }
        }

        self::$loaded = true;
    }

    /**
     * Get configuration value
     * 
     * @param string $key Configuration key
     * @param mixed $default Default value if key not found
     * @return mixed Configuration value
     */
    public static function get($key, $default = null) {
        self::load();
        
        // Check in stored config first
        if (isset(self::$config[$key])) {
            return self::$config[$key];
        }

        // Check in $_ENV
        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }

        // Check in getenv()
        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }

        return $default;
    }

    /**
     * Get boolean configuration value
     * 
     * @param string $key Configuration key
     * @param bool $default Default value
     * @return bool
     */
    public static function getBool($key, $default = false) {
        $value = self::get($key);
        if ($value === null) {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Get integer configuration value
     * 
     * @param string $key Configuration key
     * @param int $default Default value
     * @return int
     */
    public static function getInt($key, $default = 0) {
        $value = self::get($key);
        if ($value === null) {
            return $default;
        }

        return (int) $value;
    }

    /**
     * Check if app is in production mode
     * 
     * @return bool
     */
    public static function isProduction() {
        return self::get('APP_ENV', 'production') === 'production';
    }

    /**
     * Check if debug mode is enabled
     * 
     * @return bool
     */
    public static function isDebug() {
        return self::getBool('APP_DEBUG', false);
    }

    /**
     * Get allowed frontend origins as array
     * 
     * @return array
     */
    public static function getAllowedOrigins() {
        $origins = self::get('FRONTEND_URL', 'http://localhost:3000');
        return array_map('trim', explode(',', $origins));
    }
}

// Load configuration on include
Config::load();
