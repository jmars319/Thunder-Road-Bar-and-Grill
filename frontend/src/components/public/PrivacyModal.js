/*
  PrivacyModal

  Purpose:
  - Show the site's Privacy Policy in a dismissible modal.

  Contract:
  - Props: { onClose: function }

  Notes:
  - Content is currently embedded in the component. If policies need to be
    edited by non-developers, consider loading this from the backend.
*/

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
            Thunder Road Bar and Grill ("we", "us", "our") is committed to protecting your privacy.
            This policy explains what personal information we collect, why we collect it, how we use it,
            and the choices you have about your information. It applies to information collected through
            this website and related services.
          </p>

          <h4>Information we collect</h4>
          <p>We collect different types of information depending on how you use our site:</p>
          <ul>
            <li><strong>Contact & transactional data:</strong> name, email, phone, billing/shipping address, and order details when you place orders or make reservations.</li>
            <li><strong>Payment data:</strong> online ordering and payment processing are handled by ChowNow or another third-party provider. We do not store full payment card details on our servers - see "Payments" below.</li>
            <li><strong>Job applications:</strong> name, email, resume/CV and other information you include when applying for jobs.</li>
            <li><strong>Communications:</strong> any messages you send through contact forms, email, or other channels.</li>
            <li><strong>Usage and device data:</strong> IP address, browser type, device identifiers, pages visited, and technical log information collected automatically (analytics).</li>
            <li><strong>Cookies and tracking:</strong> cookies, local storage and similar technologies used to provide functionality, remember preferences, and analyse traffic.</li>
          </ul>

          <h4>How we use your information</h4>
          <p>We use the information to:</p>
          <ul>
            <li>Provide, operate, and maintain the website and ordering features.</li>
            <li>Process orders, reservations and job applications, and communicate with you about them.</li>
            <li>Send marketing messages when you opt in (you can opt out any time).</li>
            <li>Detect and prevent fraud or other unlawful activity and to protect our rights.</li>
            <li>Understand usage patterns and improve the website via analytics services.</li>
          </ul>

          <h4>Legal bases for processing (where applicable)</h4>
          <p>If you are in the European Economic Area (EEA) or otherwise subject to GDPR, we rely on one or more of the following legal bases to process your personal data: your consent, performance of a contract (e.g., to fulfill an order), compliance with a legal obligation, or our legitimate interests (for site security and analytics).</p>

          <h4>Sharing and third parties</h4>
          <p>We do not sell your personal information. We may share information with:</p>
          <ul>
            <li>Service providers who process data on our behalf, including ChowNow for online ordering, hosting providers, email delivery, and analytics.</li>
            <li>Delivery or fulfillment partners when needed to complete an order.</li>
            <li>Law enforcement, regulators or others when required by law or to protect rights and safety.</li>
          </ul>

          <h4>Cookies and tracking</h4>
          <p>We use cookies and similar technologies to remember preferences, enable core functionality, and collect analytics data. You can control cookies through your browser settings; note that disabling certain cookies may affect site functionality. If we add targeted advertising or third-party tracking we will disclose the providers and how to opt out.</p>

          <h4>Payments</h4>
          <p>Online ordering is provided through ChowNow. Payment details entered during online ordering are handled by ChowNow or its payment partners. We do not store full payment card numbers on our servers.</p>

          <h4>Data retention</h4>
          <p>We retain personal information only as long as necessary to provide the services, comply with legal obligations, and resolve disputes. For example, order records may be kept for tax and accounting purposes for a limited number of years.</p>

          <h4>Your rights</h4>
          <p>Depending on your location and applicable law, you may have rights including access, correction, deletion, portability, and objection to certain processing. To exercise these rights, contact us at the email address listed in the footer. We may ask for information to verify your identity before responding.</p>

          <h4>Children</h4>
          <p>Our services are not directed at children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected data from a child, contact us and we will take steps to remove it.</p>

          <h4>Security</h4>
          <p>We use reasonable administrative and technical safeguards to protect your data. However, no system is completely secure — if you suspect a breach, contact us immediately.</p>

          <h4>Changes to this policy</h4>
          <p>We may update this policy periodically. We will post the updated policy here with an updated "Last updated" date and, where appropriate, notify you of significant changes.</p>

          <h4>Contact</h4>
          <p>If you have questions, or want to exercise your privacy rights, please contact us at the email address in the footer or by using the contact form on the site.</p>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-1 px-3 rounded hover:bg-primary-dark">Close</button>
        </div>
      </div>
    </div>
  );
}
