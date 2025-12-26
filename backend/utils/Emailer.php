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
        $service = htmlspecialchars(Config::get('SERVICE_NAME', 'Thunder Road Bar & Grill'), ENT_QUOTES, 'UTF-8');
        $support = htmlspecialchars(Config::get('SUPPORT_EMAIL', 'support@jamarq.digital'), ENT_QUOTES, 'UTF-8');

        $blocks = '';
        foreach ($sections as $title => $rows) {
            $rowsHtml = '';
            foreach ($rows as $label => $value) {
                $rowsHtml .= sprintf(
                    '<tr><td style="padding:6px 12px;font-weight:600;width:160px;vertical-align:top;">%s</td><td style="padding:6px 12px;">%s</td></tr>',
                    htmlspecialchars((string) $label, ENT_QUOTES, 'UTF-8'),
                    self::formatHtmlValue($value)
                );
            }
            $blocks .= sprintf(
                '<tr><td colspan="2" style="padding:20px 0 8px;font-size:15px;font-weight:700;color:#111827;font-family:Arial,sans-serif;">%s</td></tr><tr><td colspan="2"><table role="presentation" style="width:100%%;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">%s</table></td></tr>',
                htmlspecialchars((string) $title, ENT_QUOTES, 'UTF-8'),
                $rowsHtml
            );
        }

        $body = sprintf(
            '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%%;background:#111827;padding:24px 0;">
                <tr>
                    <td style="padding:0 16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;max-width:640px;width:100%%;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 10px 25px rgba(15,23,42,0.12);font-family:Arial,sans-serif;color:#111827;font-size:15px;">
                            <tr>
                                <td style="border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px;">
                                    <div style="font-size:20px;font-weight:700;">%s</div>
                                    <div style="font-size:13px;color:#6b7280;">Operational Notification</div>
                                </td>
                            </tr>
                            %s
                            <tr>
                                <td style="padding-top:24px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Need help? Contact %s</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>',
            $service,
            $blocks,
            $support
        );

        return trim(preg_replace('/\s+/', ' ', $body));
    }

    private static function buildText(array $sections): string
    {
        $lines = [];
        $service = Config::get('SERVICE_NAME', 'Thunder Road Bar & Grill');
        $lines[] = $service . ' Notification';
        $lines[] = str_repeat('=', strlen($lines[0]));
        $lines[] = '';

        foreach ($sections as $title => $rows) {
            $lines[] = strtoupper((string) $title);
            foreach ($rows as $label => $value) {
                $lines[] = sprintf('%s: %s', $label, self::formatTextValue($value));
            }
            $lines[] = '';
        }

        $lines[] = 'Support: ' . Config::get('SUPPORT_EMAIL', 'support@jamarq.digital');
        return implode(PHP_EOL, array_map('rtrim', $lines));
    }

    private static function normalizeValue($value): string
    {
        if (is_null($value) || $value === '') {
            return '(not provided)';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_scalar($value)) {
            return trim((string) $value) !== '' ? (string) $value : '(not provided)';
        }
        if (is_array($value)) {
            $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return $encoded !== false ? $encoded : '(not provided)';
        }
        return '(not provided)';
    }

    private static function formatHtmlValue($value): string
    {
        $normalized = self::normalizeValue($value);
        $safe = htmlspecialchars($normalized, ENT_QUOTES, 'UTF-8');
        return nl2br($safe);
    }

    private static function formatTextValue($value): string
    {
        $normalized = self::normalizeValue($value);
        return preg_replace('/[\r\n]+/', ' ', trim($normalized));
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
