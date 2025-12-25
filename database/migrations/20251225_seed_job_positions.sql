-- Migration: seed/update default job positions with descriptions and display order
-- Date: 2025-12-25

DROP PROCEDURE IF EXISTS upsert_job_position;
DELIMITER $$
CREATE PROCEDURE upsert_job_position(
    IN p_name VARCHAR(150),
    IN p_description TEXT,
    IN p_display_order INT,
    IN p_is_active BOOLEAN
)
BEGIN
    DECLARE existing INT;
    SELECT id INTO existing
    FROM job_positions
    WHERE name COLLATE utf8mb4_unicode_ci = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    IF existing IS NULL THEN
        INSERT INTO job_positions (name, description, display_order, is_active)
        VALUES (p_name, p_description, p_display_order, p_is_active);
    ELSE
        UPDATE job_positions
        SET description = p_description,
            display_order = p_display_order,
            is_active = p_is_active
        WHERE id = existing;
    END IF;
END$$
DELIMITER ;

CALL upsert_job_position('Server', 'Front-of-house pros who keep drinks full, food moving, and vibes high.', 10, TRUE);
CALL upsert_job_position('Bartender', 'Craft cocktails, keep taps flowing, and own the bar experience.', 20, TRUE);
CALL upsert_job_position('Line Cook', 'Work the grill, sauté, and fry stations with speed and consistency.', 30, TRUE);
CALL upsert_job_position('Prep Cook', 'Handle prep lists, sauces, and assist the line during heavy rushes.', 40, TRUE);
CALL upsert_job_position('Dishwasher', 'Keep the heart of the kitchen clean and ready — dish, sanitize, reset.', 50, TRUE);
CALL upsert_job_position('Host', 'First impressions expert — greet guests, manage the waitlist, seat the floor.', 60, TRUE);
CALL upsert_job_position('Barback', 'Support bartenders with restocks, ice, garnishes, and quick hands.', 70, TRUE);
CALL upsert_job_position('Shift Lead', 'Help manage teams on busy nights, coach staff, and handle guest escalations.', 80, TRUE);

DROP PROCEDURE IF EXISTS upsert_job_position;
