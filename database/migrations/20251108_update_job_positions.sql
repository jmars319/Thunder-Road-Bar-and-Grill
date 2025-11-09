-- Migration: 20251108_update_job_positions.sql
-- Purpose: Align job_positions rows with the current public positions.
-- Actions:
-- 1) Rename 'Host' -> 'Cashier' if a 'Cashier' row does not already exist.
-- 2) If 'Cashier' already exists, remove any 'Host' rows to avoid duplication.
-- 3) Remove any 'Prep Cook' rows (these positions are no longer used).

START TRANSACTION;

-- 1) If there is no Cashier, rename Host -> Cashier
UPDATE job_positions
SET name = 'Cashier'
WHERE name = 'Host'
  AND (SELECT COUNT(*) FROM job_positions WHERE name = 'Cashier') = 0;

-- 2) If Cashier already exists, mark any Host rows inactive to avoid duplicates
UPDATE job_positions
SET is_active = 0
WHERE name = 'Host'
  AND (SELECT COUNT(*) FROM job_positions WHERE name = 'Cashier') > 0;

-- 3) Mark Prep Cook rows inactive (preserve history)
UPDATE job_positions
SET is_active = 0
WHERE name = 'Prep Cook';

COMMIT;

-- Notes:
-- - This migration is intentionally idempotent: running it multiple times will not create duplicates.
-- - It uses non-destructive updates (marks rows inactive) to preserve historical data.
