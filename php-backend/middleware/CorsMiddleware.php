<?php
/**
 * CORS Middleware
 * 
 * Handles Cross-Origin Resource Sharing (CORS) headers
 */

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';

class CorsMiddleware {
    /**
     * Handle CORS headers
     */
    public static function handle() {
        $allowedOrigins = Config::getAllowedOrigins();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Handle preflight OPTIONS request
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            if (empty($origin)) {
                // Non-browser clients
                header('Access-Control-Allow-Origin: *');
            } elseif (in_array($origin, $allowedOrigins)) {
                // Allowed origin
                header("Access-Control-Allow-Origin: $origin");
                header('Access-Control-Allow-Credentials: true');
                header('Vary: Origin');
            }

            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours
            http_response_code(204);
            exit;
        }

        // Handle actual request
        if (empty($origin)) {
            // Non-browser clients (curl, Postman, etc.)
            header('Access-Control-Allow-Origin: *');
        } elseif (in_array($origin, $allowedOrigins)) {
            // Explicitly allowed origin for browser requests
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    }
}
