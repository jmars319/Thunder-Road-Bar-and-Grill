<?php
/**
 * Settings Routes
 * 
 * Purpose:
 * - Serve site-wide configuration, navigation, business hours, 'about' page
 *   content and footer columns
 * 
 * Public endpoints:
 * - GET /api/site-settings -> { business_name, tagline, logo_url, phone, email, address, ... }
 * - GET /api/navigation -> [{ id, label, url, display_order }]
 * - GET /api/business-hours -> [{ id, day, opening_time, closing_time, is_closed, ... }]
 * - GET /api/about -> { header, paragraph, phone, email, address, map_embed_url }
 * - GET /api/footer-columns -> [{ id, column_title, links: [...] }]
 * 
 * Admin endpoints:
 * - PUT /api/site-settings
 * - PUT /api/business-hours/:id
 * - PUT /api/about
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class SettingsRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * GET /api/site-settings - Get site settings
     */
    public function getSiteSettings() {
        try {
            $row = $this->db->fetchOne('SELECT * FROM site_settings WHERE id = 1');
            
            if (!$row) {
                $row = [];
            }

            // Parse hero_images JSON if present
            if (isset($row['hero_images'])) {
                $row['hero_images'] = json_decode($row['hero_images'], true) ?: [];
            } else {
                $row['hero_images'] = [];
            }

            header('Cache-Control: public, max-age=300');
            echo json_encode($row);
        } catch (PDOException $e) {
            // Return empty settings if table doesn't exist
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing site_settings table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/navigation - Get navigation links
     */
    public function getNavigation() {
        try {
            $results = $this->db->fetchAll('SELECT * FROM navigation_links ORDER BY display_order');
            
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (PDOException $e) {
            // Return empty array if table doesn't exist
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing navigation_links table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/business-hours - Get business hours
     */
    public function getBusinessHours() {
        try {
            $area = isset($_GET['area']) ? trim($_GET['area']) : null;
            
            if ($area) {
                $results = $this->db->fetchAll(
                    'SELECT * FROM business_hours WHERE area = ? ORDER BY id',
                    [$area]
                );
            } else {
                $results = $this->db->fetchAll(
                    'SELECT * FROM business_hours ORDER BY area, id'
                );
            }
            
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (PDOException $e) {
            // Return empty array if table doesn't exist
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing business_hours table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/about - Get about content
     */
    public function getAbout() {
        try {
            $row = $this->db->fetchOne('SELECT * FROM about_content WHERE id = 1');
            
            if (!$row) {
                $row = [];
            }
            
            header('Cache-Control: public, max-age=300');
            echo json_encode($row);
        } catch (PDOException $e) {
            // Return empty object if table doesn't exist
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing about_content table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode(new stdClass());
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/footer-columns - Get footer columns with links
     */
    public function getFooterColumns() {
        $query = "
            SELECT 
                fc.id as column_id,
                fc.column_title,
                fc.display_order as column_order,
                fl.id as link_id,
                fl.label as link_label,
                fl.url as link_url,
                fl.display_order as link_order
            FROM footer_columns fc
            LEFT JOIN footer_links fl ON fc.id = fl.column_id
            ORDER BY fc.display_order, fl.display_order
        ";

        try {
            $results = $this->db->fetchAll($query);
            
            $columns = [];
            foreach ($results as $row) {
                $colId = $row['column_id'];
                
                if (!isset($columns[$colId])) {
                    $columns[$colId] = [
                        'id' => $colId,
                        'column_title' => $row['column_title'],
                        'display_order' => (int)$row['column_order'],
                        'links' => []
                    ];
                }
                
                if ($row['link_id']) {
                    $columns[$colId]['links'][] = [
                        'id' => (int)$row['link_id'],
                        'label' => $row['link_label'],
                        'url' => $row['link_url'],
                        'display_order' => (int)$row['link_order']
                    ];
                }
            }
            
            header('Cache-Control: public, max-age=300');
            echo json_encode(array_values($columns));
        } catch (PDOException $e) {
            // Return empty array if tables don't exist
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing footer tables', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } else {
                throw $e;
            }
        }
    }

    /**
     * PUT /api/site-settings - Update site settings
     */
    public function updateSiteSettings() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        
        // Get existing settings
        $existing = $this->db->fetchOne('SELECT * FROM site_settings WHERE id = 1') ?: [];

        // Build dynamic UPDATE query
        $fields = [];
        $params = [];

        $allowedFields = [
            'business_name', 'tagline', 'logo_url', 'phone', 'email', 'address',
            'hero_images', 'menu_description', 'instagram', 'facebook', 'google'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $value = $input[$field];
                
                // Special handling for hero_images
                if ($field === 'hero_images') {
                    $value = is_array($value) ? json_encode($value) : null;
                }
                
                $fields[] = "$field = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) {
            ErrorHandler::send('No updatable fields provided', 400);
        }

        $sql = 'UPDATE site_settings SET ' . implode(', ', $fields) . ' WHERE id = 1';
        
        try {
            $this->db->update($sql, $params);
            echo json_encode(['message' => 'Settings updated']);
        } catch (PDOException $e) {
            Logger::error('Failed to update site_settings', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * PUT /api/business-hours/:id - Update business hours
     */
    public function updateBusinessHours($id) {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $openingTime = $input['opening_time'] ?? null;
        $closingTime = $input['closing_time'] ?? null;
        $isClosed = $input['is_closed'] ?? null;

        $this->db->update(
            'UPDATE business_hours SET opening_time = ?, closing_time = ?, is_closed = ? WHERE id = ?',
            [$openingTime, $closingTime, $isClosed, $id]
        );

        echo json_encode(['message' => 'Hours updated']);
    }

    /**
     * PUT /api/about - Update about content
     */
    public function updateAbout() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $header = $input['header'] ?? null;
        $paragraph = $input['paragraph'] ?? null;
        $phone = $input['phone'] ?? null;
        $email = $input['email'] ?? null;
        $address = $input['address'] ?? null;
        $mapEmbedUrl = $input['map_embed_url'] ?? null;

        $this->db->update(
            'UPDATE about_content SET header = ?, paragraph = ?, phone = ?, email = ?, address = ?, map_embed_url = ? WHERE id = 1',
            [$header, $paragraph, $phone, $email, $address, $mapEmbedUrl]
        );

        echo json_encode(['message' => 'About content updated']);
    }
}
