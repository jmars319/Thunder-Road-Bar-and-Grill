<?php
/**
 * Menu Routes
 * 
 * Purpose:
 * - Provide public menu data (categories and their items) and admin CRUD
 *   endpoints for categories and items used by the admin UI.
 * 
 * Public endpoints:
 * - GET /api/menu -> returns categories with nested items (for public site)
 * 
 * Admin endpoints (CRUD for categories and items):
 * - GET /api/menu/admin
 * - GET /api/menu/categories
 * - GET /api/menu/categories/:categoryId/items
 * - POST /api/menu/categories
 * - PUT /api/menu/categories/:id
 * - DELETE /api/menu/categories/:id
 * - POST /api/menu/items
 * - PUT /api/menu/items/:id
 * - DELETE /api/menu/items/:id
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/MediaResponseBuilder.php';
require_once __DIR__ . '/../utils/HtmlSanitizer.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class MenuRoutes {
    private $db;
    private static $cache = ['payload' => null, 'expires' => 0];
    private static $cacheTTL;

    public function __construct() {
        $this->db = Database::getInstance();
        self::$cacheTTL = Config::getInt('CACHE_MENU_TTL', 300); // 5 minutes default
    }

    private function isDebugRequest() {
        if (Config::getBool('DEBUG_MENU_COLUMNS', false)) {
            return true;
        }
        if (isset($_GET['debug'])) {
            $value = strtolower((string) $_GET['debug']);
            return !in_array($value, ['0', 'false', 'off'], true);
        }
        return false;
    }

    private function debugLog($label, array $data = []) {
        if (!$this->isDebugRequest()) {
            return;
        }
        Logger::info('[menu-debug] ' . $label, $data);
    }

    private function simplifyMedia($media) {
        if (!$media) {
            return null;
        }
        if (!empty($media['missing_file']) || empty($media['fallback_original'])) {
            return null;
        }
        return [
            'id' => $media['id'] ?? null,
            'file_url' => $media['file_url'] ?? null,
            'fallback_original' => $media['fallback_original'] ?? ($media['file_url'] ?? null),
            'responsive_variants' => $media['responsive_variants'] ?? [],
            'image_variants' => $media['image_variants'] ?? [],
            'optimized_srcset' => $media['optimized_srcset'] ?? '',
            'webp_srcset' => $media['webp_srcset'] ?? '',
            'alt_text' => $media['alt_text'] ?? null,
            'title' => $media['title'] ?? null
        ];
    }

    /**
     * Invalidate menu cache
     */
    private static function invalidateCache() {
        self::$cache = ['payload' => null, 'expires' => 0];
    }

    /**
     * GET /api/menu - Public menu with active categories and available items
     */
    public function getMenu() {
        // Always serve fresh data; public menu needs immediate updates
        // Menu payload is public content. Allow a short-lived cache to reduce
        // backend load without risking stale admin edits.
        header('Cache-Control: public, max-age=60, stale-while-revalidate=30');
        header('Pragma: no-cache');
        header('Expires: 0');

        $query = "
            SELECT 
                c.id as category_id,
                c.name as category_name,
                c.description as category_description,
                c.image_url as category_image,
                c.gallery_image_id as category_gallery_image_id,
                ml.file_url as category_gallery_image,
                c.display_order as category_order,
                c.display_columns as category_display_columns,
                c.hide_descriptions as category_hide_descriptions,
                i.id as item_id,
                i.name as item_name,
                i.description as item_description,
                i.price as item_price,
                i.primary_quantity as item_primary_quantity,
                i.secondary_quantity as item_secondary_quantity,
                i.secondary_price as item_secondary_price,
                i.image_url as item_image,
                i.display_order as item_order
            FROM menu_categories c
            LEFT JOIN menu_items i ON c.id = i.category_id
            LEFT JOIN media_library ml ON c.gallery_image_id = ml.id
            WHERE c.is_active = 1 AND (COALESCE(i.is_available, 1) = 1 OR i.id IS NULL)
            ORDER BY c.display_order, i.display_order
        ";

        $results = $this->db->fetchAll($query);
        $galleryIds = [];
        foreach ($results as $row) {
            if (!empty($row['category_gallery_image_id'])) {
                $galleryIds[(int)$row['category_gallery_image_id']] = true;
            }
        }
        $mediaMap = $galleryIds
            ? MediaResponseBuilder::hydrateByIds($this->db, array_keys($galleryIds))
            : [];
        $galleryIds = [];
        foreach ($results as $row) {
            if (!empty($row['category_gallery_image_id'])) {
                $galleryIds[(int) $row['category_gallery_image_id']] = true;
            }
        }
        $mediaMap = $galleryIds
            ? MediaResponseBuilder::hydrateByIds($this->db, array_keys($galleryIds))
            : [];

        // Group items by category
        $categories = [];
        foreach ($results as $row) {
            $catId = $row['category_id'];
            
            if (!isset($categories[$catId])) {
                $categories[$catId] = [
                    'id' => $catId,
                    'name' => $row['category_name'],
                    'description' => HtmlSanitizer::sanitizeRichText($row['category_description'] ?? ''),
                    'image_url' => $row['category_image'],
                    'display_order' => (int) $row['category_order'],
                    'display_columns' => isset($row['category_display_columns']) ? (int) $row['category_display_columns'] : 1,
                    'hide_descriptions' => isset($row['category_hide_descriptions']) ? (bool) $row['category_hide_descriptions'] : false,
                    'items' => []
                ];
                $mediaId = $row['category_gallery_image_id'] ?? null;
                if ($mediaId && isset($mediaMap[$mediaId])) {
                    $media = $this->simplifyMedia($mediaMap[$mediaId]);
                    if ($media) {
                        $categories[$catId]['gallery_image_url'] = $media['fallback_original'];
                        $categories[$catId]['gallery_image_responsive'] = $media;
                    }
                }
            }

            if ($row['item_id']) {
                $categories[$catId]['items'][] = [
                    'id' => (int)$row['item_id'],
                    'name' => $row['item_name'],
                    'description' => $row['item_description'],
                    'price' => $row['item_price'] !== null ? (float)$row['item_price'] : null,
                    'primary_quantity' => $row['item_primary_quantity'],
                    'secondary_quantity' => $row['item_secondary_quantity'],
                    'secondary_price' => $row['item_secondary_price'] !== null ? (float)$row['item_secondary_price'] : null,
                    'image_url' => $row['item_image'],
                    'display_order' => (int)$row['item_order']
                ];
            }
        }

        $output = array_values($categories);
        $this->debugLog('api.menu.response.sample', [
            'count' => count($output),
            'first_category' => $output[0] ?? null
        ]);
        echo json_encode($output);
    }

    /**
     * GET /api/menu/admin - Admin view with all categories and items
     */
    public function getAdminMenu() {
        AdminAuthMiddleware::require();

        $query = "
            SELECT 
                c.id as category_id,
                c.name as category_name,
                c.description as category_description,
                c.image_url as category_image,
                c.gallery_image_id as category_gallery_image_id,
                ml.file_url as category_gallery_image,
                c.display_order as category_order,
                c.display_columns as category_display_columns,
                c.hide_descriptions as category_hide_descriptions,
                c.is_active as category_active,
                i.id as item_id,
                i.name as item_name,
                i.description as item_description,
                i.price as item_price,
                i.primary_quantity as item_primary_quantity,
                i.secondary_quantity as item_secondary_quantity,
                i.secondary_price as item_secondary_price,
                i.image_url as item_image,
                i.display_order as item_order,
                i.is_available as item_available
            FROM menu_categories c
            LEFT JOIN menu_items i ON c.id = i.category_id
            LEFT JOIN media_library ml ON c.gallery_image_id = ml.id
            ORDER BY c.display_order, i.display_order
        ";

        $results = $this->db->fetchAll($query);

        $categories = [];
        foreach ($results as $row) {
            $catId = $row['category_id'];
            
            if (!isset($categories[$catId])) {
                $categories[$catId] = [
                    'id' => $catId,
                    'name' => $row['category_name'],
                    'description' => HtmlSanitizer::sanitizeRichText($row['category_description'] ?? ''),
                    'image_url' => $row['category_image'],
                    'gallery_image_id' => $row['category_gallery_image_id'] !== null ? (int)$row['category_gallery_image_id'] : null,
                    'gallery_image_url' => $row['category_gallery_image'],
                    'display_order' => (int)$row['category_order'],
                    'display_columns' => isset($row['category_display_columns']) ? (int)$row['category_display_columns'] : 1,
                    'hide_descriptions' => isset($row['category_hide_descriptions']) ? (bool)$row['category_hide_descriptions'] : false,
                    'is_active' => (bool)$row['category_active'],
                    'items' => []
                ];
                $mediaId = $row['category_gallery_image_id'] ?? null;
                if ($mediaId && isset($mediaMap[$mediaId])) {
                    $media = $this->simplifyMedia($mediaMap[$mediaId]);
                    if ($media) {
                        $categories[$catId]['gallery_image_responsive'] = $media;
                        $categories[$catId]['gallery_image_variants'] = $media['responsive_variants'];
                    }
                }
            }

            if ($row['item_id']) {
                    $categories[$catId]['items'][] = [
                        'id' => (int)$row['item_id'],
                        'name' => $row['item_name'],
                        'description' => HtmlSanitizer::sanitizeRichText($row['item_description'] ?? ''),
                    'price' => $row['item_price'] !== null ? (float)$row['item_price'] : null,
                    'primary_quantity' => $row['item_primary_quantity'],
                    'secondary_quantity' => $row['item_secondary_quantity'],
                    'secondary_price' => $row['item_secondary_price'] !== null ? (float)$row['item_secondary_price'] : null,
                    'image_url' => $row['item_image'],
                    'display_order' => (int)$row['item_order'],
                    'is_available' => (bool)$row['item_available']
                ];
            }
        }

        echo json_encode(array_values($categories));
    }

    /**
     * GET /api/menu/categories - Get all categories
     */
    public function getCategories() {
        $results = $this->db->fetchAll(
            'SELECT id, name, description, image_url, gallery_image_id, display_order, display_columns, hide_descriptions, is_active 
             FROM menu_categories ORDER BY display_order'
        );
        foreach ($results as &$row) {
            $row['description'] = HtmlSanitizer::sanitizeRichText($row['description'] ?? '');
        }
        echo json_encode($results);
    }

    /**
     * GET /api/menu/categories/:id/items - Get items by category
     */
    public function getCategoryItems($categoryId) {
        $results = $this->db->fetchAll(
            'SELECT * FROM menu_items WHERE category_id = ? ORDER BY display_order',
            [$categoryId]
        );
        foreach ($results as &$item) {
            $item['description'] = HtmlSanitizer::sanitizeRichText($item['description'] ?? '');
        }
        echo json_encode($results);
    }

    /**
     * POST /api/menu/categories - Create category
     */
    public function createCategory() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $description = HtmlSanitizer::sanitizeRichText($input['description'] ?? '');
        $imageUrl = $input['image_url'] ?? null;
        $galleryImageId = $input['gallery_image_id'] ?? null;
        $displayOrder = $input['display_order'] ?? 0;
        $displayColumns = $input['display_columns'] ?? 1;
        $hideDescriptions = $input['hide_descriptions'] ?? 0;
        $isActive = $input['is_active'] ?? 1;

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');
        $validator->integer($displayOrder, 'display_order');
        $validator->min($displayOrder, 0, 'display_order');
        $validator->integer($displayColumns, 'display_columns');
        $validator->min($displayColumns, 1, 'display_columns');
        $validator->max($displayColumns, 3, 'display_columns');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        $id = $this->db->insert(
            'INSERT INTO menu_categories (name, description, image_url, gallery_image_id, display_order, display_columns, hide_descriptions, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$name, $description, $imageUrl, $galleryImageId, $displayOrder, $displayColumns, $hideDescriptions, $isActive]
        );

        if ($this->isDebugRequest()) {
            $this->debugLog('category.create.input', [
                'name' => $name,
                'gallery_image_id' => $galleryImageId,
                'description' => $description
            ]);
            $saved = $this->db->fetchOne('SELECT description, gallery_image_id FROM menu_categories WHERE id = ?', [$id]);
            $this->debugLog('category.create.persisted', [
                'id' => $id,
                'gallery_image_id' => $saved['gallery_image_id'] ?? null,
                'description' => $saved['description'] ?? null
            ]);
        }

        self::invalidateCache();
        echo json_encode(['id' => $id, 'message' => 'Category created']);
    }

    /**
     * PUT /api/menu/categories/:id - Update category
     */
    public function updateCategory($id) {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $description = HtmlSanitizer::sanitizeRichText($input['description'] ?? '');
        $displayOrder = $input['display_order'] ?? 0;
        $displayColumns = $input['display_columns'] ?? 1;
        $hideDescriptions = $input['hide_descriptions'] ?? 0;
        $isActive = $input['is_active'] ?? 1;
        
        // Fetch existing category to preserve image fields if not provided
        $existing = $this->db->fetchOne('SELECT image_url, gallery_image_id FROM menu_categories WHERE id = ?', [$id]);
        $imageUrl = array_key_exists('image_url', $input) ? $input['image_url'] : ($existing['image_url'] ?? null);
        $galleryImageId = array_key_exists('gallery_image_id', $input) ? $input['gallery_image_id'] : ($existing['gallery_image_id'] ?? null);

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');
        $validator->integer($displayColumns, 'display_columns');
        $validator->min($displayColumns, 1, 'display_columns');
        $validator->max($displayColumns, 3, 'display_columns');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        if ($this->isDebugRequest()) {
            $this->debugLog('category.update.input', [
                'id' => $id,
                'gallery_image_id' => $galleryImageId,
                'description' => $description
            ]);
        }

        $this->db->update(
            'UPDATE menu_categories 
             SET name = ?, description = ?, image_url = ?, gallery_image_id = ?, display_order = ?, display_columns = ?, hide_descriptions = ?, is_active = ? 
             WHERE id = ?',
            [$name, $description, $imageUrl, $galleryImageId, $displayOrder, $displayColumns, $hideDescriptions, $isActive, $id]
        );

        if ($this->isDebugRequest()) {
            $saved = $this->db->fetchOne('SELECT description, gallery_image_id FROM menu_categories WHERE id = ?', [$id]);
            $this->debugLog('category.update.persisted', [
                'id' => $id,
                'gallery_image_id' => $saved['gallery_image_id'] ?? null,
                'description' => $saved['description'] ?? null
            ]);
        }

        self::invalidateCache();
        echo json_encode(['message' => 'Category updated']);
    }

    /**
     * DELETE /api/menu/categories/:id - Delete category
     */
    public function deleteCategory($id) {
        AdminAuthMiddleware::require();

        $this->db->delete('DELETE FROM menu_categories WHERE id = ?', [$id]);

        self::invalidateCache();
        echo json_encode(['message' => 'Category deleted']);
    }

    /**
     * PUT /api/menu/categories/reorder - Batch update category display orders
     */
    public function reorderCategories() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $categories = $input['categories'] ?? [];

        if (!is_array($categories) || empty($categories)) {
            ErrorHandler::validation(['categories' => 'Categories array is required']);
        }

        // Validate structure
        foreach ($categories as $cat) {
            if (!isset($cat['id']) || !isset($cat['display_order'])) {
                ErrorHandler::validation(['categories' => 'Each category must have id and display_order']);
            }
        }

        // Update each category's display_order
        $this->db->beginTransaction();
        try {
            foreach ($categories as $cat) {
                $this->db->update(
                    'UPDATE menu_categories SET display_order = ? WHERE id = ?',
                    [$cat['display_order'], $cat['id']]
                );
            }
            $this->db->commit();
            self::invalidateCache();
            echo json_encode(['message' => 'Category order updated']);
        } catch (Exception $e) {
            $this->db->rollback();
            ErrorHandler::server('Failed to update category order: ' . $e->getMessage());
        }
    }

    /**
     * POST /api/menu/items - Create menu item
     */
    public function createItem() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $categoryId = $input['category_id'] ?? 0;
        $name = $input['name'] ?? '';
        $description = HtmlSanitizer::sanitizeRichText($input['description'] ?? '');
        $price = $input['price'] ?? null;
        $imageUrl = $input['image_url'] ?? null;
        $displayOrder = $input['display_order'] ?? 0;
        $primaryQuantity = $input['primary_quantity'] ?? null;
        $secondaryQuantity = $input['secondary_quantity'] ?? null;
        $secondaryPrice = $input['secondary_price'] ?? null;
        $isAvailable = $input['is_available'] ?? 1;

        // Validate
        $validator = new Validator();
        $validator->required($categoryId, 'category_id');
        $validator->integer($categoryId, 'category_id');
        $validator->required($name, 'name');
        if ($price !== null) $validator->min($price, 0, 'price');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        $id = $this->db->insert(
            'INSERT INTO menu_items 
             (category_id, name, description, price, image_url, display_order, 
              primary_quantity, secondary_quantity, secondary_price, is_available) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$categoryId, $name, $description, $price, $imageUrl, $displayOrder, 
             $primaryQuantity, $secondaryQuantity, $secondaryPrice, $isAvailable]
        );

        self::invalidateCache();
        echo json_encode(['id' => $id, 'message' => 'Item created']);
    }

    /**
     * PUT /api/menu/items/:id - Update menu item
     */
    public function updateItem($id) {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $description = HtmlSanitizer::sanitizeRichText($input['description'] ?? '');
        $price = $input['price'] ?? null;
        $imageUrl = $input['image_url'] ?? null;
        $displayOrder = $input['display_order'] ?? 0;
        $primaryQuantity = $input['primary_quantity'] ?? null;
        $secondaryQuantity = $input['secondary_quantity'] ?? null;
        $secondaryPrice = $input['secondary_price'] ?? null;
        $isAvailable = $input['is_available'] ?? 1;

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        $this->db->update(
            'UPDATE menu_items 
             SET name = ?, description = ?, price = ?, image_url = ?, display_order = ?, 
                 is_available = ?, primary_quantity = ?, secondary_quantity = ?, secondary_price = ? 
             WHERE id = ?',
            [$name, $description, $price, $imageUrl, $displayOrder, $isAvailable, 
             $primaryQuantity, $secondaryQuantity, $secondaryPrice, $id]
        );

        self::invalidateCache();
        echo json_encode(['message' => 'Item updated']);
    }

    /**
     * DELETE /api/menu/items/:id - Delete menu item
     */
    public function deleteItem($id) {
        AdminAuthMiddleware::require();

        $this->db->delete('DELETE FROM menu_items WHERE id = ?', [$id]);

        self::invalidateCache();
        echo json_encode(['message' => 'Item deleted']);
    }
}
