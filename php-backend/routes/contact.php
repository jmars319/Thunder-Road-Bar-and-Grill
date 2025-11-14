<?php
/**
 * Contact Routes
 * 
 * Purpose:
 * - Handle public contact form submissions
 * 
 * Endpoints:
 * - POST /api/contact - Submit a contact message
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class ContactRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * GET /api/contact or /api/messages - Get all contact messages (admin)
     */
    public function getAllMessages() {
        require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
        AdminAuthMiddleware::require();

        // Support pagination for inbox module
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 25;
        $offset = ($page - 1) * $perPage;

        $messages = $this->db->fetchAll(
            'SELECT * FROM contact_messages ORDER BY submitted_at DESC LIMIT ? OFFSET ?',
            [$perPage, $offset]
        );

        $total = $this->db->fetchOne('SELECT COUNT(*) as count FROM contact_messages');

        echo json_encode([
            'messages' => $messages,
            'total' => (int)$total['count']
        ]);
    }

    /**
     * POST /api/contact - Submit a contact message
     */
    public function createContact() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $subject = $input['subject'] ?? '';
        $message = $input['message'] ?? '';

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');
        $validator->required($email, 'email');
        $validator->email($email, 'email');
        $validator->required($message, 'message');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        // Insert contact message
        $id = $this->db->insert(
            'INSERT INTO contact_messages (name, email, phone, subject, message, is_read, submitted_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [$name, $email, $phone, $subject, $message, 0]
        );

        Logger::info("New contact message: ID=$id, From=$name ($email)");

        echo json_encode([
            'id' => $id,
            'message' => 'Message sent successfully'
        ]);
    }

    /**
     * PUT /api/contact/messages/:id - Update message (mark as read)
     */
    public function updateMessage($id) {
        require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $isRead = isset($input['is_read']) ? (int)$input['is_read'] : 0;

        $this->db->update(
            'UPDATE contact_messages SET is_read = ? WHERE id = ?',
            [$isRead, $id]
        );

        echo json_encode(['message' => 'Message updated']);
    }

    /**
     * DELETE /api/contact/messages/:id - Delete message
     */
    public function deleteMessage($id) {
        require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
        AdminAuthMiddleware::require();

        $this->db->delete('DELETE FROM contact_messages WHERE id = ?', [$id]);

        echo json_encode(['message' => 'Message deleted']);
    }
}
