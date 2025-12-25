-- Migration: add job sidebar fields to site_settings
-- Date: 2025-12-25

DROP PROCEDURE IF EXISTS add_job_sidebar_column;
DELIMITER $$
CREATE PROCEDURE add_job_sidebar_column(
    IN p_name VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    DECLARE col_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'site_settings'
      AND COLUMN_NAME = p_name;

    IF col_exists = 0 THEN
        SET @sql_stmt = CONCAT('ALTER TABLE site_settings ADD COLUMN ', p_definition);
        PREPARE stmt FROM @sql_stmt;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL add_job_sidebar_column('jobs_sidebar_heading', 'jobs_sidebar_heading VARCHAR(255) NULL DEFAULT NULL');
CALL add_job_sidebar_column('jobs_sidebar_intro', 'jobs_sidebar_intro TEXT NULL');
CALL add_job_sidebar_column('jobs_sidebar_benefits', 'jobs_sidebar_benefits TEXT NULL');
CALL add_job_sidebar_column('jobs_positions_label', 'jobs_positions_label VARCHAR(255) NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS add_job_sidebar_column;

UPDATE site_settings
SET
  jobs_sidebar_heading = COALESCE(jobs_sidebar_heading, 'Work with the Thunder Road crew'),
  jobs_sidebar_intro = COALESCE(jobs_sidebar_intro, 'Our team brings the energy every night. Here are a few reasons people love working here:'),
  jobs_sidebar_benefits = COALESCE(jobs_sidebar_benefits, '<ul><li>Shift meals + staff discounts</li><li>Flexible scheduling</li><li>Room to grow into bar, kitchen, or management roles</li></ul>'),
  jobs_positions_label = COALESCE(jobs_positions_label, 'Open Positions')
WHERE id = 1;
