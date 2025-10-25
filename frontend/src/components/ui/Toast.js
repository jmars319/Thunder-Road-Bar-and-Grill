/*
  Toast

  Purpose:
  - Small, accessible toast/inline notification component used by the
    `ToastContext` and ad-hoc callers to show brief status messages.

  Contract:
  - Props: { type?: 'success'|'error'|'info', children: node, onClose?: function }

  Notes:
  - Keep styling tokenized and minimal. Auto-dismiss and stacking behavior
    should be implemented by the caller (e.g., ToastProvider) when needed.
*/
export default function Toast({ type = 'info', children, onClose }) {
  const base = 'rounded-lg p-3 mb-2 flex items-center gap-3';
  const variants = {
    success: 'bg-success/10 border border-success text-success',
    error: 'bg-error/10 border border-error text-error',
    info: 'bg-surface p-3 border border-border text-text-primary'
  };

  return (
    <div role="status" aria-live="polite" className={`${base} ${variants[type] || variants.info}`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-sm text-text-secondary px-2 py-1 rounded hover:bg-surface-warm">✕</button>
      )}
    </div>
  );
}
