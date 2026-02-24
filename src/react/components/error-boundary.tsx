import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PDFiumError } from '../../core/errors.js';

interface PDFiumErrorBoundaryProps {
  children: ReactNode;
  resetKeys?: ReadonlyArray<string | number>;
  fallbackRender?: (props: { error: PDFiumError; resetErrorBoundary: () => void }) => ReactNode;
  fallback?: ReactNode;
  onError?: (error: PDFiumError) => void;
}

interface State {
  error: PDFiumError | null;
}

class PDFiumErrorBoundary extends Component<PDFiumErrorBoundaryProps, State> {
  private prevResetKeys: ReadonlyArray<string | number> | undefined;
  private fallbackRef: HTMLDivElement | null = null;
  private prevError: PDFiumError | null = null;

  constructor(props: PDFiumErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
    this.prevResetKeys = props.resetKeys;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Only catch PDFiumError -- let other errors propagate to parent boundaries
    if (error instanceof PDFiumError) {
      return { error };
    }
    throw error;
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (error instanceof PDFiumError) {
      this.props.onError?.(error);
    }
  }

  override componentDidUpdate(): void {
    // Auto-reset when resetKeys change (e.g. documentRevision changes -> new document clears the error)
    const { resetKeys } = this.props;
    const prev = this.prevResetKeys;
    if (this.state.error && resetKeys && prev) {
      const changed = resetKeys.length !== prev.length || resetKeys.some((key, i) => key !== prev[i]);
      if (changed) {
        this.reset();
      }
    }
    this.prevResetKeys = resetKeys;

    // Move focus to the fallback container when an error is first caught
    if (this.state.error && this.state.error !== this.prevError && this.fallbackRef) {
      this.fallbackRef.focus();
    }
    this.prevError = this.state.error;
  }

  private reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (error) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({ error, resetErrorBoundary: this.reset });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default fallback -- minimal inline styles, no external dependencies
      return (
        <div
          ref={(node) => {
            this.fallbackRef = node;
          }}
          tabIndex={-1}
          role="alert"
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#fef2f2',
            borderRadius: '0.5rem',
            outline: 'none',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <span
              style={{
                fontFamily: 'monospace',
                backgroundColor: '#fee2e2',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
              }}
            >
              {error.code}
            </span>
            <strong style={{ marginLeft: '0.5rem' }}>{error.name}</strong>
          </div>
          <p style={{ color: '#374151', fontSize: '0.875rem', marginBottom: '1rem' }}>{error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { PDFiumErrorBoundary };
export type { PDFiumErrorBoundaryProps };
