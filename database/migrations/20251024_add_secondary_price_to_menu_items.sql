-- Add per-item quantity and secondary price fields for menu items
ALTER TABLE menu_items
  ADD COLUMN primary_quantity VARCHAR(64) DEFAULT NULL,
  ADD COLUMN secondary_quantity VARCHAR(64) DEFAULT NULL,
  ADD COLUMN secondary_price DECIMAL(10,2) DEFAULT NULL;
