-- Migration: 20251109_add_area_to_business_hours.sql
-- Purpose: Add an 'area' column to business_hours to support multiple sets of hours (e.g., 'kitchen', 'bar').
-- Actions:
-- 1) Add column `area` with default 'kitchen'.
-- 2) Backfill existing rows to 'kitchen'.
-- 3) Insert a matching set of 'bar' rows for each day if no 'bar' rows exist (duplicates current times).

START TRANSACTION;

-- 1) Add the column if it doesn't exist
ALTER TABLE business_hours
  ADD COLUMN IF NOT EXISTS area VARCHAR(32) NOT NULL DEFAULT 'kitchen';

-- 2) Explicitly set existing rows to 'kitchen' where NULL
UPDATE business_hours SET area = 'kitchen' WHERE area IS NULL OR area = '';

-- 3) Insert bar rows only if none exist for that day
INSERT INTO business_hours (day_of_week, opening_time, closing_time, is_closed, area)
SELECT bh.day_of_week, bh.opening_time, bh.closing_time, bh.is_closed, 'bar'
FROM business_hours bh
WHERE bh.area = 'kitchen'
  AND NOT EXISTS (
    SELECT 1 FROM business_hours b2 WHERE b2.day_of_week = bh.day_of_week AND b2.area = 'bar'
  )
GROUP BY bh.day_of_week, bh.opening_time, bh.closing_time, bh.is_closed;

COMMIT;

-- Notes:
-- - This migration is idempotent: re-running will not create duplicate 'bar' rows.
-- - If you prefer 'bar' to default to closed, modify the SELECT above to set is_closed = 1 for inserted rows.
