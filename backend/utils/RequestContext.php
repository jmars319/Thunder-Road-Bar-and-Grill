<?php
/**
 * Request Context helper
 *
 * Generates and exposes a per-request identifier so logs and client responses
 * can be correlated without leaking implementation details.
 */

class RequestContext {
    private static $requestId = null;

    /**
     * Initialize the current request id. Should be called once per request.
     */
    public static function init() {
        if (self::$requestId !== null) {
            return;
        }

        $headerId = $_SERVER['HTTP_X_REQUEST_ID'] ?? null;
        if ($headerId && preg_match('/^[A-Za-z0-9\\-_.]{6,64}$/', $headerId)) {
            self::$requestId = $headerId;
        } else {
            self::$requestId = 'req_' . bin2hex(random_bytes(8));
        }

        header('X-Request-ID: ' . self::$requestId);
    }

    /**
     * Get the current request id.
     *
     * @return string
     */
    public static function getRequestId() {
        if (self::$requestId === null) {
            self::init();
        }
        return self::$requestId;
    }
}
