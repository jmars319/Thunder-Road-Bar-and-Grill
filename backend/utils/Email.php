<?php
/**
 * Email Utility - SendGrid version
 */
require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';

class Email {
    private const SKIP_LOG_PREFIX = '[email:skip]';
    private const ERROR_LOG_PREFIX = '[email:error]';
    private const BODY_PREVIEW_LIMIT = 200;
    
    public static function send($to, $subject, $body, $fromEmail = null, $fromName = null) {
        Logger::info('Email send() called', ['to' => $to, 'subject' => $subject]);
        
        $apiKey = Config::get('SENDGRID_API_KEY');
        if (is_array($to)) {
            $to = reset($to) ?: '';
        }
        $to = trim((string) $to);
        if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            self::logSkip('invalid recipient', $to, $fromEmail, $subject, $body);
            return true;
        }
        $fromEmail = $fromEmail ?: Config::get('EMAIL_FROM_NOTIFICATIONS', Config::get('EMAIL_FROM', 'no-reply@localhost'));
        $fromName = $fromName ?: Config::get('EMAIL_FROM_NAME', 'Thunder Road Admin');
        
        $sendGate = self::getSendGateStatus($apiKey);
        if (!$sendGate['enabled']) {
            self::logSkip($sendGate['reason'], $to, $fromEmail, $subject, $body);
            return true;
        }
        
        $data = [
            'personalizations' => [
                [
                    'to' => [['email' => $to]]
                ]
            ],
            'from' => [
                'email' => $fromEmail,
                'name' => $fromName
            ],
            'subject' => $subject,
            'content' => [
                [
                    'type' => 'text/html',
                    'value' => $body
                ]
            ]
        ];
        
        Logger::info('Sending email via SendGrid...');
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.sendgrid.com/v3/mail/send');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        Logger::info('SendGrid response received', [
            'http_code' => $httpCode,
            'curl_error' => $curlError ?: 'none'
        ]);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            Logger::info('Email sent via SendGrid', ['to' => $to, 'subject' => $subject]);
            return true;
        }
        
        error_log(self::ERROR_LOG_PREFIX . ' ' . json_encode([
            'to' => $to,
            'subject' => $subject,
            'status' => $httpCode,
            'curl_error' => $curlError ?: 'none',
            'response' => self::truncatePreview($response)
        ]));
        
        Logger::error('SendGrid email failed', [
            'to' => $to,
            'http_code' => $httpCode,
            'response' => $response,
            'curl_error' => $curlError
        ]);
        return false;
    }
    
    public static function sendReservationNotification($reservation) {
        Logger::info('sendReservationNotification() called', ['name' => $reservation['name']]);
        
        $to = Config::get('STAFF_EMAIL_TO', Config::get('NOTIFICATION_EMAIL', 'thundergrillmidway@gmail.com'));
        $subject = 'New Reservation - ' . $reservation['name'];
        $fromEmail = Config::get('EMAIL_FROM_NOTIFICATIONS', Config::get('EMAIL_FROM', 'no-reply@trbgmidway.com'));
        $fromName = Config::get('EMAIL_FROM_NOTIFICATIONS_NAME', 'TRBG Notifications');
        
        $body = "
            <h2>New Reservation Received</h2>
            <p><strong>Name:</strong> {$reservation['name']}</p>
            <p><strong>Email:</strong> {$reservation['email']}</p>
            <p><strong>Phone:</strong> {$reservation['phone']}</p>
            <p><strong>Date:</strong> {$reservation['date']}</p>
            <p><strong>Time:</strong> {$reservation['time']}</p>
            <p><strong>Party Size:</strong> {$reservation['party_size']}</p>
            <p><strong>Special Requests:</strong> " . ($reservation['special_requests'] ?: 'None') . "</p>
            <hr>
            <p><a href='https://www.trbgmidway.com/admin'>View in Admin Panel</a></p>
        ";
        
        return self::send($to, $subject, $body, $fromEmail, $fromName);
    }
    
    public static function sendJobApplicationNotification($application) {
        Logger::info('sendJobApplicationNotification() called', ['name' => $application['name']]);
        
        $to = Config::get('ALERTS_EMAIL_TO', Config::get('STAFF_EMAIL_TO', 'thundergrillmidway@gmail.com'));
        $subject = 'New Job Application - ' . $application['name'];
        $fromEmail = Config::get('EMAIL_FROM_ALERTS', Config::get('EMAIL_FROM_NOTIFICATIONS', 'no-reply@trbgmidway.com'));
        $fromName = Config::get('EMAIL_FROM_ALERTS_NAME', 'TRBG Alerts');
        
        $body = "
            <h2>New Job Application Received</h2>
            <p><strong>Name:</strong> {$application['name']}</p>
            <p><strong>Email:</strong> {$application['email']}</p>
            <p><strong>Phone:</strong> {$application['phone']}</p>
            <p><strong>Position:</strong> {$application['position']}</p>
            <hr>
            <p><a href='https://www.trbgmidway.com/admin'>View in Admin Panel</a></p>
        ";
        
        return self::send($to, $subject, $body, $fromEmail, $fromName);
    }
    
    private static function getSendGateStatus($apiKey) {
        $env = Config::get('APP_ENV', 'production');
        $sendToggleRaw = trim((string) Config::get('SEND_EMAILS', 'false'));
        $sendToggle = filter_var($sendToggleRaw, FILTER_VALIDATE_BOOLEAN);
        $hasKey = !empty($apiKey);
        
        $enabled = ($env === 'production') && $sendToggle && $hasKey;
        
        if ($enabled) {
            return ['enabled' => true, 'reason' => 'send enabled'];
        }
        
        $reasons = [];
        if ($env !== 'production') {
            $reasons[] = "APP_ENV={$env}";
        }
        if (!$sendToggle) {
            $reasons[] = "SEND_EMAILS={$sendToggleRaw}";
        }
        if (!$hasKey) {
            $reasons[] = 'missing SENDGRID_API_KEY';
        }
        
        return ['enabled' => false, 'reason' => implode('; ', $reasons) ?: 'send disabled'];
    }
    
    private static function logSkip($reason, $to, $fromEmail, $subject, $body) {
        error_log(self::SKIP_LOG_PREFIX . ' ' . json_encode([
            'reason' => $reason,
            'to' => $to,
            'from' => $fromEmail,
            'subject' => $subject,
            'preview' => self::truncatePreview($body)
        ]));
        Logger::info('Email skipped due to gating', [
            'reason' => $reason,
            'to' => $to,
            'subject' => $subject
        ]);
    }
    
    private static function truncatePreview($text) {
        $normalized = trim(preg_replace('/\s+/', ' ', strip_tags((string) $text)));
        if (strlen($normalized) > self::BODY_PREVIEW_LIMIT) {
            return substr($normalized, 0, self::BODY_PREVIEW_LIMIT - 3) . '...';
        }
        return $normalized;
    }
}
