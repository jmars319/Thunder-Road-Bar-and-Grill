<?php
/**
 * Settings Routes
 * 
 * Purpose:
 * - Serve site-wide configuration, navigation, business hours, 'about' page
 *   content and footer columns
 * 
 * Public endpoints:
 * - GET /api/site-settings -> { business_name, tagline, phone, email, address, ... }
 * - GET /api/navigation -> [{ id, label, url, display_order }]
 * - GET /api/business-hours -> [{ id, day, opening_time, closing_time, is_closed, ... }]
 * - GET /api/about -> { header, paragraph, phone, email, address, map_embed_url }
 * - GET /api/footer-columns -> [{ id, column_title, links: [...] }]
 * 
 * Admin endpoints:
 * - PUT /api/site-settings
 * - PUT /api/business-hours/:id
 * - PUT /api/about
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';
require_once __DIR__ . '/../utils/MediaResponseBuilder.php';
require_once __DIR__ . '/../utils/HtmlSanitizer.php';
require_once __DIR__ . '/../utils/DevPublicSnapshot.php';
require_once __DIR__ . '/../utils/AuditLog.php';

class SettingsRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::lazy();
    }

    private function fetchFallbackHeroMedia() {
        $rows = $this->db->fetchAll(
            'SELECT * FROM media_library WHERE category = ? ORDER BY uploaded_at DESC LIMIT 12',
            ['hero']
        );
        return MediaResponseBuilder::hydrateRows($rows);
    }

    private function formatHeroVariantFromMedia($media) {
        return [
            'id' => $media['id'] ?? null,
            'title' => $media['title'] ?? '',
            'alt_text' => $media['alt_text'] ?? '',
            'file_url' => $media['file_url'] ?? null,
            'responsive_variants' => $media['responsive_variants'] ?? [],
            'image_variants' => $media['image_variants'] ?? [],
            'optimized_srcset' => $media['optimized_srcset'] ?? '',
            'webp_srcset' => $media['webp_srcset'] ?? '',
            'fallback_original' => $media['fallback_original'] ?? ($media['file_url'] ?? null)
        ];
    }

    private function sendNoCacheHeaders() {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
    }

    private function sanitizeHeroImages($entries) {
        if (!is_array($entries)) {
            return [];
        }
        $normalized = [];
        $seen = [];
        foreach ($entries as $entry) {
            $id = null;
            $title = '';
            $altText = '';
            $isFallback = false;

            if (is_array($entry)) {
                $isFallback = !empty($entry['is_fallback']);
                if (isset($entry['id'])) {
                    $id = (int) $entry['id'];
                } elseif (isset($entry['media_id'])) {
                    $id = (int) $entry['media_id'];
                } elseif (isset($entry['value'])) {
                    $id = (int) $entry['value'];
                }
                $title = isset($entry['title']) ? trim((string) $entry['title']) : '';
                $altText = isset($entry['alt_text']) ? trim((string) $entry['alt_text']) : '';
            } elseif (is_scalar($entry)) {
                $candidate = trim((string) $entry);
                if ($candidate !== '' && is_numeric($candidate)) {
                    $id = (int) $candidate;
                }
            }

            if (!$id || isset($seen[$id]) || $isFallback) {
                continue;
            }
            $seen[$id] = true;
            $normalized[] = [
                'id' => $id,
                'title' => $title,
                'alt_text' => $altText
            ];
        }
        return $normalized;
    }

    /**
     * GET /api/site-settings - Get site settings
     */
    public function getSiteSettings() {
        try {
            $row = $this->db->fetchOne('SELECT * FROM site_settings WHERE id = 1');
            
            if (!$row) {
                $row = [];
            }

            // Parse hero_images JSON if present
            if (isset($row['hero_images'])) {
                $decoded = json_decode($row['hero_images'], true) ?: [];
                $row['hero_images'] = $this->sanitizeHeroImages($decoded);
            } else {
                $row['hero_images'] = [];
            }

            $this->sendNoCacheHeaders();
            echo json_encode($row);
        } catch (Throwable $e) {
            // Return empty settings if table doesn't exist
            if ($e instanceof PDOException && strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing site_settings table', ['error' => $e->getMessage()]);
                $this->sendNoCacheHeaders();
                echo json_encode([]);
            } elseif (DevPublicSnapshot::respond('site-settings', $e)) {
                return;
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/settings - Enriched settings with hero variants
     */
    public function getSettings() {
        try {
            $settings = $this->db->fetchOne('SELECT * FROM site_settings WHERE id = 1') ?: [];
            $heroImagesRaw = [];
            if (!empty($settings['hero_images'])) {
                $heroImagesRaw = json_decode($settings['hero_images'], true) ?: [];
            }
            $heroImagesRaw = $this->sanitizeHeroImages($heroImagesRaw);
            $heroSelectionForResponse = [];
            $ids = array_values(array_filter(array_map(function ($entry) {
                if (isset($entry['id'])) {
                    return (int) $entry['id'];
                }
                return null;
            }, $heroImagesRaw)));
            $map = $ids ? MediaResponseBuilder::hydrateByIds($this->db, $ids) : [];
            $heroVariants = [];
            foreach ($heroImagesRaw as $entry) {
                $id = $entry['id'] ?? null;
                if (!$id || !isset($map[$id])) {
                    Logger::info('Skipping hero image reference with missing media record', ['id' => $id]);
                    continue;
                }
                $hydrated = $map[$id];
                if (!empty($hydrated['missing_file']) || empty($hydrated['fallback_original'])) {
                    Logger::info('Skipping hero image due to missing files', ['id' => $id]);
                    continue;
                }
                $heroVariants[] = [
                    'id' => $id,
                    'title' => $entry['title'] ?? $hydrated['title'],
                    'alt_text' => $entry['alt_text'] ?? $hydrated['alt_text'],
                    'file_url' => $hydrated['file_url'],
                    'responsive_variants' => $hydrated['responsive_variants'],
                    'image_variants' => $hydrated['image_variants'],
                    'optimized_srcset' => $hydrated['optimized_srcset'],
                    'webp_srcset' => $hydrated['webp_srcset'],
                    'fallback_original' => $hydrated['fallback_original']
                ];
                $heroSelectionForResponse[] = [
                    'id' => $id,
                    'title' => $entry['title'] ?? '',
                    'alt_text' => $entry['alt_text'] ?? ''
                ];
            }
            if (empty($heroVariants)) {
                $fallbackMedia = $this->fetchFallbackHeroMedia();
                if (!empty($fallbackMedia)) {
                    foreach ($fallbackMedia as $media) {
                        if (!$media || !empty($media['missing_file']) || empty($media['fallback_original'])) {
                            continue;
                        }
                        $formatted = $this->formatHeroVariantFromMedia($media);
                        $heroVariants[] = $formatted;
                        if (empty($heroSelectionForResponse)) {
                            $heroSelectionForResponse[] = [
                                'id' => $formatted['id'],
                                'title' => $formatted['title'] ?? '',
                                'alt_text' => $formatted['alt_text'] ?? '',
                                'is_fallback' => true
                            ];
                        }
                    }
                }
            }

            $settings['hero_images'] = $heroSelectionForResponse;
            $settings['hero_images_variants'] = $heroVariants;
            $this->sendNoCacheHeaders();
            echo json_encode(['success' => true, 'settings' => $settings]);
        } catch (Throwable $e) {
            if (DevPublicSnapshot::respond('settings', $e)) {
                return;
            }
            Logger::error('GET /api/settings failed', ['error' => $e->getMessage()]);
            $this->sendNoCacheHeaders();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to load settings']);
        }
    }

    /**
     * GET /api/navigation - Get navigation links
     */
    public function getNavigation() {
        try {
            $results = $this->db->fetchAll('SELECT * FROM navigation_links WHERE is_active = 1 ORDER BY display_order');
            
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (Throwable $e) {
            // Return empty array if table doesn't exist
            if ($e instanceof PDOException && strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing navigation_links table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } elseif (DevPublicSnapshot::respond('navigation', $e)) {
                return;
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/business-hours - Get business hours
     */
    public function getBusinessHours() {
        try {
            $area = isset($_GET['area']) ? trim($_GET['area']) : null;
            
            if ($area) {
                $results = $this->db->fetchAll(
                    'SELECT * FROM business_hours WHERE area = ? ORDER BY id',
                    [$area]
                );
            } else {
                $results = $this->db->fetchAll(
                    'SELECT * FROM business_hours ORDER BY area, id'
                );
            }
            
            header('Cache-Control: public, max-age=300');
            echo json_encode($results);
        } catch (Throwable $e) {
            // Return empty array if table doesn't exist
            if ($e instanceof PDOException && strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing business_hours table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } elseif (DevPublicSnapshot::respond('business-hours', $e)) {
                return;
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/about - Get about content
     */
    public function getAbout() {
        try {
            $row = $this->db->fetchOne('SELECT * FROM about_content WHERE id = 1');
            
            if (!$row) {
                $row = [];
            }
            
            header('Cache-Control: public, max-age=300');
            echo json_encode($row);
        } catch (Throwable $e) {
            // Return empty object if table doesn't exist
            if ($e instanceof PDOException && strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing about_content table', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode(new stdClass());
            } elseif (DevPublicSnapshot::respond('about', $e)) {
                return;
            } else {
                throw $e;
            }
        }
    }

    /**
     * GET /api/footer-columns - Get footer columns with links
     */
    public function getFooterColumns() {
        $query = "
            SELECT 
                fc.id as column_id,
                fc.column_title,
                fc.display_order as column_order,
                fl.id as link_id,
                fl.label as link_label,
                fl.url as link_url,
                fl.display_order as link_order
            FROM footer_columns fc
            LEFT JOIN footer_links fl ON fc.id = fl.column_id
            ORDER BY fc.display_order, fl.display_order
        ";

        try {
            $results = $this->db->fetchAll($query);
            
            $columns = [];
            foreach ($results as $row) {
                $colId = $row['column_id'];
                
                if (!isset($columns[$colId])) {
                    $columns[$colId] = [
                        'id' => $colId,
                        'column_title' => $row['column_title'],
                        'display_order' => (int)$row['column_order'],
                        'links' => []
                    ];
                }
                
                if ($row['link_id']) {
                    $columns[$colId]['links'][] = [
                        'id' => (int)$row['link_id'],
                        'label' => $row['link_label'],
                        'url' => $row['link_url'],
                        'display_order' => (int)$row['link_order']
                    ];
                }
            }
            
            header('Cache-Control: public, max-age=300');
            echo json_encode(array_values($columns));
        } catch (Throwable $e) {
            // Return empty array if tables don't exist
            if ($e instanceof PDOException && strpos($e->getMessage(), "doesn't exist") !== false) {
                Logger::warning('Missing footer tables', ['error' => $e->getMessage()]);
                header('Cache-Control: public, max-age=300');
                echo json_encode([]);
            } elseif (DevPublicSnapshot::respond('footer-columns', $e)) {
                return;
            } else {
                throw $e;
            }
        }
    }

    /**
     * PUT /api/site-settings - Update site settings
     */
    public function updateSiteSettings() {
        $user = AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        
        // Get existing settings
        $existing = $this->db->fetchOne('SELECT * FROM site_settings WHERE id = 1') ?: [];
        $heroImagesBefore = $this->sanitizeHeroImages(
            !empty($existing['hero_images']) ? (json_decode($existing['hero_images'], true) ?: []) : []
        );
        $heroImagesAfter = null;
        $writtenFields = [];

        // Build dynamic UPDATE query
        $fields = [];
        $params = [];

        $allowedFields = [
            'business_name', 'tagline', 'phone', 'email', 'address',
            'hero_images', 'hero_slideshow_speed', 'instagram', 'facebook', 'google',
            'hero_title', 'hero_subtitle', 'hero_cta_primary_label', 'hero_cta_primary_href',
            'hero_cta_secondary_label', 'hero_cta_secondary_href',
            'menu_heading', 'menu_intro',
            'reservations_heading', 'reservations_intro', 'reservations_success_copy', 'reservations_error_copy',
            'about_heading', 'about_intro',
            'jobs_heading', 'jobs_intro', 'jobs_success_copy', 'jobs_error_copy',
            'jobs_sidebar_heading', 'jobs_sidebar_intro', 'jobs_sidebar_benefits', 'jobs_positions_label'
        ];

        $richTextFields = [
            'menu_intro', 'reservations_intro', 'reservations_success_copy', 'reservations_error_copy',
            'about_intro', 'jobs_intro', 'jobs_success_copy', 'jobs_error_copy',
            'jobs_sidebar_benefits'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $value = $input[$field];
                
                // Special handling for hero_images
                if ($field === 'hero_images') {
                    $decodedValue = is_array($value)
                        ? $value
                        : (is_string($value) ? json_decode($value, true) : []);
                    $heroImagesAfter = $this->sanitizeHeroImages($decodedValue ?: []);
                    $value = json_encode($heroImagesAfter);
                } elseif (in_array($field, $richTextFields, true)) {
                    $value = HtmlSanitizer::sanitizeRichText($value);
                } elseif (in_array($field, ['hero_cta_primary_href', 'hero_cta_secondary_href'], true)) {
                    $value = is_string($value) ? trim($value) : '';
                    if ($value === '') {
                        $value = null;
                    } elseif (strpos($value, '#') === 0) {
                        // allow in-page anchors
                    } else {
                        $sanitized = filter_var($value, FILTER_SANITIZE_URL);
                        $value = $sanitized ?: null;
                    }
                } elseif ($field === 'hero_slideshow_speed') {
                    $value = (int) $value;
                    if ($value <= 0) {
                        $value = 6000;
                    }
                } elseif (is_string($value)) {
                    $value = trim($value);
                }
                
                $fields[] = "$field = ?";
                $params[] = $value;
                $writtenFields[] = $field;
            }
        }

        if (empty($fields)) {
            ErrorHandler::send('No updatable fields provided', 400);
        }

        $sql = 'UPDATE site_settings SET ' . implode(', ', $fields) . ' WHERE id = 1';
        
        try {
            $affected = $this->db->update($sql, $params);
            if ($affected === 0) {
                $context = [
                    'fields' => $writtenFields,
                    'hero_images_count' => is_array($heroImagesAfter) ? count($heroImagesAfter) : null
                ];
                Logger::warning('Site settings update touched 0 rows', $context);
                http_response_code(409);
                $this->sendNoCacheHeaders();
                $errorResponse = [
                    'success' => false,
                    'message' => 'No settings were updated. Please make changes before saving.'
                ];
                if (!Config::isProduction()) {
                    $errorResponse['debug'] = $context;
                }
                echo json_encode($errorResponse);
                return;
            }

            $freshRow = $this->db->fetchOne('SELECT hero_images, hero_slideshow_speed FROM site_settings WHERE id = 1') ?: [];
            $storedHeroImages = [];
            if (!empty($freshRow['hero_images'])) {
                $decoded = json_decode($freshRow['hero_images'], true);
                if (is_array($decoded)) {
                    $storedHeroImages = $decoded;
                }
            }

            if ($heroImagesAfter !== null) {
                $beforeIds = array_map(function ($entry) {
                    return isset($entry['id']) ? (int) $entry['id'] : null;
                }, $heroImagesBefore);
                $beforeIds = array_values(array_filter($beforeIds, function ($id) {
                    return $id !== null;
                }));
                $afterIds = array_map(function ($entry) {
                    return isset($entry['id']) ? (int) $entry['id'] : null;
                }, $heroImagesAfter);
                $afterIds = array_values(array_filter($afterIds, function ($id) {
                    return $id !== null;
                }));

                $added = array_values(array_diff($afterIds, $beforeIds));
                $removed = array_values(array_diff($beforeIds, $afterIds));
                $idsChanged = $beforeIds !== $afterIds;

                if (!empty($added)) {
                    AuditLog::record('hero_slideshow_select', [
                        'actor_type' => 'admin',
                        'actor_id' => $user['id'] ?? null,
                        'entity_type' => 'site_settings',
                        'entity_id' => 1,
                        'meta' => ['ids' => $added]
                    ]);
                }

                if (!empty($removed)) {
                    AuditLog::record('hero_slideshow_remove', [
                        'actor_type' => 'admin',
                        'actor_id' => $user['id'] ?? null,
                        'entity_type' => 'site_settings',
                        'entity_id' => 1,
                        'meta' => ['ids' => $removed]
                    ]);
                }

                if ($idsChanged && empty($added) && empty($removed)) {
                    AuditLog::record('hero_slideshow_reorder', [
                        'actor_type' => 'admin',
                        'actor_id' => $user['id'] ?? null,
                        'entity_type' => 'site_settings',
                        'entity_id' => 1,
                        'meta' => ['order' => $afterIds]
                    ]);
                }

                $beforeJson = json_encode($heroImagesBefore);
                $afterJson = json_encode($heroImagesAfter);
                if ($beforeJson !== $afterJson && empty($added) && empty($removed) && !$idsChanged) {
                    AuditLog::record('hero_slideshow_meta_update', [
                        'actor_type' => 'admin',
                        'actor_id' => $user['id'] ?? null,
                        'entity_type' => 'site_settings',
                        'entity_id' => 1,
                        'meta' => ['ids' => $afterIds]
                    ]);
                }
            }

            if (!Config::isProduction()) {
                Logger::info('site_settings.hero_update', [
                    'fields' => $writtenFields,
                    'rows_affected' => $affected,
                    'stored_hero_images' => $storedHeroImages
                ]);
            }

            $this->sendNoCacheHeaders();
            $response = [
                'success' => true,
                'message' => 'Settings updated',
                'settings' => [
                    'hero_images' => $storedHeroImages,
                    'hero_slideshow_speed' => isset($freshRow['hero_slideshow_speed'])
                        ? (int) $freshRow['hero_slideshow_speed']
                        : (int) ($existing['hero_slideshow_speed'] ?? 6000)
                ]
            ];

            if (!Config::isProduction()) {
                $response['debug'] = [
                    'rows_affected' => $affected,
                    'fields' => $writtenFields,
                    'hero_images_json' => $freshRow['hero_images'] ?? null
                ];
            }

            echo json_encode($response);
        } catch (PDOException $e) {
            Logger::error('Failed to update site_settings', ['error' => $e->getMessage()]);
            $this->sendNoCacheHeaders();
            throw $e;
        }
    }

    /**
     * PUT /api/business-hours/:id - Update business hours
     */
    public function updateBusinessHours($id) {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $openingTime = $input['opening_time'] ?? null;
        $closingTime = $input['closing_time'] ?? null;
        $isClosed = $input['is_closed'] ?? null;

        $this->db->update(
            'UPDATE business_hours SET opening_time = ?, closing_time = ?, is_closed = ? WHERE id = ?',
            [$openingTime, $closingTime, $isClosed, $id]
        );

        echo json_encode(['message' => 'Hours updated']);
    }

    /**
     * PUT /api/about - Update about content
     */
    public function updateAbout() {
        AdminAuthMiddleware::require();

        $input = json_decode(file_get_contents('php://input'), true);
        $header = $input['header'] ?? null;
        $paragraph = $input['paragraph'] ?? null;
        $phone = $input['phone'] ?? null;
        $email = $input['email'] ?? null;
        $address = $input['address'] ?? null;
        $mapEmbedUrl = $input['map_embed_url'] ?? null;

        $this->db->update(
            'UPDATE about_content SET header = ?, paragraph = ?, phone = ?, email = ?, address = ?, map_embed_url = ? WHERE id = 1',
            [$header, $paragraph, $phone, $email, $address, $mapEmbedUrl]
        );

        echo json_encode(['message' => 'About content updated']);
    }
}
