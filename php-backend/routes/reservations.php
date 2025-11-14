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

        $reservations = $this->db->fetchAll(
            'SELECT * FROM reservations ORDER BY reservation_date DESC, reservation_time DESC'
        );

        echo json_encode($reservations);
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

        if (!in_array($status, ['pending', 'confirmed', 'cancelled', 'completed'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            return;
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
