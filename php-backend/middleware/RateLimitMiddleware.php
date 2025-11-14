<?php
/**
 * Rate Limiting Middleware
 * 
 * Simple file-based rate limiting to prevent abuse
 */

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';

class RateLimitMiddleware {
    private static $cacheDir = null;

    /**
     * Initialize cache directory
     */
    private static function init() {
        if (self::$cacheDir === null) {
            self::$cacheDir = __DIR__ . '/../cache/ratelimit';
            if (!is_dir(self::$cacheDir)) {
                mkdir(self::$cacheDir, 0755, true);
            }
        }
    }

    /**
     * Check rate limit
     * 
     * @param string $key Unique key for rate limit (e.g., IP address)
     * @param int $maxRequests Maximum requests allowed
     * @param int $windowSeconds Time window in seconds
     * @return bool True if within limit, false if exceeded
     */
    public static function check($key, $maxRequests, $windowSeconds) {
        if (!Config::getBool('RATE_LIMIT_ENABLED', true)) {
            return true;
        }

        self::init();

        $hash = md5($key);
        $file = self::$cacheDir . '/' . $hash . '.txt';

        $now = time();
        $requests = [];

        // Read existing requests
        if (file_exists($file)) {
            $data = file_get_contents($file);
            $requests = json_decode($data, true) ?: [];
        }

        // Filter out old requests outside the window
        $requests = array_filter($requests, function($timestamp) use ($now, $windowSeconds) {
            return ($now - $timestamp) < $windowSeconds;
        });

        // Check if limit exceeded
        if (count($requests) >= $maxRequests) {
            Logger::warning('Rate limit exceeded', ['key' => $key, 'limit' => $maxRequests]);
            return false;
        }

        // Add current request
        $requests[] = $now;

        // Save updated requests
        file_put_contents($file, json_encode($requests));

        return true;
    }

    /**
     * Apply global rate limit
     * 
     * @param string $ip IP address
     */
    public static function global($ip) {
        $limit = Config::getInt('RATE_LIMIT_GLOBAL', 300);
        if (!self::check($ip, $limit, 60)) {
            http_response_code(429);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Too many requests. Please try again later.']);
            exit;
        }
    }

    /**
     * Apply strict rate limit for write operations
     * 
     * @param string $ip IP address
     */
    public static function strict($ip) {
        $limit = Config::getInt('RATE_LIMIT_STRICT', 20);
        if (!self::check($ip, $limit, 60)) {
            http_response_code(429);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Too many requests. Please try again later.']);
            exit;
        }
    }

    /**
     * Apply login rate limit
     * 
     * @param string $ip IP address
     */
    public static function login($ip) {
        $limit = Config::getInt('RATE_LIMIT_LOGIN', 5);
        if (!self::check($ip, $limit, 900)) { // 15 minutes
            http_response_code(429);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Too many login attempts. Please try again later.']);
            exit;
        }
    }

    /**
     * Clean old rate limit files
     */
    public static function cleanup() {
        self::init();

        $files = glob(self::$cacheDir . '/*.txt');
        $now = time();
        $maxAge = 3600; // 1 hour

        foreach ($files as $file) {
            if ($now - filemtime($file) > $maxAge) {
                unlink($file);
            }
        }
    }
}
