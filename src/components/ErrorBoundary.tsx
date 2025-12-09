/**
 * Error Boundary Component
 * Catches React errors and displays a user-friendly error message
 * Auto-reloads the page after 5 seconds on critical errors
 */

import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private reloadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Error info:', errorInfo);

    // Increment error count
    this.setState((prevState) => ({
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-reload after 5 seconds if too many errors
    if (this.state.errorCount >= 2) {
      console.warn('Multiple errors detected. Reloading page in 5 seconds...');
      this.reloadTimeout = setTimeout(() => {
        window.location.reload();
      }, 5000);
    }
  }

  componentWillUnmount(): void {
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
    }
  }

  handleReset = (): void => {
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
    }
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-700 mb-4">
              The application encountered an unexpected error. The page will automatically
              reload in a few seconds.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-gray-100 p-4 rounded mb-6 text-left overflow-auto max-h-40">
                <p className="font-mono text-sm text-red-700">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="font-mono text-xs text-gray-600 mt-2 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>

            <p className="text-gray-500 text-sm mt-4">
              Error ID: {Date.now()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
