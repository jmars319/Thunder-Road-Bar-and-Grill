/**
 * ErrorBoundary.test.js
 * 
 * Unit tests for React Error Boundary components.
 * Tests error catching and fallback UI rendering.
 */

/* global jest, beforeEach, describe, test, expect */

import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock error boundary component for testing
// In production, this would be imported from your actual ErrorBoundary component
class TestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error in production
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders children when there is no error', () => {
    render(
      <TestErrorBoundary>
        <div>Child content</div>
      </TestErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('renders fallback UI when child throws error', () => {
    render(
      <TestErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('uses custom fallback when provided', () => {
    render(
      <TestErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  test('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <TestErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('does not render fallback when children render successfully', () => {
    render(
      <TestErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError shouldThrow={false} />
      </TestErrorBoundary>
    );

    expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('catches errors in nested components', () => {
    const NestedComponent = () => (
      <div>
        <ThrowError shouldThrow={true} />
      </div>
    );

    render(
      <TestErrorBoundary>
        <NestedComponent />
      </TestErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('boundary isolates errors to its subtree', () => {
    render(
      <div>
        <TestErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TestErrorBoundary>
        <div>Sibling content</div>
      </div>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Sibling content')).toBeInTheDocument();
  });
});

describe('ErrorBoundary Usage Patterns', () => {
  test('can wrap individual route components', () => {
    const RouteComponent = () => <div>Route content</div>;
    
    render(
      <TestErrorBoundary fallback={<div>Route error</div>}>
        <RouteComponent />
      </TestErrorBoundary>
    );

    expect(screen.getByText('Route content')).toBeInTheDocument();
  });

  test('provides graceful degradation', () => {
    render(
      <TestErrorBoundary 
        fallback={
          <div role="alert">
            <h1>Oops!</h1>
            <p>Something went wrong. Please refresh the page.</p>
          </div>
        }
      >
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Oops!')).toBeInTheDocument();
  });
});
