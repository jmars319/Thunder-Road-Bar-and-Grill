-- Migration: add menu_description to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS menu_description TEXT NULL DEFAULT NULL;

-- Backfill a friendly default if empty
UPDATE site_settings SET menu_description = 'Our kitchen serves scratch-made favorites with seasonal ingredients. Browse by category for details and prices.' WHERE id = 1 AND (menu_description IS NULL OR menu_description = '');
