import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initialiseToolbarRovingTabStop = vi.fn();
const getFocusableToolbarItems = vi.fn<() => HTMLElement[]>();
const isToolbarRovingKey = vi.fn((key: string) => key === 'ArrowRight');
const getNextRovingIndex = vi.fn(() => 1);
const applyToolbarTabStops = vi.fn();

vi.mock('../../../../src/react/internal/pdf-toolbar-focus.js', () => ({
  getFocusableToolbarItems,
  initialiseToolbarRovingTabStop,
}));

vi.mock('../../../../src/react/internal/toolbar-roving.js', () => ({
  applyToolbarTabStops,
  getNextRovingIndex,
  isToolbarRovingKey,
}));

const { PDFToolbarRoot } = await import('../../../../src/react/internal/pdf-toolbar-root.js');

describe('PDFToolbarRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function renderToolbar() {
    return render(
      <PDFToolbarRoot contextValue={{} as never}>
        <button type="button">One</button>
        <button type="button">Two</button>
      </PDFToolbarRoot>,
    );
  }

  it('initialises roving focus on mount', () => {
    renderToolbar();
    expect(initialiseToolbarRovingTabStop).toHaveBeenCalledTimes(1);
    expect(initialiseToolbarRovingTabStop.mock.calls[0]?.[0]).toBeInstanceOf(HTMLDivElement);
  });

  it('ignores non-roving keys', () => {
    isToolbarRovingKey.mockReturnValue(false);
    renderToolbar();

    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'Tab' });

    expect(getFocusableToolbarItems).not.toHaveBeenCalled();
    expect(applyToolbarTabStops).not.toHaveBeenCalled();
  });

  it('returns early when there are no focusable items', () => {
    getFocusableToolbarItems.mockReturnValue([]);
    render(<PDFToolbarRoot contextValue={{} as never} />);

    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'ArrowRight', code: 'ArrowRight' });

    expect(applyToolbarTabStops).not.toHaveBeenCalled();
  });

  it('returns early when the active element is outside the toolbar', () => {
    renderToolbar();
    const buttons = screen.getAllByRole('button') as HTMLElement[];
    getFocusableToolbarItems.mockReturnValue(buttons);

    const outside = document.createElement('button');
    outside.type = 'button';
    document.body.append(outside);
    outside.focus();

    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'ArrowRight', code: 'ArrowRight' });

    expect(applyToolbarTabStops).not.toHaveBeenCalled();
  });

  it('returns early when the roving index resolves negative', () => {
    renderToolbar();
    const buttons = screen.getAllByRole('button') as HTMLElement[];
    getFocusableToolbarItems.mockReturnValue(buttons);
    getNextRovingIndex.mockReturnValue(-1);
    buttons[0]?.focus();

    fireEvent.keyDown(buttons[0] as HTMLElement, { key: 'ArrowRight', code: 'ArrowRight' });

    expect(applyToolbarTabStops).not.toHaveBeenCalled();
  });

  it('returns early when the next toolbar item cannot be resolved', () => {
    renderToolbar();
    const buttons = screen.getAllByRole('button') as HTMLElement[];
    getFocusableToolbarItems.mockReturnValue(buttons);
    getNextRovingIndex.mockReturnValue(99);
    buttons[0]?.focus();

    fireEvent.keyDown(buttons[0] as HTMLElement, { key: 'ArrowRight', code: 'ArrowRight' });

    expect(applyToolbarTabStops).not.toHaveBeenCalled();
  });
});
