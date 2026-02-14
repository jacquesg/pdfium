import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyPanelState } from '../../../../src/react/internal/empty-panel-state.js';

describe('EmptyPanelState', () => {
  it('renders fallback icon and message when icon is not provided', () => {
    const { container } = render(<EmptyPanelState message="Nothing to show" className="empty" />);

    expect(screen.getByText('Nothing to show')).toBeDefined();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe('empty');
    expect(root.style.display).toBe('flex');

    const fallbackSvg = container.querySelector('svg');
    expect(fallbackSvg).toBeDefined();
  });

  it('renders provided icon instead of fallback svg', () => {
    const { container } = render(<EmptyPanelState icon={<span data-testid="custom-icon">i</span>} message="No data" />);

    expect(screen.getByTestId('custom-icon')).toBeDefined();
    expect(screen.getByText('No data')).toBeDefined();
    expect(container.querySelector('svg')).toBeNull();
  });
});
