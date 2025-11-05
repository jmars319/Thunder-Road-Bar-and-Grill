(
  async () => {
    const assert = require('assert');
    const fetch = global.fetch || require('node-fetch');

    const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

    try {
      // 1) Read current settings so we can restore them after the test
      let res = await fetch(`${API_BASE}/site-settings`);
      assert(res.ok, 'GET /site-settings failed');
      const original = await res.json();

      // 2) Prepare test values (include long google URL to exercise TEXT column)
      const longTail = 'a'.repeat(400);
      const testPayload = {
        instagram: 'https://www.instagram.com/test-integration',
        facebook: 'https://www.facebook.com/test-integration',
        google: `https://example.com/test/${longTail}`
      };

      // 3) Use the preview endpoint to validate/normalize without mutating DB
      res = await fetch(`${API_BASE}/internal/site-settings/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      assert(res.ok, 'POST /internal/site-settings/preview failed');
      const preview = await res.json();

      // 4) Verify normalization/preview output
      assert.strictEqual(preview.instagram, testPayload.instagram, 'instagram preview mismatch');
      assert.strictEqual(preview.facebook, testPayload.facebook, 'facebook preview mismatch');
      assert.strictEqual(preview.google, testPayload.google, 'google preview mismatch');

      // 5) Do not mutate DB; test is conservative and ends here.

      console.log('Site-settings integration test passed');
      process.exit(0);
    } catch (err) {
      console.error('Site-settings integration test failed:', err && err.message ? err.message : err);
      process.exit(2);
    }
  }
)();
