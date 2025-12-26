<?php

require_once __DIR__ . '/../routes/audit_log.php';

class AuditLogRoutesTest {
    public static function seed(Database $db) {
        $db->delete('DELETE FROM audit_log', []);
        $rows = [
            ['actor_type' => 'admin', 'actor_id' => 1, 'action' => 'login', 'entity_type' => 'session', 'entity_id' => 101, 'meta_json' => json_encode(['ip' => '1.1.1.1'])],
            ['actor_type' => 'public', 'actor_id' => null, 'action' => 'reservation_submit', 'entity_type' => 'reservation', 'entity_id' => 202, 'meta_json' => json_encode(['guests' => 4])],
            ['actor_type' => 'system', 'actor_id' => null, 'action' => 'email_sent', 'entity_type' => 'email', 'entity_id' => null, 'meta_json' => json_encode(['provider_id' => 'xyz'])],
        ];
        foreach ($rows as $row) {
            $db->insert('INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, meta_json) VALUES (:actor_type, :actor_id, :action, :entity_type, :entity_id, :meta_json)', $row);
        }
    }

    public static function run() {
        $routes = new AuditLogRoutes();
        $result = $routes->fetchEntries(['action' => 'login']);
        if (($result['pagination']['total'] ?? 0) !== 1) {
            throw new Exception('AuditLogRoutes filtering by action failed');
        }
        $result = $routes->fetchEntries(['actor_type' => 'system']);
        if (($result['pagination']['total'] ?? 0) !== 1) {
            throw new Exception('AuditLogRoutes filtering by actor_type failed');
        }
        $result = $routes->fetchEntries(['per_page' => 1]);
        if (($result['pagination']['total_pages'] ?? 0) < 3) {
            throw new Exception('AuditLogRoutes pagination failed');
        }
    }
}

AuditLogRoutesTest::seed(Database::getInstance());
AuditLogRoutesTest::run();
echo "AuditLogRoutes tests passed\n";
