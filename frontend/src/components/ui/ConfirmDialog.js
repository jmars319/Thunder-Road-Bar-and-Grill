/*
  ConfirmDialog

  Purpose:
  - Shared admin confirmation dialog for destructive or high-risk actions.

  Contract:
  - Props: { title, message, confirmLabel, cancelLabel, tone, onConfirm, onCancel }
*/
export default function ConfirmDialog({
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel
}) {
  const confirmClass = tone === 'danger'
    ? 'bg-error text-text-inverse hover:opacity-90'
    : 'bg-primary text-text-inverse hover:bg-primary-dark';

  return (
    <div className="modal-backdrop flex items-center justify-center z-50" role="presentation">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full shadow-xl" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h3 id="confirm-dialog-title" className="text-xl font-bold mb-2 text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-lg ${confirmClass}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-surface-warm text-text-secondary py-2 rounded-lg hover:bg-surface"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
