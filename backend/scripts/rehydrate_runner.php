<?php

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/MediaPipeline.php';

$token = Config::get('REHYDRATE_TOKEN');

if (empty($token)) {
    http_response_code(503);
    echo json_encode([
        'error' => 'rehydrate-disabled',
        'status' => 503,
        'requestId' => null,
        'timestampUTC' => gmdate('c'),
        'message' => 'Rehydrate token not configured.'
    ]);
    exit;
}

$requestToken = isset($_GET['token']) ? $_GET['token'] : null;

if (!hash_equals($token, (string)$requestToken)) {
    http_response_code(403);
    echo json_encode([
        'error' => 'forbidden',
        'status' => 403,
        'requestId' => null,
        'timestampUTC' => gmdate('c'),
        'message' => 'Invalid token.'
    ]);
    exit;
}

ob_start();
include __DIR__ . '/rehydrate_media_variants.php';
$output = trim(ob_get_clean());

echo json_encode([
    'success' => true,
    'status' => 200,
    'requestId' => null,
    'timestampUTC' => gmdate('c'),
    'message' => 'Rehydrate job executed.',
    'log' => $output
]);
