import { icons } from '../../icons';

export const normalizeHeroImages = (rawValue) => {
  const asArray = (() => {
    if (Array.isArray(rawValue)) return rawValue;
    if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  return asArray
    .map((entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const rawId = typeof entry.id !== 'undefined'
          ? entry.id
          : (typeof entry.media_id !== 'undefined' ? entry.media_id : entry.value);
        const id = Number(rawId);
        if (!Number.isFinite(id)) return null;
        return {
          id,
          title: entry.title || '',
          alt_text: entry.alt_text || '',
          is_fallback: Boolean(entry.is_fallback)
        };
      }
      if (typeof entry === 'number' || typeof entry === 'string') {
        const parsed = Number(entry);
        if (!Number.isFinite(parsed)) return null;
        return {
          id: parsed,
          title: '',
          alt_text: '',
          is_fallback: false
        };
      }
      return null;
    })
    .filter((entry) => entry && Number.isFinite(entry.id) && !entry.is_fallback)
    .map(({ id, title, alt_text }) => ({
      id,
      title,
      alt_text
    }));
};

export function CollapsibleCard({ title, helper, isOpen, onToggle, children }) {
  return (
    <div className="bg-surface rounded-lg shadow overflow-hidden border border-divider/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 bg-surface-dark text-text-inverse"
      >
        <div className="text-left">
          <h3 className="text-lg font-semibold">{title}</h3>
          {helper && <p className="text-xs text-text-inverse/80 mt-1">{helper}</p>}
        </div>
        <icons.ChevronDown
          size={18}
          className={`text-text-inverse/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-divider space-y-4 bg-surface">
          {children}
        </div>
      )}
    </div>
  );
}

export function Field({ label, value, onChange, helper, textarea = false, rows = 1 }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text-primary">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full form-input"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full form-input"
        />
      )}
      {helper && <p className="text-xs text-text-secondary">{helper}</p>}
    </div>
  );
}
