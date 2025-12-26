#!/usr/bin/env php
<?php

require_once __DIR__ . '/../backend/utils/MediaPipeline.php';
require_once __DIR__ . '/../backend/utils/MediaProfiles.php';

function createTempImage($width = 1600, $height = null) {
    $height = $height ?: (int) round($width * 2 / 3);
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

$cases = [
    ['context' => 'hero', 'width' => 1600],
    ['context' => 'menu', 'width' => 1600],
    ['context' => 'gallery', 'width' => 1600],
    ['context' => 'gallery', 'width' => 500, 'label' => 'gallery_tiny']
];
$report = [];

foreach ($cases as $case) {
    $tmp = createTempImage($case['width']);
    $result = MediaPipeline::processUploadedFile($tmp, "proof-{$case['context']}.jpg", 'image/jpeg', filesize($tmp), $case['context']);
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
        'context' => $case['label'] ?? $case['context'],
        'source_width' => $case['width'],
        'variant_widths' => MediaProfiles::getVariantWidths($case['context']),
        'optimized_files' => $variants['optimized'],
        'webp_files' => $variants['webp']
    ];
    destroyArtifacts($result);
}

echo json_encode($report, JSON_PRETTY_PRINT) . PHP_EOL;
