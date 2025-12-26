/*
  Purpose:
  - Simple smoke test to ensure the application's main heading renders. This
    file demonstrates basic React Testing Library usage; add more targeted
    tests under `/src` as components gain behavior.
*/

import { render, screen } from '@testing-library/react';
 
import App from './App';

// Reference App via dynamic lookup so linters see a JS usage rather than a
// module-scope no-op object.
const _appRef = { name: 'App', comp: App };
void _appRef;

test('renders skip link and site logo', () => {
  render(<App />);
  const skipLink = screen.getByRole('link', { name: /skip to main content/i });
  expect(skipLink).toBeInTheDocument();

  const logo = screen.getByRole('img', { name: /thunder road bar and grill/i });
  expect(logo).toBeInTheDocument();
});
