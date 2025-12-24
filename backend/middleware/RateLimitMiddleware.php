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
     * Apply public endpoint rate limit (for read-only endpoints)
     * 
     * @param string $ip IP address
     */
    public static function publicEndpoint($ip) {
        $limit = Config::getInt('RATE_LIMIT_PUBLIC', 100);
        if (!self::check($ip, $limit, 60)) {
            http_response_code(429);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Too many requests. Please try again later.']);
            exit;
        }
    }

    /**
     * Track failed login attempts for account lockout
     * 
     * @param string $username Username attempting login
     * @return int Number of failed attempts in lockout window
     */
    public static function trackFailedLogin($username) {
        self::init();

        $hash = md5('failed_login_' . strtolower($username));
        $file = self::$cacheDir . '/' . $hash . '.txt';

        $now = time();
        $lockoutWindow = 900; // 15 minutes
        $attempts = [];

        // Read existing attempts
        if (file_exists($file)) {
            $data = file_get_contents($file);
            $attempts = json_decode($data, true) ?: [];
        }

        // Filter out old attempts outside the window
        $attempts = array_filter($attempts, function($timestamp) use ($now, $lockoutWindow) {
            return ($now - $timestamp) < $lockoutWindow;
        });

        // Add current failed attempt
        $attempts[] = $now;

        // Save updated attempts
        file_put_contents($file, json_encode($attempts));

        return count($attempts);
    }

    /**
     * Check if account is locked due to too many failed login attempts
     * 
     * @param string $username Username to check
     * @return bool True if account is locked
     */
    public static function isAccountLocked($username) {
        self::init();

        $hash = md5('failed_login_' . strtolower($username));
        $file = self::$cacheDir . '/' . $hash . '.txt';

        if (!file_exists($file)) {
            return false;
        }

        $now = time();
        $lockoutWindow = 900; // 15 minutes
        $data = file_get_contents($file);
        $attempts = json_decode($data, true) ?: [];

        // Filter to recent attempts only
        $recentAttempts = array_filter($attempts, function($timestamp) use ($now, $lockoutWindow) {
            return ($now - $timestamp) < $lockoutWindow;
        });

        // Lock account if 5 or more failed attempts
        return count($recentAttempts) >= 5;
    }

    /**
     * Clear failed login attempts (called on successful login)
     * 
     * @param string $username Username that successfully logged in
     */
    public static function clearFailedLogins($username) {
        self::init();

        $hash = md5('failed_login_' . strtolower($username));
        $file = self::$cacheDir . '/' . $hash . '.txt';

        if (file_exists($file)) {
            unlink($file);
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
