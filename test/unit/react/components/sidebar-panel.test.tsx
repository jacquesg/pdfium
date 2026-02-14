import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}));

const { SidebarPanel } = await import('../../../../src/react/components/sidebar-panel.js');

describe('SidebarPanel', () => {
  it('renders title text', () => {
    render(<SidebarPanel title="Bookmarks">Content</SidebarPanel>);
    expect(screen.getByText('Bookmarks')).toBeDefined();
  });

  it('renders children content', () => {
    render(
      <SidebarPanel title="Panel">
        <div data-testid="child">Hello</div>
      </SidebarPanel>,
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('close button calls onClose when clicked', () => {
    const onClose = vi.fn();
    render(
      <SidebarPanel title="Panel" onClose={onClose}>
        Content
      </SidebarPanel>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Close panel' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no close button when onClose is undefined', () => {
    render(<SidebarPanel title="Panel">Content</SidebarPanel>);
    expect(screen.queryByRole('button', { name: 'Close panel' })).toBeNull();
  });

  it('renders icon when provided', () => {
    const TestIcon = ({ size }: { size?: number }) => <svg data-testid="test-icon" width={size} />;
    render(
      <SidebarPanel title="Panel" icon={TestIcon}>
        Content
      </SidebarPanel>,
    );
    expect(screen.getByTestId('test-icon')).toBeDefined();
  });

  it('does not render icon when not provided', () => {
    render(<SidebarPanel title="Panel">Content</SidebarPanel>);
    expect(screen.queryByTestId('test-icon')).toBeNull();
  });

  it('close button renders lucide X icon', () => {
    render(
      <SidebarPanel title="Panel" onClose={vi.fn()}>
        Content
      </SidebarPanel>,
    );
    expect(screen.getByTestId('x-icon')).toBeDefined();
  });

  it('has data-pdfium-sidebar attribute for CSS var targeting', () => {
    const { container } = render(<SidebarPanel title="Panel">Content</SidebarPanel>);
    const aside = container.querySelector('[data-pdfium-sidebar]') as HTMLElement;
    // The component uses var(--pdfium-sidebar-width, 240px) for width, but jsdom
    // strips CSS custom property values from the style serialisation. We verify the
    // data attribute exists so CSS rules can target it, and check structural styles.
    expect(aside).not.toBeNull();
    expect(aside.tagName).toBe('ASIDE');
    expect(aside.style.display).toBe('flex');
    expect(aside.style.flexDirection).toBe('column');
  });
});
