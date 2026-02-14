import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageInput, ZoomInput } from '../../../../src/react/internal/default-toolbar-inputs.js';

describe('default-toolbar-inputs', () => {
  it('edits and commits page input with clamped values', () => {
    const goToPage = vi.fn();
    render(<PageInput pageNumber={2} pageCount={5} goToPage={goToPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page number' }));
    const input = screen.getByRole('textbox', { name: 'Page number' });
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(goToPage).toHaveBeenCalledWith(5);
  });

  it('ignores invalid page input values', () => {
    const goToPage = vi.fn();
    render(<PageInput pageNumber={1} pageCount={5} goToPage={goToPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page number' }));
    const input = screen.getByRole('textbox', { name: 'Page number' });
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(goToPage).not.toHaveBeenCalled();
  });

  it('edits and commits zoom input with clamped percentage', () => {
    const setScale = vi.fn();
    render(<ZoomInput percentage={100} setScale={setScale} />);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom percentage' }));
    const input = screen.getByRole('textbox', { name: 'Zoom percentage' });
    fireEvent.change(input, { target: { value: '900' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setScale).toHaveBeenCalledWith(5);
  });
});
