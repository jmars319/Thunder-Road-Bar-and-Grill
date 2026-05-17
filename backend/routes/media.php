<?php

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/MediaPipeline.php';
require_once __DIR__ . '/../utils/MediaResponseBuilder.php';
require_once __DIR__ . '/../utils/RequestContext.php';
require_once __DIR__ . '/../utils/UploadLimits.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class MediaRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::lazy();
    }

    private function respondUploadError($message, $status = 400, $errorKey = 'bad_request', array $details = []) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => $errorKey,
            'message' => $message,
            'details' => $details,
            'requestId' => RequestContext::getRequestId(),
            'timestampUTC' => gmdate('c')
        ]);
        exit;
    }

    protected function normalizeContextValue($value, $allowNull = false) {
        if ($value === null) {
            return $allowNull ? null : 'gallery';
        }
        $normalized = strtolower(trim((string) $value));
        if ($normalized === '' && $allowNull) {
            return null;
        }
        if ($normalized === '' || $normalized === 'general') {
            return 'gallery';
        }
        return $normalized;
    }

    protected function buildGalleryWhereClause() {
        return "(category IS NULL OR category = '' OR category = 'general' OR category = 'gallery')";
    }

    private function describeUploadError($code) {
        switch ($code) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'File exceeds server upload limit';
            case UPLOAD_ERR_PARTIAL:
                return 'Upload interrupted, please try again';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Server is missing a temporary directory';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Server failed to save the uploaded file';
            case UPLOAD_ERR_EXTENSION:
                return 'A PHP extension blocked the upload';
            default:
                return 'Upload failed';
        }
    }

    private function hydrate($rows) {
        return MediaResponseBuilder::hydrateRows($rows);
    }

    /**
     * GET /api/media
     */
    public function getAllMedia() {
        try {
            $contextParam = $_GET['context'] ?? $_GET['category'] ?? null;
            $context = $this->normalizeContextValue($contextParam, true);
            $limit = min(max((int) ($_GET['limit'] ?? 48), 1), 200);
            $offset = max((int) ($_GET['offset'] ?? 0), 0);

            $where = '';
            $params = [];
            if ($context !== null) {
                if ($context === 'gallery') {
                    $where = 'WHERE ' . $this->buildGalleryWhereClause();
                } else {
                    $where = 'WHERE category = ?';
                    $params[] = $context;
                }
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
            ErrorHandler::respond('Failed to fetch media', 500, ['success' => false]);
        }
    }

    /**
     * GET /api/media/:id
     */
    public function getMediaById($id) {
        try {
            $row = $this->db->fetchOne('SELECT * FROM media_library WHERE id = ?', [$id]);
            if (!$row) {
                ErrorHandler::respond('Media not found', 404, ['success' => false]);
            }
            echo json_encode(['success' => true, 'media' => MediaResponseBuilder::hydrateRow($row)]);
        } catch (Exception $e) {
            Logger::error('GET /api/media/:id failed', ['error' => $e->getMessage()]);
            ErrorHandler::respond('Failed to fetch media', 500, ['success' => false]);
        }
    }

    /**
     * POST /api/media
     */
    public function uploadMedia() {
        $user = AdminAuthMiddleware::require();

        $limits = UploadLimits::getLimitsDebugInfo();
        $effectiveMax = $limits['effective_bytes'] ?? 0;
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
        if ($effectiveMax > 0 && $contentLength > $effectiveMax) {
            $this->respondUploadError(
                'File exceeds server upload limit',
                413,
                'file_too_large',
                array_merge($limits, [
                    'content_length' => $contentLength
                ])
            );
        }

        $file = $_FILES['file'] ?? $_FILES['image'] ?? null;
        if (!$file) {
            $this->respondUploadError('No file uploaded', 400, 'missing_file');
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $message = $this->describeUploadError($file['error']);
            Logger::error('POST /api/media upload_error', ['code' => $file['error'], 'message' => $message]);
            $this->respondUploadError($message, 400, 'upload_error', ['code' => $file['error']]);
        }

        $fileSize = isset($file['size']) ? (int) $file['size'] : 0;
        if ($fileSize <= 0 || empty($file['tmp_name'])) {
            $this->respondUploadError('Uploaded file is empty', 400, 'empty_file');
        }

        if ($effectiveMax > 0 && $fileSize > $effectiveMax) {
            $this->respondUploadError(
                'File exceeds server upload limit',
                413,
                'file_too_large',
                array_merge($limits, [
                    'received_bytes' => $fileSize
                ])
            );
        }

        $title = trim($_POST['title'] ?? $file['name']);
        $altText = trim($_POST['alt_text'] ?? '');
        $caption = trim($_POST['caption'] ?? '');
        $category = $this->normalizeContextValue($_POST['category'] ?? null);

        if ($category === 'logo') {
            $this->respondUploadError('Logo uploads are no longer supported', 400, 'unsupported_category');
        }

        if ($category === 'resume') {
            $this->respondUploadError('Resume uploads are not supported', 400, 'unsupported_category');
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
            $status = $e->getCode() >= 400 && $e->getCode() < 600 ? (int) $e->getCode() : 500;
            $message = $status === 400 ? $e->getMessage() : 'Upload failed';
            $errorKey = $status === 400 ? 'bad_request' : 'upload_failed';
            $details = $status === 400 ? ['reason' => $e->getMessage()] : [];
            $this->respondUploadError($message, $status, $errorKey, $details);
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
                if ($field === 'category') {
                    $normalized = $this->normalizeContextValue($value);
                    if ($normalized === 'resume' || $normalized === 'logo') {
                        ErrorHandler::respond(ucfirst($normalized) . ' category is not allowed', 400, ['success' => false]);
                    }
                    $value = $normalized;
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
            ErrorHandler::respond('Failed to update media', 500, ['success' => false]);
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
                ErrorHandler::respond('Media not found', 404, ['success' => false]);
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
            ErrorHandler::respond('Failed to delete media', 500, ['success' => false]);
        }
    }
}
