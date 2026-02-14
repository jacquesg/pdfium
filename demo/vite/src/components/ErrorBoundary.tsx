import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const error = this.state.error;
      const code = 'code' in error ? (error as { code: number }).code : undefined;
      const context = 'context' in error ? (error as { context: Record<string, unknown> }).context : undefined;

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-red-50">
          <Alert variant="destructive" className="max-w-2xl w-full shadow-md bg-white">
            <div className="flex items-center gap-3 mb-4">
              {code !== undefined && <Badge variant="red" className="font-mono">{code}</Badge>}
              <AlertTitle className="text-lg">{error.name || 'Error'}</AlertTitle>
            </div>
            <AlertDescription>
              <div className="text-sm text-gray-700 mb-4">{error.message}</div>
              {context && (
                <pre className="text-xs font-mono bg-gray-50 p-3 rounded border overflow-auto max-h-64 mb-4">
                  {JSON.stringify(context, (key, value) => {
                    // Filter out internal WASM details
                    if (key === 'pointer' || key === 'handle' || key === 'address') return undefined;
                    return value;
                  }, 2)}
                </pre>
              )}
              <Button onClick={this.handleRetry}>Retry</Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
