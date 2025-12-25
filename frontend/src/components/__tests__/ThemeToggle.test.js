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

  test('renders theme toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  test('button has accessible label', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  test('toggles theme on click', () => {
    mockLocalStorage.getItem.mockReturnValue('system');
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');
    
    // Initial state should be system (no data-theme attribute)
    expect(document.documentElement.getAttribute('data-theme')).toBe(null);
    
    // Click to toggle to dark
    fireEvent.click(button);
    
    // Should save to localStorage using the ThemeContext key
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('site-theme', 'dark');
  });

  test('loads saved theme from localStorage on mount', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('uses system preference when no saved theme', () => {
  mockLocalStorage.getItem.mockReturnValue(null);
    
    // Mock system preference for dark mode
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    // Should have checked storage using the ThemeContext key
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('site-theme');
  });

  test('displays correct icon for current theme', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    // Should show moon icon for light theme (to switch to dark)
    // or sun icon for dark theme (to switch to light)
    // This depends on your icon implementation
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('maintains theme across re-renders', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    
    const { rerender } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    rerender(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('button is keyboard accessible', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
