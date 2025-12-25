#!/usr/bin/env php
<?php

require_once __DIR__ . '/../backend/utils/MediaPipeline.php';
require_once __DIR__ . '/../backend/utils/MediaProfiles.php';

function createTempImage($width = 1600, $height = 1066) {
    $tmp = tempnam(sys_get_temp_dir(), 'variant-proof');
    $image = imagecreatetruecolor($width, $height);
    $bg = imagecolorallocate($image, 24, 24, 24);
    imagefill($image, 0, 0, $bg);
    imagejpeg($image, $tmp, 90);
    if (PHP_VERSION_ID < 80500) {
        imagedestroy($image);
    }
    return $tmp;
}

function destroyArtifacts($result) {
    if (empty($result['manifest_path'])) {
        return;
    }
    $manifest = MediaPipeline::readManifest($result['manifest_path']);
    if ($manifest) {
        MediaPipeline::deleteFilesFromManifest($manifest);
    }
    if (!empty($result['file_url'])) {
        MediaPipeline::deleteOriginalByUrl($result['file_url']);
    }
    $absoluteManifest = MediaPipeline::absolutePathFromUrl($result['manifest_path']);
    if ($absoluteManifest && file_exists($absoluteManifest)) {
        @unlink($absoluteManifest);
    }
}

$contexts = ['hero', 'menu', 'gallery'];
$report = [];

foreach ($contexts as $context) {
    $tmp = createTempImage();
    $result = MediaPipeline::processUploadedFile($tmp, "proof-{$context}.jpg", 'image/jpeg', filesize($tmp), $context);
    $variants = [
        'optimized' => array_map(function ($variant) {
            return [
                'width' => $variant['width'],
                'file' => basename($variant['url'])
            ];
        }, $result['optimized_variants']),
        'webp' => array_map(function ($variant) {
            return [
                'width' => $variant['width'],
                'file' => basename($variant['url'])
            ];
        }, $result['webp_variants'])
    ];
    $report[] = [
        'context' => $context,
        'variant_widths' => MediaProfiles::getVariantWidths($context),
        'optimized_files' => $variants['optimized'],
        'webp_files' => $variants['webp']
    ];
    destroyArtifacts($result);
}

echo json_encode($report, JSON_PRETTY_PRINT) . PHP_EOL;
