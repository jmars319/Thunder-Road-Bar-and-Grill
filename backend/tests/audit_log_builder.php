<?php

require_once __DIR__ . '/../utils/Database.php';

function seedAuditLog() {
    $db = Database::getInstance();
    $db->delete('DELETE FROM audit_log', []);
    $rows = [
        ['actor_type' => 'admin', 'actor_id' => 1, 'action' => 'admin_login_success', 'entity_type' => 'session', 'entity_id' => 101, 'meta_json' => json_encode(['ip' => '1.2.3.4'])],
        ['actor_type' => 'public', 'action' => 'reservation_submit', 'entity_type' => 'reservation', 'entity_id' => 202, 'meta_json' => json_encode(['guests' => 4])],
        ['actor_type' => 'system', 'action' => 'email_sent', 'entity_type' => 'email', 'entity_id' => null, 'meta_json' => json_encode(['provider_id' => 'abc123'])]
    ];
    foreach ($rows as $row) {
        $db->insert('INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, meta_json) VALUES (:actor_type, :actor_id, :action, :entity_type, :entity_id, :meta_json)', $row);
    }
}

