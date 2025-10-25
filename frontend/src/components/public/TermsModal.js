// No default React import required with the new JSX transform

export default function TermsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-surface text-text-primary rounded-lg shadow-lg max-w-2xl w-full p-4 overflow-auto max-h-[80vh]">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-heading font-semibold">Terms of Service</h3>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        <div className="prose text-xs text-text-secondary">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h4>Acceptance of terms</h4>
          <p>By using this website you agree to these Terms of Service. If you do not agree, please do not use the site.</p>

          <h4>Use of content</h4>
          <p>All content on this site is provided for general informational purposes. You may not republish or reuse content without permission.</p>

          <h4>Reservations and services</h4>
          <p>Reservations made through the site are requests and may be confirmed by our staff. We reserve the right to modify or cancel reservations as needed.</p>

          <h4>Limitation of liability</h4>
          <p>We are not liable for indirect, incidental, or consequential damages arising from the use of the site.</p>

          <h4>Contact</h4>
          <p>If you have questions about these terms, please contact us at the email address in the footer.</p>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-1 px-3 rounded hover:bg-primary-dark">Close</button>
        </div>
      </div>
    </div>
  );
}
