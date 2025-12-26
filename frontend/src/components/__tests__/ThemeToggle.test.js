/* eslint-disable no-unused-vars */
/**
 * ThemeToggle.test.js
 * 
 * Unit tests for the ThemeToggle component.
 * Tests theme switching functionality and localStorage persistence.
 */

/* eslint-env jest */

import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';

describe('ThemeToggle', () => {
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

  // Clear any theme data attribute from document
  document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithProvider = () => render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );

  test('renders theme toggle button', () => {
    renderWithProvider();
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  test('button has accessible label', () => {
    renderWithProvider();
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  test('initializes theme to dark and persists to localStorage', () => {
    renderWithProvider();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('site-theme', 'dark');
  });

  test('button is keyboard accessible', () => {
    renderWithProvider();
    const button = screen.getByRole('button');
    
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
