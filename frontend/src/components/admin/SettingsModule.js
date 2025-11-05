/*
  SettingsModule

  Purpose:
  - Admin settings page for business information, site branding, and basic site configuration.

  Contract:
  - Rendered inside the admin shell. Reads and updates site settings via API.

  Notes:
  - Changing logos or branding should trigger a `siteSettingsUpdated` event so the public site updates live.
*/
import { useState, useEffect, useRef } from 'react';
import { clearCacheFor } from '../../lib/cachedFetch';
import { icons } from '../../icons';

/*
  SettingsModule

  Purpose:
  - Admin area to manage global site settings, the About content, and business hours.

  API expectations:
  - GET /api/site-settings -> { ... }
  - PUT /api/site-settings
  - GET /api/about -> { header, paragraph, map_embed_url }
  - PUT /api/about
  - GET /api/business-hours -> [ { id, day_of_week, opening_time, closing_time, is_closed }, ... ]
  - PUT /api/business-hours/:id

  Notes:
  - All network calls are performed with minimal optimistic UX. Errors are caught and silently ignored
    to keep the admin UI responsive; consider surfacing errors to the user via toasts for a better UX.
*/

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

function SettingsModule() {
  const [siteSettings, setSiteSettings] = useState({});
  const [aboutContent, setAboutContent] = useState({});
  const [businessHours, setBusinessHours] = useState([]);
  const [saved, setSaved] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const originalSettingsRef = useRef({});

  useEffect(() => {
    // Load all settings in a single async function with error handling
    const loadAll = async () => {
      try {
        const [siteRes, aboutRes, hoursRes] = await Promise.all([
          fetch(`${API_BASE}/site-settings`),
          fetch(`${API_BASE}/about`),
          fetch(`${API_BASE}/business-hours`)
        ]);

        if (siteRes.ok) {
          const siteData = await siteRes.json();
          setSiteSettings(siteData || {});
          originalSettingsRef.current = siteData || {};
        }

        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          setAboutContent(aboutData || {});
        }

        if (hoursRes.ok) {
          const hoursData = await hoursRes.json();
          setBusinessHours(Array.isArray(hoursData) ? hoursData : []);
        }
      } catch {
        // Intentionally quiet: admin UI will render empty/default values on error
        setSiteSettings({});
        setAboutContent({});
        setBusinessHours([]);
      }
    };

    loadAll();
  }, []);

  const saveSiteSettings = async () => {
    try {
      // Send only fields that changed to avoid overwriting unrelated values
      const orig = originalSettingsRef.current || {};
      const payload = {};
      const keys = ['business_name','tagline','menu_description','phone','email','address','logo_url','hero_images','instagram','facebook','google'];
      for (const k of keys) {
        const cur = siteSettings[k];
        const o = orig[k];
        if (Array.isArray(cur) || Array.isArray(o)) {
          const curJson = JSON.stringify(cur || []);
          const oJson = JSON.stringify(o || []);
          if (curJson !== oJson) payload[k] = cur;
        } else if (cur !== o) {
          payload[k] = cur;
        }
      }

      // Debug: log siteSettings, original snapshot, and computed payload so
      // we can diagnose why saves sometimes do not trigger a network request.
      try {
        if (typeof window !== 'undefined' && typeof window.__app_debug === 'function') {
          window.__app_debug('saveSiteSettings', { siteSettings, original: originalSettingsRef.current, payload });
        }
      } catch (e) {}

      // If nothing changed, show a quick saved indicator and return
      if (Object.keys(payload).length === 0) {
        try { if (typeof window !== 'undefined' && typeof window.__app_debug === 'function') window.__app_debug('saveSiteSettings', 'no changes, aborting save'); } catch (e) {}
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        return;
      }

      // Ensure google is always sent when present in the UI. Some browsers or
      // minimal-diff logic can omit fields unexpectedly; force-send google when
      // the admin filled it so the backend gets the updated value.
      try {
        if ((typeof siteSettings.google !== 'undefined') && !Object.prototype.hasOwnProperty.call(payload, 'google')) {
          payload.google = siteSettings.google;
        }
      } catch (e) {}

  try { if (typeof window !== 'undefined' && typeof window.__app_debug === 'function') window.__app_debug('saveSiteSettings:performFetch', payload); } catch (e) {}

      const res = await fetch(`${API_BASE}/site-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Clear cached entries that depend on site-settings and menu so public UI updates immediately
        clearCacheFor(`${API_BASE}/site-settings`);
        clearCacheFor(`${API_BASE}/menu`);
        // Emit window events so other tabs/components can respond
        try {
          const Ev = (typeof window !== 'undefined' && window.CustomEvent) ? window.CustomEvent : (typeof window !== 'undefined' ? window.Event : null);
          if (Ev) {
            window.dispatchEvent(new Ev('siteSettingsUpdated'));
            window.dispatchEvent(new Ev('menuUpdated'));
          }
        } catch (e) {}

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // update original copy to reflect saved state
        try { originalSettingsRef.current = { ...(originalSettingsRef.current || {}), ...payload }; } catch (e) {}
        // show a small toast if the menu description was part of the save
        if (siteSettings.menu_description && siteSettings.menu_description.length > 0) {
          setMenuSaved(true);
          setTimeout(() => setMenuSaved(false), 2500);
        }
      }
    } catch {
      // swallow for now; could show toast on failure
    }
  };

  const saveAboutContent = async () => {
    try {
      // If admin pasted a full <iframe ...> HTML snippet into the Map Embed URL
      // field, extract the src attribute and store that instead of the raw HTML.
      const payload = { ...aboutContent };
      if (payload.map_embed_url && typeof payload.map_embed_url === 'string') {
        const trimmed = payload.map_embed_url.trim();
        // Detect an iframe tag quickly
        if (/^<iframe\s+/i.test(trimmed)) {
          // Extract src attribute value
          const match = trimmed.match(/src\s*=\s*"([^"]+)"/i);
          if (match && match[1]) {
            payload.map_embed_url = match[1];
          } else {
            // Try single-quoted src
            const match2 = trimmed.match(/src\s*=\s*'([^']+)'/i);
            if (match2 && match2[1]) payload.map_embed_url = match2[1];
          }
        }
      }

      const res = await fetch(`${API_BASE}/about`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
  } catch {
    // swallow for now; consider showing an error toast
    }
  };

  // Update a single day's hours. Returns the fetch Response so callers can handle errors.
  const saveBusinessHours = async (id, data) => {
    try {
      const res = await fetch(`${API_BASE}/business-hours/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res;
    } catch (err) {
      // bubble up so caller can surface an error
      throw err;
    }
  };

  // Save all business hours in one action. This calls the single-day PUT for
  // each entry and then refetches the hours to ensure the UI matches server state.
  const saveAllBusinessHours = async () => {
    try {
      const saves = businessHours.map((d) => saveBusinessHours(d.id, d));
      const results = await Promise.allSettled(saves);

      const rejected = results.filter(r => r.status === 'rejected');
      const failed = results.filter(r => r.status === 'fulfilled' && !r.value.ok);

      if (rejected.length || failed.length) {
        // Surface a generic error message; for more granularity we could
        // examine individual responses and show per-day messages.
        setSaved(false);
        setTimeout(() => setSaved(false), 2000);
        // throw to allow downstream handling (e.g., toasts)
        throw new Error('One or more days failed to save');
      }

      // All saved successfully — refetch hours to ensure canonical state
      try {
        const hr = await fetch(`${API_BASE}/business-hours`);
        if (hr.ok) {
          const data = await hr.json();
          setBusinessHours(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        // ignore refetch errors — we still mark saved
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // TODO: show a toast with err.message; currently we just setSaved false
      console.error('Failed to save business hours:', err && err.message);
      setSaved(false);
      // Consider exposing the error with a toast in future
    }
  };

  return (
    <div className="space-y-6">
      {saved && (
    <div className="bg-success text-text-inverse px-4 py-3 rounded-lg flex items-center gap-2">
          <icons.Save size={18} />
          Settings saved successfully!
        </div>
      )}

      {/* Site Settings */}
      <div className="bg-surface rounded-lg shadow p-6">
  <h3 className="text-xl font-bold mb-4 text-text-primary">Site Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Business Name</label>
            <input
              type="text"
              value={siteSettings.business_name || ''}
              onChange={(e) => setSiteSettings({...siteSettings, business_name: e.target.value})}
              className="w-full form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Tagline</label>
            <input
              type="text"
              value={siteSettings.tagline || ''}
              onChange={(e) => setSiteSettings({...siteSettings, tagline: e.target.value})}
              className="w-full form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Menu Description (public)</label>
            <textarea
              value={siteSettings.menu_description || ''}
              onChange={(e) => setSiteSettings({...siteSettings, menu_description: e.target.value})}
              className="w-full form-input"
              rows="3"
              placeholder="A short description shown on the public menu page"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
            <input
              type="text"
              value={siteSettings.phone || ''}
              onChange={(e) => setSiteSettings({...siteSettings, phone: e.target.value})}
              className="w-full form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
            <input
              type="email"
              value={siteSettings.email || ''}
              onChange={(e) => setSiteSettings({...siteSettings, email: e.target.value})}
              className="w-full form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Address</label>
            <textarea
              value={siteSettings.address || ''}
              onChange={(e) => setSiteSettings({...siteSettings, address: e.target.value})}
              className="w-full form-input"
              rows="2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Instagram URL</label>
            <input
              type="url"
              value={siteSettings.instagram || siteSettings.instagram_url || (siteSettings.social && siteSettings.social.instagram) || ''}
              onChange={(e) => {
                const v = e.target.value;
                setSiteSettings({
                  ...siteSettings,
                  instagram: v,
                  instagram_url: v,
                  social: { ...(siteSettings.social || {}), instagram: v }
                });
              }}
              className="w-full form-input"
              placeholder="https://instagram.com/yourhandle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Facebook URL</label>
            <input
              type="url"
              value={siteSettings.facebook || siteSettings.facebook_url || (siteSettings.social && siteSettings.social.facebook) || ''}
              onChange={(e) => {
                const v = e.target.value;
                setSiteSettings({
                  ...siteSettings,
                  facebook: v,
                  facebook_url: v,
                  social: { ...(siteSettings.social || {}), facebook: v }
                });
              }}
              className="w-full form-input"
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Google Listing URL</label>
            <input
              type="url"
              value={siteSettings.google || siteSettings.google_url || (siteSettings.social && siteSettings.social.google) || ''}
              onChange={(e) => {
                const v = e.target.value;
                setSiteSettings({
                  ...siteSettings,
                  google: v,
                  google_url: v,
                  social: { ...(siteSettings.social || {}), google: v }
                });
              }}
              className="w-full form-input"
              placeholder="https://maps.google.com/... or https://business.google.com/..."
            />
          </div>
          <button
            onClick={saveSiteSettings}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
          >
            <icons.Save size={18} />
            Save Site Settings
          </button>
          {menuSaved && (
            <div className="fixed right-6 top-6 z-50">
              <div className="bg-success text-text-inverse px-4 py-2 rounded shadow flex items-center gap-2">
                <icons.CheckCircle size={16} />
                <span className="text-sm">Menu description saved</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About Content */}
      <div className="bg-surface rounded-lg shadow p-6">
  <h3 className="text-xl font-bold mb-4 text-text-primary">About Section</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Header</label>
            <input
              type="text"
              value={aboutContent.header || ''}
              onChange={(e) => setAboutContent({...aboutContent, header: e.target.value})}
              className="w-full form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Paragraph</label>
            <textarea
              value={aboutContent.paragraph || ''}
              onChange={(e) => setAboutContent({...aboutContent, paragraph: e.target.value})}
              className="w-full form-input"
              rows="4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Map Embed URL</label>
            <input
              type="text"
              value={aboutContent.map_embed_url || ''}
              onChange={(e) => setAboutContent({...aboutContent, map_embed_url: e.target.value})}
              className="w-full form-input"
              placeholder="Google Maps embed URL"
            />
          </div>
          <button
            onClick={saveAboutContent}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
          >
            <icons.Save size={18} />
            Save About Content
          </button>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-surface rounded-lg shadow p-6">
  <h3 className="text-xl font-bold mb-4 text-text-primary">Business Hours</h3>
        <div className="space-y-3">
          {businessHours.map(day => (
            <div key={day.id} className="flex items-center gap-4">
              <div className="w-32 font-medium text-text-primary">{day.day_of_week}</div>
              <input
                type="time"
                value={day.opening_time || ''}
                onChange={(e) => {
                  const updated = businessHours.map(d => 
                    d.id === day.id ? {...d, opening_time: e.target.value} : d
                  );
                  setBusinessHours(updated);
                }}
                disabled={day.is_closed}
                className="form-input"
              />
              <span className="text-text-secondary">to</span>
              <input
                type="time"
                value={day.closing_time || ''}
                onChange={(e) => {
                  const updated = businessHours.map(d => 
                    d.id === day.id ? {...d, closing_time: e.target.value} : d
                  );
                  setBusinessHours(updated);
                }}
                disabled={day.is_closed}
                className="form-input"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.is_closed}
                  onChange={(e) => {
                    const updated = businessHours.map(d => 
                      d.id === day.id ? {...d, is_closed: e.target.checked} : d
                    );
                    setBusinessHours(updated);
                  }}
                />
                <span className="text-sm text-text-secondary">Closed</span>
              </label>
              {/* Per-day save removed in favor of a single 'Save All Hours' action below */}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={saveAllBusinessHours}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
          >
            <icons.Save size={16} />
            Save All Hours
          </button>
        </div>
      </div>
    </div>
  );
}

const Module = {
  component: SettingsModule,
  name: 'Settings',
  icon: icons.Settings
};

export default Module;
