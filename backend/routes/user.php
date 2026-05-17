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
        $this->db = Database::lazy();
    }

    /**
     * Change user password
     * Requires authentication
     */
    public function changePassword() {
        // Authenticate user
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
            ErrorHandler::respond('Password must be at least 8 characters long', 400, [
                'success' => false,
                'message' => 'Password must be at least 8 characters long'
            ]);
        }

        if (!preg_match('/[A-Z]/', $newPassword)) {
            ErrorHandler::respond('Password must contain at least one uppercase letter', 400, [
                'success' => false,
                'message' => 'Password must contain at least one uppercase letter'
            ]);
        }

        if (!preg_match('/[a-z]/', $newPassword)) {
            ErrorHandler::respond('Password must contain at least one lowercase letter', 400, [
                'success' => false,
                'message' => 'Password must contain at least one lowercase letter'
            ]);
        }

        if (!preg_match('/[0-9]/', $newPassword)) {
            ErrorHandler::respond('Password must contain at least one number', 400, [
                'success' => false,
                'message' => 'Password must contain at least one number'
            ]);
        }

        try {
            // Get current user from database
            $dbUser = $this->db->fetchOne(
                'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
                [$user['id']]
            );

            if (!$dbUser) {
                ErrorHandler::respond('User not found', 404, [
                    'success' => false,
                    'message' => 'User not found'
                ]);
            }

            // Verify current password
            if (!password_verify($currentPassword, $dbUser['password_hash'])) {
                ErrorHandler::respond('Current password is incorrect', 401, [
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ]);
            }

            // Check if new password is same as current
            if (password_verify($newPassword, $dbUser['password_hash'])) {
                ErrorHandler::respond('New password must be different from current password', 400, [
                    'success' => false,
                    'message' => 'New password must be different from current password'
                ]);
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
            ErrorHandler::respond('An error occurred while changing password', 500, [
                'success' => false,
                'message' => 'An error occurred while changing password'
            ]);
        }
    }
}
