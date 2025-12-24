<?php
/**
 * File Validator
 * 
 * Advanced file validation using magic byte verification.
 * Provides additional security beyond MIME type and extension checking.
 */

class FileValidator {
    /**
     * File type magic byte signatures
     * First few bytes that identify file types
     */
    private static $signatures = [
        'image/jpeg' => [
            ['offset' => 0, 'bytes' => "\xFF\xD8\xFF\xE0"],
            ['offset' => 0, 'bytes' => "\xFF\xD8\xFF\xE1"],
            ['offset' => 0, 'bytes' => "\xFF\xD8\xFF\xE8"]
        ],
        'image/png' => [
            ['offset' => 0, 'bytes' => "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"]
        ],
        'image/gif' => [
            ['offset' => 0, 'bytes' => "GIF87a"],
            ['offset' => 0, 'bytes' => "GIF89a"]
        ],
        'image/webp' => [
            ['offset' => 8, 'bytes' => "WEBP"]
        ],
        'video/mp4' => [
            ['offset' => 4, 'bytes' => "ftyp"]
        ],
        'application/pdf' => [
            ['offset' => 0, 'bytes' => "%PDF"]
        ]
    ];

    /**
     * Verify file type using magic bytes
     * 
     * @param string $filePath Path to file
     * @param string $expectedMimeType Expected MIME type
     * @return bool True if magic bytes match expected type
     */
    public static function verifyMagicBytes($filePath, $expectedMimeType) {
        if (!file_exists($filePath)) {
            return false;
        }

        // Check if we have signature for this type
        if (!isset(self::$signatures[$expectedMimeType])) {
            // No signature defined, fallback to basic validation
            return true;
        }

        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            return false;
        }

        // Read first 32 bytes (enough for most signatures)
        $bytes = fread($handle, 32);
        fclose($handle);

        // Check each possible signature for this MIME type
        foreach (self::$signatures[$expectedMimeType] as $signature) {
            $offset = $signature['offset'];
            $expected = $signature['bytes'];
            $length = strlen($expected);

            // Extract bytes at the specified offset
            $actual = substr($bytes, $offset, $length);

            // If bytes match, file type is verified
            if ($actual === $expected) {
                return true;
            }
        }

        return false;
    }

    /**
     * Comprehensive file validation
     * 
     * @param string $filePath Path to uploaded file
     * @param string $mimeType MIME type from upload
     * @param int $fileSize File size in bytes
     * @param array $allowedTypes Allowed MIME types
     * @param int $maxSize Maximum file size
     * @return array ['valid' => bool, 'error' => string|null]
     */
    public static function validate($filePath, $mimeType, $fileSize, $allowedTypes, $maxSize) {
        // Check file exists
        if (!file_exists($filePath)) {
            return ['valid' => false, 'error' => 'File not found'];
        }

        // Check MIME type is allowed
        if (!in_array($mimeType, $allowedTypes)) {
            return ['valid' => false, 'error' => 'File type not allowed'];
        }

        // Check file size
        if ($fileSize > $maxSize) {
            $maxSizeMB = round($maxSize / 1048576, 2);
            return ['valid' => false, 'error' => "File too large (max {$maxSizeMB}MB)"];
        }

        // Verify magic bytes match claimed MIME type
        if (!self::verifyMagicBytes($filePath, $mimeType)) {
            return ['valid' => false, 'error' => 'File type verification failed'];
        }

        // Additional checks for images
        if (strpos($mimeType, 'image/') === 0) {
            $imageInfo = @getimagesize($filePath);
            if ($imageInfo === false) {
                return ['valid' => false, 'error' => 'Invalid image file'];
            }

            // Check if MIME type matches getimagesize result
            if ($imageInfo['mime'] !== $mimeType) {
                return ['valid' => false, 'error' => 'Image type mismatch'];
            }

            // Check reasonable dimensions (prevent decompression bombs)
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            if ($width > 10000 || $height > 10000) {
                return ['valid' => false, 'error' => 'Image dimensions too large'];
            }
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Sanitize SVG file
     * Removes potentially dangerous elements and attributes
     * 
     * @param string $svgContent SVG file content
     * @return string Sanitized SVG content
     */
    public static function sanitizeSvg($svgContent) {
        // Remove XML declarations and DOCTYPE
        $svgContent = preg_replace('/<\?xml.*?\?>/i', '', $svgContent);
        $svgContent = preg_replace('/<!DOCTYPE.*?>/i', '', $svgContent);

        // Remove script tags
        $svgContent = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $svgContent);

        // Remove event handlers
        $svgContent = preg_replace('/\s*on\w+\s*=\s*["\'][^"\']*["\']/i', '', $svgContent);

        // Remove javascript: protocol
        $svgContent = preg_replace('/javascript:/i', '', $svgContent);

        // Remove data: protocol (can be used for attacks)
        $svgContent = preg_replace('/data:text\/html/i', '', $svgContent);

        // Remove foreign objects (can embed HTML)
        $svgContent = preg_replace('/<foreignObject\b[^>]*>.*?<\/foreignObject>/is', '', $svgContent);

        return $svgContent;
    }

    /**
     * Generate safe filename from original name
     * 
     * @param string $filename Original filename
     * @return string Safe filename
     */
    public static function sanitizeFilename($filename) {
        // Get extension
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        // Remove extension from name
        $name = pathinfo($filename, PATHINFO_FILENAME);
        
        // Remove special characters, keep only alphanumeric, dash, underscore
        $name = preg_replace('/[^a-zA-Z0-9\-_]/', '_', $name);
        
        // Limit length
        $name = substr($name, 0, 100);
        
        // Add timestamp for uniqueness
        $timestamp = time();
        
        return "{$name}_{$timestamp}.{$extension}";
    }

    /**
     * Check if file extension matches allowed list
     * 
     * @param string $filename Filename to check
     * @param array $allowedExtensions Allowed extensions (without dot)
     * @return bool True if extension is allowed
     */
    public static function isExtensionAllowed($filename, $allowedExtensions) {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, $allowedExtensions);
    }
}
