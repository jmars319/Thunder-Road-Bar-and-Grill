-- Migration: add audit log indexes for performance
SET @has_idx_created := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'audit_log'
    AND INDEX_NAME = 'idx_created_at'
);

SET @add_idx_created_sql := IF(
  @has_idx_created = 0,
  'ALTER TABLE audit_log ADD INDEX idx_created_at (created_at);',
  'SELECT "idx_created_at exists";'
);
PREPARE stmt FROM @add_idx_created_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_actor := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'audit_log'
    AND INDEX_NAME = 'idx_actor_type'
);

SET @add_idx_actor_sql := IF(
  @has_idx_actor = 0,
  'ALTER TABLE audit_log ADD INDEX idx_actor_type (actor_type, actor_id, created_at);',
  'SELECT "idx_actor_type exists";'
);
PREPARE stmt FROM @add_idx_actor_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_entity := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'audit_log'
    AND INDEX_NAME = 'idx_entity_created'
);

SET @add_idx_entity_sql := IF(
  @has_idx_entity = 0,
  'ALTER TABLE audit_log ADD INDEX idx_entity_created (entity_type, entity_id, created_at);',
  'SELECT "idx_entity_created exists";'
);
PREPARE stmt FROM @add_idx_entity_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
