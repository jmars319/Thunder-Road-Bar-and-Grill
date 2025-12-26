<?php

require_once __DIR__ . '/../utils/AuditLog.php';
require_once __DIR__ . '/../utils/Config.php';

putenv('AUDIT_LOG_RETENTION_DAYS=1');

$db = Database::getInstance();
$db->delete('DELETE FROM audit_log');

// seed: 2 days old + recent
$db->insert("INSERT INTO audit_log (actor_type, action, created_at) VALUES ('system', 'old', NOW() - INTERVAL 2 DAY)");
$db->insert("INSERT INTO audit_log (actor_type, action, created_at) VALUES ('system', 'recent', NOW())");

for ($i = 0; $i < 200; $i++) {
    AuditLog::record('probe');
}

$rows = $db->fetchAll('SELECT action FROM audit_log');
echo json_encode($rows) . PHP_EOL;
