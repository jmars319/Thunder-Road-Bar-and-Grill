<?php
/**
 * JWT (JSON Web Token) Utility
 * 
 * Simple JWT implementation for authentication tokens
 * Uses HMAC SHA256 for signing
 */

require_once __DIR__ . '/Config.php';

class JWT {
    /**
     * Encode payload to JWT token
     * 
     * @param array $payload Token payload
     * @param int $expiry Expiration time in seconds (default: 24 hours)
     * @return string JWT token
     */
    public static function encode($payload, $expiry = null) {
        $secret = Config::get('JWT_SECRET', 'dev-secret-change-in-production');
        
        if (Config::isProduction() && $secret === 'dev-secret-change-in-production') {
            throw new Exception('JWT_SECRET must be set in production');
        }

        if ($expiry === null) {
            $expiry = Config::getInt('JWT_EXPIRY', 86400); // 24 hours default
        }

        // Header
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        // Add expiration to payload
        $payload['exp'] = time() + $expiry;
        $payload['iat'] = time();

        // Encode
        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        // Signature
        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$headerEncoded.$payloadEncoded.$signatureEncoded";
    }

    /**
     * Decode and verify JWT token
     * 
     * @param string $token JWT token
     * @return array|null Decoded payload or null if invalid
     */
    public static function decode($token) {
        $secret = Config::get('JWT_SECRET', 'dev-secret-change-in-production');

        // Split token
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        // Verify signature
        $signature = self::base64UrlDecode($signatureEncoded);
        $expectedSignature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);

        if (!hash_equals($expectedSignature, $signature)) {
            return null; // Invalid signature
        }

        // Decode payload
        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);
        if (!$payload) {
            return null;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Token expired
        }

        return $payload;
    }

    /**
     * Verify JWT token
     * 
     * @param string $token JWT token
     * @return bool True if valid
     */
    public static function verify($token) {
        return self::decode($token) !== null;
    }

    /**
     * Base64 URL encode
     * 
     * @param string $data Data to encode
     * @return string Encoded string
     */
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     * 
     * @param string $data Data to decode
     * @return string Decoded string
     */
    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
