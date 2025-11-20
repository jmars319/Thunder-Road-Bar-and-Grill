<?php
/**
 * Email Utility - SendGrid version
 */
require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';

class Email {
    
    public static function send($to, $subject, $body) {
        Logger::info('Email send() called', ['to' => $to, 'subject' => $subject]);
        
        $apiKey = Config::get('SENDGRID_API_KEY');
        $fromEmail = Config::get('EMAIL_FROM');
        $fromName = Config::get('EMAIL_FROM_NAME');
        
        Logger::info('Email config loaded', [
            'has_api_key' => !empty($apiKey),
            'from_email' => $fromEmail,
            'from_name' => $fromName
        ]);
        
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
        } else {
            Logger::error('SendGrid email failed', [
                'to' => $to,
                'http_code' => $httpCode,
                'response' => $response,
                'curl_error' => $curlError
            ]);
            return false;
        }
    }
    
    public static function sendReservationNotification($reservation) {
        Logger::info('sendReservationNotification() called', ['name' => $reservation['name']]);
        
        $to = Config::get('NOTIFICATION_EMAIL', 'thundergrillmidway@gmail.com');
        $subject = 'New Reservation - ' . $reservation['name'];
        
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
        
        return self::send($to, $subject, $body);
    }
    
    public static function sendJobApplicationNotification($application) {
        Logger::info('sendJobApplicationNotification() called', ['name' => $application['name']]);
        
        $to = Config::get('NOTIFICATION_EMAIL', 'thundergrillmidway@gmail.com');
        $subject = 'New Job Application - ' . $application['name'];
        
        $body = "
            <h2>New Job Application Received</h2>
            <p><strong>Name:</strong> {$application['name']}</p>
            <p><strong>Email:</strong> {$application['email']}</p>
            <p><strong>Phone:</strong> {$application['phone']}</p>
            <p><strong>Position:</strong> {$application['position']}</p>
            <hr>
            <p><a href='https://www.trbgmidway.com/admin'>View in Admin Panel</a></p>
        ";
        
        return self::send($to, $subject, $body);
    }
}