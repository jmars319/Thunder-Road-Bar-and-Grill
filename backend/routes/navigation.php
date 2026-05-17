<?php

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class NavigationRoutes
{
    private $db;

    public function __construct()
    {
        $this->db = Database::lazy();
    }

    public function list()
    {
        AdminAuthMiddleware::require();
        $results = $this->db->fetchAll('SELECT * FROM navigation_links ORDER BY display_order, id');
        echo json_encode($results);
    }

    public function create()
    {
        AdminAuthMiddleware::require();
        $input = json_decode(file_get_contents('php://input'), true);
        $label = trim($input['label'] ?? '');
        $url = trim($input['url'] ?? '');
        $displayOrder = isset($input['display_order']) ? (int)$input['display_order'] : 0;
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        $validator = new Validator();
        $validator->required($label, 'label');
        $validator->required($url, 'url');

        if ($validator->fails()) {
            ErrorHandler::validation($validator->getErrors());
        }

        $id = $this->db->insert(
            'INSERT INTO navigation_links (label, url, display_order, is_active) VALUES (?, ?, ?, ?)',
            [$label, $url, $displayOrder, $isActive]
        );

        echo json_encode(['id' => $id, 'message' => 'Navigation link created']);
    }

    public function update($id)
    {
        AdminAuthMiddleware::require();
        $input = json_decode(file_get_contents('php://input'), true);

        $fields = [];
        $params = [];

        $map = [
            'label' => 'label',
            'url' => 'url',
            'display_order' => 'display_order',
            'is_active' => 'is_active'
        ];

        foreach ($map as $payloadKey => $column) {
            if (array_key_exists($payloadKey, $input)) {
                $value = $input[$payloadKey];
                if ($payloadKey === 'label' || $payloadKey === 'url') {
                    $value = is_string($value) ? trim($value) : '';
                } elseif ($payloadKey === 'display_order') {
                    $value = (int)$value;
                } elseif ($payloadKey === 'is_active') {
                    $value = $value ? 1 : 0;
                }
                $fields[] = "$column = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) {
            ErrorHandler::validation(['fields' => 'No updatable fields supplied']);
        }

        $params[] = $id;
        $this->db->update('UPDATE navigation_links SET ' . implode(', ', $fields) . ' WHERE id = ?', $params);
        echo json_encode(['message' => 'Navigation link updated']);
    }

    public function delete($id)
    {
        AdminAuthMiddleware::require();
        $this->db->delete('DELETE FROM navigation_links WHERE id = ?', [$id]);
        echo json_encode(['message' => 'Navigation link deleted']);
    }
}
