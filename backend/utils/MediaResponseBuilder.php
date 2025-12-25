<?php

require_once __DIR__ . '/MediaPipeline.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class MediaResponseBuilder {
    private static function normalizeContext($value) {
        if (!$value) {
            return 'gallery';
        }
        $normalized = strtolower(trim($value));
        if ($normalized === '' || $normalized === 'general') {
            return 'gallery';
        }
        return $normalized;
    }

    private static function decodeVariants($value) {
        if (!$value) {
            return null;
        }
        if (is_array($value)) {
            return $value;
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : null;
    }

    private static function buildSrcsetFromVariants($variants) {
        if (!is_array($variants) || empty($variants)) {
            return '';
        }
        $parts = [];
        foreach ($variants as $variant) {
            if (isset($variant['url'], $variant['width'])) {
                $parts[] = $variant['url'] . ' ' . $variant['width'] . 'w';
            }
        }
        return implode(', ', $parts);
    }

    private static function resolveVariants($row) {
        $variants = self::decodeVariants($row['responsive_variants'] ?? null);
        if ($variants) {
            return $variants;
        }
        $manifest = MediaPipeline::readManifest($row['manifest_path'] ?? null);
        if ($manifest && isset($manifest['variants'])) {
            return $manifest['variants'];
        }
        return [
            'optimized' => [],
            'webp' => []
        ];
    }

    private static function filterExistingVariants($variants, $rowId, $type) {
        if (!is_array($variants)) {
            return [];
        }
        $filtered = [];
        foreach ($variants as $variant) {
            $path = $variant['path'] ?? $variant['url'] ?? null;
            if ($path && MediaPipeline::fileExistsByUrl($path)) {
                $filtered[] = $variant;
                continue;
            }
            Logger::warning('Missing media variant on disk', [
                'media_id' => $rowId,
                'variant_type' => $type,
                'path' => $path
            ]);
        }
        return $filtered;
    }

    public static function hydrateRow($row) {
        if (!$row) {
            return null;
        }
        $variants = self::resolveVariants($row);
        $missingFile = false;

        if (!MediaPipeline::fileExistsByUrl($row['file_url'] ?? null)) {
            $missingFile = true;
        }

        $filteredOptimized = self::filterExistingVariants($variants['optimized'] ?? [], $row['id'] ?? null, 'optimized');
        $filteredWebp = self::filterExistingVariants($variants['webp'] ?? [], $row['id'] ?? null, 'webp');
        if (count($filteredOptimized) !== count($variants['optimized'] ?? []) ||
            count($filteredWebp) !== count($variants['webp'] ?? [])) {
            $missingFile = true;
        }
        $variants['optimized'] = $filteredOptimized;
        $variants['webp'] = $filteredWebp;

        $row['responsive_variants'] = $variants;
        $row['image_variants'] = $variants;
        $row['fallback_original'] = $row['file_url'];

        $normalizedContext = self::normalizeContext($row['category'] ?? null);
        $row['context'] = $normalizedContext;
        $row['category'] = $normalizedContext;

        if (empty($row['optimized_srcset'])) {
            $row['optimized_srcset'] = self::buildSrcsetFromVariants($variants['optimized'] ?? []);
        }
        if (empty($row['webp_srcset'])) {
            $row['webp_srcset'] = self::buildSrcsetFromVariants($variants['webp'] ?? []);
        }

        if ($missingFile) {
            Logger::warning('Media missing original or variants on disk', [
                'media_id' => $row['id'] ?? null,
                'file_url' => $row['file_url'] ?? null
            ]);
            $row['file_url'] = null;
            $row['fallback_original'] = null;
            $row['optimized_srcset'] = '';
            $row['webp_srcset'] = '';
        }

        $row['missing_file'] = $missingFile;

        return $row;
    }

    public static function hydrateRows($rows) {
        if (!is_array($rows)) {
            return [];
        }
        return array_map(function ($row) {
            return self::hydrateRow($row);
        }, $rows);
    }

    public static function hydrateByIds($db, $ids) {
        if (!$ids) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "SELECT * FROM media_library WHERE id IN ($placeholders)";
        $rows = $db->fetchAll($sql, $ids);
        $hydrated = [];
        foreach ($rows as $row) {
            $hydrated[$row['id']] = self::hydrateRow($row);
        }
        return $hydrated;
    }
}
