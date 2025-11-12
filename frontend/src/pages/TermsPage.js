// eslint-disable-next-line no-unused-vars
import SEO from '../components/SEO';
// Some linters may not detect JSX usage in this file's render path; mark
// these imports as intentionally used to avoid false-positive warnings.
// eslint-disable-next-line no-unused-vars
import PublicNavbar from '../components/public/PublicNavbar';
// eslint-disable-next-line no-unused-vars
import PublicFooter from '../components/public/PublicFooter';

export default function TermsPage() {
  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <>
      <SEO 
        title="Terms of Service"
        description="Terms of Service for Thunder Road Bar and Grill — site use, ordering and legal notices."
        url="https://thunderroadbarandgrill.com/terms"
      />
      <div className="min-h-screen bg-background">
        <PublicNavbar />

        <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-heading font-bold mb-4">Terms of Service</h1>
        <p className="text-sm text-text-secondary mb-2">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="prose text-base text-text-secondary">
          <h2>Agreement to terms</h2>
          <p>These Terms of Service ("Terms") govern your access to and use of the Thunder Road Bar and Grill website and any services provided through it. By using the site you agree to these Terms. If you do not agree, please do not use the site.</p>

          <h2>Services and ordering</h2>
          <p>The website provides information about our business and may allow you to place orders or reservation requests. Orders placed on the site are subject to our confirmation. We may refuse or cancel an order for any reason, including unavailability of an item or suspected fraud. Prices and availability are subject to change.</p>

          <h2>Payments and fees</h2>
          <p>Payments made through the website will be processed by a third-party payment processor if/when we enable online payments. We do not store full payment card numbers on our servers — the payment provider handles card storage and PCI compliance.</p>

          <h2>User responsibilities</h2>
          <p>You agree not to use the site for unlawful activities, to provide accurate information when requested, and to comply with any posted policies. You are responsible for keeping any account credentials secure when applicable.</p>

          <h2>Intellectual property</h2>
          <p>All content on the site (text, images, logos) is owned or licensed by Thunder Road Bar and Grill and is protected by copyright and other intellectual property laws. You may not copy or reuse content without permission.</p>

          <h2>Disclaimer of warranties & limitation of liability</h2>
          <p>The site and content are provided "as is" and "as available" without warranties of any kind. To the maximum extent permitted by law, Thunder Road Bar and Grill and its owners, employees and agents will not be liable for indirect, incidental, special, or consequential damages arising from your use of the site or any orders placed through it.</p>

          <h2>Governing law</h2>
          <p>These Terms are governed by the laws of the State of North Carolina.</p>

          <h2>Changes to these terms</h2>
          <p>We may update these Terms from time to time. We will post the updated Terms with a new "Last updated" date and, where appropriate, notify users of significant changes.</p>

          <h2>Contact</h2>
          <p>If you have questions about these Terms, contact us via the website contact details.</p>
        </section>

        <div className="mt-6">
          <button onClick={goHome} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-2 px-4 rounded hover:bg-primary-dark">Back to Thunder Road</button>
        </div>
      </main>

        <PublicFooter />
      </div>
    </>
  );
}
