-- Migration: add hero_slideshow_speed column for configurable hero slideshow timing

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
