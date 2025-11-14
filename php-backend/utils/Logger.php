<?php
/**
 * Logger Utility
 * 
 * Simple logging system with level support
 */

require_once __DIR__ . '/Config.php';

class Logger {
    const DEBUG = 'debug';
    const INFO = 'info';
    const WARNING = 'warning';
    const ERROR = 'error';

    private static $levels = [
        'debug' => 0,
        'info' => 1,
        'warning' => 2,
        'error' => 3
    ];

    /**
     * Log a message
     * 
     * @param string $level Log level
     * @param string $message Log message
     * @param array $context Additional context
     */
    private static function log($level, $message, $context = []) {
        $minLevel = Config::get('LOG_LEVEL', 'info');
        
        // Check if this message should be logged
        if (self::$levels[$level] < self::$levels[$minLevel]) {
            return;
        }

        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? json_encode($context) : '';
        
        $logMessage = sprintf(
            "[%s] %s: %s %s\n",
            $timestamp,
            strtoupper($level),
            $message,
            $contextStr
        );

        // Log to file if configured
        $logFile = Config::get('LOG_FILE');
        if ($logFile) {
            $logPath = __DIR__ . '/../' . $logFile;
            $logDir = dirname($logPath);
            
            // Create log directory if it doesn't exist
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }

            error_log($logMessage, 3, $logPath);
        }

        // Also log to PHP error log in development
        if (Config::isDebug()) {
            error_log(rtrim($logMessage));
        }
    }

    /**
     * Log debug message
     */
    public static function debug($message, $context = []) {
        self::log(self::DEBUG, $message, $context);
    }

    /**
     * Log info message
     */
    public static function info($message, $context = []) {
        self::log(self::INFO, $message, $context);
    }

    /**
     * Log warning message
     */
    public static function warning($message, $context = []) {
        self::log(self::WARNING, $message, $context);
    }

    /**
     * Log error message
     */
    public static function error($message, $context = []) {
        self::log(self::ERROR, $message, $context);
    }
}
