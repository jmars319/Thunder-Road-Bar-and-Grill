# API Error Envelope

Every API error response **must** include the standard envelope so clients can rely on a consistent shape regardless of endpoint:

```json
{
  "error": "Human-readable summary of the problem",
  "status": 400,
  "requestId": "req_abc123",
  "timestampUTC": "2025-12-25T11:59:42+00:00"
}
```

Additional fields (for example legacy `success:false`, `message`, or `errors`) **may** be included, but the envelope keys above are mandatory whenever the HTTP status is ≥ 400.

To prevent regressions, run:

```bash
bash ./scripts/verify-error-envelope.sh
```

This script issues requests against a running dev stack and fails if any response is missing the required keys or returns an unexpected status code.
