<?php
/**
 * User Routes
 * 
 * Purpose:
 * - Provide user management endpoints for authenticated users
 * 
 * Endpoints:
 * - PUT /api/user/password - Change current user's password
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';

class UserRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Change user password
     * Requires authentication
     */
    public function changePassword() {
        // Authenticate user (will exit with 401/403 if not authenticated)
        $user = AdminAuthMiddleware::require();

        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        // Validate input
        $validator = new Validator();
        $validator->required($currentPassword, 'current_password');
        $validator->required($newPassword, 'new_password');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        // Validate new password strength
        if (strlen($newPassword) < 8) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Password must be at least 8 characters long'
            ]);
            return;
        }

        if (!preg_match('/[A-Z]/', $newPassword)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Password must contain at least one uppercase letter'
            ]);
            return;
        }

        if (!preg_match('/[a-z]/', $newPassword)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Password must contain at least one lowercase letter'
            ]);
            return;
        }

        if (!preg_match('/[0-9]/', $newPassword)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Password must contain at least one number'
            ]);
            return;
        }

        try {
            // Get current user from database
            $dbUser = $this->db->fetchOne(
                'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
                [$user['id']]
            );

            if (!$dbUser) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
                return;
            }

            // Verify current password
            if (!password_verify($currentPassword, $dbUser['password_hash'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ]);
                return;
            }

            // Check if new password is same as current
            if (password_verify($newPassword, $dbUser['password_hash'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'New password must be different from current password'
                ]);
                return;
            }

            // Hash new password
            $newPasswordHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 10]);

            // Update password
            $this->db->query(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [$newPasswordHash, $user['id']]
            );

            Logger::info('Password changed', ['user_id' => $user['id'], 'username' => $user['username']]);

            echo json_encode([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (Exception $e) {
            Logger::error('Password change error', ['error' => $e->getMessage(), 'user_id' => $user['id']]);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'An error occurred while changing password'
            ]);
        }
    }
}
