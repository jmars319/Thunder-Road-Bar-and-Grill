<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Step 1: Testing Email class...<br>";

try {
    require_once __DIR__ . '/utils/Config.php';
    echo "Step 2: Config loaded<br>";
    
    require_once __DIR__ . '/utils/Logger.php';
    echo "Step 3: Logger loaded<br>";
    
    require_once __DIR__ . '/utils/Email.php';
    echo "Step 4: Email class loaded<br>";
    
    echo "Step 5: Attempting to send email...<br>";
    
    $result = Email::send(
        'thundergrillmidway@gmail.com',
        'Test from Thunder Road',
        '<p>Test email</p>'
    );
    
    if ($result) {
        echo "SUCCESS! Email sent!<br>";
    } else {
        echo "FAILED! Check logs/app.log<br>";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "<br>";
    echo "File: " . $e->getFile() . "<br>";
    echo "Line: " . $e->getLine() . "<br>";
}