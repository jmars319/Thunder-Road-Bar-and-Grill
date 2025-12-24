<?php
/**
 * Router script for PHP built-in development server
 * This simulates Apache's mod_rewrite for local testing
 * 
 * Usage: php -S localhost:5001 router.php
 */

// Get the requested URI
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Remove /api prefix if present for local testing
$uri = preg_replace('#^/api#', '', $uri);

// Serve static files directly (uploads, etc.)
if ($uri !== '/') {
    // Check in current directory first
    if (file_exists(__DIR__ . $uri)) {
        return false; // Serve the file directly
    }
    
    // Check if it's an upload file request (with or without /uploads/ prefix)
    $uploadPath = preg_match('#^/uploads/#', $uri) ? __DIR__ . $uri : __DIR__ . '/uploads' . $uri;
    if (file_exists($uploadPath)) {
        // Serve the file with appropriate MIME type
        $ext = strtolower(pathinfo($uploadPath, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf'
        ];
        
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        
        header('Cache-Control: public, max-age=31536000'); // 1 year cache
        readfile($uploadPath);
        exit;
    }
}

// All other requests go through index.php
$_SERVER['REQUEST_URI'] = '/api' . $uri;
require __DIR__ . '/index.php';
