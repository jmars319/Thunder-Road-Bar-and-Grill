/*
  Purpose:
  - Top-level composition for the public-facing website. This page stitches
    together smaller presentational components (Navbar, Hero, Menu, Reservation,
    About, Footer).

  Contract:
  - Props: { onGoToAdmin?: function }
  - Responsibilities: layout composition only; children handle data fetching.

  Notes:
  - Consider lazy-loading heavy sections if the page becomes large.
*/

// Using automatic JSX runtime; explicit React import not required
// eslint-disable-next-line no-unused-vars
import SEO from '../components/SEO';
import PublicNavbar from '../components/public/PublicNavbar';
import HeroSection from '../components/public/HeroSection';
import MenuSection from '../components/public/MenuSection';
import ReservationSection from '../components/public/ReservationSection';
import AboutSection from '../components/public/AboutSection';
import JobSection from '../components/public/JobSection';
import PublicFooter from '../components/public/PublicFooter';

/*
  PublicSite

  Purpose:
  - Top-level composition for the public-facing website. This page stitches
    together smaller presentational components (Navbar, Hero, Menu, Reservation,
    About, Footer).

  Props:
  - onGoToAdmin: optional function passed to the navbar to open the admin login
    or navigate to the admin panel. Kept intentionally generic so different
    apps can wire routing or modal behaviour.

  Data flow / performance notes:
  - Each child component is responsible for its own data fetching. This keeps
    `PublicSite` simple, but may cause duplicate network requests if multiple
    children fetch the same resource. If performance becomes a concern, introduce
    a lightweight data layer or lift shared fetching to this page and pass
    props to children.
  - Consider lazy-loading heavy sections (MenuSection, AboutSection) with
    React.lazy + Suspense or intersection-observer-based loading for faster
    first paint on mobile devices.

  Accessibility:
  - Page-level layout relies on children to expose accessible landmarks (nav,
    main, footer). Keep that contract when refactoring children.
*/

export default function PublicSite({ onGoToAdmin }) {
  // Local registry reference to ensure linters detect symbol usage.
  const _refs = { SEO, PublicNavbar, HeroSection, MenuSection, ReservationSection, JobSection, AboutSection, PublicFooter };
  void _refs;

  return (
    <>
      <SEO 
        title="Thunder Road Bar & Grill — Midway, NC"
        description="Thunder Road Bar & Grill in Midway, NC — great food, cold drinks, live music, and a friendly neighborhood atmosphere. View our menu, hours, and events."
        keywords="Thunder Road, bar, grill, Midway NC, restaurant, burgers, wings, live music, reservations, Winston-Salem"
        url="https://trbgmidway.com/"
      />
      <div className="min-h-screen bg-background">
        <div id="top" />
        {/* Skip link for keyboard users */}
        <a href="#site-main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-surface focus:text-text-primary focus:px-2 focus:py-1 rounded">Skip to main content</a>
        <PublicNavbar onGoToAdmin={onGoToAdmin} />
        <main id="site-main" role="main">
      <HeroSection />
      <MenuSection />
    <ReservationSection />
    <AboutSection />
    <JobSection />
        </main>
        <PublicFooter onGoToAdmin={onGoToAdmin} />
      </div>
    </>
  );
}

// Group component references so linters that don't follow JSX usage will still
// see these symbols as used. This is a minimal, file-local pattern.
// NOTE (2025-10-24): previous comment about editor-tooling workarounds removed as stale.
const __usedComponents = { PublicNavbar, HeroSection, MenuSection, ReservationSection, JobSection, AboutSection, PublicFooter };
void __usedComponents;
