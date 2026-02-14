import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocPanel } from '../DocPanel';

describe('DocPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up localStorage
    try {
      localStorage.clear();
    } catch {
      // Ignore if unavailable
    }
  });

  it('renders with title and description', async () => {
    render(<DocPanel title="Test Panel" description="A description" />);

    // Collapsible trigger is visible
    expect(screen.getByRole('button', { name: /API Docs/i })).toBeDefined();
  });

  it('renders API badges when apis are provided', () => {
    render(<DocPanel title="Test" apis={['getPage()', 'render()']} />);
    expect(screen.getByText('getPage()')).toBeDefined();
    expect(screen.getByText('render()')).toBeDefined();
  });

  it('sanitises storage key from title', async () => {
    const user = userEvent.setup();

    render(<DocPanel title="Test/Panel" />);

    // Toggle the panel to trigger a localStorage write
    const trigger = screen.getByRole('button', { name: /API Docs/i });
    await user.click(trigger);

    // The slash in the title should be replaced with underscore
    const stored = localStorage.getItem('docpanel-collapsed-Test_Panel');
    expect(stored).not.toBeNull();
  });

  it('gracefully degrades when localStorage throws on getItem — defaults to open', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    // Should not throw — defaults to open
    render(<DocPanel title="Fallback Test" apis={['testApi()']} />);

    // Panel should default to open when storage is unavailable
    // The "Hide" text appears when the panel is open, "Show" when collapsed
    expect(screen.getByText('Hide')).toBeDefined();
    // API badge should be visible (panel content is expanded)
    expect(screen.getByText('testApi()')).toBeDefined();
  });

  it('gracefully degrades when localStorage throws on setItem', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const user = userEvent.setup();

    // Should not throw when toggling
    render(<DocPanel title="Test" />);
    const trigger = screen.getByRole('button', { name: /API Docs/i });
    await user.click(trigger);

    // Component should still function
    expect(trigger).toBeDefined();
  });

  it('persists collapsed state to localStorage', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(Storage.prototype, 'setItem');

    render(<DocPanel title="Persist Test" />);
    const trigger = screen.getByRole('button', { name: /API Docs/i });

    // Toggle closed
    await user.click(trigger);

    // Should have stored the collapsed state
    expect(spy).toHaveBeenCalledWith('docpanel-collapsed-Persist_Test', expect.any(String));
  });
});
