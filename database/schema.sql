-- ============================================
-- Thunder Road - Complete Database Schema
-- For MySQL Workbench
-- ============================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS thunder_road CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE thunder_road;
ALTER DATABASE thunder_road CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET NAMES utf8mb4;

-- ============================================
-- AUTHENTICATION & USERS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  full_name VARCHAR(100),
  role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (username: admin, password: admin123)
-- Password is bcrypt-hashed (cost factor 10)
-- IMPORTANT: Change this password immediately after deployment!
INSERT INTO users (username, password_hash, email, full_name, role) 
VALUES ('admin', '$2y$10$/r68NL6iotpmBzCQ8QCEYeTUJFIziMZiDGdMt7jVxqywMmBk8MoTC', 'admin@thunderroad.com', 'Admin User', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- ============================================
-- SITE SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  business_name VARCHAR(100) DEFAULT 'Thunder Road Bar and Grill',
  tagline VARCHAR(200) DEFAULT 'Great Food. Cold Drinks. Good Times.',
  logo_url VARCHAR(255),
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  google VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  hero_title VARCHAR(255),
  hero_subtitle VARCHAR(255),
  hero_cta_primary_label VARCHAR(150),
  hero_cta_primary_href VARCHAR(255),
  hero_cta_secondary_label VARCHAR(150),
  hero_cta_secondary_href VARCHAR(255),
  hero_slideshow_speed INT DEFAULT 6000,
  menu_heading VARCHAR(255),
  menu_intro TEXT,
  reservations_heading VARCHAR(255),
  reservations_intro TEXT,
  reservations_success_copy TEXT,
  reservations_error_copy TEXT,
  about_heading VARCHAR(255),
  about_intro TEXT,
  jobs_heading VARCHAR(255),
  jobs_intro TEXT,
  jobs_success_copy TEXT,
  jobs_error_copy TEXT,
  jobs_sidebar_heading VARCHAR(255),
  jobs_sidebar_intro TEXT,
  jobs_sidebar_benefits TEXT,
  jobs_positions_label VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO site_settings (
  id, business_name, tagline, phone, email, address,
  hero_title, hero_subtitle, hero_cta_primary_label, hero_cta_primary_href,
  hero_cta_secondary_label, hero_cta_secondary_href,
  hero_slideshow_speed,
  menu_heading, menu_intro,
  reservations_heading, reservations_intro, reservations_success_copy, reservations_error_copy,
  about_heading, about_intro,
  jobs_heading, jobs_intro, jobs_success_copy, jobs_error_copy,
  jobs_sidebar_heading, jobs_sidebar_intro, jobs_sidebar_benefits, jobs_positions_label
)
VALUES (
  1,
  'Thunder Road Bar and Grill',
  'Great Food. Cold Drinks. Good Times.',
  '(555) 123-4567',
  'info@thunderroad.com',
  '123 Main Street, Anytown, USA 12345',
  'Welcome to Thunder Road Bar and Grill',
  'Great Food. Cold Drinks. Good Times.',
  'View Menu',
  '#menu',
  'Make a Reservation',
  '#reservations',
  6000,
  'Our Menu',
  'Our kitchen serves scratch-made favorites with seasonal ingredients. Browse by category for details and prices.',
  'Make a Reservation',
  'Let us know when you are planning to visit and we''ll confirm as soon as possible.',
  'Reservation submitted! We''ll contact you to confirm.',
  'We could not submit your reservation. Please fix the highlighted fields.',
  'About Us',
  'Thunder Road Bar & Grill is your neighborhood spot for live music, great drinks, and a welcoming crowd.',
  'Join our team',
  'We''re hiring friendly, reliable people. Fill out the short form below to apply.',
  'Application submitted — thank you!',
  'Submission failed. Please fix the highlighted fields.',
  'Work with the Thunder Road crew',
  'Our team brings the energy every night. Here are a few reasons people love working here:',
  '<ul><li>Shift meals + staff discounts</li><li>Flexible scheduling</li><li>Room to grow into bar, kitchen, or management roles</li></ul>',
  'Open Positions'
)
ON DUPLICATE KEY UPDATE id = id;

-- NOTE: If you're upgrading an existing database, run the following ALTER statements
-- to add the new social columns without wiping existing data:
-- ALTER TABLE site_settings ADD COLUMN instagram VARCHAR(255);
-- ALTER TABLE site_settings ADD COLUMN facebook VARCHAR(255);

-- ============================================
-- NAVIGATION
-- ============================================

CREATE TABLE IF NOT EXISTS navigation_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  label VARCHAR(50) NOT NULL,
  url VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default navigation
INSERT INTO navigation_links (label, url, display_order) VALUES
('Home', '#home', 1),
('Menu', '#menu', 2),
('Reservations', '#reservations', 3),
('About', '#about', 4),
('Contact', '#contact', 5)
ON DUPLICATE KEY UPDATE label = label;

-- ============================================
-- MENU SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  display_order INT DEFAULT 0,
  display_columns INT DEFAULT 1 COMMENT '1=single column, 2=two columns, 3=three columns',
  hide_descriptions TINYINT(1) DEFAULT 0 COMMENT 'Hide item descriptions in menu display',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  display_order INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample menu data
INSERT INTO menu_categories (name, description, display_order) VALUES
('Appetizers', 'Start your meal right', 1),
('Main Courses', 'Hearty entrees and favorites', 2),
('Burgers & Sandwiches', 'Classic American favorites', 3),
('Beverages', 'Drinks and refreshments', 4),
('Desserts', 'Sweet endings', 5)
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO menu_items (category_id, name, description, price, display_order) VALUES
(1, 'Wings', 'Buffalo, BBQ, or Honey Garlic - 1 lb', 12.99, 1),
(1, 'Loaded Nachos', 'Cheese, jalape\u00f1os, sour cream, salsa', 10.99, 2),
(1, 'Mozzarella Sticks', 'With marinara sauce', 8.99, 3),
(2, 'Ribeye Steak', '12oz ribeye with choice of sides', 28.99, 1),
(2, 'Grilled Salmon', 'Atlantic salmon with seasonal vegetables', 24.99, 2),
(2, 'BBQ Ribs', 'Full rack with coleslaw and fries', 22.99, 3),
(3, 'Thunder Burger', 'Double patty, bacon, cheese, special sauce', 15.99, 1),
(3, 'Chicken Club', 'Grilled chicken, bacon, lettuce, tomato', 13.99, 2),
(3, 'Pulled Pork Sandwich', 'Slow-cooked BBQ pork', 12.99, 3)
ON DUPLICATE KEY UPDATE name = name;

-- ============================================
-- RESERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS reservations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  number_of_guests INT NOT NULL,
  special_requests TEXT,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (reservation_date),
  INDEX idx_status (status)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- JOB APPLICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS job_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  position VARCHAR(100) NOT NULL,
  experience TEXT,
  availability VARCHAR(255),
  cover_letter TEXT,
  resume_url VARCHAR(255),
  status ENUM('new', 'reviewing', 'interviewed', 'hired', 'rejected') DEFAULT 'new',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEDIA LIBRARY
-- ============================================

CREATE TABLE IF NOT EXISTS media_library (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_url VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  width INT,
  height INT,
  checksum VARCHAR(64),
  title VARCHAR(200),
  alt_text VARCHAR(200),
  caption VARCHAR(255),
  category VARCHAR(50),
  optimized_path VARCHAR(255),
  webp_path VARCHAR(255),
  optimized_srcset TEXT,
  webp_srcset TEXT,
  responsive_variants LONGTEXT,
  manifest_path VARCHAR(255),
  uploader VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ready',
  processing_notes TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_uploaded_at (uploaded_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NEWSLETTER
-- ============================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  INDEX idx_active (is_active)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONTACT MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(200),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_read (is_read)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BUSINESS HOURS
-- ============================================

CREATE TABLE IF NOT EXISTS business_hours (
  id INT PRIMARY KEY AUTO_INCREMENT,
  day_of_week VARCHAR(20) NOT NULL,
  opening_time TIME,
  closing_time TIME,
  is_closed BOOLEAN DEFAULT false
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default business hours
INSERT INTO business_hours (day_of_week, opening_time, closing_time, is_closed) VALUES
('Monday', '11:00:00', '22:00:00', false),
('Tuesday', '11:00:00', '22:00:00', false),
('Wednesday', '11:00:00', '22:00:00', false),
('Thursday', '11:00:00', '23:00:00', false),
('Friday', '11:00:00', '00:00:00', false),
('Saturday', '10:00:00', '00:00:00', false),
('Sunday', '10:00:00', '21:00:00', false)
ON DUPLICATE KEY UPDATE day_of_week = day_of_week;

-- ============================================
-- ABOUT CONTENT
-- ============================================

CREATE TABLE IF NOT EXISTS about_content (
  id INT PRIMARY KEY AUTO_INCREMENT,
  header VARCHAR(200) DEFAULT 'About Thunder Road',
  paragraph TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  map_embed_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default about content
INSERT INTO about_content (id, header, paragraph, phone, email, address, map_embed_url)
VALUES (
  1,
  'About Thunder Road',
  'Thunder Road Bar and Grill has been serving the community since 2010. We pride ourselves on great food, cold drinks, and a welcoming atmosphere for everyone. Whether you''re here for a casual dinner, celebrating a special occasion, or just grabbing drinks with friends, we''ve got you covered.',
  '(555) 123-4567',
  'info@thunderroad.com',
  '123 Main Street, Anytown, USA 12345',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9!2d-73.98!3d40.75!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1'
)
ON DUPLICATE KEY UPDATE id = id;

-- ============================================
-- FOOTER
-- ============================================

CREATE TABLE IF NOT EXISTS footer_columns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  column_title VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS footer_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  column_id INT NOT NULL,
  label VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (column_id) REFERENCES footer_columns(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default footer structure
INSERT INTO footer_columns (column_title, display_order) VALUES
('Quick Links', 1),
('Legal', 2)
ON DUPLICATE KEY UPDATE column_title = column_title;

INSERT INTO footer_links (column_id, label, url, display_order) VALUES
(1, 'Menu', '#menu', 1),
(1, 'Reservations', '#reservations', 2),
(1, 'Careers', '#jobs', 3),
(2, 'Privacy Policy', '#privacy', 1),
(2, 'Terms of Service', '#terms', 2)
ON DUPLICATE KEY UPDATE label = label;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all tables created
SHOW TABLES;

-- Show sample data
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Menu Categories', COUNT(*) FROM menu_categories
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'Business Hours', COUNT(*) FROM business_hours;

SELECT '\u2705 Database schema created successfully!' as status;
