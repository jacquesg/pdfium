import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResizeHandle } from '../../../../src/react/components/resize-handle.js';
import type { UseResizeHandleProps } from '../../../../src/react/hooks/use-resize.js';

function createHandleProps(): UseResizeHandleProps {
  return {
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
    style: { cursor: 'col-resize' },
    role: 'separator',
    'aria-orientation': 'vertical',
    'aria-label': 'Resize sidebar',
    'aria-valuenow': 280,
    'aria-valuemin': 200,
    'aria-valuemax': 500,
    tabIndex: 0,
    'data-pdfium-resize-handle': '',
  };
}

describe('ResizeHandle', () => {
  it('renders structural resize affordance and applies base styles', () => {
    const { container } = render(<ResizeHandle handleProps={createHandleProps()} isResizing={false} />);

    const root = container.querySelector('[role="separator"]') as HTMLElement;
    expect(root).toBeDefined();
    expect(root.style.width).toBe('8px');
    expect(root.style.display).toBe('flex');
    expect(root.style.touchAction).toBe('none');
    expect(root.style.cursor).toBe('col-resize');

    const grip = container.querySelector('[data-pdfium-resize-grip]') as HTMLElement;
    expect(grip).toBeDefined();
    expect(grip.style.opacity).toBe('0.5');
    expect(grip.querySelectorAll('div')).toHaveLength(3);
  });

  it('switches active visual state when resizing', () => {
    const { container } = render(<ResizeHandle handleProps={createHandleProps()} isResizing />);

    const grip = container.querySelector('[data-pdfium-resize-grip]') as HTMLElement;
    expect(grip.style.opacity).toBe('1');
  });
});
