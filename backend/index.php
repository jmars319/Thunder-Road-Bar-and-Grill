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
require_once __DIR__ . '/utils/RequestContext.php';
require_once __DIR__ . '/utils/Logger.php';
require_once __DIR__ . '/utils/Database.php';
require_once __DIR__ . '/utils/Router.php';

// Load middleware
require_once __DIR__ . '/middleware/ErrorHandler.php';
require_once __DIR__ . '/middleware/CorsMiddleware.php';
require_once __DIR__ . '/middleware/RateLimitMiddleware.php';

// Initialize request context & setup error handling
RequestContext::init();
ErrorHandler::setup();

// Ensure PHP upload limits line up with our pipeline limit (default 8MB)
$uploadLimitBytes = (int) Config::get('IMAGE_UPLOAD_MAX_BYTES', 8388608);
$uploadLimitMb = max(8, (int) ceil($uploadLimitBytes / 1048576));
@ini_set('upload_max_filesize', $uploadLimitMb . 'M');
@ini_set('post_max_size', max($uploadLimitMb * 2, $uploadLimitMb + 2) . 'M');

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

// Dev-only diagnostic routes
if (Config::get('APP_ENV', 'production') !== 'production') {
    $router->get('/dev/trigger-error', function() {
        throw new Exception('Intentional debug failure', 500);
    });
}

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
    $menuRoutes->createCategory();
});

$router->put('/menu/categories/reorder', function() use ($menuRoutes) {
    $menuRoutes->reorderCategories();
});

$router->put('/menu/categories/:id', function($id) use ($menuRoutes) {
    $menuRoutes->updateCategory($id);
});

$router->delete('/menu/categories/:id', function($id) use ($menuRoutes) {
    $menuRoutes->deleteCategory($id);
});

$router->post('/menu/items', function() use ($menuRoutes) {
    $menuRoutes->createItem();
});

$router->put('/menu/items/:id', function($id) use ($menuRoutes) {
    $menuRoutes->updateItem($id);
});

$router->delete('/menu/items/:id', function($id) use ($menuRoutes) {
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

$router->get('/settings', function() use ($settingsRoutes) {
    RateLimitMiddleware::publicEndpoint($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $settingsRoutes->getSettings();
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
// Navigation Admin Routes
// ============================================
require_once __DIR__ . '/routes/navigation.php';
$navigationRoutes = new NavigationRoutes();

$router->get('/navigation/admin', function() use ($navigationRoutes) {
    $navigationRoutes->list();
});

$router->post('/navigation', function() use ($navigationRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $navigationRoutes->create();
});

$router->put('/navigation/:id', function($id) use ($navigationRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $navigationRoutes->update($id);
});

$router->delete('/navigation/:id', function($id) use ($navigationRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $navigationRoutes->delete($id);
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

$router->put('/jobs/:id', function($id) use ($jobsRoutes) {
    RateLimitMiddleware::strict($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $jobsRoutes->updateApplication($id);
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
// Admin utilities
// ============================================
require_once __DIR__ . '/utils/Emailer.php';

$router->post('/admin/test-email', function() {
    require_once __DIR__ . '/middleware/AdminAuthMiddleware.php';

    $env = Config::get('APP_ENV', 'production');
    if ($env === 'production' && !Config::getBool('ALLOW_PROD_TEST_EMAIL', false)) {
        ErrorHandler::respond('Test email endpoint is disabled in production', 403);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if (!RateLimitMiddleware::check('test_email_ip_' . $ip, 5, 60)) {
        ErrorHandler::respond('Too many test email attempts. Please slow down.', 429);
    }

    $user = AdminAuthMiddleware::require(['allow_dev_bypass' => false]);
    $userKey = 'test_email_user_' . ($user['id'] ?? 'unknown');
    if (!RateLimitMiddleware::check($userKey, 20, 3600)) {
        ErrorHandler::respond('Too many test email attempts for this account.', 429);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $type = strtolower($input['type'] ?? 'ops');
    $requestId = RequestContext::getRequestId();

    if ($type === 'alert') {
        Emailer::sendAlert([
            'status' => 500,
            'message' => 'Admin-triggered alert test',
            'requestId' => $requestId,
            'timestampUTC' => gmdate('c'),
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
            'path' => $_SERVER['REQUEST_URI'] ?? '/api/admin/test-email',
            'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'ip' => $ip,
        ]);
        echo json_encode(['success' => true, 'type' => 'alert', 'requestId' => $requestId]);
        return;
    }

    Emailer::sendOpsNotification(
        'Admin Test Notification',
        [
            'Triggered By' => sprintf('Admin user %s', $user['username'] ?? 'unknown'),
            'Purpose' => 'Verify SendGrid ops delivery',
        ],
        [
            'requestId' => $requestId,
            'path' => $_SERVER['REQUEST_URI'] ?? '/api/admin/test-email',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'POST',
        ],
        null
    );

    echo json_encode(['success' => true, 'type' => 'ops', 'requestId' => $requestId]);
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
