-- MMH Image Pipeline Migration (PHP backend)
-- Adds responsive image metadata columns to media_library.
-- Run once; ignore errors if columns already exist.

ALTER TABLE media_library
  ADD COLUMN width INT NULL AFTER file_size,
  ADD COLUMN height INT NULL AFTER width,
  ADD COLUMN checksum VARCHAR(64) NULL AFTER height,
  ADD COLUMN caption VARCHAR(255) NULL AFTER alt_text,
  ADD COLUMN optimized_path VARCHAR(255) NULL AFTER category,
  ADD COLUMN webp_path VARCHAR(255) NULL AFTER optimized_path,
  ADD COLUMN optimized_srcset TEXT NULL AFTER webp_path,
  ADD COLUMN webp_srcset TEXT NULL AFTER optimized_srcset,
  ADD COLUMN responsive_variants LONGTEXT NULL AFTER webp_srcset,
  ADD COLUMN manifest_path VARCHAR(255) NULL AFTER responsive_variants,
  ADD COLUMN uploader VARCHAR(100) NULL AFTER manifest_path,
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ready' AFTER uploader,
  ADD COLUMN processing_notes TEXT NULL AFTER status,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER uploaded_at;

ALTER TABLE media_library
  ADD INDEX idx_uploaded_at (uploaded_at);
