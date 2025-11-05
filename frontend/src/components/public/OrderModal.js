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
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

export default function OrderModal({ onClose }) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    // trigger CSS animation on next frame
    const raf = requestAnimationFrame(() => setMounted(true));

    // save previously focused element so we can restore focus on close
    previouslyFocused.current = typeof document !== 'undefined' ? document.activeElement : null;

    // focus management: trap focus inside the modal and handle Escape
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose && onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const idx = focusable.indexOf(document.activeElement);
      if (e.shiftKey) {
        // backward
        const next = idx <= 0 ? focusable[focusable.length - 1] : focusable[idx - 1];
        e.preventDefault();
        next.focus();
      } else {
        // forward
        const next = idx === -1 || idx === focusable.length - 1 ? focusable[0] : focusable[idx + 1];
        e.preventDefault();
        next.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });

    // focus first focusable inside modal once mounted
    const focusTimer = setTimeout(() => {
      try {
        const container = modalRef.current;
        if (container) {
          const first = container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          (first || container).focus();
        }
      } catch (err) {
        // ignore
      }
    }, 0);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
      // restore focus
      try {
        const prev = previouslyFocused.current;
        if (prev && typeof prev.focus === 'function') prev.focus();
      } catch (err) {}
    };
  }, [onClose]);

  const modal = (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${mounted ? 'opacity-100' : 'opacity-0'}`} aria-hidden="false">
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={`bg-surface rounded-lg p-4 max-w-md w-full mx-auto modal-transition ${mounted ? 'modal-enter-active' : 'modal-exit-active'}`}
        tabIndex={-1}
      >
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

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }

  return modal;
}
