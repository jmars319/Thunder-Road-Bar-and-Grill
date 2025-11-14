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
            $results = $this->db->fetchAll('SELECT * FROM job_positions ORDER BY id');
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (PDOException $e) {
            Logger::warning('Job positions query failed: ' . $e->getMessage());
            header('Cache-Control: public, max-age=300');
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
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $position = $input['position'] ?? '';
        $experience = $input['experience'] ?? '';
        $availability = $input['availability'] ?? '';
        $coverLetter = $input['cover_letter'] ?? '';
        $resumeUrl = $input['resume_url'] ?? null;

        // Basic validation
        if (!$name || !trim($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Name is required', 'errors' => [['field' => 'name', 'error' => 'Name is required']]]);
            return;
        }
        
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Valid email is required', 'errors' => [['field' => 'email', 'error' => 'Valid email is required']]]);
            return;
        }
        
        if (!$phone || !trim($phone)) {
            http_response_code(400);
            echo json_encode(['error' => 'Phone is required', 'errors' => [['field' => 'phone', 'error' => 'Phone is required']]]);
            return;
        }
        
        try {
            $id = $this->db->insert(
                'INSERT INTO job_applications (name, email, phone, position, availability, experience, cover_letter, resume_url, status, submitted_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [$name, $email, $phone, $position, $availability, $experience, $coverLetter, $resumeUrl, 'new']
            );
            
            Logger::info("New job application: ID=$id, Name=$name, Position=$position");
            
            http_response_code(201);
            echo json_encode(['id' => $id, 'message' => 'Application submitted successfully']);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing job_applications table');
                http_response_code(503);
                echo json_encode(['error' => 'Job applications are currently unavailable']);
            } else {
                Logger::error('Job application error: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Failed to submit application']);
            }
        }
    }

    /**
     * Get all job positions (admin)
     */
    public function getAllJobPositions() {
        AdminAuthMiddleware::verify();
        
        try {
            $results = $this->db->fetchAll('SELECT * FROM job_positions ORDER BY id');
            echo json_encode($results);
        } catch (PDOException $e) {
            Logger::warning('Job positions query failed: ' . $e->getMessage());
            echo json_encode([]);
        }
    }

    /**
     * Get all job applications (admin)
     */
    public function getAllApplications() {
        AdminAuthMiddleware::verify();
        
        try {
            $results = $this->db->fetchAll(
                'SELECT * FROM job_applications ORDER BY submitted_at DESC'
            );
            echo json_encode($results);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing job_applications table');
                echo json_encode([]);
            } else {
                throw $e;
            }
        }
    }

    /**
     * DELETE /api/jobs/:id - Delete job application
     */
    public function deleteApplication($id) {
        AdminAuthMiddleware::verify();

        try {
            $this->db->delete('DELETE FROM job_applications WHERE id = ?', [$id]);
            echo json_encode(['message' => 'Application deleted']);
        } catch (PDOException $e) {
            Logger::error('Delete application error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete application']);
        }
    }
}
