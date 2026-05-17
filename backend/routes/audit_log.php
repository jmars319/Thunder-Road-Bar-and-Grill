<?php
/**
 * Audit Log Routes
 *
 * Purpose:
 *  - Provide admin-only access to paginated audit log entries with filters
 */

require_once __DIR__ . '/../utils/Database.php';
require_once __DIR__ . '/../utils/Config.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../middleware/AdminAuthMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorHandler.php';

class AuditLogRoutes {
    private $db;

    public function __construct() {
        $this->db = Database::lazy();
    }

    /**
     * HTTP handler: GET /api/audit-log
     */
    public function listEntries() {
        AdminAuthMiddleware::require();
        try {
            $payload = $this->fetchEntries($_GET ?? []);
            echo json_encode($payload);
        } catch (Exception $e) {
            Logger::error('Failed to fetch audit log entries', ['error' => $e->getMessage()]);
            ErrorHandler::respond('Unable to fetch audit log entries', 500);
        }
    }

    public function exportEntries() {
        AdminAuthMiddleware::require();
        $range = strtolower($_GET['range'] ?? '24h');
        $format = strtolower($_GET['format'] ?? 'json');
        $hours = $range === '7d' ? 24 * 7 : 24;
        if (!in_array($format, ['json', 'text'], true)) {
            $format = 'json';
        }
        $start = gmdate('Y-m-d H:i:s', time() - ($hours * 3600));
        $filename = sprintf('audit-log-%s-%s-%s.%s', $range, $format, gmdate('Ymd_His'), $format === 'json' ? 'json' : 'txt');

        if (ob_get_level() > 0) {
            ob_clean();
        }

        header_remove('Content-Type');
        header('Cache-Control: no-store');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        if ($format === 'json') {
            header('Content-Type: application/json; charset=utf-8');
            $this->streamJson($start);
        } else {
            header('Content-Type: text/plain; charset=utf-8');
            $this->streamText($start);
        }
    }

    /**
     * Core query logic shared with tests
     */
    public function fetchEntries(array $params) {
        $page = max(1, (int) ($params['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($params['per_page'] ?? 25)));
        $offset = ($page - 1) * $perPage;

        $where = [];
        $bind = [];

        if (!empty($params['action'])) {
            $where[] = 'action = :action';
            $bind['action'] = $params['action'];
        }

        if (!empty($params['actor_type'])) {
            $where[] = 'actor_type = :actor_type';
            $bind['actor_type'] = $params['actor_type'];
        }

        if (!empty($params['start_date'])) {
            $start = $this->parseDate($params['start_date']);
            if ($start) {
                $where[] = 'created_at >= :start_date';
                $bind['start_date'] = $start;
            }
        }

        if (!empty($params['end_date'])) {
            $end = $this->parseDate($params['end_date'], true);
            if ($end) {
                $where[] = 'created_at <= :end_date';
                $bind['end_date'] = $end;
            }
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countRow = $this->db->fetchOne("SELECT COUNT(*) as cnt FROM audit_log {$whereSql}", $bind);
        $total = isset($countRow['cnt']) ? (int) $countRow['cnt'] : 0;
        $totalPages = max(1, (int) ceil($total / $perPage));

        $limit = (int) $perPage;
        $offset = (int) $offset;
        $entries = $this->db->fetchAll(
            "SELECT id, created_at, actor_type, actor_id, ip, user_agent, action, entity_type, entity_id, meta_json
             FROM audit_log
             {$whereSql}
             ORDER BY created_at DESC
             LIMIT {$limit} OFFSET {$offset}",
            $bind
        );

        $entries = array_map(function ($row) {
            $row['meta'] = null;
            if (!empty($row['meta_json'])) {
                $decoded = json_decode($row['meta_json'], true);
                $row['meta'] = $decoded ?: null;
            }
            unset($row['meta_json']);
            return $row;
        }, $entries ?: []);

        return [
            'data' => $entries,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages
            ],
            'filters' => [
                'action' => $params['action'] ?? null,
                'actor_type' => $params['actor_type'] ?? null,
                'start_date' => $params['start_date'] ?? null,
                'end_date' => $params['end_date'] ?? null
            ]
        ];
    }

    private function parseDate($value, $endOfDay = false) {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return null;
        }
        if ($endOfDay) {
            $timestamp = strtotime('23:59:59', $timestamp);
        }
        return date('Y-m-d H:i:s', $timestamp);
    }

    private function streamJson(string $start) {
        echo '[';
        $first = true;
        foreach ($this->yieldRangeRows($start) as $row) {
            if (!$first) {
                echo ",\n";
            }
            $first = false;
            echo json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            flush();
        }
        echo ']';
    }

    private function streamText(string $start) {
        foreach ($this->yieldRangeRows($start) as $row) {
            $timestamp = $row['created_at'] ?? '';
            $actor = $row['actor_type'] ?? 'unknown';
            if (!empty($row['actor_id'])) {
                $actor .= ' (#' . $row['actor_id'] . ')';
            }
            $entity = $row['entity_type'] ?? '';
            if ($entity && !empty($row['entity_id'])) {
                $entity .= ' (#' . $row['entity_id'] . ')';
            }
            $metaSummary = $this->metaSummary($row['meta']);
            $line = sprintf('%s | %s | %s | %s | %s', $timestamp, $row['action'] ?? '', $actor, $entity ?: '-', $metaSummary);
            echo $line . "\n";
            flush();
        }
    }

    private function metaSummary($meta) {
        if (!$meta || !is_array($meta)) {
            return '(no details)';
        }
        $parts = [];
        foreach ($meta as $key => $value) {
            $valueString = is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $parts[] = sprintf('%s=%s', $key, $valueString);
            if (strlen(implode(', ', $parts)) > 160) {
                $parts[] = '…';
                break;
            }
        }
        return implode(', ', $parts);
    }

    private function yieldRangeRows(string $start) {
        $chunk = 500;
        $lastId = 0;
        while (true) {
            $rows = $this->db->fetchAll(
                "SELECT id, created_at, actor_type, actor_id, ip, user_agent, action, entity_type, entity_id, meta_json
                 FROM audit_log
                 WHERE created_at >= :start AND id > :lastId
                 ORDER BY id ASC
                 LIMIT {$chunk}",
                ['start' => $start, 'lastId' => $lastId]
            );
            if (!$rows) {
                break;
            }
            foreach ($rows as $row) {
                $row['meta'] = null;
                if (!empty($row['meta_json'])) {
                    $decoded = json_decode($row['meta_json'], true);
                    $row['meta'] = $decoded ?: null;
                }
                unset($row['meta_json']);
                yield $row;
                $lastId = (int) $row['id'];
            }
        }
    }
}
