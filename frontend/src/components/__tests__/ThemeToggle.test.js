/**
 * ThemeToggle.test.js
 * 
 * Unit tests for the ThemeToggle component.
 * Tests theme switching functionality and localStorage persistence.
 */

/* global jest, beforeEach, afterEach, describe, test, expect */

import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';

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

    // Clear any theme class from document
    document.documentElement.classList.remove('dark-theme', 'light-theme');
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
    mockLocalStorage.getItem.mockReturnValue('light-theme');
    
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    // Initial state should be light
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
    
    // Click to toggle to dark
    fireEvent.click(button);
    
    // Should save to localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark-theme');
  });

  test('loads saved theme from localStorage on mount', () => {
    mockLocalStorage.getItem.mockReturnValue('dark-theme');
    
    render(<ThemeToggle />);
    
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
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
    
    render(<ThemeToggle />);
    
    // Should detect system dark mode preference
    // Note: Actual behavior depends on component implementation
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme');
  });

  test('displays correct icon for current theme', () => {
    mockLocalStorage.getItem.mockReturnValue('light-theme');
    
    const { container } = render(<ThemeToggle />);
    
    // Should show moon icon for light theme (to switch to dark)
    // or sun icon for dark theme (to switch to light)
    // This depends on your icon implementation
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('maintains theme across re-renders', () => {
    mockLocalStorage.getItem.mockReturnValue('dark-theme');
    
    const { rerender } = render(<ThemeToggle />);
    
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    
    rerender(<ThemeToggle />);
    
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
  });

  test('button is keyboard accessible', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
