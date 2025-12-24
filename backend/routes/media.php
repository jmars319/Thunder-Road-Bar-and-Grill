<?php

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/MediaPipeline.php';
require_once __DIR__ . '/../utils/MediaResponseBuilder.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';

class MediaRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    private function hydrate($rows) {
        return MediaResponseBuilder::hydrateRows($rows);
    }

    /**
     * GET /api/media
     */
    public function getAllMedia() {
        try {
            $category = isset($_GET['category']) && $_GET['category'] !== 'all'
                ? strtolower(trim($_GET['category']))
                : null;
            $limit = min(max((int) ($_GET['limit'] ?? 48), 1), 200);
            $offset = max((int) ($_GET['offset'] ?? 0), 0);

            $where = '';
            $params = [];
            if ($category) {
                $where = 'WHERE category = ?';
                $params[] = $category;
            }

            $count = $this->db->fetchOne("SELECT COUNT(*) AS total FROM media_library {$where}", $params);
            $total = (int) ($count['total'] ?? 0);

            $params[] = $limit;
            $params[] = $offset;

            $rows = $this->db->fetchAll(
                "SELECT * FROM media_library {$where} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?",
                $params
            );

            $hydrated = $this->hydrate($rows);

            header('X-Total-Count: ' . $total);
            header('Cache-Control: public, max-age=60');
            echo json_encode(['success' => true, 'media' => $hydrated]);
        } catch (Exception $e) {
            Logger::error('GET /api/media failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to fetch media']);
        }
    }

    /**
     * GET /api/media/:id
     */
    public function getMediaById($id) {
        try {
            $row = $this->db->fetchOne('SELECT * FROM media_library WHERE id = ?', [$id]);
            if (!$row) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Media not found']);
                return;
            }
            echo json_encode(['success' => true, 'media' => MediaResponseBuilder::hydrateRow($row)]);
        } catch (Exception $e) {
            Logger::error('GET /api/media/:id failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to fetch media']);
        }
    }

    /**
     * POST /api/media
     */
    public function uploadMedia() {
        $user = AdminAuthMiddleware::require();

        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No file uploaded']);
            return;
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Upload failed']);
            return;
        }

        $title = trim($_POST['title'] ?? $file['name']);
        $altText = trim($_POST['alt_text'] ?? '');
        $caption = trim($_POST['caption'] ?? '');
        $category = strtolower(trim($_POST['category'] ?? 'general'));

        if ($category === 'resume') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Resume uploads are not supported']);
            return;
        }

        $processed = null;

        try {
            $processed = MediaPipeline::processUploadedFile(
                $file['tmp_name'],
                $file['name'],
                $file['type'],
                $file['size'],
                $category
            );

            $responsive = [
                'optimized' => $processed['optimized_variants'],
                'webp' => $processed['webp_variants']
            ];

            $optimizedPath = null;
            if (!empty($processed['optimized_variants'])) {
                $last = end($processed['optimized_variants']);
                $optimizedPath = $last['url'];
            }
            $webpPath = null;
            if (!empty($processed['webp_variants'])) {
                $last = end($processed['webp_variants']);
                $webpPath = $last['url'];
            }

            $insert = [
                'file_url' => $processed['file_url'],
                'file_name' => $processed['file_name'],
                'file_type' => $processed['file_type'],
                'file_size' => $processed['file_size'],
                'width' => $processed['width'],
                'height' => $processed['height'],
                'checksum' => $processed['checksum'],
                'title' => $title,
                'alt_text' => $altText,
                'caption' => $caption,
                'category' => $processed['category'],
                'optimized_path' => $optimizedPath,
                'webp_path' => $webpPath,
                'optimized_srcset' => $processed['optimized_srcset'],
                'webp_srcset' => $processed['webp_srcset'],
                'responsive_variants' => json_encode($responsive),
                'manifest_path' => $processed['manifest_path'],
                'uploader' => $user['username'] ?? null,
                'status' => 'ready',
                'processing_notes' => null
            ];

            $columns = array_keys($insert);
            $placeholders = implode(',', array_fill(0, count($columns), '?'));
            $sql = 'INSERT INTO media_library (' . implode(',', $columns) . ') VALUES (' . $placeholders . ')';
            $id = $this->db->insert($sql, array_values($insert));

            $row = $this->db->fetchOne('SELECT * FROM media_library WHERE id = ?', [$id]);
            http_response_code(201);
            echo json_encode(['success' => true, 'media' => MediaResponseBuilder::hydrateRow($row)]);
        } catch (Exception $e) {
            Logger::error('POST /api/media failed', ['error' => $e->getMessage()]);
            if ($processed) {
                $manifest = MediaPipeline::readManifest($processed['manifest_path'] ?? null);
                if ($manifest) {
                    MediaPipeline::deleteFilesFromManifest($manifest);
                } elseif (!empty($processed['file_url'])) {
                    MediaPipeline::deleteOriginalByUrl($processed['file_url']);
                }
            }
            http_response_code($e->getCode() === 400 ? 400 : 500);
            $message = $e->getCode() === 400 ? $e->getMessage() : 'Upload failed';
            echo json_encode(['success' => false, 'message' => $message]);
        }
    }

    /**
     * PUT /api/media/:id
     */
    public function updateMedia($id) {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $fields = [];
        $params = [];

        $assignable = ['title', 'alt_text', 'caption', 'category'];

        foreach ($assignable as $field) {
            if (array_key_exists($field, $input)) {
                $value = $input[$field];
                if ($field === 'category' && strtolower(trim($value)) === 'resume') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Resume category is not allowed']);
                    return;
                }
                $fields[] = "{$field} = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) {
            echo json_encode(['success' => true]);
            return;
        }

        $params[] = $id;

        try {
            $this->db->update('UPDATE media_library SET ' . implode(', ', $fields) . ' WHERE id = ?', $params);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            Logger::error('PUT /api/media/:id failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update media']);
        }
    }

    /**
     * DELETE /api/media/:id
     */
    public function deleteMedia($id) {
        AdminAuthMiddleware::require();
        try {
            $row = $this->db->fetchOne('SELECT * FROM media_library WHERE id = ?', [$id]);
            if (!$row) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Media not found']);
                return;
            }

            $manifest = MediaPipeline::readManifest($row['manifest_path'] ?? null);
            if ($manifest) {
                MediaPipeline::deleteFilesFromManifest($manifest);
            } else {
                $hydrated = MediaResponseBuilder::hydrateRow($row);
                if (!empty($hydrated['responsive_variants']['optimized'])) {
                    foreach ($hydrated['responsive_variants']['optimized'] as $variant) {
                        if (!empty($variant['path'])) {
                            MediaPipeline::deleteOriginalByUrl($variant['path']);
                        }
                    }
                }
                if (!empty($hydrated['responsive_variants']['webp'])) {
                    foreach ($hydrated['responsive_variants']['webp'] as $variant) {
                        if (!empty($variant['path'])) {
                            MediaPipeline::deleteOriginalByUrl($variant['path']);
                        }
                    }
                }
                MediaPipeline::deleteOriginalByUrl($row['file_url']);
            }

            $this->db->delete('DELETE FROM media_library WHERE id = ?', [$id]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            Logger::error('DELETE /api/media/:id failed', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete media']);
        }
    }
}
