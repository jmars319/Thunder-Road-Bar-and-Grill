-- Thunder Road December 2025 Full Stack Upgrade (idempotent)
-- Compatible with MySQL 5.7+/MariaDB 10.2+ and Workbench/GoDaddy
-- Bundles:
--   1) Media pipeline metadata columns
--   2) Contact message status workflow
--   3) Expanded site_settings copy fields
--   4) UTF-8 (utf8mb4) conversion for DB/tables

/* ------------------------------------------------------------
   1) Media pipeline columns
------------------------------------------------------------- */
SET @media_cols := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'media_library'
    AND COLUMN_NAME = 'responsive_variants'
);

SET @media_sql := IF(
  @media_cols = 0,
  'ALTER TABLE media_library
      ADD COLUMN width INT NULL AFTER file_size,
      ADD COLUMN height INT NULL AFTER width,
      ADD COLUMN checksum VARCHAR(64) NULL AFTER height,
      ADD COLUMN caption VARCHAR(255) NULL AFTER alt_text,
      ADD COLUMN optimized_path VARCHAR(255) NULL AFTER category,
      ADD COLUMN webp_path VARCHAR(255) NULL AFTER optimized_path,
      ADD COLUMN optimized_srcset TEXT NULL AFTER webp_path,
      ADD COLUMN webp_srcset TEXT NULL AFTER optimized_srcset,
      ADD COLUMN responsive_variants LONGTEXT NULL AFTER webp_srcset,
      ADD COLUMN manifest_path VARCHAR(255) NULL AFTER responsive_variants,
      ADD COLUMN uploader VARCHAR(100) NULL AFTER manifest_path,
      ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT ''ready'' AFTER uploader,
      ADD COLUMN processing_notes TEXT NULL AFTER status,
      ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER uploaded_at;',
  'SELECT ''media columns already present'';'
);

PREPARE stmt FROM @media_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_uploaded_idx := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'media_library'
    AND INDEX_NAME = 'idx_uploaded_at'
);

SET @add_uploaded_idx_sql := IF(
  @has_uploaded_idx = 0,
  'ALTER TABLE media_library ADD INDEX idx_uploaded_at (uploaded_at);',
  'SELECT ''idx_uploaded_at already exists'';'
);

PREPARE stmt FROM @add_uploaded_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ------------------------------------------------------------
   1b) Audit log table (safe to re-run)
------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS audit_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_type ENUM('admin','public','system') NOT NULL DEFAULT 'system',
  actor_id INT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(100) NULL,
  meta_json JSON NULL,
  KEY idx_action_created (action, created_at),
  KEY idx_created_at (created_at),
  KEY idx_actor_type (actor_type, actor_id, created_at),
  KEY idx_entity_created (entity_type, entity_id, created_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ------------------------------------------------------------
   2) Contact messages status
------------------------------------------------------------- */
SET @contact_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contact_messages'
    AND COLUMN_NAME = 'status'
);

SET @contact_sql := IF(
  @contact_status = 0,
  'ALTER TABLE contact_messages ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''new'';',
  'SELECT ''contact status already present'';'
);

PREPARE stmt FROM @contact_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE contact_messages
SET status = CASE WHEN is_read = 1 THEN 'responded' ELSE 'new' END
WHERE status = 'new' AND id > 0;

/* ------------------------------------------------------------
   3) Expanded site_settings copy fields
------------------------------------------------------------- */
DROP PROCEDURE IF EXISTS add_site_settings_column;

