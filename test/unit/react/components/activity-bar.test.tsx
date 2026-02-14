import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { ActivityBar } from '../../../../src/react/components/activity-bar.js';
import {
  BUILTIN_PANEL_IDS,
  type PanelConfig,
  type PanelEntry,
  type PanelId,
} from '../../../../src/react/components/panels/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BUILTIN_PANELS: PanelId[] = ['annotations', 'objects', 'forms'];
const ALL_BUILTIN_PANELS: readonly PanelId[] = BUILTIN_PANEL_IDS;

function makeCustomPanel(overrides?: Partial<PanelConfig>): PanelConfig {
  return {
    id: 'custom-panel',
    label: 'Custom Panel',
    icon: <span data-testid="custom-icon">C</span>,
    render: () => <div>Custom content</div>,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActivityBar', () => {
  it('renders a button for each configured panel', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders correct aria-label for each built-in panel', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Annotations' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Page Objects' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Form Fields' })).toBeDefined();
  });

  it('marks the active panel with aria-pressed="true", others "false"', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel="objects" onTogglePanel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Annotations' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Page Objects' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Form Fields' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onTogglePanel when a button is clicked', () => {
    const onToggle = vi.fn();
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page Objects' }));

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith('objects');
  });

  it('has role="toolbar" with aria-orientation="vertical"', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeDefined();
    expect(toolbar.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('wires aria-controls on each button when panelContainerId is provided', () => {
    render(
      <ActivityBar
        panels={BUILTIN_PANELS}
        activePanel={null}
        onTogglePanel={vi.fn()}
        panelContainerId="panel-container-id"
      />,
    );

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button.getAttribute('aria-controls')).toBe('panel-container-id');
    }
  });

  it('does not render aria-controls when panelContainerId is omitted', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button.getAttribute('aria-controls')).toBeNull();
    }
  });

  it('ArrowDown moves focus to the next button', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[0]!.focus();
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowDown' });

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('ArrowUp moves focus to the previous button', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[1]!.focus();
    fireEvent.keyDown(buttons[1]!, { key: 'ArrowUp' });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('ArrowDown wraps from last to first', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[2]!.focus();
    fireEvent.keyDown(buttons[2]!, { key: 'ArrowDown' });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('ArrowUp wraps from first to last', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[0]!.focus();
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowUp' });

    expect(document.activeElement).toBe(buttons[2]);
  });

  it('Home moves focus to the first button', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[2]!.focus();
    fireEvent.keyDown(buttons[2]!, { key: 'Home' });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('End moves focus to the last button', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[0]!.focus();
    fireEvent.keyDown(buttons[0]!, { key: 'End' });

    expect(document.activeElement).toBe(buttons[2]);
  });

  it('roving tabindex: focused button has tabindex 0, others -1', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel="objects" onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    // Active panel button gets tabindex 0
    expect(buttons[0]!.getAttribute('tabindex')).toBe('-1');
    expect(buttons[1]!.getAttribute('tabindex')).toBe('0');
    expect(buttons[2]!.getAttribute('tabindex')).toBe('-1');
  });

  it('first button gets tabindex 0 when no panel is active', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]!.getAttribute('tabindex')).toBe('0');
    expect(buttons[1]!.getAttribute('tabindex')).toBe('-1');
    expect(buttons[2]!.getAttribute('tabindex')).toBe('-1');
  });

  it('renders custom panel config icons', () => {
    const custom = makeCustomPanel();
    const panels: PanelEntry[] = ['annotations', custom];

    render(<ActivityBar panels={panels} activePanel={null} onTogglePanel={vi.fn()} />);

    expect(screen.getByTestId('custom-icon')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Custom Panel' })).toBeDefined();
  });

  it('renders an SVG icon for every built-in panel button', () => {
    render(<ActivityBar panels={ALL_BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(ALL_BUILTIN_PANELS.length);
    for (const button of buttons) {
      expect(button.querySelector('svg')).not.toBeNull();
    }
  });

  it('applies data-pdfium-activity-bar attribute', () => {
    const { container } = render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const bar = container.querySelector('[data-pdfium-activity-bar]');
    expect(bar).not.toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} className="my-bar" />,
    );

    const bar = container.querySelector('[data-pdfium-activity-bar]');
    expect(bar?.className).toBe('my-bar');
  });

  it('sets title attribute on each button', () => {
    render(<ActivityBar panels={BUILTIN_PANELS} activePanel={null} onTogglePanel={vi.fn()} />);

    const annotations = screen.getByRole('button', { name: 'Annotations' });
    expect(annotations.getAttribute('title')).toBe('Annotations');

    const objects = screen.getByRole('button', { name: 'Page Objects' });
    expect(objects.getAttribute('title')).toBe('Page Objects');
  });

  it('always shows a right border', () => {
    const { container } = render(<ActivityBar panels={BUILTIN_PANELS} activePanel="objects" onTogglePanel={vi.fn()} />);
    const bar = container.querySelector('[data-pdfium-activity-bar]') as HTMLElement;
    // happy-dom drops CSS var() values, so borderRight may be empty — verify it's not 'none'
    expect(bar.style.borderRight).not.toMatch(/^none/);
  });

  it('renders separator immediately after bookmarks (before the following panel)', () => {
    const { container } = render(
      <ActivityBar panels={['thumbnails', 'bookmarks', 'annotations']} activePanel={null} onTogglePanel={vi.fn()} />,
    );

    const separators = container.querySelectorAll('hr');
    expect(separators).toHaveLength(1);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.children[0]?.tagName).toBe('BUTTON');
    expect(toolbar.children[1]?.tagName).toBe('BUTTON');
    expect(toolbar.children[2]?.tagName).toBe('HR');
    expect(toolbar.children[3]?.tagName).toBe('BUTTON');
  });

  it('does not render a separator when only 2 panels exist', () => {
    const twoPanels: PanelId[] = ['annotations', 'objects'];
    const { container } = render(<ActivityBar panels={twoPanels} activePanel={null} onTogglePanel={vi.fn()} />);

    const separators = container.querySelectorAll('hr');
    expect(separators).toHaveLength(0);
  });

  it('does not render separator when bookmarks is the last panel', () => {
    const { container } = render(
      <ActivityBar panels={['annotations', 'bookmarks']} activePanel={null} onTogglePanel={vi.fn()} />,
    );

    const separators = container.querySelectorAll('hr');
    expect(separators).toHaveLength(0);
  });

  it('renders separator after bookmarks even when panels are reordered', () => {
    const { container } = render(
      <ActivityBar
        panels={['annotations', 'thumbnails', 'bookmarks', 'info']}
        activePanel={null}
        onTogglePanel={vi.fn()}
      />,
    );

    const separators = container.querySelectorAll('hr');
    expect(separators).toHaveLength(1);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.children[0]?.tagName).toBe('BUTTON');
    expect(toolbar.children[1]?.tagName).toBe('BUTTON');
    expect(toolbar.children[2]?.tagName).toBe('BUTTON');
    expect(toolbar.children[3]?.tagName).toBe('HR');
    expect(toolbar.children[4]?.tagName).toBe('BUTTON');
  });
});
