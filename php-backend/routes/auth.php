<?php
/**
 * Authentication Routes
 * 
 * Purpose:
 * - Provide secure authentication endpoints for the admin UI using bcrypt
 *   password hashing and JWT tokens.
 * 
 * Endpoints:
 * - POST /api/login
 *   Request: { username, password }
 *   Response: { success: boolean, token?: string, user?: { id, username, role }, message?: string }
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../middleware/RateLimitMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class AuthRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Handle login request
     */
    public function login() {
        // Apply login rate limiting
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        RateLimitMiddleware::login($ip);

        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        // Validate input
        $validator = new Validator();
        $validator->required($username, 'username');
        $validator->required($password, 'password');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        try {
            // Look up user by username
            $user = $this->db->fetchOne(
                'SELECT id, username, password_hash, email, full_name, role, is_active 
                 FROM users WHERE username = ? LIMIT 1',
                [$username]
            );

            // Return generic error to prevent username enumeration
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid credentials'
                ]);
                return;
            }

            // Check if user is active
            if (!$user['is_active']) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Account is disabled'
                ]);
                return;
            }

            // Verify password with bcrypt
            if (!password_verify($password, $user['password_hash'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid credentials'
                ]);
                return;
            }

            // Update last_login timestamp
            $this->db->query(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [$user['id']]
            );

            // Generate JWT token
            $token = JWT::encode([
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]);

            // Return success with token and user info (no sensitive data)
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'name' => $user['full_name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);

        } catch (Exception $e) {
            Logger::error('Login error', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'An error occurred during login'
            ]);
        }
    }

    /**
     * Dev-only: set an admin cookie for local testing
     */
    public function devSignin() {
        // Only allow in non-production environments
        if (Config::isProduction()) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Dev signin disabled in production'
            ]);
            return;
        }

        // Set admin cookie
        $secure = Config::getBool('FORCE_HTTPS', false);
        setcookie('admin', 'true', [
            'path' => '/',
            'httponly' => true,
            'samesite' => 'None',
            'secure' => $secure
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Dev admin cookie set'
        ]);
    }
}
