<?php
/**
 * Thunder Road Bar & Grill - PHP Backend API
 * Main entry point for all API requests
 * 
 * This file bootstraps the application, sets up middleware, and routes requests
 */

// Set timezone
date_default_timezone_set('America/Chicago');

// Start output buffering
ob_start();

// Load utilities
require_once __DIR__ . '/utils/Config.php';
require_once __DIR__ . '/utils/Logger.php';
require_once __DIR__ . '/utils/Database.php';
require_once __DIR__ . '/utils/Router.php';

// Load middleware
require_once __DIR__ . '/middleware/ErrorHandler.php';
require_once __DIR__ . '/middleware/CorsMiddleware.php';
require_once __DIR__ . '/middleware/RateLimitMiddleware.php';

// Setup error handling
ErrorHandler::setup();

// Log request
Logger::info('Request received', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
]);

// Set response headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

// Hide PHP version
header_remove('X-Powered-By');

// Handle CORS
CorsMiddleware::handle();

// Apply global rate limiting
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
RateLimitMiddleware::global($ip);

// Initialize router
$router = new Router();
$router->setPrefix('/api');

// ============================================
// Health Check
// ============================================
$router->get('/health', function() {
    echo json_encode([
        'status' => 'OK',
        'message' => 'Thunder Road API is running',
        'timestamp' => date('c')
    ]);
});

// ============================================
// Authentication Routes
// ============================================
require_once __DIR__ . '/routes/auth.php';
$authRoutes = new AuthRoutes();

$router->post('/login', function() use ($authRoutes) {
    $authRoutes->login();
});

$router->post('/dev-signin', function() use ($authRoutes) {
    $authRoutes->devSignin();
});

// ============================================
// User Routes
// ============================================
require_once __DIR__ . '/routes/user.php';
$userRoutes = new UserRoutes();

$router->put('/user/password', function() use ($userRoutes) {
    $userRoutes->changePassword();
});

// ============================================
// Menu Routes
// ============================================
require_once __DIR__ . '/routes/menu.php';
$menuRoutes = new MenuRoutes();

// Public (with rate limiting)
$router->get('/menu', function() use ($menuRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->getMenu();
});

// Admin
$router->get('/menu/admin', function() use ($menuRoutes) {
    $menuRoutes->getAdminMenu();
});

$router->get('/menu/categories', function() use ($menuRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->getCategories();
});

$router->get('/menu/categories/:id/items', function($id) use ($menuRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->getCategoryItems($id);
});

$router->post('/menu/categories', function() use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->createCategory();
});

$router->put('/menu/categories/reorder', function() use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->reorderCategories();
});

$router->put('/menu/categories/:id', function($id) use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->updateCategory($id);
});

$router->delete('/menu/categories/:id', function($id) use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->deleteCategory($id);
});

$router->post('/menu/items', function() use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->createItem();
});

$router->put('/menu/items/:id', function($id) use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->updateItem($id);
});

$router->delete('/menu/items/:id', function($id) use ($menuRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $menuRoutes->deleteItem($id);
});

// ============================================
// Settings Routes
// ============================================
require_once __DIR__ . '/routes/settings.php';
$settingsRoutes = new SettingsRoutes();

// Public (with rate limiting)
$router->get('/site-settings', function() use ($settingsRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->getSiteSettings();
});

$router->get('/navigation', function() use ($settingsRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->getNavigation();
});

$router->get('/business-hours', function() use ($settingsRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->getBusinessHours();
});

$router->get('/about', function() use ($settingsRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->getAbout();
});

$router->get('/footer-columns', function() use ($settingsRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->getFooterColumns();
});

// Admin
$router->put('/site-settings', function() use ($settingsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->updateSiteSettings();
});

$router->put('/business-hours/:id', function($id) use ($settingsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->updateBusinessHours($id);
});

$router->put('/about', function() use ($settingsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->updateAbout();
});

// ============================================
// Media Routes
// ============================================
require_once __DIR__ . '/routes/media.php';
$mediaRoutes = new MediaRoutes();

$router->get('/media', function() use ($mediaRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->getAllMedia();
});

