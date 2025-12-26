<?php

require_once __DIR__ . '/../utils/AuditLog.php';

$ref = new ReflectionClass('AuditLog');
$method = $ref->getMethod('sanitizeMeta');
$method->setAccessible(true);

$meta = [
    'token' => 'abc.def.ghi',
    'nested' => [
        'password' => 'hunter2',
        'note' => 'safe',
    ],
    'cookie' => 'session=123',
    'list' => ['secret' => 'value'],
];

$clean = $method->invoke(null, $meta);
echo json_encode($clean, JSON_PRETTY_PRINT) . PHP_EOL;
