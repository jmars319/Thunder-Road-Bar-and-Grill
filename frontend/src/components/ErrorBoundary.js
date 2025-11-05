import React from 'react';

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

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="max-w-md w-full bg-surface-warm rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-error text-5xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-text-secondary mb-4">
                We're sorry for the inconvenience. Please try refreshing the page.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary mb-2">
                    Error Details (Dev Mode)
                  </summary>
                  <div className="bg-surface p-3 rounded text-xs font-mono overflow-auto max-h-64">
                    <p className="text-error font-bold mb-2">{this.state.error.toString()}</p>
                    <pre className="text-text-secondary whitespace-pre-wrap">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-primary text-text-inverse rounded-lg hover:bg-primary-light transition"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