$router->get('/media/:id', function($id) use ($mediaRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->getMediaById($id);
});

$router->post('/media', function() use ($mediaRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->uploadMedia();
});

$router->post('/media', function() use ($mediaRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->uploadMedia();
});

$router->post('/media/upload', function() use ($mediaRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->uploadMedia();
});

$router->put('/media/:id', function($id) use ($mediaRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->updateMedia($id);
});

$router->delete('/media/:id', function($id) use ($mediaRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $mediaRoutes->deleteMedia($id);
});

// ============================================
// Jobs Routes
// ============================================
require_once __DIR__ . '/routes/jobs.php';
$jobsRoutes = new JobsRoutes();

// Public
$router->get('/job-positions/public', function() use ($jobsRoutes) {
    $jobsRoutes->getPublicJobPositions();
});

$router->get('/application-fields', function() use ($jobsRoutes) {
    $jobsRoutes->getApplicationFields();
});

$router->post('/job-applications', function() use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->submitApplication();
});

// Alias for frontend compatibility
$router->post('/jobs', function() use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->submitApplication();
});

// Admin
$router->get('/job-positions', function() use ($jobsRoutes) {
    $jobsRoutes->getAllJobPositions();
});

$router->post('/job-positions', function() use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->createPosition();
});

$router->put('/job-positions/:id', function($id) use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->updatePosition($id);
});

$router->delete('/job-positions/:id', function($id) use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->deletePosition($id);
});

$router->get('/job-applications', function() use ($jobsRoutes) {
    $jobsRoutes->getAllApplications();
});

$router->get('/jobs', function() use ($jobsRoutes) {
    $jobsRoutes->getAllApplications();
});

$router->delete('/jobs/:id', function($id) use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->deleteApplication($id);
});

// ============================================
// Reservations Routes
// ============================================
require_once __DIR__ . '/routes/reservations.php';
$reservationsRoutes = new ReservationsRoutes();

$router->get('/reservations', function() use ($reservationsRoutes) {
    $reservationsRoutes->getAllReservations();
});

$router->post('/reservations', function() use ($reservationsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $reservationsRoutes->createReservation();
});

$router->put('/reservations/:id', function($id) use ($reservationsRoutes) {
    // No rate limit - admin auth required in route handler
    $reservationsRoutes->updateReservation($id);
});

$router->delete('/reservations/:id', function($id) use ($reservationsRoutes) {
    // No rate limit - admin auth required in route handler
    $reservationsRoutes->deleteReservation($id);
});

// ============================================
// Contact Routes
// ============================================
require_once __DIR__ . '/routes/contact.php';
$contactRoutes = new ContactRoutes();

$router->get('/contact', function() use ($contactRoutes) {
    $contactRoutes->getAllMessages();
});

$router->get('/messages', function() use ($contactRoutes) {
    $contactRoutes->getAllMessages();
});

$router->get('/contact/messages', function() use ($contactRoutes) {
    $contactRoutes->getAllMessages();
});

$router->post('/contact', function() use ($contactRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $contactRoutes->createContact();
});

$router->put('/contact/messages/:id', function($id) use ($contactRoutes) {
    // No rate limit - admin auth required in route handler
    $contactRoutes->updateMessage($id);
});

$router->delete('/contact/messages/:id', function($id) use ($contactRoutes) {
    // No rate limit - admin auth required in route handler
    $contactRoutes->deleteMessage($id);
});

// ============================================
// Newsletter Routes
// ============================================
require_once __DIR__ . '/routes/newsletter.php';
$newsletterRoutes = new NewsletterRoutes();

$router->get('/subscribers', function() use ($newsletterRoutes) {
    $newsletterRoutes->getAllSubscribers();
});

$router->post('/newsletter/subscribe', function() use ($newsletterRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $newsletterRoutes->subscribe();
});

// ============================================
// Dispatch Request
// ============================================
try {
    $router->dispatch();
} catch (Exception $e) {
    ErrorHandler::handle($e);
}

// Cleanup old rate limit files periodically (1% chance per request)
if (rand(1, 100) === 1) {
    RateLimitMiddleware::cleanup();
}

// Flush output buffer
ob_end_flush();
