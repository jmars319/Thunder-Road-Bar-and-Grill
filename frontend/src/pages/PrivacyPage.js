import { useEffect } from 'react';
// Some linters may not detect JSX usage in this file's render path; mark
// these imports as intentionally used to avoid false-positive warnings.
// eslint-disable-next-line no-unused-vars
import PublicNavbar from '../components/public/PublicNavbar';
// eslint-disable-next-line no-unused-vars
import PublicFooter from '../components/public/PublicFooter';

export default function PrivacyPage() {
  usePrivacySeo();
  const goHome = () => {
    // use a full navigation to the site root; this keeps behavior consistent
    // across hosting environments and avoids relying on browser globals.
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-heading font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-text-secondary mb-2">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="prose text-base text-text-secondary">
          <h2>Introduction</h2>
          <p>
            Thunder Road Bar and Grill ("we", "us", "our") is committed to protecting your privacy.
            This policy explains what personal information we collect, why we collect it, how we use it,
            and the choices you have about your information. It applies to information collected through
            this website and related services.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li><strong>Contact & transactional data:</strong> name, email, phone, billing/shipping address, and order details when you place orders or make reservations.</li>
            <li><strong>Job applications:</strong> name, email, resume/CV and other information you include when applying for jobs.</li>
            <li><strong>Communications:</strong> any messages you send through contact forms, email, or other channels.</li>
            <li><strong>Usage and device data:</strong> IP address, browser type, device identifiers, pages visited, and technical log information collected automatically (analytics).</li>
            <li><strong>Cookies and tracking:</strong> cookies, local storage and similar technologies used to provide functionality, remember preferences, and analyse traffic.</li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>Provide, operate, and maintain the website and ordering features.</li>
            <li>Process orders, reservations and job applications, and communicate with you about them.</li>
            <li>Send marketing messages when you opt in (you can opt out any time).</li>
            <li>Detect and prevent fraud or other unlawful activity and to protect our rights.</li>
            <li>Understand usage patterns and improve the website via analytics services.</li>
          </ul>

          <h2>Payments</h2>
          <p>At this time, the website does not offer online payments. If we add online ordering and payments in the future, payment processing will be handled by a third-party provider and this policy will be updated to include the provider name and details. We will not store full payment card numbers on our servers.</p>

          <h2>Cookies and tracking</h2>
          <p>We use cookies and similar technologies to remember preferences, enable core functionality, and collect analytics data. You can control cookies through your browser settings; note that disabling certain cookies may affect site functionality.</p>

          <h2>Data retention & your rights</h2>
          <p>We retain personal information only as long as necessary to provide the services, comply with legal obligations, and resolve disputes. Depending on applicable law you may have rights to access, correct or delete your personal data. Contact the business for details.</p>

          <h2>Security</h2>
          <p>We use reasonable administrative and technical safeguards to protect your data. However, no system is completely secure — if you suspect a breach, contact us immediately.</p>

          <h2>Contact</h2>
          <p>If you have questions or want to exercise your privacy rights, please use the contact information on our website.</p>
        </section>

        <div className="mt-6">
          <button onClick={goHome} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-2 px-4 rounded hover:bg-primary-dark">Back to Thunder Road</button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

// SEO: set meta tags and structured data when page mounts
// This keeps the app dependency-free (no react-helmet) while providing
// essential SEO signals for crawlers and social previews.
function usePrivacySeo() {
  useEffect(() => {
    const title = 'Privacy Policy — Thunder Road Bar and Grill';
    const description = 'Privacy Policy for Thunder Road Bar and Grill — how we collect and use personal information.';
    document.title = title;

    const setTag = (attr, name, content) => {
      let el = null;
      try {
        el = document.querySelector(`[${attr}="${name}"]`);
      } catch (e) {
        el = null;
      }
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setTag('name', 'description', description);
    setTag('property', 'og:title', title);
    setTag('property', 'og:description', description);
    setTag('property', 'og:type', 'website');
    setTag('name', 'twitter:card', 'summary_large_image');
    setTag('name', 'twitter:title', title);
    setTag('name', 'twitter:description', description);

    // canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/privacy');

    // JSON-LD Organization
    const ldId = 'seo-org-jsonld';
    let existing = document.getElementById(ldId);
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = ldId;
    script.type = 'application/ld+json';
    const org = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Thunder Road Bar and Grill',
      url: window.location.origin || '/',
      sameAs: [],
    };
    script.text = JSON.stringify(org);
    document.head.appendChild(script);

    return () => {
      // cleanup: remove tags we created (leave existing ones alone)
      // (we keep title as-is when navigating away)
      const removeIfMatches = (attr, name, value) => {
        const el = document.querySelector(`[${attr}="${name}"]`);
        if (el && el.getAttribute('content') === value) el.remove();
      };
      removeIfMatches('name', 'description', description);
      removeIfMatches('property', 'og:description', description);
      const ld = document.getElementById(ldId);
      if (ld) ld.remove();
    };
  }, []);
}

