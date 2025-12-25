<?php
/**
 * Admin Authentication Middleware
 * 
 * Verifies JWT tokens for admin endpoints
 * Supports legacy dev-only simple auth when APP_ENV !== 'production'
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/ErrorHandler.php';

class AdminAuthMiddleware {
    /**
     * Verify admin authentication
     * 
     * @return array|null User data if authenticated, null otherwise
     */
    public static function verify(bool $allowDevBypass = true) {
        // Extract token from Authorization header (Bearer <token>)
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        $token = null;
        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if ($token) {
            try {
                // Verify JWT token
                $decoded = JWT::decode($token);
                
                if (!$decoded) {
                    return self::unauthorized('Invalid or expired token');
                }

                // Check that user has admin role
                if (!isset($decoded['role']) || $decoded['role'] !== 'admin') {
                    return self::forbidden('Admin access required');
                }

                // Return user info
                return [
                    'id' => $decoded['id'] ?? null,
                    'username' => $decoded['username'] ?? null,
                    'role' => $decoded['role'] ?? null
                ];

            } catch (Exception $e) {
                Logger::warning('JWT verification failed', ['error' => $e->getMessage()]);
                return self::unauthorized('Invalid token');
            }
        }

        /**
         * Dev-only bypass:
         * - Must explicitly enable ALLOW_DEV_ADMIN_HEADER=true
         * - Must run with APP_ENV === 'development'
         * - Request must originate from localhost (127.0.0.1 / ::1 or optional DEV_ADMIN_ALLOW_IPS list)
         * Without ALL of the above, bypass is impossible.
         */
        if ($allowDevBypass && self::devBypassEnabled()) {
            $devHeader = $_SERVER['HTTP_X_ADMIN_AUTH'] ?? '';
            if ($devHeader === 'admin' && self::isAllowedDevIp()) {
                Logger::debug('Dev admin header auth used');
                return [
                    'id' => 1,
                    'username' => 'admin',
                    'role' => 'admin'
                ];
            }

            if (isset($_COOKIE['admin']) && $_COOKIE['admin'] === 'true' && self::isAllowedDevIp()) {
                Logger::debug('Dev admin cookie auth used');
                return [
                    'id' => 1,
                    'username' => 'admin',
                    'role' => 'admin'
                ];
            }
        }

        // No valid authentication found
        return self::unauthorized('Admin authentication required');
    }

    /**
     * Send unauthorized response
     * 
     * @param string $message Error message
     */
    private static function unauthorized($message) {
        ErrorHandler::respond($message, 401);
    }

    /**
     * Send forbidden response
     * 
     * @param string $message Error message
     */
    private static function forbidden($message) {
        ErrorHandler::respond($message, 403);
    }

    /**
     * Require admin authentication (middleware function)
     * 
     * @return array User data
     */
    public static function require(array $options = []) {
        $allowDevBypass = $options['allow_dev_bypass'] ?? true;
        $user = self::verify($allowDevBypass);
        if (!is_array($user)) {
            exit; // verify() already sent response
        }
        return $user;
    }

    private static function devBypassEnabled() {
        if (!Config::getBool('ALLOW_DEV_ADMIN_HEADER', false)) {
            return false;
        }
        return Config::get('APP_ENV', 'production') === 'development';
    }

    private static function isAllowedDevIp() {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        $allowed = ['127.0.0.1', '::1'];
        $extra = trim((string) Config::get('DEV_ADMIN_ALLOW_IPS', ''));
        if ($extra !== '') {
            $parts = array_filter(array_map('trim', explode(',', $extra)));
            $allowed = array_merge($allowed, $parts);
        }
        return in_array($remote, $allowed, true);
    }
}
