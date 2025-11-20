<?php
/**
 * Media Routes
 * 
 * Handles media library and file uploads.
 * 
 * Public endpoints:
 * - GET /media - Get all media files
 * - GET /media/:id - Get single media file
 * 
 * Admin endpoints:
 * - POST /media - Upload media file
 * - PUT /media/:id - Update media metadata
 * - DELETE /media/:id - Delete media file
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/FileValidator.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';

class MediaRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all media files (with optional category filtering)
     */
    public function getAllMedia() {
        try {
            // Get query parameters
            $category = $_GET['category'] ?? null;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            // Build query based on category filter
            if ($category) {
                $query = 'SELECT * FROM media_library WHERE category = ? ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
                $params = [$category, $limit, $offset];
                
                // Get total count for this category
                $countQuery = 'SELECT COUNT(*) as total FROM media_library WHERE category = ?';
                $countResult = $this->db->fetchOne($countQuery, [$category]);
                $total = $countResult['total'] ?? 0;
            } else {
                $query = 'SELECT * FROM media_library ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
                $params = [$limit, $offset];
                
                // Get total count
                $countQuery = 'SELECT COUNT(*) as total FROM media_library';
                $countResult = $this->db->fetchOne($countQuery);
                $total = $countResult['total'] ?? 0;
            }
            
            $results = $this->db->fetchAll($query, $params);
            
            // Set total count header
            header('X-Total-Count: ' . $total);
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (PDOException $e) {
            Logger::warning('Media query failed: ' . $e->getMessage());
            header('Cache-Control: public, max-age=300');
            echo json_encode([]);
        }
    }

    /**
     * Get single media file
     */
    public function getMediaById($id) {
        try {
            $result = $this->db->fetchOne(
                'SELECT * FROM media_library WHERE id = ?',
                [$id]
            );
            
            if ($result) {
                header('Cache-Control: public, max-age=300');
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Media not found']);
            }
        } catch (PDOException $e) {
            Logger::warning('Media query failed: ' . $e->getMessage());
            http_response_code(404);
            echo json_encode(['error' => 'Media not found']);
        }
    }

    /**
     * Upload media file (admin)
     */
    public function uploadMedia() {
        AdminAuthMiddleware::verify();
        
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded']);
            return;
        }
        
        $file = $_FILES['file'];
        
        // Validate file
        $validator = new FileValidator();
        if (!$validator->validate($file)) {
            http_response_code(400);
            echo json_encode(['error' => $validator->getError()]);
            return;
        }
        
        try {
            // Generate unique filename
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = uniqid('media_') . '.' . $ext;
            $uploadDir = Config::get('UPLOAD_DIR', 'uploads');
            $uploadPath = __DIR__ . '/../' . $uploadDir . '/' . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Failed to move uploaded file');
            }
            
            // Store metadata in database
            $data = [
                'filename' => $filename,
                'original_filename' => $file['name'],
                'file_size' => $file['size'],
                'mime_type' => $file['type'],
                'title' => $_POST['title'] ?? $file['name'],
                'alt_text' => $_POST['alt_text'] ?? '',
                'caption' => $_POST['caption'] ?? '',
                'category' => $_POST['category'] ?? 'general',
                'tags' => $_POST['tags'] ?? null
            ];
            
            $id = $this->db->insert(
                'INSERT INTO media_library (filename, original_filename, file_size, mime_type, title, alt_text, caption, category, tags) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                array_values($data)
            );
            
            $data['id'] = $id;
            $data['url'] = '/' . $uploadDir . '/' . $filename;
            
            http_response_code(201);
            echo json_encode(['message' => 'File uploaded successfully', 'media' => $data]);
            
        } catch (Exception $e) {
            Logger::error('Media upload failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['error' => 'Upload failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Update media metadata (admin)
     */
    public function updateMedia($id) {
        AdminAuthMiddleware::verify();
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $updateData = [];
            
            if (isset($data['title'])) $updateData['title'] = $data['title'];
            if (isset($data['alt_text'])) $updateData['alt_text'] = $data['alt_text'];
            if (isset($data['caption'])) $updateData['caption'] = $data['caption'];
            if (isset($data['tags'])) $updateData['tags'] = $data['tags'];
            if (isset($data['category'])) $updateData['category'] = $data['category'];
            
            if (empty($updateData)) {
                echo json_encode(['message' => 'No fields to update']);
                return;
            }
            
            $this->db->update('media_library', $id, $updateData);
            
            echo json_encode(['message' => 'Media updated successfully']);
        } catch (PDOException $e) {
            Logger::warning('Media update failed: ' . $e->getMessage());
            http_response_code(404);
            echo json_encode(['error' => 'Media not found']);
        }
    }

    /**
     * Delete media file (admin)
     */
    public function deleteMedia($id) {
        AdminAuthMiddleware::verify();
        
        try {
            $result = $this->db->delete('DELETE FROM media_library WHERE id = ?', [$id]);
            if ($result === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Media not found']);
                return;
            }
            echo json_encode(['message' => 'Media deleted successfully']);
        } catch (PDOException $e) {
            Logger::warning('Media delete failed: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Delete failed']);
        }
    }
}
