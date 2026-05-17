<?php

require_once __DIR__ . '/../utils/AuditLog.php';

$ref = new ReflectionClass('AuditLog');
$method = $ref->getMethod('sanitizeMeta');

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
if (($clean['token'] ?? null) !== '[REDACTED]') {
    throw new Exception('Token was not redacted');
}
if (($clean['nested']['password'] ?? null) !== '[REDACTED]') {
    throw new Exception('Nested password was not redacted');
}
if (($clean['nested']['note'] ?? null) !== 'safe') {
    throw new Exception('Safe nested note was altered');
}
if (($clean['cookie'] ?? null) !== '[REDACTED]') {
    throw new Exception('Cookie was not redacted');
}
if (($clean['list']['secret'] ?? null) !== '[REDACTED]') {
    throw new Exception('List secret was not redacted');
}

echo "AuditLog sanitizer tests passed\n";
