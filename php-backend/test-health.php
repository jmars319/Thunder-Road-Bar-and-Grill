<?php
// Simple health check - does not load any dependencies
header('Content-Type: application/json');
echo json_encode([
    'status' => 'OK',
    'message' => 'PHP is working',
    'php_version' => PHP_VERSION,
    'time' => date('Y-m-d H:i:s')
]);
