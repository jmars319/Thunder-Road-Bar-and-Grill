<?php
/**
 * Jobs Routes
 * 
 * Handles job applications and job position management.
 * 
 * Public endpoints:
 * - GET /job-positions/public - Get active job positions
 * - GET /application-fields - Get application form fields
 * - POST /job-applications - Submit job application
 * 
 * Admin endpoints:
 * - GET /job-positions - Get all job positions
 * - POST /job-positions - Create job position
 * - PUT /job-positions/:id - Update job position
 * - DELETE /job-positions/:id - Delete job position
 * - GET /job-applications - Get all applications
 * - GET /job-applications/:id - Get single application
 * - PUT /job-applications/:id/status - Update application status
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';
require_once __DIR__ . '/../utils/Emailer.php';
require_once __DIR__ . '/../utils/RequestContext.php';
require_once __DIR__ . '/../utils/AuditLog.php';

class JobsRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get active job positions for public view
     */
    public function getPublicJobPositions() {
        try {
            $results = $this->db->fetchAll('SELECT id, name, description, display_order FROM job_positions WHERE is_active = 1 ORDER BY display_order, id');
            header('Cache-Control: no-store, max-age=0, must-revalidate');
            header('Pragma: no-cache');
            echo json_encode($results);
        } catch (PDOException $e) {
            Logger::warning('Job positions query failed: ' . $e->getMessage());
            header('Cache-Control: no-store, max-age=0, must-revalidate');
            header('Pragma: no-cache');
            echo json_encode([]);
        }
    }

    /**
     * Get application form fields configuration
     */
    public function getApplicationFields() {
        try {
            $results = $this->db->fetchAll('SELECT * FROM application_fields ORDER BY id');
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (PDOException $e) {
            Logger::warning('Application fields query failed: ' . $e->getMessage());
            header('Cache-Control: public, max-age=300');
            echo json_encode([]);
        }
    }

    /**
     * Submit job application
     */
    public function submitApplication() {
        $input = json_decode(file_get_contents('php://input'), true);
        $input = is_array($input) ? $input : [];
        if ($this->honeypotTripped($input)) {
            Logger::warning('Public job application honeypot triggered');
            http_response_code(202);
            echo json_encode(['message' => 'Application received']);
            return;
        }
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $position = $input['position'] ?? '';
        $experience = $input['experience'] ?? '';
        $availability = $input['availability'] ?? '';
        $coverLetter = $input['cover_letter'] ?? '';
        $resumeUrl = $input['resume_url'] ?? null;

        // Basic validation
        $errors = [];
        if (!$name || !trim($name)) {
            $errors['name'] = 'Name is required';
        }
        
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required';
        }
        
        if (!$phone || !trim($phone)) {
            $errors['phone'] = 'Phone is required';
        }

        if (!empty($errors)) {
            $errorsList = [];
            foreach ($errors as $field => $message) {
                $errorsList[] = ['field' => $field, 'error' => $message];
            }

            ErrorHandler::respond('Validation failed', 400, [
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors,
                'errorsList' => $errorsList
            ]);
        }
        
        try {
            $id = $this->db->insert(
                'INSERT INTO job_applications (name, email, phone, position, availability, experience, cover_letter, resume_url, status, submitted_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [$name, $email, $phone, $position, $availability, $experience, $coverLetter, $resumeUrl, 'new']
            );
            
            Logger::info("New job application: ID=$id, Name=$name, Position=$position");
            AuditLog::record('job_application_submit', [
                'actor_type' => 'public',
                'entity_type' => 'job_application',
                'entity_id' => $id,
                'meta' => [
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'position' => $position,
                ],
            ]);
            
            // Send email notification
            try {
                Emailer::sendOpsNotification(
                    'Job Application',
                    [
                        'Name' => $name,
                        'Email' => $email,
                        'Phone' => $phone,
                        'Position' => $position ?: 'Not specified',
                        'Availability' => $availability ?: 'Not provided',
                        'Experience' => $experience ?: 'Not provided',
                        'Cover Letter' => $coverLetter ?: 'Not provided',
                        'Resume URL' => $resumeUrl ?: 'Not provided',
                    ],
                    [
                        'requestId' => RequestContext::getRequestId(),
                        'path' => $_SERVER['REQUEST_URI'] ?? '/api/jobs',
                        'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
                        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                    ],
                    $email ?: null
                );
                Logger::info('Job application email sent', ['id' => $id]);
            } catch (Exception $e) {
                Logger::error('Job application email failed', ['error' => $e->getMessage()]);
            }
            
            http_response_code(201);
            echo json_encode(['id' => $id, 'message' => 'Application submitted successfully']);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing job_applications table');
                ErrorHandler::respond('Job applications are currently unavailable', 503);
            } else {
                Logger::error('Job application error: ' . $e->getMessage());
                ErrorHandler::respond('Failed to submit application', 500);
            }
        }
    }

    /**
     * Get all job positions (admin)
     */
    public function getAllJobPositions() {
        $user = AdminAuthMiddleware::verify();
        
        try {
            $results = $this->db->fetchAll('SELECT * FROM job_positions ORDER BY id');
            echo json_encode($results);
        } catch (PDOException $e) {
            Logger::warning('Job positions query failed: ' . $e->getMessage());
            echo json_encode([]);
        }
    }

    /**
     * Create a job position (admin)
     */
    public function createPosition() {
        $user = AdminAuthMiddleware::verify();

        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $isActive = isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1;

        if (!trim($name)) {
            ErrorHandler::respond('Position name is required', 400);
        }

        try {
            $id = $this->db->insert('INSERT INTO job_positions (name, is_active) VALUES (?, ?)', [$name, $isActive]);
            AuditLog::record('job_position_create', [
                'actor_type' => 'admin',
                'actor_id' => $user['id'] ?? null,
                'entity_type' => 'job_position',
                'entity_id' => $id,
                'meta' => ['name' => $name],
            ]);
            echo json_encode(['id' => $id, 'message' => 'Position created']);
        } catch (PDOException $e) {
            Logger::error('Create position error: ' . $e->getMessage());
            ErrorHandler::respond('Failed to create position', 500);
        }
    }

    /**
     * Update a job position (admin)
     */
    public function updatePosition($id) {
        $user = AdminAuthMiddleware::verify();

        $input = json_decode(file_get_contents('php://input'), true);

        $fields = [];
        $params = [];

        if (isset($input['name'])) {
            $fields[] = 'name = ?';
            $params[] = $input['name'];
        }

        if (isset($input['is_active'])) {
            $fields[] = 'is_active = ?';
            $params[] = $input['is_active'] ? 1 : 0;
        }

        if (count($fields) === 0) {
            ErrorHandler::respond('No fields to update', 400);
        }

        $params[] = $id;

        try {
            $sql = 'UPDATE job_positions SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $this->db->query($sql, $params);
        AuditLog::record('job_position_update', [
            'actor_type' => 'admin',
            'actor_id' => $user['id'] ?? null,
            'entity_type' => 'job_position',
            'entity_id' => $id,
            'meta' => $input,
        ]);
        echo json_encode(['message' => 'Position updated']);
        } catch (PDOException $e) {
            Logger::error('Update position error: ' . $e->getMessage());
            ErrorHandler::respond('Failed to update position', 500);
        }
    }

    /**
     * Delete a job position (admin)
     */
    public function deletePosition($id) {
        $user = AdminAuthMiddleware::verify();

        try {
            $this->db->delete('DELETE FROM job_positions WHERE id = ?', [$id]);
        AuditLog::record('job_position_delete', [
            'actor_type' => 'admin',
            'actor_id' => $user['id'] ?? null,
            'entity_type' => 'job_position',
            'entity_id' => $id,
        ]);
        echo json_encode(['message' => 'Position deleted']);
        } catch (PDOException $e) {
            Logger::error('Delete position error: ' . $e->getMessage());
            ErrorHandler::respond('Failed to delete position', 500);
        }
    }

    /**
     * Get all job applications (admin)
     */
    public function getAllApplications() {
        $user = AdminAuthMiddleware::verify();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));
        $offset = ($page - 1) * $perPage;

        $allowedSort = [
            'submitted_at' => 'submitted_at',
            'name' => 'name',
            'status' => 'status',
            'position' => 'position'
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
            $where[] = '(name LIKE ? OR email LIKE ? OR position LIKE ?)';
            $needle = '%' . $search . '%';
            $params[] = $needle;
            $params[] = $needle;
            $params[] = $needle;
        }

        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';

        try {
            $totalRow = $this->db->fetchOne('SELECT COUNT(*) as count FROM job_applications' . $whereSql, $params);
            $total = (int)($totalRow['count'] ?? 0);

            $results = $this->db->fetchAll(
                'SELECT * FROM job_applications' . $whereSql . " ORDER BY {$sortColumn} {$sortDir} LIMIT ? OFFSET ?",
                array_merge($params, [$perPage, $offset])
            );

            echo json_encode([
                'data' => $results,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage
            ]);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing job_applications table');
                echo json_encode(['data' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage]);
            } else {
                throw $e;
            }
        }
    }

    /**
     * PUT /api/jobs/:id - Update job application status
     */
    public function updateApplication($id) {
        $user = AdminAuthMiddleware::verify();
        $input = json_decode(file_get_contents('php://input'), true);
        $status = isset($input['status']) ? trim($input['status']) : null;
        $allowed = ['new', 'reviewing', 'interviewed', 'hired', 'rejected', 'archived'];

        if (!$status || !in_array($status, $allowed, true)) {
            ErrorHandler::respond('Invalid status', 400);
        }

        $this->db->update('UPDATE job_applications SET status = ? WHERE id = ?', [$status, $id]);
        AuditLog::record('job_application_update', [
            'actor_type' => 'admin',
            'actor_id' => $user['id'] ?? null,
            'entity_type' => 'job_application',
            'entity_id' => $id,
            'meta' => ['status' => $status],
        ]);
        echo json_encode(['message' => 'Application updated']);
    }

    /**
     * DELETE /api/jobs/:id - Delete job application
     */
    public function deleteApplication($id) {
        $user = AdminAuthMiddleware::verify();

        try {
            $this->db->delete('DELETE FROM job_applications WHERE id = ?', [$id]);
        AuditLog::record('job_application_delete', [
            'actor_type' => 'admin',
            'actor_id' => $user['id'] ?? null,
            'entity_type' => 'job_application',
            'entity_id' => $id,
        ]);
        echo json_encode(['message' => 'Application deleted']);
        } catch (PDOException $e) {
            Logger::error('Delete application error: ' . $e->getMessage());
            ErrorHandler::respond('Failed to delete application', 500);
        }
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
