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
        // Serve from cache if available
        if (Config::getBool('CACHE_MENU', true) && 
            self::$cache['payload'] && 
            time() < self::$cache['expires']) {
            header('X-Cache: HIT');
            header('Cache-Control: public, max-age=300, s-maxage=600');
            echo json_encode(self::$cache['payload']);
            return;
        }

        $query = "
            SELECT 
                c.id as category_id,
                c.name as category_name,
                c.description as category_description,
                c.image_url as category_image,
                c.gallery_image_id as category_gallery_image_id,
                ml.file_url as category_gallery_image,
                c.display_order as category_order,
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

        // Group items by category
        $categories = [];
        foreach ($results as $row) {
            $catId = $row['category_id'];
            
            if (!isset($categories[$catId])) {
                $categories[$catId] = [
                    'id' => $catId,
                    'name' => $row['category_name'],
                    'description' => $row['category_description'],
                    'image_url' => $row['category_image'],
                    'gallery_image_url' => $row['category_gallery_image'],
                    'display_order' => (int)$row['category_order'],
                    'items' => []
                ];
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

        // Store in cache
        if (Config::getBool('CACHE_MENU', true)) {
            self::$cache = [
                'payload' => $output,
                'expires' => time() + self::$cacheTTL
            ];
        }

        header('X-Cache: MISS');
        header('Cache-Control: public, max-age=300, s-maxage=600');
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
                    'description' => $row['category_description'],
                    'image_url' => $row['category_image'],
                    'gallery_image_url' => $row['category_gallery_image'],
                    'display_order' => (int)$row['category_order'],
                    'is_active' => (bool)$row['category_active'],
                    'items' => []
                ];
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
            'SELECT id, name, description, image_url, gallery_image_id, display_order, is_active 
             FROM menu_categories ORDER BY display_order'
        );
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
        echo json_encode($results);
    }

    /**
     * POST /api/menu/categories - Create category
     */
    public function createCategory() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $imageUrl = $input['image_url'] ?? null;
        $galleryImageId = $input['gallery_image_id'] ?? null;
        $displayOrder = $input['display_order'] ?? 0;
        $isActive = $input['is_active'] ?? 1;

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');
        $validator->integer($displayOrder, 'display_order');
        $validator->min($displayOrder, 0, 'display_order');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        $id = $this->db->insert(
            'INSERT INTO menu_categories (name, description, image_url, gallery_image_id, display_order, is_active) 
             VALUES (?, ?, ?, ?, ?, ?)',
            [$name, $description, $imageUrl, $galleryImageId, $displayOrder, $isActive]
        );

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
        $description = $input['description'] ?? '';
        $imageUrl = $input['image_url'] ?? null;
        $galleryImageId = $input['gallery_image_id'] ?? null;
        $displayOrder = $input['display_order'] ?? 0;
        $isActive = $input['is_active'] ?? 1;

        // Validate
        $validator = new Validator();
        $validator->required($name, 'name');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        $this->db->update(
            'UPDATE menu_categories 
             SET name = ?, description = ?, image_url = ?, gallery_image_id = ?, display_order = ?, is_active = ? 
             WHERE id = ?',
            [$name, $description, $imageUrl, $galleryImageId, $displayOrder, $isActive, $id]
        );

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
        $description = $input['description'] ?? '';
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
        $description = $input['description'] ?? '';
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
