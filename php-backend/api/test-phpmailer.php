<?php
$path = __DIR__ . '/vendor/phpmailer/phpmailer/src/PHPMailer.php';
if (file_exists($path)) {
    echo "PHPMailer found!";
} else {
    echo "PHPMailer NOT found at: " . $path;
}