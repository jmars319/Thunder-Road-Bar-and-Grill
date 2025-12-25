-- Migration: add status column to contact_messages
SET @has_status_column := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'contact_messages' 
    AND COLUMN_NAME = 'status'
);

SET @add_status_sql := IF(
  @has_status_column = 0,
  'ALTER TABLE contact_messages ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''new'';',
  'SELECT ''column_exists'';'
);

PREPARE stmt FROM @add_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE contact_messages
SET status = CASE
  WHEN is_read = 1 THEN 'responded'
  ELSE 'new'
END
WHERE status = 'new' AND id > 0;
