<?php

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/FileValidator.php';
require_once __DIR__ . '/MediaProfiles.php';

class MediaPipeline {
    private const ALLOWED_IMAGE_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    private const REQUIRED_SUBDIRS = [
        '',
        'incoming',
        'optimized',
        'webp',
        'variants',
        'variants/optimized',
        'variants/webp',
        'manifests'
    ];

    private static function uploadDir() {
        $dir = trim(Config::get('UPLOAD_DIR', 'uploads'));
        return $dir === '' ? 'uploads' : $dir;
    }

    private static function uploadRoot() {
        $root = realpath(__DIR__ . '/../' . self::uploadDir());
        if ($root === false) {
            $root = __DIR__ . '/../' . self::uploadDir();
        }
        return $root;
    }

    private static function publicPath($relative) {
        $normalized = ltrim($relative, '/');
        return '/' . self::uploadDir() . '/' . $normalized;
    }

    public static function ensureStructure() {
        $root = self::uploadRoot();
        foreach (self::REQUIRED_SUBDIRS as $sub) {
            $path = rtrim($root . '/' . $sub, '/');
            if (!is_dir($path)) {
                mkdir($path, 0775, true);
            }
        }
    }

    private static function extensionForMime($mime, $originalName = '') {
        switch ($mime) {
            case 'image/png':
                return '.png';
            case 'image/webp':
                return '.webp';
            case 'image/gif':
                return '.gif';
            case 'image/jpeg':
                return '.jpg';
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        return $ext ? '.' . $ext : '.jpg';
    }

    private static function buildBasename($checksum) {
        $hashPart = substr($checksum, 0, 8);
        $rand = bin2hex(random_bytes(3));
        return "event-{$hashPart}-{$rand}";
    }

    private static function normalizeCategory($category) {
        if (!$category) {
            return 'general';
        }
        return strtolower(trim($category));
    }

    public static function absolutePathFromUrl($url) {
        if (!$url) {
            return null;
        }
        $trimmed = ltrim($url, '/');
        $uploadDir = self::uploadDir();
        if (strpos($trimmed, $uploadDir . '/') === 0) {
            $trimmed = substr($trimmed, strlen($uploadDir) + 1);
        }
        $candidate = self::uploadRoot() . '/' . $trimmed;
        $real = realpath($candidate);
        if ($real && strpos($real, self::uploadRoot()) === 0) {
            return $real;
        }
        return $candidate;
    }

    public static function fileExistsByUrl($url) {
        if (!$url) {
            return false;
        }
        $absolute = self::absolutePathFromUrl($url);
        return $absolute && file_exists($absolute);
    }

    private static function createImageResource($path, $mime) {
        switch ($mime) {
            case 'image/jpeg':
                return imagecreatefromjpeg($path);
            case 'image/png':
                return imagecreatefrompng($path);
            case 'image/gif':
                return imagecreatefromgif($path);
            case 'image/webp':
                return function_exists('imagecreatefromwebp') ? imagecreatefromwebp($path) : null;
        }
        return null;
    }

    private static function applyExifOrientation($image, $path, $mime) {
        if ($mime !== 'image/jpeg' || !function_exists('exif_read_data')) {
            return $image;
        }
        $exif = @exif_read_data($path);
        if (!$exif || !isset($exif['Orientation'])) {
            return $image;
        }
        $orientation = (int) $exif['Orientation'];
        switch ($orientation) {
            case 3:
                $image = imagerotate($image, 180, 0);
                break;
            case 6:
                $image = imagerotate($image, -90, 0);
                break;
            case 8:
                $image = imagerotate($image, 90, 0);
                break;
            default:
                break;
        }
        return $image;
    }

    private static function resizeImage($image, $width, $mime) {
        $origWidth = imagesx($image);
        $origHeight = imagesy($image);
        if ($origWidth <= 0 || $origHeight <= 0) {
            return null;
        }
        $targetWidth = (int) round($width);
        if ($targetWidth < 1) {
            return null;
        }
        $targetHeight = (int) round(($origHeight * $targetWidth) / $origWidth);
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        if (in_array($mime, ['image/png', 'image/gif', 'image/webp'], true)) {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $transparent);
        }
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $origWidth, $origHeight);
        return $canvas;
    }

    private static function saveOptimizedVariant($resource, $path, $format) {
        $result = false;
        if ($format === '.png') {
            $compression = max(0, min(9, (int) Config::get('IMAGE_PNG_COMPRESSION', 6)));
            $result = imagepng($resource, $path, $compression);
        } else {
            $quality = max(1, min(100, (int) Config::get('IMAGE_JPEG_QUALITY', 85)));
            $result = imagejpeg($resource, $path, $quality);
        }
        return $result;
    }

    private static function saveWebpVariant($resource, $path) {
        if (!function_exists('imagewebp')) {
            return false;
        }
        $quality = max(1, min(100, (int) Config::get('IMAGE_WEBP_QUALITY', 85)));
        return imagewebp($resource, $path, $quality);
    }

    private static function buildSrcset($variants) {
        if (!is_array($variants) || empty($variants)) {
            return '';
        }
        $parts = [];
        foreach ($variants as $variant) {
            if (!isset($variant['url'], $variant['width'])) {
                continue;
            }
            $parts[] = $variant['url'] . ' ' . $variant['width'] . 'w';
        }
        return implode(', ', $parts);
    }

    private static function writeManifest($basename, $category, $originalMeta, $optimizedVariants, $webpVariants) {
        $manifest = [
            'version' => 1,
            'generated_at' => date('c'),
            'category' => $category,
            'basename' => $basename,
            'original' => $originalMeta,
            'variants' => [
                'optimized' => $optimizedVariants,
                'webp' => $webpVariants
            ]
        ];

        $manifestPath = self::uploadRoot() . '/manifests/' . $basename . '.json';
        file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT));
        return self::publicPath('manifests/' . $basename . '.json');
    }

    private static function runVariantGeneration($absolutePath, $basename, $ext, $mimeType, $category, $fileSize) {
        self::ensureStructure();

        $image = self::createImageResource($absolutePath, $mimeType);
        if (!$image) {
            throw new Exception('Unsupported image type');
        }
        $image = self::applyExifOrientation($image, $absolutePath, $mimeType);

        $metadata = [
            'width' => imagesx($image),
            'height' => imagesy($image)
        ];

        $variantWidths = MediaProfiles::getVariantWidths($category);
        $optimizedVariants = [];
        $webpVariants = [];
        $uploadDir = self::uploadDir();

        $optimizedExt = in_array($mimeType, ['image/png', 'image/gif'], true) ? '.png' : '.jpg';

        foreach ($variantWidths as $width) {
            $resized = self::resizeImage($image, $width, $mimeType);
            if (!$resized) {
                continue;
            }

            $optimizedFilename = $basename . '-w' . $width . $optimizedExt;
            $optimizedPath = self::uploadRoot() . '/variants/optimized/' . $optimizedFilename;
            if (self::saveOptimizedVariant($resized, $optimizedPath, $optimizedExt)) {
                $optimizedVariants[] = [
                    'width' => $width,
                    'url' => '/' . $uploadDir . '/variants/optimized/' . $optimizedFilename,
                    'path' => '/' . $uploadDir . '/variants/optimized/' . $optimizedFilename
                ];
            }

            $webpFilename = $basename . '-w' . $width . '.webp';
            $webpPath = self::uploadRoot() . '/variants/webp/' . $webpFilename;
            if (self::saveWebpVariant($resized, $webpPath)) {
                $webpVariants[] = [
                    'width' => $width,
                    'url' => '/' . $uploadDir . '/variants/webp/' . $webpFilename,
                    'path' => '/' . $uploadDir . '/variants/webp/' . $webpFilename
                ];
            }

            self::destroyImage($resized);
        }

        $originalMeta = [
            'url' => '/' . $uploadDir . '/' . $basename . $ext,
            'path' => '/' . $uploadDir . '/' . $basename . $ext,
            'width' => $metadata['width'],
            'height' => $metadata['height'],
            'mime' => $mimeType,
            'size' => $fileSize
        ];

        $manifestPath = self::writeManifest($basename, $category, $originalMeta, $optimizedVariants, $webpVariants);

        self::destroyImage($image);

        return [
            'metadata' => $metadata,
            'optimized_variants' => $optimizedVariants,
            'webp_variants' => $webpVariants,
            'optimized_srcset' => self::buildSrcset($optimizedVariants),
            'webp_srcset' => self::buildSrcset($webpVariants),
            'manifest_path' => $manifestPath
        ];
    }

    private static function destroyImage($resource) {
        if (PHP_VERSION_ID >= 80500) {
            return;
        }

        $isGdObject = class_exists('GdImage', false) && $resource instanceof \GdImage;
        if ((is_resource($resource) || $isGdObject) && function_exists('imagedestroy')) {
            imagedestroy($resource);
        }
    }

    public static function processUploadedFile($tmpPath, $originalName, $mimeType, $fileSize, $category) {
        self::ensureStructure();

        $validation = FileValidator::validate(
            $tmpPath,
            $mimeType,
            $fileSize,
            self::ALLOWED_IMAGE_MIME_TYPES,
            (int) Config::get('IMAGE_UPLOAD_MAX_BYTES', 8388608)
        );

        if (!$validation['valid']) {
            throw new Exception($validation['error'], 400);
        }

        $checksum = hash_file('sha256', $tmpPath);
        $basename = self::buildBasename($checksum);
        $ext = self::extensionForMime($mimeType, $originalName);
        $finalName = $basename . $ext;
        $absolutePath = self::uploadRoot() . '/' . $finalName;

        if (!@move_uploaded_file($tmpPath, $absolutePath)) {
            if (!@rename($tmpPath, $absolutePath)) {
                throw new Exception('Failed to move uploaded file');
            }
        }

        $result = self::runVariantGeneration(
            $absolutePath,
            $basename,
            $ext,
            $mimeType,
            self::normalizeCategory($category),
            filesize($absolutePath)
        );

        return [
            'file_url' => '/' . self::uploadDir() . '/' . $finalName,
            'file_name' => $finalName,
            'file_type' => $mimeType,
            'file_size' => filesize($absolutePath),
            'width' => $result['metadata']['width'],
            'height' => $result['metadata']['height'],
            'checksum' => $checksum,
            'optimized_variants' => $result['optimized_variants'],
            'webp_variants' => $result['webp_variants'],
            'optimized_srcset' => $result['optimized_srcset'],
            'webp_srcset' => $result['webp_srcset'],
            'manifest_path' => $result['manifest_path'],
            'category' => self::normalizeCategory($category)
        ];
    }

    public static function regenerateForRow($row) {
        if (empty($row['file_url'])) {
            throw new Exception('Missing file path');
        }
        $absolute = self::absolutePathFromUrl($row['file_url']);
        if (!$absolute || !file_exists($absolute)) {
            throw new Exception('File not found on disk: ' . $row['file_url']);
        }
        $mime = $row['file_type'] ?: mime_content_type($absolute);
        $ext = self::extensionForMime($mime, $row['file_url']);
        $basename = pathinfo($absolute, PATHINFO_FILENAME);
        $result = self::runVariantGeneration(
            $absolute,
            $basename,
            $ext,
            $mime,
            self::normalizeCategory($row['category'] ?? 'general'),
            filesize($absolute)
        );

        return [
            'file_type' => $mime,
            'file_size' => filesize($absolute),
            'width' => $result['metadata']['width'],
            'height' => $result['metadata']['height'],
            'optimized_variants' => $result['optimized_variants'],
            'webp_variants' => $result['webp_variants'],
            'optimized_srcset' => $result['optimized_srcset'],
            'webp_srcset' => $result['webp_srcset'],
            'manifest_path' => $result['manifest_path'],
            'responsive_variants' => [
                'optimized' => $result['optimized_variants'],
                'webp' => $result['webp_variants']
            ]
        ];
    }

    public static function readManifest($manifestPath) {
        if (!$manifestPath) {
            return null;
        }
        $absolute = self::absolutePathFromUrl($manifestPath);
        if (!$absolute || !file_exists($absolute)) {
            return null;
        }
        $data = file_get_contents($absolute);
        $decoded = json_decode($data, true);
        return $decoded ?: null;
    }

    public static function deleteFilesFromManifest($manifest) {
        if (!$manifest || !isset($manifest['original'])) {
            return;
        }
        $paths = [];
        if (!empty($manifest['original']['path'])) {
            $paths[] = $manifest['original']['path'];
        }
        $variants = $manifest['variants'] ?? [];
        foreach (['optimized', 'webp'] as $key) {
            if (!empty($variants[$key]) && is_array($variants[$key])) {
                foreach ($variants[$key] as $variant) {
                    if (isset($variant['path'])) {
                        $paths[] = $variant['path'];
                    }
                }
            }
        }
        foreach ($paths as $path) {
            $absolute = self::absolutePathFromUrl($path);
            if ($absolute && file_exists($absolute)) {
                @unlink($absolute);
            }
        }
        if (!empty($manifest['basename'])) {
            $manifestUrl = '/'. self::uploadDir() . '/manifests/' . $manifest['basename'] . '.json';
            $absoluteManifest = self::absolutePathFromUrl($manifestUrl);
            if ($absoluteManifest && file_exists($absoluteManifest)) {
                @unlink($absoluteManifest);
            }
        }
    }

    public static function deleteOriginalByUrl($fileUrl) {
        $absolute = self::absolutePathFromUrl($fileUrl);
        if ($absolute && file_exists($absolute)) {
            @unlink($absolute);
        }
    }
}
