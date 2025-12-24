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
        $result = MediaPipeline::regenerateForRow($row);
        $optimized = $result['optimized_variants'];
        $webp = $result['webp_variants'];
        $optimizedPath = end($optimized);
        $optimizedPath = $optimizedPath ? $optimizedPath['url'] : null;
        $webpPath = end($webp);
        $webpPath = $webpPath ? $webpPath['url'] : null;

        $db->update(
            'UPDATE media_library SET file_type = ?, file_size = ?, width = ?, height = ?, optimized_path = ?, webp_path = ?, optimized_srcset = ?, webp_srcset = ?, responsive_variants = ?, manifest_path = ?, updated_at = NOW() WHERE id = ?',
            [
                $result['file_type'],
                $result['file_size'],
                $result['width'],
                $result['height'],
                $optimizedPath,
                $webpPath,
                $result['optimized_srcset'],
                $result['webp_srcset'],
                json_encode($result['responsive_variants']),
                $result['manifest_path'],
                $id
            ]
        );
        echo "✔ Media #{$id} regenerated\n";
    } catch (Exception $e) {
        echo "✖ Failed to regenerate media #{$id}: " . $e->getMessage() . "\n";
    }
}
