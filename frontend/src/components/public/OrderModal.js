/**
 * OrderModal
 *
 * Purpose:
 * - Lightweight placeholder modal shown when users click "Order Online".
 * - Intentionally simple: shows a Work-In-Progress message until a real
 *   ordering flow (or external provider) is integrated.
 *
 * Props:
 * - onClose: function invoked when the modal should be dismissed.
 *
 * Notes for maintainers:
 * - This component is purposely small and synchronous. If you later
 *   integrate a real ordering provider, consider making this a lazy-loaded
 *   component (React.lazy) or replacing it with a portal-based flow to
 *   isolate stacking context and focus management.
 */
export default function OrderModal({ onClose }) {
  return (
    <div className="modal-backdrop flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-4 max-w-md w-full">
        <h3 className="text-lg font-bold mb-2 text-text-primary">Order Online (WIP)</h3>
        <p className="text-sm text-text-secondary mb-4">
          We're currently working on online ordering. In the meantime you can place an order by phone or stop by the restaurant.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="bg-surface-warm text-text-secondary py-1 px-3 rounded"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="bg-primary text-text-inverse py-1 px-3 rounded"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
