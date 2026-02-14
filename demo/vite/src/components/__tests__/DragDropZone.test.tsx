import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DragDropZone } from '../DragDropZone';

describe('DragDropZone', () => {
  it('renders children', () => {
    render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Child content</div>
      </DragDropZone>,
    );

    expect(screen.getByText('Child content')).toBeDefined();
  });

  it('shows overlay on dragenter', () => {
    const { container } = render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Content</div>
      </DragDropZone>,
    );

    const dropZone = container.firstChild as HTMLElement;
    fireEvent.dragEnter(dropZone);

    expect(screen.getByText('Drop PDF here')).toBeDefined();
    expect(screen.getByText('Release to load document')).toBeDefined();
  });

  it('hides overlay on dragleave when counter reaches zero', () => {
    const { container } = render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Content</div>
      </DragDropZone>,
    );

    const dropZone = container.firstChild as HTMLElement;

    // Show overlay via dragenter
    fireEvent.dragEnter(dropZone);
    expect(screen.getByText('Drop PDF here')).toBeDefined();

    // A single dragleave should hide the overlay (counter: 1 -> 0)
    fireEvent.dragLeave(dropZone);

    const overlay = screen.queryByText('Drop PDF here');
    expect(overlay == null).toBe(true);
  });

  it('does not flicker when dragging over child elements', () => {
    const { container } = render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div data-testid="child">Content</div>
      </DragDropZone>,
    );

    const dropZone = container.firstChild as HTMLElement;
    const child = screen.getByTestId('child');

    // Enter the container (counter: 0 -> 1)
    fireEvent.dragEnter(dropZone);
    expect(screen.getByText('Drop PDF here')).toBeDefined();

    // Enter a child element (counter: 1 -> 2)
    fireEvent.dragEnter(child);
    expect(screen.getByText('Drop PDF here')).toBeDefined();

    // Leave the parent (counter: 2 -> 1) — overlay should STAY visible
    fireEvent.dragLeave(dropZone);
    expect(screen.getByText('Drop PDF here')).toBeDefined();

    // Leave the child (counter: 1 -> 0) — overlay should hide
    fireEvent.dragLeave(child);
    const overlay = screen.queryByText('Drop PDF here');
    expect(overlay == null).toBe(true);
  });

  it('prevents default on dragover', () => {
    const { container } = render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Content</div>
      </DragDropZone>,
    );

    const dropZone = container.firstChild as HTMLElement;
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    dropZone.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('has aria-label attribute for accessibility', () => {
    const { container } = render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Content</div>
      </DragDropZone>,
    );

    const dropZone = container.firstChild as HTMLElement;
    const ariaLabel = dropZone.getAttribute('aria-label');
    expect(ariaLabel).toContain('Drop zone for PDF files');
    expect(ariaLabel).toContain('Press Enter or Space');
  });

  it('includes live region for screen reader announcements', () => {
    const { container } = render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Content</div>
      </DragDropZone>,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.getAttribute('aria-atomic')).toBe('true');
  });

  it('overlay is not visible initially', () => {
    render(
      <DragDropZone onFileSelect={vi.fn()}>
        <div>Content</div>
      </DragDropZone>,
    );

    const overlay = screen.queryByText('Drop PDF here');
    expect(overlay == null).toBe(true);
  });
});
