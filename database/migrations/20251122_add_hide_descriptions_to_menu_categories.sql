-- Migration: add hide_descriptions to menu_categories
-- This allows hiding item descriptions for simple menu categories (e.g., ice cream flavors)

ALTER TABLE menu_categories
ADD COLUMN hide_descriptions TINYINT(1) DEFAULT 0 COMMENT 'Hide item descriptions in menu display';

-- Default all existing categories to show descriptions
UPDATE menu_categories SET hide_descriptions = 0 WHERE hide_descriptions IS NULL;
