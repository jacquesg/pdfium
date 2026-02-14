import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// A component that throws based on an external flag
let shouldThrow = false;
function ThrowingChild() {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child rendered</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    shouldThrow = false;
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('renders error display when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Test error')).toBeDefined();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('displays error name in error display', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    // AlertTitle renders as h5
    const heading = screen.getByRole('heading', { level: 5 });
    expect(heading.textContent).toBe('Error');

    consoleSpy.mockRestore();
  });

  it('shows retry button that resets error state', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    shouldThrow = true;

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    // Error is displayed
    expect(screen.getByText('Test error')).toBeDefined();

    // Fix the child before clicking retry so it doesn't re-throw
    shouldThrow = false;

    // Click retry button — ErrorBoundary resets state, child re-renders without throwing
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryButton);

    // Child should render normally now
    expect(screen.getByText('Child rendered')).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;

    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback')).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('filters sensitive WASM keys from error context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a custom error with context containing sensitive keys
    class PDFiumLikeError extends Error {
      code = 300;
      context = {
        pageIndex: 0,
        pointer: 12345678,
        handle: 87654321,
        address: 0xdeadbeef,
        description: 'Page load failed',
      };
    }

    let throwCustom = false;
    function ThrowingCustomChild() {
      if (throwCustom) throw new PDFiumLikeError('Custom WASM error');
      return <div>OK</div>;
    }

    throwCustom = true;
    render(
      <ErrorBoundary>
        <ThrowingCustomChild />
      </ErrorBoundary>,
    );

    // The error display should render the context in a <pre> element
    const contextPre = document.querySelector('pre');
    expect(contextPre).not.toBeNull();

    const contextText = contextPre!.textContent ?? '';

    // Safe fields should be visible
    expect(contextText).toContain('pageIndex');
    expect(contextText).toContain('description');

    // Sensitive WASM fields should be filtered out
    expect(contextText).not.toContain('pointer');
    expect(contextText).not.toContain('handle');
    expect(contextText).not.toContain('address');
    expect(contextText).not.toContain('12345678');
    expect(contextText).not.toContain('87654321');

    consoleSpy.mockRestore();
  });
});
