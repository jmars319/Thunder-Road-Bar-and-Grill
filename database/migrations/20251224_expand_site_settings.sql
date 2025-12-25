-- Migration: expand site_settings with global content fields

DELIMITER $$
CREATE PROCEDURE add_site_settings_column_if_missing(
    IN col_name VARCHAR(64),
    IN col_definition TEXT
)
BEGIN
    DECLARE col_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'site_settings'
      AND COLUMN_NAME = col_name;

    IF col_exists = 0 THEN
        SET @alter_sql = CONCAT('ALTER TABLE site_settings ADD COLUMN ', col_definition);
        PREPARE stmt FROM @alter_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL add_site_settings_column_if_missing('hero_title', 'hero_title VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('hero_subtitle', 'hero_subtitle VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('hero_cta_primary_label', 'hero_cta_primary_label VARCHAR(150) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('hero_cta_primary_href', 'hero_cta_primary_href VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('hero_cta_secondary_label', 'hero_cta_secondary_label VARCHAR(150) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('hero_cta_secondary_href', 'hero_cta_secondary_href VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('menu_heading', 'menu_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('menu_intro', 'menu_intro TEXT NULL');
CALL add_site_settings_column_if_missing('reservations_heading', 'reservations_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('reservations_intro', 'reservations_intro TEXT NULL');
CALL add_site_settings_column_if_missing('reservations_success_copy', 'reservations_success_copy TEXT NULL');
CALL add_site_settings_column_if_missing('reservations_error_copy', 'reservations_error_copy TEXT NULL');
CALL add_site_settings_column_if_missing('about_heading', 'about_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('about_intro', 'about_intro TEXT NULL');
CALL add_site_settings_column_if_missing('jobs_heading', 'jobs_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_site_settings_column_if_missing('jobs_intro', 'jobs_intro TEXT NULL');
CALL add_site_settings_column_if_missing('jobs_success_copy', 'jobs_success_copy TEXT NULL');
CALL add_site_settings_column_if_missing('jobs_error_copy', 'jobs_error_copy TEXT NULL');

DROP PROCEDURE IF EXISTS add_site_settings_column_if_missing;

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
  jobs_error_copy = COALESCE(jobs_error_copy, 'Submission failed. Please fix the highlighted fields.')
WHERE id = 1;
