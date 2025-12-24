<?php
/**
 * Error Handler Middleware
 * 
 * Centralized error handling for consistent error responses
 */

require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';

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

        // Log error
        Logger::error('Error occurred', [
            'code' => $code,
            'message' => $message,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);

        // Send JSON error response (ensure code is integer)
        http_response_code(is_int($code) ? $code : 500);
        header('Content-Type: application/json');

        $response = ['error' => $message];

        // Include stack trace in development
        if (Config::isDebug() && !Config::isProduction()) {
            $response['file'] = $e->getFile();
            $response['line'] = $e->getLine();
            $response['trace'] = explode("\n", $e->getTraceAsString());
        }

        echo json_encode($response);
        exit;
    }

    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int $code HTTP status code
     */
    public static function send($message, $code = 400) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
        exit;
    }

    /**
     * Send validation error response
     * 
     * @param array $errors Validation errors
     */
    public static function validation($errors) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Validation failed',
            'errors' => $errors
        ]);
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
                Logger::error('Fatal error', $error);
                
                if (!headers_sent()) {
                    http_response_code(500);
                    header('Content-Type: application/json');
                    
                    $response = ['error' => 'Internal server error'];
                    if (Config::isDebug()) {
                        $response['details'] = $error;
                    }
                    
                    echo json_encode($response);
                }
            }
        });
    }
}
