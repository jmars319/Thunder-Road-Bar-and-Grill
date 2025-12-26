<?php
/**
 * Reservations Routes
 * 
 * Purpose:
 * - Handle public reservation submissions from the frontend
 * 
 * Endpoints:
 * - POST /api/reservations - Create a new reservation
 */
require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';
require_once __DIR__ . '/../utils/Emailer.php';
require_once __DIR__ . '/../utils/RequestContext.php';
require_once __DIR__ . '/../utils/AuditLog.php';

class ReservationsRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * GET /api/reservations - Get all reservations (admin)
     */
    public function getAllReservations() {
        require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
        AdminAuthMiddleware::require();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));
        $offset = ($page - 1) * $perPage;

        $allowedSort = [
            'reservation_date' => 'reservation_date',
            'reservation_time' => 'reservation_time',
            'created_at' => 'created_at',
            'name' => 'name',
            'status' => 'status'
        ];
        $sortBy = strtolower($_GET['sort_by'] ?? 'reservation_date');
        $sortColumn = $allowedSort[$sortBy] ?? 'reservation_date';
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
            $where[] = '(name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            $needle = '%' . $search . '%';
            $params[] = $needle;
            $params[] = $needle;
            $params[] = $needle;
        }

        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $totalRow = $this->db->fetchOne('SELECT COUNT(*) as count FROM reservations' . $whereSql, $params);
        $total = (int)($totalRow['count'] ?? 0);

        $reservations = $this->db->fetchAll(
            'SELECT * FROM reservations' . $whereSql . " ORDER BY {$sortColumn} {$sortDir} LIMIT ? OFFSET ?",
            array_merge($params, [$perPage, $offset])
        );

        echo json_encode([
            'data' => $reservations,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ]);
    }

    /**
     * POST /api/reservations - Create a new reservation
     */
    public function createReservation() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $reservationDate = $input['reservation_date'] ?? '';
        $reservationTime = $input['reservation_time'] ?? '';
        $numberOfGuests = $input['number_of_guests'] ?? 0;
        $specialRequests = $input['special_requests'] ?? '';

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');
        $validator->required($phone, 'phone');
        $validator->required($reservationDate, 'reservation_date');
        $validator->required($reservationTime, 'reservation_time');
        $validator->integer($numberOfGuests, 'number_of_guests');
        $validator->min($numberOfGuests, 1, 'number_of_guests');

        if ($email) {
            $validator->email($email, 'email');
        }

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        // Insert reservation
        $id = $this->db->insert(
            'INSERT INTO reservations (name, email, phone, reservation_date, reservation_time, number_of_guests, special_requests, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [$name, $email, $phone, $reservationDate, $reservationTime, $numberOfGuests, $specialRequests, 'pending']
        );

        Logger::info("New reservation created: ID=$id, Name=$name, Date=$reservationDate");
        AuditLog::record('reservation_submit', [
            'actor_type' => 'public',
            'entity_type' => 'reservation',
            'entity_id' => $id,
            'meta' => [
                'name' => $name,
                'email' => $email,
                'guests' => $numberOfGuests,
                'date' => $reservationDate,
                'time' => $reservationTime,
            ],
        ]);
        
        // Send email notification
        try {
            Emailer::sendOpsNotification(
                'Reservation Request',
                [
                    'Name' => $name,
                    'Email' => $email ?: 'Not provided',
                    'Phone' => $phone,
                    'Date' => $reservationDate,
                    'Time' => $reservationTime,
                    'Party Size' => $numberOfGuests,
                    'Special Requests' => $specialRequests ?: 'None',
                ],
                [
                    'requestId' => RequestContext::getRequestId(),
                    'path' => $_SERVER['REQUEST_URI'] ?? '/api/reservations',
                    'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
                    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                ],
                $email ?: null
            );
            Logger::info('Reservation email sent', ['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Reservation email failed', ['error' => $e->getMessage()]);
        }

        echo json_encode([
            'id' => $id,
            'message' => 'Reservation submitted successfully'
        ]);
    }

    /**
     * PUT /api/reservations/:id - Update reservation status
     */
    public function updateReservation($id) {
        require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['status'] ?? '';

        if (!in_array($status, ['pending', 'confirmed', 'cancelled', 'completed', 'archived'], true)) {
            ErrorHandler::respond('Invalid status', 400);
        }

        $this->db->update(
            'UPDATE reservations SET status = ? WHERE id = ?',
            [$status, $id]
        );

        echo json_encode(['message' => 'Reservation updated']);
    }

    /**
     * DELETE /api/reservations/:id - Delete reservation
     */
    public function deleteReservation($id) {
        require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
        AdminAuthMiddleware::require();

        $this->db->delete('DELETE FROM reservations WHERE id = ?', [$id]);

        echo json_encode(['message' => 'Reservation deleted']);
    }
}
