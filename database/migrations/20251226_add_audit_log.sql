-- Migration: add audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_type ENUM('admin','public','system') NOT NULL DEFAULT 'system',
  actor_id INT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(100) NULL,
  meta_json JSON NULL,
  KEY idx_action_created (action, created_at),
  KEY idx_entity (entity_type, entity_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
