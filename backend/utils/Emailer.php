<?php

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/RequestContext.php';

/**
 * Centralized SendGrid email helper for TRBG.
 * Handles operational notifications (forms) and alert emails.
 */
class Emailer
{
    private const PREVIEW_LOG = __DIR__ . '/../cache/email-previews.log';

    /**
     * Send an operational notification (reservations, jobs, contact).
     *
     * @param string $type    e.g. "Reservation Request"
     * @param array  $fields  key => value pairs describing the submission
     * @param array  $meta    optional metadata (path, method, requestId, etc)
     * @param string|null $replyTo optional reply-to email (validated)
     */
    public static function sendOpsNotification(string $type, array $fields, array $meta = [], ?string $replyTo = null): bool
    {
        $to = Config::get('OPERATIONS_EMAIL', 'thundergrillmidway@gmail.com');
        $from = Config::get('MAIL_FROM', 'no-reply@trbgmidway.com');
        $subject = self::buildSubject($type);
        $support = Config::get('SUPPORT_EMAIL', 'support@jamarq.digital');

        $sections = [
            'Details' => $fields,
            'Context' => self::buildContext($meta, $support),
        ];

        $replyToAddress = self::sanitizeEmail($replyTo);

        return self::sendMessage([
            'channel' => 'ops',
            'to' => $to,
            'from' => $from,
            'subject' => $subject,
            'sections' => $sections,
            'reply_to' => $replyToAddress,
        ]);
    }

    /**
     * Send a 5xx alert email.
     *
     * @param array $context expects status, path, method, requestId, timestampUTC, signature
     */
    public static function sendAlert(array $context): bool
    {
        $status = (int)($context['status'] ?? 500);
        $path = $context['path'] ?? '/';
        $requestId = $context['requestId'] ?? RequestContext::getRequestId();
        $service = Config::get('SERVICE_NAME', 'Thunder Road Bar & Grill');
        $env = Config::get('APP_ENV', 'production');
        $subject = sprintf('[%s ALERT] (%s) – %d at %s – %s', $service, $env, $status, $path, $requestId);

        $sections = [
            'Summary' => [
                'Service' => $service,
                'Environment' => $env,
                'Status' => $status,
                'Request ID' => $requestId,
                'Timestamp (UTC)' => $context['timestampUTC'] ?? gmdate('c'),
            ],
            'Request' => [
                'Method' => strtoupper($context['method'] ?? 'GET'),
                'Path' => $path,
                'User Agent' => $context['userAgent'] ?? 'unknown',
                'Remote IP' => $context['ip'] ?? 'unknown',
            ],
            'Diagnostics' => [
                'Signature' => $context['signature'] ?? 'n/a',
                'Next Steps' => sprintf('Check server logs for requestId %s', $requestId),
            ],
        ];

        return self::sendMessage([
            'channel' => 'alert',
            'to' => Config::get('ALERT_TO', Config::get('ALERTS_EMAIL_TO', 'support@jamarq.digital')),
            'from' => Config::get('ALERT_FROM', 'alerts@trbgmidway.com'),
            'subject' => $subject,
            'sections' => $sections,
            'reply_to' => null,
        ]);
    }

