import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PanelButton } from '../../../../src/react/internal/panel-button.js';

describe('PanelButton', () => {
  it('renders default button attributes and shared interaction styles', () => {
    render(<PanelButton>Open</PanelButton>);

    const button = screen.getByRole('button', { name: 'Open' }) as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.style.cursor).toBe('pointer');
    expect(button.style.padding).toBe('6px 14px');
    expect(button.style.fontSize).toBe('13px');
    expect(button.style.lineHeight).toBe('1.4');
  });

  it('calls onClick when enabled and applies className/style overrides', () => {
    const onClick = vi.fn();
    render(
      <PanelButton onClick={onClick} className="custom" style={{ padding: '10px 20px' }}>
        Save
      </PanelButton>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.className).toBe('custom');
    expect(button.style.padding).toBe('10px 20px');
  });

  it('applies disabled interaction styles and blocks clicks', () => {
    const onClick = vi.fn();
    render(
      <PanelButton disabled onClick={onClick} variant="danger">
        Delete
      </PanelButton>,
    );

    const button = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement;
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(button.style.cursor).toBe('not-allowed');
    expect(button.style.opacity).toBe('0.4');
    expect(onClick).not.toHaveBeenCalled();
  });
});
