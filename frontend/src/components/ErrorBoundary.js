import React from 'react';
import TemporaryIssuePage from './error-pages/TemporaryIssuePage';

/*
  ErrorBoundary component

  Purpose:
  - Catch JavaScript errors anywhere in child component tree
  - Log error details for debugging
  - Display fallback UI instead of crashing the entire app

  Usage:
  - Wrap sections of your app that should handle errors gracefully
  - <ErrorBoundary fallback={<CustomError />}>
      <YourComponent />
    </ErrorBoundary>

  Props:
  - fallback: Optional custom fallback UI (default: generic error message)
  - onError: Optional callback when error occurs

  Last updated: 2025-11-05 — Created error boundary for graceful error handling
*/

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console (or send to logging service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <TemporaryIssuePage
          statusCode={500}
          timestampUTC={new Date().toISOString()}
          requestId={window.__LAST_REQUEST_ID__ || null}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
