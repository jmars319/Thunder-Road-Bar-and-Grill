/*
  TermsModal

  Purpose:
  - Simple modal that displays site Terms of Service to public users.

  Contract:
  - Props: { onClose: function }

  Notes:
  - Presentational only. Keep content short and prefer server-driven legal
    content if you later wire this to an admin-managed policy store.
*/

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

          <h4>Agreement to terms</h4>
          <p>These Terms of Service ("Terms") govern your access to and use of the Thunder Road Bar and Grill website and any services provided through it. By using the site you agree to these Terms. If you do not agree, please do not use the site.</p>

          <h4>Services and ordering</h4>
          <p>The website provides information about our business and may allow you to place orders or reservation requests. Orders placed on the site are subject to our confirmation. We may refuse or cancel an order for any reason, including unavailability of an item or suspected fraud. Prices and availability are subject to change.</p>

          <h4>Payments and fees</h4>
          <p>Payments made through the website are processed by a third-party payment processor (e.g. Stripe, Square). We do not store full payment card numbers on our servers — the payment provider handles card storage and PCI compliance. You are responsible for providing accurate billing information and for any fees charged by your payment method.</p>

          <h4>User responsibilities</h4>
          <p>You agree not to use the site for unlawful activities, to provide accurate information when requested, and to comply with any posted policies. You are responsible for keeping any account credentials secure when applicable.</p>

          <h4>Intellectual property</h4>
          <p>All content on the site (text, images, logos) is owned or licensed by Thunder Road Bar and Grill and is protected by copyright and other intellectual property laws. You may not copy or reuse content without permission.</p>

          <h4>Disclaimer of warranties</h4>
          <p>The site and content are provided "as is" and "as available" without warranties of any kind. We do not guarantee that the site will be error-free or available at all times.</p>

          <h4>Limitation of liability</h4>
          <p>To the maximum extent permitted by law, Thunder Road Bar and Grill and its owners, employees and agents will not be liable for indirect, incidental, special, or consequential damages arising from your use of the site or any orders placed through it.</p>

          <h4>Third-party links</h4>
          <p>The site may contain links to third-party websites and services. We are not responsible for the content or practices of third parties. Links do not imply endorsement.</p>

          <h4>Governing law and disputes</h4>
          <p>These Terms are governed by the laws of the State of North Carolina. For disputes, you may choose to require arbitration or small-claims court — consult legal counsel for the best option for your business.</p>

          <h4>Changes to these terms</h4>
          <p>We may update these Terms from time to time. We will post the updated Terms with a new "Last updated" date and, where appropriate, notify users of significant changes.</p>

          <h4>Contact</h4>
          <p>If you have questions about these Terms, contact us at the email address listed in the footer.</p>

          <p className="text-xs text-text-muted">Note: This is a general template and does not constitute legal advice. Please review these Terms with legal counsel and replace placeholders such as <em>[STATE]</em> before publishing.</p>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-1 px-3 rounded hover:bg-primary-dark">Close</button>
        </div>
      </div>
    </div>
  );
}
