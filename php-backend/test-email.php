<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/utils/Config.php';
require_once __DIR__ . '/utils/Email.php';
require_once __DIR__ . '/utils/Logger.php';

echo "<h1>Email Test</h1>";

echo "<p>SMTP User: " . Config::get('SMTP_USER') . "</p>";
echo "<p>SMTP Host: " . Config::get('SMTP_HOST') . "</p>";
echo "<p>SMTP Port: " . Config::get('SMTP_PORT') . "</p>";
echo "<p>Password Length: " . strlen(Config::get('SMTP_PASSWORD')) . " chars</p>";

echo "<hr><p>Attempting to send test email...</p>";

$result = Email::send(
    'thundergrillmidway@gmail.com',
    'Test Email from Thunder Road',
    '<h1>Test Email</h1><p>If you receive this, email is working!</p>'
);

if ($result) {
    echo "<p style='color:green;'><strong>✓ Email sent successfully!</strong></p>";
} else {
    echo "<p style='color:red;'><strong>✗ Email failed - check logs/app.log for error</strong></p>";
}

echo "<hr><p>Check /api/logs/app.log for details</p>";