    private static function sendMessage(array $payload): bool
    {
        $to = self::sanitizeEmail($payload['to'] ?? '');
        $from = self::sanitizeEmail($payload['from'] ?? '');
        $subject = $payload['subject'] ?? '(no subject)';
        $replyTo = self::sanitizeEmail($payload['reply_to'] ?? null);
        $sections = $payload['sections'] ?? [];
        $channel = $payload['channel'] ?? 'ops';

        if (!$to || !$from) {
            Logger::error('Email send aborted: missing to/from', [
                'channel' => $channel,
                'to' => $to,
                'from' => $from,
            ]);
            return false;
        }

        $html = self::buildHtml($sections);
        $text = self::buildText($sections);
        $requestId = RequestContext::getRequestId();

        $emailPayload = [
            'personalizations' => [
                [
                    'to' => [['email' => $to]],
                ]
            ],
            'from' => [
                'email' => $from,
                'name' => Config::get('SERVICE_NAME', 'Thunder Road Bar & Grill'),
            ],
            'subject' => $subject,
            'content' => [
                ['type' => 'text/plain', 'value' => $text],
                ['type' => 'text/html', 'value' => $html],
            ],
        ];

        if ($replyTo) {
            $emailPayload['reply_to'] = ['email' => $replyTo];
        }

        $gate = self::getSendGateStatus();
        self::recordPreview($channel, [
            'to' => $to,
            'from' => $from,
            'subject' => $subject,
            'requestId' => $requestId,
            'gate' => $gate,
            'sections' => self::isProduction() ? ['count' => count($sections)] : $sections,
        ]);

        if (!$gate['enabled']) {
            Logger::info('Email skipped due to gate', [
                'channel' => $channel,
                'reason' => $gate['reason'],
                'to' => $to,
                'subject' => $subject,
            ]);
            return true;
        }

        $apiKey = Config::get('SENDGRID_API_KEY');
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.sendgrid.com/v3/mail/send');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailPayload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            Logger::info('Email sent via SendGrid', [
                'channel' => $channel,
                'to' => $to,
                'subject' => $subject,
                'status' => $httpCode,
            ]);
            return true;
        }

        Logger::error('SendGrid email failed', [
            'channel' => $channel,
            'to' => $to,
            'status' => $httpCode,
            'curl_error' => $curlError ?: 'none',
            'response_preview' => self::truncate($response),
        ]);

        return false;
    }

    private static function getSendGateStatus(): array
    {
        $env = Config::get('APP_ENV', 'production');
        $sendToggleRaw = trim((string) Config::get('SEND_EMAILS', 'false'));
        $sendToggle = filter_var($sendToggleRaw, FILTER_VALIDATE_BOOLEAN);
        $apiKey = trim((string) Config::get('SENDGRID_API_KEY', ''));

        $enabled = ($env === 'production') && $sendToggle && !empty($apiKey);

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
        if (!$apiKey) {
            $reasons[] = 'missing SENDGRID_API_KEY';
        }

        return ['enabled' => false, 'reason' => implode('; ', $reasons) ?: 'send disabled'];
    }

    private static function buildSubject(string $type): string
    {
        $service = Config::get('SERVICE_NAME', 'Thunder Road Bar & Grill');
        $env = Config::get('APP_ENV', 'production');
        $timestamp = gmdate('Y-m-d H:i') . ' UTC';
        return sprintf('[%s] %s (%s) – %s', $service, $type, $env, $timestamp);
    }

    private static function buildContext(array $meta, string $supportEmail): array
    {
        $requestId = $meta['requestId'] ?? RequestContext::getRequestId();
        $method = strtoupper($meta['method'] ?? ($_SERVER['REQUEST_METHOD'] ?? 'POST'));
        $path = $meta['path'] ?? ($_SERVER['REQUEST_URI'] ?? 'unknown');
        return [
            'Request ID' => $requestId,
            'Path' => $path,
            'Method' => $method,
            'Timestamp (UTC)' => gmdate('c'),
            'Support' => $supportEmail,
        ];
    }

    private static function buildHtml(array $sections): string
    {
        $blocks = [];
        foreach ($sections as $title => $rows) {
            $rowsHtml = '';
            foreach ($rows as $label => $value) {
                $rowsHtml .= sprintf(
                    '<tr><td style="padding:4px 8px;font-weight:bold;">%s</td><td style="padding:4px 8px;">%s</td></tr>',
                    htmlspecialchars((string) $label, ENT_QUOTES, 'UTF-8'),
                    self::formatHtmlValue($value)
                );
            }
            $blocks[] = sprintf(
                '<h3 style="margin:16px 0 8px;font-family:Arial,sans-serif;">%s</h3><table style="border-collapse:collapse;font-family:Arial,sans-serif;width:100%%;max-width:640px;">%s</table>',
                htmlspecialchars((string) $title, ENT_QUOTES, 'UTF-8'),
                $rowsHtml
            );
        }

        return '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2933;">' .
            implode('', $blocks) .
            '</div>';
    }

    private static function buildText(array $sections): string
    {
        $lines = [];
        foreach ($sections as $title => $rows) {
            $lines[] = strtoupper($title);
            foreach ($rows as $label => $value) {
                $lines[] = sprintf('%s: %s', $label, self::formatTextValue($value));
            }
            $lines[] = '';
        }
        return trim(implode(PHP_EOL, $lines));
    }

    private static function formatHtmlValue($value): string
    {
        $normalized = is_array($value) ? implode(', ', $value) : (string) $value;
        $safe = htmlspecialchars($normalized, ENT_QUOTES, 'UTF-8');
        return nl2br($safe);
    }

    private static function formatTextValue($value): string
    {
        $normalized = is_array($value) ? implode(', ', $value) : (string) $value;
        return preg_replace('/\s+/', ' ', trim($normalized));
    }

    private static function sanitizeEmail(?string $email): ?string
    {
        $email = trim((string) $email);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }

    private static function recordPreview(string $channel, array $data): void
    {
        if (self::isProduction() || !self::allowPreviewLog()) {
            return;
        }

        $dir = dirname(self::PREVIEW_LOG);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $entry = array_merge(['channel' => $channel, 'timestamp' => gmdate('c')], $data);
        file_put_contents(self::PREVIEW_LOG, json_encode($entry) . PHP_EOL, FILE_APPEND);
    }

    private static function truncate(?string $text, int $limit = 200): string
    {
        if ($text === null) {
            return '';
        }
        $text = trim($text);
        return strlen($text) > $limit ? substr($text, 0, $limit - 3) . '...' : $text;
    }

    private static function isProduction(): bool
    {
        return Config::get('APP_ENV', 'production') === 'production';
    }

    private static function allowPreviewLog(): bool
    {
        if (self::isProduction()) {
            return false;
        }
        return Config::getBool('EMAIL_PREVIEW_LOG', false);
    }
}
