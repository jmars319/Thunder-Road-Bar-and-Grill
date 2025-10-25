// No default React import required with the new JSX transform

export default function PrivacyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-surface text-text-primary rounded-lg shadow-lg max-w-2xl w-full p-4 overflow-auto max-h-[80vh]">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-heading font-semibold">Privacy Policy</h3>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        <div className="prose text-xs text-text-secondary">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h4>Introduction</h4>
          <p>
            Thunder Road Bar and Grill ("we", "us", "our") respects your privacy and is committed to
            protecting the personal information you share with us. This Privacy Policy explains how we
            collect, use, disclose, and protect your personal information when you use our website.
          </p>

          <h4>Information we collect</h4>
          <ul>
            <li>Contact information you provide to make reservations or sign up for our newsletter.</li>
            <li>Information submitted with job applications (name, email, resume link, etc.).</li>
            <li>Usage data collected automatically such as IP address, device information, and pages visited.</li>
          </ul>

          <h4>How we use your information</h4>
          <p>We use your information to provide and improve our services, respond to inquiries, process reservations and job applications, and send you updates when you opt-in.</p>

          <h4>Data sharing and third parties</h4>
          <p>We do not sell personal information. We may share information with service providers who help us operate the website, comply with legal obligations, or protect our rights.</p>

          <h4>Security</h4>
          <p>We take reasonable steps to protect the information we collect. However, no system is completely secure.</p>

          <h4>Your choices</h4>
          <p>You may opt-out of marketing communications, update your contact information, or request deletion by contacting us at the email address listed in the footer.</p>

          <h4>Contact</h4>
          <p>If you have questions about this Privacy Policy, please contact us at the email address in the footer of this site.</p>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-1 px-3 rounded hover:bg-primary-dark">Close</button>
        </div>
      </div>
    </div>
  );
}
