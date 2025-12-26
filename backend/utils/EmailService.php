<?php

require_once __DIR__ . '/Emailer.php';
require_once __DIR__ . '/AuditLog.php';
require_once __DIR__ . '/RequestContext.php';

class EmailService
{
    public static function sendOps(string $type, array $fields, array $meta = [], ?string $replyTo = null): array
    {
        AuditLog::record('email_queued', [
            'actor_type' => 'system',
            'meta' => self::buildEmailMeta('ops', $type, $meta, null),
        ]);

        $ok = Emailer::sendOpsNotification($type, $fields, $meta, $replyTo);
        if ($ok) {
            AuditLog::record('email_sent', [
                'actor_type' => 'system',
                'meta' => self::buildEmailMeta('ops', $type, $meta, ['status' => 'sent']),
            ]);
            return ['ok' => true];
        }

        AuditLog::record('email_failed', [
            'actor_type' => 'system',
            'meta' => self::buildEmailMeta('ops', $type, $meta, ['status' => 'failed']),
        ]);
        return ['ok' => false, 'error' => 'send_failure'];
    }

    public static function sendAlert(array $context): array
    {
        AuditLog::record('email_queued', [
            'actor_type' => 'system',
            'meta' => self::buildEmailMeta('alert', (string)($context['status'] ?? 500), $context),
        ]);

        $ok = Emailer::sendAlert($context);
        if ($ok) {
            AuditLog::record('email_sent', [
                'actor_type' => 'system',
                'meta' => self::buildEmailMeta('alert', (string)($context['status'] ?? 500), $context, ['status' => 'sent']),
            ]);
            return ['ok' => true];
        }

        AuditLog::record('email_failed', [
            'actor_type' => 'system',
            'meta' => self::buildEmailMeta('alert', (string)($context['status'] ?? 500), $context, ['status' => 'failed']),
        ]);
        return ['ok' => false, 'error' => 'send_failure'];
    }

    private static function buildEmailMeta(string $channel, string $type, array $context = [], array $extra = []): array
    {
        $requestId = $context['requestId'] ?? RequestContext::getRequestId();
        $recipient = $context['to'] ?? $context['email'] ?? null;
        $subject = $context['subject'] ?? $context['type'] ?? null;
        $masked = $recipient ? self::maskEmail((string) $recipient) : null;

        $meta = [
            'channel' => $channel,
            'type' => $type,
            'requestId' => $requestId,
            'to' => $masked,
            'subject' => $subject,
        ];

        if (isset($context['sendgrid_message_id'])) {
            $meta['provider_message_id'] = $context['sendgrid_message_id'];
        }

        if (isset($context['error'])) {
            $meta['error'] = mb_substr((string) $context['error'], 0, 500);
        }

        return array_merge($meta, $extra);
    }

    private static function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return $email;
        }

        $name = $parts[0];
        $domain = $parts[1];
        if (strlen($name) <= 1) {
            return '*' . '@' . $domain;
        }

        $visible = substr($name, 0, 1);
        return sprintf('%s***@%s', $visible, $domain);
    }
}
