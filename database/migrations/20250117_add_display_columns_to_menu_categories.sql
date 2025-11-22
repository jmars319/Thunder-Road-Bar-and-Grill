-- Migration: add display_columns to menu_categories for column layout support
-- This allows categories like ice cream flavors to be displayed in 2-3 columns

ALTER TABLE menu_categories
ADD COLUMN display_columns INT DEFAULT 1 COMMENT '1=single column, 2=two columns, 3=three columns';

-- Default all existing categories to single column
UPDATE menu_categories SET display_columns = 1 WHERE display_columns IS NULL;
