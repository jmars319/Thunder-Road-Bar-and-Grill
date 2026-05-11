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
require_once __DIR__ . '/../utils/Emailer.php';
require_once __DIR__ . '/../utils/RequestContext.php';
require_once __DIR__ . '/../utils/AuditLog.php';

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
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));
        $offset = ($page - 1) * $perPage;

        $allowedSort = [
            'submitted_at' => 'submitted_at',
            'name' => 'name',
            'status' => 'status',
            'subject' => 'subject'
        ];
        $sortBy = strtolower($_GET['sort_by'] ?? 'submitted_at');
        $sortColumn = $allowedSort[$sortBy] ?? 'submitted_at';
        $sortDir = strtoupper($_GET['sort_dir'] ?? 'DESC');
        if (!in_array($sortDir, ['ASC', 'DESC'], true)) {
            $sortDir = 'DESC';
        }

        $where = [];
        $params = [];

        $status = isset($_GET['status']) ? trim($_GET['status']) : null;
        if ($status && $status !== 'all') {
            $where[] = 'status = ?';
            $params[] = $status;
        }

        $search = isset($_GET['search']) ? trim($_GET['search']) : null;
        if ($search !== null && $search !== '') {
            $where[] = '(name LIKE ? OR email LIKE ? OR subject LIKE ?)';
            $needle = '%' . $search . '%';
            $params[] = $needle;
            $params[] = $needle;
            $params[] = $needle;
        }

        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $totalRow = $this->db->fetchOne('SELECT COUNT(*) as count FROM contact_messages' . $whereSql, $params);
        $total = (int)($totalRow['count'] ?? 0);

        $messages = $this->db->fetchAll(
            'SELECT * FROM contact_messages' . $whereSql . " ORDER BY {$sortColumn} {$sortDir} LIMIT ? OFFSET ?",
            array_merge($params, [$perPage, $offset])
        );

        echo json_encode([
            'data' => $messages,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ]);
    }

    /**
     * POST /api/contact - Submit a contact message
     */
    public function createContact() {
        $input = json_decode(file_get_contents('php://input'), true);
        $input = is_array($input) ? $input : [];
        if ($this->honeypotTripped($input)) {
            Logger::warning('Public contact honeypot triggered');
            http_response_code(202);
            echo json_encode(['message' => 'Message received']);
            return;
        }
        
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
            'INSERT INTO contact_messages (name, email, phone, subject, message, is_read, status, submitted_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [$name, $email, $phone, $subject, $message, 0, 'new']
        );

        Logger::info("New contact message: ID=$id, From=$name ($email)");
        AuditLog::record('contact_submit', [
            'actor_type' => 'public',
            'entity_type' => 'contact_message',
            'entity_id' => $id,
            'meta' => [
                'name' => $name,
                'email' => $email,
                'subject' => $subject,
            ],
        ]);

        try {
            Emailer::sendOpsNotification(
                'Contact Message',
                [
                    'Name' => $name,
                    'Email' => $email,
                    'Phone' => $phone ?: 'Not provided',
                    'Subject' => $subject ?: 'No subject',
                    'Message' => $message,
                ],
                [
                    'requestId' => RequestContext::getRequestId(),
                    'path' => $_SERVER['REQUEST_URI'] ?? '/api/contact',
                    'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
                    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                ],
                $email
            );
            Logger::info('Contact email sent', ['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Contact email failed', ['error' => $e->getMessage()]);
        }

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
        $status = isset($input['status']) ? trim($input['status']) : null;
        $allowedStatuses = ['new', 'in_progress', 'responded', 'archived'];

        $fields = ['is_read = ?'];
        $params = [$isRead];

        if ($status && in_array($status, $allowedStatuses, true)) {
            $fields[] = 'status = ?';
            $params[] = $status;
        }

        $params[] = $id;

        $this->db->update(
            'UPDATE contact_messages SET ' . implode(', ', $fields) . ' WHERE id = ?',
            $params
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

    private function honeypotTripped(array $input): bool {
        foreach (['trbg_hp', 'website', 'companyWebsite', 'company_website'] as $field) {
            if (trim((string)($input[$field] ?? '')) !== '') {
                return true;
            }
        }

        return false;
    }
}
