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
            'action' => 'email_queued',
            'meta' => [
                'channel' => 'ops',
                'type' => $type,
                'requestId' => $meta['requestId'] ?? RequestContext::getRequestId(),
            ],
        ]);

        $ok = Emailer::sendOpsNotification($type, $fields, $meta, $replyTo);
        if ($ok) {
            AuditLog::record('email_sent', [
                'actor_type' => 'system',
                'meta' => [
                    'channel' => 'ops',
                    'type' => $type,
                    'requestId' => $meta['requestId'] ?? RequestContext::getRequestId(),
                ],
            ]);
            return ['ok' => true];
        }

        AuditLog::record('email_failed', [
            'actor_type' => 'system',
            'meta' => [
                'channel' => 'ops',
                'type' => $type,
                'requestId' => $meta['requestId'] ?? RequestContext::getRequestId(),
            ],
        ]);
        return ['ok' => false, 'error' => 'send_failure'];
    }

    public static function sendAlert(array $context): array
    {
        AuditLog::record('email_queued', [
            'actor_type' => 'system',
            'meta' => [
                'channel' => 'alert',
                'status' => $context['status'] ?? 500,
                'requestId' => $context['requestId'] ?? RequestContext::getRequestId(),
            ],
        ]);

        $ok = Emailer::sendAlert($context);
        if ($ok) {
            AuditLog::record('email_sent', [
                'actor_type' => 'system',
                'meta' => [
                    'channel' => 'alert',
                    'status' => $context['status'] ?? 500,
                    'requestId' => $context['requestId'] ?? RequestContext::getRequestId(),
                ],
            ]);
            return ['ok' => true];
        }

        AuditLog::record('email_failed', [
            'actor_type' => 'system',
            'meta' => [
                'channel' => 'alert',
                'status' => $context['status'] ?? 500,
                'requestId' => $context['requestId'] ?? RequestContext::getRequestId(),
            ],
        ]);
        return ['ok' => false, 'error' => 'send_failure'];
    }
}