DELIMITER $$
CREATE PROCEDURE add_site_settings_column(
    IN p_name VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    DECLARE col_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'site_settings'
      AND COLUMN_NAME = p_name;

    IF col_exists = 0 THEN
        SET @sql_stmt = CONCAT('ALTER TABLE site_settings ADD COLUMN ', p_definition);
        PREPARE stmt FROM @sql_stmt;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL add_site_settings_column('hero_title', 'hero_title VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('hero_subtitle', 'hero_subtitle VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('hero_cta_primary_label', 'hero_cta_primary_label VARCHAR(150) NULL DEFAULT NULL');
CALL add_site_settings_column('hero_cta_primary_href', 'hero_cta_primary_href VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('hero_cta_secondary_label', 'hero_cta_secondary_label VARCHAR(150) NULL DEFAULT NULL');
CALL add_site_settings_column('hero_cta_secondary_href', 'hero_cta_secondary_href VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('menu_heading', 'menu_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('menu_intro', 'menu_intro TEXT NULL');
CALL add_site_settings_column('reservations_heading', 'reservations_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('reservations_intro', 'reservations_intro TEXT NULL');
CALL add_site_settings_column('reservations_success_copy', 'reservations_success_copy TEXT NULL');
CALL add_site_settings_column('reservations_error_copy', 'reservations_error_copy TEXT NULL');
CALL add_site_settings_column('about_heading', 'about_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('about_intro', 'about_intro TEXT NULL');
CALL add_site_settings_column('jobs_heading', 'jobs_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('jobs_intro', 'jobs_intro TEXT NULL');
CALL add_site_settings_column('jobs_success_copy', 'jobs_success_copy TEXT NULL');
CALL add_site_settings_column('jobs_error_copy', 'jobs_error_copy TEXT NULL');
CALL add_site_settings_column('jobs_sidebar_heading', 'jobs_sidebar_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column('jobs_sidebar_intro', 'jobs_sidebar_intro TEXT NULL');
CALL add_site_settings_column('jobs_sidebar_benefits', 'jobs_sidebar_benefits TEXT NULL');
CALL add_site_settings_column('jobs_positions_label', 'jobs_positions_label VARCHAR(255) NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS add_site_settings_column;

UPDATE site_settings
SET
  hero_title = COALESCE(hero_title, 'Welcome to Thunder Road Bar and Grill'),
  hero_subtitle = COALESCE(hero_subtitle, 'Great Food. Cold Drinks. Good Times.'),
  hero_cta_primary_label = COALESCE(hero_cta_primary_label, 'View Menu'),
  hero_cta_primary_href = COALESCE(hero_cta_primary_href, '#menu'),
  hero_cta_secondary_label = COALESCE(hero_cta_secondary_label, 'Make a Reservation'),
  hero_cta_secondary_href = COALESCE(hero_cta_secondary_href, '#reservations'),
  menu_heading = COALESCE(menu_heading, 'Our Menu'),
  menu_intro = COALESCE(menu_intro, 'Our kitchen serves scratch-made favorites with seasonal ingredients. Browse by category for details and prices.'),
  reservations_heading = COALESCE(reservations_heading, 'Make a Reservation'),
  reservations_intro = COALESCE(reservations_intro, 'Let us know when you are planning to visit and we''ll confirm as soon as possible.'),
  reservations_success_copy = COALESCE(reservations_success_copy, 'Reservation submitted! We''ll contact you to confirm.'),
  reservations_error_copy = COALESCE(reservations_error_copy, 'We could not submit your reservation. Please fix the highlighted fields.'),
  about_heading = COALESCE(about_heading, 'About Us'),
  about_intro = COALESCE(about_intro, 'Thunder Road Bar & Grill is your neighborhood spot for live music, great drinks, and a welcoming crowd.'),
  jobs_heading = COALESCE(jobs_heading, 'Join our team'),
  jobs_intro = COALESCE(jobs_intro, 'We''re hiring friendly, reliable people. Fill out the short form below to apply.'),
  jobs_success_copy = COALESCE(jobs_success_copy, 'Application submitted — thank you!'),
  jobs_error_copy = COALESCE(jobs_error_copy, 'Submission failed. Please fix the highlighted fields.'),
  jobs_sidebar_heading = COALESCE(jobs_sidebar_heading, 'Work with the Thunder Road crew'),
  jobs_sidebar_intro = COALESCE(jobs_sidebar_intro, 'Our team brings the energy every night. Here are a few reasons people love working here:'),
  jobs_sidebar_benefits = COALESCE(jobs_sidebar_benefits, '<ul><li>Shift meals + staff discounts</li><li>Flexible scheduling</li><li>Room to grow into bar, kitchen, or management roles</li></ul>'),
  jobs_positions_label = COALESCE(jobs_positions_label, 'Open Positions')
WHERE id = 1;

/* ------------------------------------------------------------
   3b) Hero slideshow speed
------------------------------------------------------------- */
SET @has_hero_speed := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'site_settings'
    AND COLUMN_NAME = 'hero_slideshow_speed'
);

SET @hero_speed_sql := IF(
  @has_hero_speed = 0,
  'ALTER TABLE site_settings ADD COLUMN hero_slideshow_speed INT NOT NULL DEFAULT 6000;',
  'SELECT 1;'
);

PREPARE stmt FROM @hero_speed_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE site_settings
SET hero_slideshow_speed = COALESCE(hero_slideshow_speed, 6000)
WHERE id = 1;

/* ------------------------------------------------------------
   3c) Normalize hero_images defaults
------------------------------------------------------------- */
UPDATE site_settings
SET hero_images = '[]'
WHERE id = 1
  AND (
    hero_images IS NULL
    OR TRIM(hero_images) = ''
    OR LOWER(TRIM(hero_images)) = 'null'
  );

/* ------------------------------------------------------------
   3d) Ensure job_positions/application_fields tables exist
------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS job_positions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_fields (
  id INT PRIMARY KEY AUTO_INCREMENT,
  field_name VARCHAR(150) NOT NULL,
  field_type VARCHAR(50) DEFAULT 'text',
  required BOOLEAN DEFAULT FALSE,
  options TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ------------------------------------------------------------
   3d) Default job positions content
------------------------------------------------------------- */
DROP PROCEDURE IF EXISTS upsert_job_position;
DELIMITER $$
CREATE PROCEDURE upsert_job_position(
    IN p_name VARCHAR(150),
    IN p_description TEXT,
    IN p_display_order INT,
    IN p_is_active BOOLEAN
)
BEGIN
    DECLARE existing INT;
    SELECT id INTO existing
    FROM job_positions
    WHERE name COLLATE utf8mb4_unicode_ci = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    IF existing IS NULL THEN
        INSERT INTO job_positions (name, description, display_order, is_active)
        VALUES (p_name, p_description, p_display_order, p_is_active);
    ELSE
        UPDATE job_positions
        SET description = p_description,
            display_order = p_display_order,
            is_active = p_is_active
        WHERE id = existing;
    END IF;
END$$
DELIMITER ;

CALL upsert_job_position('Server', 'Front-of-house pros who keep drinks full, food moving, and vibes high.', 10, TRUE);
CALL upsert_job_position('Bartender', 'Craft cocktails, keep taps flowing, and own the bar experience.', 20, TRUE);
CALL upsert_job_position('Line Cook', 'Work the grill, sauté, and fry stations with speed and consistency.', 30, TRUE);
CALL upsert_job_position('Prep Cook', 'Handle prep lists, sauces, and assist the line during heavy rushes.', 40, TRUE);
CALL upsert_job_position('Dishwasher', 'Keep the heart of the kitchen clean and ready — dish, sanitize, reset.', 50, TRUE);
CALL upsert_job_position('Host', 'First impressions expert — greet guests, manage the waitlist, seat the floor.', 60, TRUE);
CALL upsert_job_position('Barback', 'Support bartenders with restocks, ice, garnishes, and quick hands.', 70, TRUE);
CALL upsert_job_position('Shift Lead', 'Help manage teams on busy nights, coach staff, and handle guest escalations.', 80, TRUE);

DROP PROCEDURE IF EXISTS upsert_job_position;

/* ------------------------------------------------------------
   3e) Menu category/item enhancements
------------------------------------------------------------- */
SET @has_gallery_image_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'menu_categories'
    AND COLUMN_NAME = 'gallery_image_id'
);

SET @add_gallery_image_sql := IF(
  @has_gallery_image_id = 0,
  'ALTER TABLE menu_categories ADD COLUMN gallery_image_id INT NULL DEFAULT NULL AFTER image_url;',
  'SELECT ''menu_categories.gallery_image_id already exists'';'
);

PREPARE stmt FROM @add_gallery_image_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_primary_quantity := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'menu_items'
    AND COLUMN_NAME = 'primary_quantity'
);

SET @add_primary_quantity_sql := IF(
  @has_primary_quantity = 0,
  'ALTER TABLE menu_items
      ADD COLUMN primary_quantity VARCHAR(64) DEFAULT NULL AFTER price,
      ADD COLUMN secondary_quantity VARCHAR(64) DEFAULT NULL AFTER primary_quantity,
      ADD COLUMN secondary_price DECIMAL(10,2) DEFAULT NULL AFTER secondary_quantity;',
  'SELECT ''menu_items quantity columns already exist'';'
);

PREPARE stmt FROM @add_primary_quantity_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* ------------------------------------------------------------
   4) UTF-8 (utf8mb4) conversion
------------------------------------------------------------- */
ALTER DATABASE thunder_road CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET foreign_key_checks = 0;

ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE site_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE navigation_links CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE menu_categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE menu_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reservations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE job_applications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE media_library CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE newsletter_subscribers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE contact_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE business_hours CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE about_content CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE footer_columns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE footer_links CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
