#!/usr/bin/env php
<?php

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/MediaPipeline.php';

$db = Database::getInstance();

$rows = $db->fetchAll("SELECT * FROM media_library WHERE manifest_path IS NULL OR manifest_path = '' OR responsive_variants IS NULL OR responsive_variants = ''");

if (!$rows) {
    echo "No media rows require regeneration.\n";
    exit(0);
}

echo "Regenerating variants for " . count($rows) . " media row(s)\n";

foreach ($rows as $row) {
    $id = $row['id'];
    try {
        MediaPipeline::regenerateForRow($row);
        echo "✔ Media #{$id} regenerated\n";
    } catch (Exception $e) {
        echo "✖ Failed to regenerate media #{$id}: " . $e->getMessage() . "\n";
    }
}
