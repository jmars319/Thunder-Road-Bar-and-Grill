#!/usr/bin/env php
<?php
require_once __DIR__ . '/../backend/routes/media.php';
require_once __DIR__ . '/../backend/utils/MediaResponseBuilder.php';

class MediaRoutesProbe extends MediaRoutes {
    public function __construct() {}
    public function normalize($value, $allowNull = false) {
        return parent::normalizeContextValue($value, $allowNull);
    }
    public function galleryWhere() {
        return parent::buildGalleryWhereClause();
    }
}

$probe = new MediaRoutesProbe();
$inputs = [null, '', 'general', 'gallery', 'hero', 'menu'];
$normalized = array_map(function ($input) use ($probe) {
    return [
        'input' => var_export($input, true),
        'allowNull' => true,
        'normalized' => $probe->normalize($input, true)
    ];
}, $inputs);

$galleryWhere = $probe->galleryWhere();

$sampleRows = [
    ['id' => 1, 'file_url' => '/uploads/event-11e11b9c-c497e2.jpg', 'category' => null, 'responsive_variants' => json_encode(['optimized' => [], 'webp' => []])],
    ['id' => 2, 'file_url' => '/uploads/event-16f83471-892e0e.jpg', 'category' => 'general', 'responsive_variants' => json_encode(['optimized' => [], 'webp' => []])],
    ['id' => 3, 'file_url' => '/uploads/event-41e47902-8ef99d.jpg', 'category' => 'menu', 'responsive_variants' => json_encode(['optimized' => [], 'webp' => []])]
];
$hydrated = array_map(function ($row) {
    $hydratedRow = MediaResponseBuilder::hydrateRow($row);
    return [
        'id' => $row['id'],
        'input_category' => $row['category'],
        'output_category' => $hydratedRow['category'],
        'context_field' => $hydratedRow['context']
    ];
}, $sampleRows);

$result = [
    'normalized_inputs' => $normalized,
    'gallery_where_clause' => $galleryWhere,
    'hydrated_categories' => $hydrated
];

echo json_encode($result, JSON_PRETTY_PRINT) . PHP_EOL;
