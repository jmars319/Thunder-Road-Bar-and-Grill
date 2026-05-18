import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import PublicNavbar from '../PublicNavbar';
import PublicFooter from '../PublicFooter';
import PrivacyModal from '../PrivacyModal';
import TermsModal from '../TermsModal';

const CHOWNOW_URL = 'https://direct.chownow.com/order/42923/locations/64729';

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn((url) => {
    const value = String(url).includes('/navigation') ? [] : { settings: {} };
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(value)
    });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('public order links point directly to ChowNow without coming-soon copy', () => {
  render(
    <>
      <PublicNavbar />
      <PublicFooter />
    </>
  );

  const orderLinks = screen.getAllByRole('link', { name: /order online/i });
  expect(orderLinks.length).toBeGreaterThanOrEqual(2);
  orderLinks.forEach((link) => {
    expect(link).toHaveAttribute('href', CHOWNOW_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });
  expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
});

test('public legal modals use clean ChowNow-aware copy', () => {
  render(
    <>
      <PrivacyModal onClose={() => {}} />
      <TermsModal onClose={() => {}} />
    </>
  );

  expect(screen.getAllByText(/ChowNow/i).length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/general template/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/\[PAYMENT_PROVIDER\]|\[STATE\]/i)).not.toBeInTheDocument();
});
