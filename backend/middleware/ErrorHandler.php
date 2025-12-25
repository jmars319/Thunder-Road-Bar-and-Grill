<?php
/**
 * Error Handler Middleware
 * 
 * Centralized error handling for consistent error responses
 */

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/RequestContext.php';
require_once __DIR__ . '/../utils/ErrorAlert.php';

class ErrorHandler {
    /**
     * Handle exceptions and errors
     * 
     * @param Throwable $e Exception or error
     */
    public static function handle($e) {
        $code = $e->getCode();
        $message = $e->getMessage();

        // Default to 500 if code is not a valid HTTP status
        if ($code < 400 || $code >= 600) {
            $code = 500;
        }

        $requestId = RequestContext::getRequestId();
        $timestamp = gmdate('c');

        // Log error
        Logger::error('Error occurred', [
            'code' => $code,
            'message' => $message,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'requestId' => $requestId
        ]);

        $clientMessage = $message;
        if ($code >= 500 && !Config::isDebug()) {
            $clientMessage = 'Internal server error';
        }

        $extra = [];
        if (Config::isDebug()) {
            $extra['debugMessage'] = $message;
        }

        self::respond($clientMessage, $code, $extra);
    }

    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int $code HTTP status code
     */
    public static function send($message, $code = 400) {
        self::respond($message, $code);
    }

    /**
     * Send validation error response
     * 
     * @param array $errors Validation errors
     */
    public static function validation($errors) {
        self::respond('Validation failed', 400, ['errors' => $errors]);
    }

    /**
     * Build and send a consistent error response payload
     */
    public static function respond($message, $code = 400, $extra = []) {
        $status = (int) $code;
        if ($status < 100) {
            $status = 400;
        }

        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        $payload = array_merge([
            'error' => $message,
            'status' => $status,
            'requestId' => RequestContext::getRequestId(),
            'timestampUTC' => gmdate('c')
        ], $extra);

        if ($status >= 500) {
            ErrorAlert::maybeSend([
                'status' => $status,
                'message' => $message,
                'requestId' => $payload['requestId'],
                'timestampUTC' => $payload['timestampUTC'],
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
                'path' => $_SERVER['REQUEST_URI'] ?? '/',
                'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
            ]);
        }

        echo json_encode($payload);
        exit;
    }

    /**
     * Setup global error handlers
     */
    public static function setup() {
        // Set error reporting based on environment
        if (Config::isProduction()) {
            error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED & ~E_STRICT);
            ini_set('display_errors', '0');
            ini_set('display_startup_errors', '0');
        } else {
            error_reporting(E_ALL);
            ini_set('display_errors', '1');
            ini_set('display_startup_errors', '1');
        }

        // Register exception handler
        set_exception_handler([self::class, 'handle']);

        // Register error handler
        set_error_handler(function($errno, $errstr, $errfile, $errline) {
            // Convert errors to exceptions
            throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
        });

        // Register shutdown function for fatal errors
        register_shutdown_function(function() {
            $error = error_get_last();
            if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
                Logger::error('Fatal error', array_merge($error, [
                    'requestId' => RequestContext::getRequestId()
                ]));
                
                if (!headers_sent()) {
                    self::respond('Internal server error', 500);
                }
            }
        });
    }
}
