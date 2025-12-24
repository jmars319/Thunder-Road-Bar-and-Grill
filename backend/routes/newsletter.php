<?php
/**
 * Newsletter Routes
 * 
 * Purpose:
 * - Handle newsletter subscriptions
 * 
 * Endpoints:
 * - GET /api/subscribers - Get all subscribers (admin)
 * - POST /api/newsletter/subscribe - Subscribe to newsletter
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';

class NewsletterRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * GET /api/subscribers - Get all newsletter subscribers (admin)
     */
    public function getAllSubscribers() {
        AdminAuthMiddleware::require();

        $subscribers = $this->db->fetchAll(
            'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC'
        );

        echo json_encode($subscribers);
    }

    /**
     * POST /api/newsletter/subscribe - Subscribe to newsletter
     */
    public function subscribe() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $email = $input['email'] ?? '';
        $name = $input['name'] ?? '';

        // Validate
        $validator = new Validator();
        $validator->required($email, 'email');
        $validator->email($email, 'email');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        // Check if already subscribed
        $existing = $this->db->fetchOne(
            'SELECT id, is_active FROM newsletter_subscribers WHERE email = ?',
            [$email]
        );

        if ($existing) {
            if ($existing['is_active']) {
                echo json_encode(['message' => 'Already subscribed']);
                return;
            } else {
                // Reactivate subscription
                $this->db->update(
                    'UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL WHERE email = ?',
                    [$email]
                );
                echo json_encode(['message' => 'Subscription reactivated']);
                return;
            }
        }

        // Insert new subscription
        $id = $this->db->insert(
            'INSERT INTO newsletter_subscribers (email, name, is_active, subscribed_at) 
             VALUES (?, ?, ?, NOW())',
            [$email, $name, 1]
        );

        Logger::info("New newsletter subscription: $email");

        echo json_encode([
            'id' => $id,
            'message' => 'Successfully subscribed'
        ]);
    }
}
