import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeSnippet } from '../CodeSnippet';

describe('CodeSnippet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders code content', () => {
    render(<CodeSnippet code="const x = 1;" language="typescript" />);
    expect(screen.getByText('const x = 1;')).toBeDefined();
  });

  it('shows copy button', () => {
    render(<CodeSnippet code="hello" />);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeDefined();
  });

  it('copies code to clipboard on click', async () => {
    const user = userEvent.setup();

    // In browser mode, clipboard API is available natively
    const spy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<CodeSnippet code="test code" />);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(spy).toHaveBeenCalledWith('test code');
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeDefined();
  });

  it('cleans up timer on unmount — no setState warnings', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error');

    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    const { unmount } = render(<CodeSnippet code="test" />);

    // Trigger copy — this starts a 2s timer to reset "Copied!" back to "Copy"
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeDefined();

    // Unmount before the 2s timer fires
    unmount();

    // Wait longer than the timer duration to prove it was cancelled
    await new Promise<void>((r) => setTimeout(r, 2500));

    // If clearTimeout wasn't called, React would log a warning about setState on unmounted component
    const stateWarnings = consoleSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && (
        call[0].includes('unmounted') ||
        call[0].includes('Can\'t perform a React state update')
      ),
    );
    expect(stateWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('sets data-language attribute on pre element', () => {
    const { container } = render(<CodeSnippet code="fn main()" language="rust" />);
    const pre = container.querySelector('pre');
    expect(pre?.getAttribute('data-language')).toBe('rust');
  });
});
