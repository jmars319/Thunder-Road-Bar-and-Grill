<?php
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../routes/audit_log.php';

// Ensure audit_log table exists
$schemaSql = file_get_contents(__DIR__ . '/../database/schema.sql');
$tableSql = trim(preg_replace('/.*CREATE TABLE IF NOT EXISTS audit_log/si', 'CREATE TABLE IF NOT EXISTS audit_log', $schemaSql));
if ($tableSql) {
    $parts = explode(';', $tableSql);
    $create = trim($parts[0]);
    if ($create) {
        $testDb = Database::getInstance();
        $testDb->query($create);
    }
}

$testDb = Database::getInstance();
$testDb->delete('DELETE FROM audit_log', []);
$now = date('Y-m-d H:i:s');
$rows = [
    ['actor_type' => 'admin', 'actor_id' => 1, 'action' => 'login', 'entity_type' => 'session', 'entity_id' => 1, 'meta_json' => json_encode(['foo' => 'bar']), 'created_at' => $now],
    ['actor_type' => 'public', 'actor_id' => null, 'action' => 'reservation_submit', 'entity_type' => 'reservation', 'entity_id' => 2, 'meta_json' => json_encode(['guests' => 4]), 'created_at' => date('Y-m-d H:i:s', strtotime('-1 day'))],
    ['actor_type' => 'system', 'actor_id' => null, 'action' => 'email_sent', 'entity_type' => 'email', 'entity_id' => 3, 'meta_json' => json_encode(['provider' => 'sg']), 'created_at' => date('Y-m-d H:i:s', strtotime('-2 days'))],
];
foreach ($rows as $row) {
    $testDb->insert('INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, meta_json, created_at) VALUES (:actor_type, :actor_id, :action, :entity_type, :entity_id, :meta_json, :created_at)', $row);
}

$routes = new AuditLogRoutes();
$all = $routes->fetchEntries(['per_page' => 2]);
if (($all['pagination']['total'] ?? 0) !== 3) {
    throw new Exception('Total count mismatch');
}
$filtered = $routes->fetchEntries(['action' => 'login']);
if (($filtered['pagination']['total'] ?? 0) !== 1) {
    throw new Exception('Action filter mismatch');
}
$range = $routes->fetchEntries(['start_date' => date('Y-m-d', strtotime('-1 day'))]);
if (($range['pagination']['total'] ?? 0) !== 2) {
    throw new Exception('Date filter mismatch');
}

echo "AuditLogRoutes tests passed\n";
