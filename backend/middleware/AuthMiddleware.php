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

class AdminAuthMiddleware {
    /**
     * Verify admin authentication
     * 
     * @return array|null User data if authenticated, null otherwise
     */
    public static function verify() {
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

        // SECURITY WARNING: Development fallback authentication
        // This allows simple header auth ONLY in non-production environments
        if (!Config::isProduction()) {
            // Header-based dev auth
            if (Config::getBool('ALLOW_DEV_ADMIN_HEADER', false)) {
                $devHeader = $_SERVER['HTTP_X_ADMIN_AUTH'] ?? '';
                if ($devHeader === 'admin') {
                    Logger::debug('Dev admin header auth used');
                    return [
                        'id' => 1,
                        'username' => 'admin',
                        'role' => 'admin'
                    ];
                }
            }

            // Cookie-based dev auth
            if (isset($_COOKIE['admin']) && $_COOKIE['admin'] === 'true') {
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
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
        exit;
    }

    /**
     * Send forbidden response
     * 
     * @param string $message Error message
     */
    private static function forbidden($message) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
        exit;
    }

    /**
     * Require admin authentication (middleware function)
     * 
     * @return array User data
     */
    public static function require() {
        $user = self::verify();
        if (!is_array($user)) {
            exit; // verify() already sent response
        }
        return $user;
    }
}
