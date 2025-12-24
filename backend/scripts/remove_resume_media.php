#!/usr/bin/env php
<?php

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/MediaPipeline.php';

$db = Database::getInstance();

$rows = $db->fetchAll("SELECT * FROM media_library WHERE LOWER(category) = 'resume'");

if (!$rows) {
    echo "No resume media rows found.\n";
    exit(0);
}

echo "Removing " . count($rows) . " resume media row(s)\n";

foreach ($rows as $row) {
    $id = $row['id'];
    try {
        $manifest = MediaPipeline::readManifest($row['manifest_path'] ?? null);
        if ($manifest) {
            MediaPipeline::deleteFilesFromManifest($manifest);
        } elseif (!empty($row['file_url'])) {
            MediaPipeline::deleteOriginalByUrl($row['file_url']);
        }

        $fileUrl = $row['file_url'];
        $pattern = '%' . basename($fileUrl) . '%';
        $db->update(
            'UPDATE job_applications SET resume_url = NULL WHERE resume_url = ? OR resume_url = ? OR resume_url LIKE ?',
            [$fileUrl, ltrim($fileUrl, '/'), $pattern]
        );

        $db->delete('DELETE FROM media_library WHERE id = ?', [$id]);
        echo "✔ Removed resume media #{$id}\n";
    } catch (Exception $e) {
        echo "✖ Failed to remove media #{$id}: " . $e->getMessage() . "\n";
    }
}
