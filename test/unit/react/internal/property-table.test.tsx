import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PropertyRow } from '../../../../src/react/internal/property-table.js';
import { PropertyTable } from '../../../../src/react/internal/property-table.js';

describe('PropertyTable', () => {
  it('renders key-value pairs with labels and string values', () => {
    const rows: PropertyRow[] = [
      { label: 'Title', value: 'My Document' },
      { label: 'Author', value: 'Jane Doe' },
    ];

    render(<PropertyTable rows={rows} />);

    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('My Document')).toBeDefined();
    expect(screen.getByText('Author')).toBeDefined();
    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('renders boolean true as a badge with "true" text', () => {
    const rows: PropertyRow[] = [{ label: 'Encrypted', value: true }];
    render(<PropertyTable rows={rows} />);

    const badge = screen.getByText('true');
    expect(badge).toBeDefined();
    // Badge should have pill styling (borderRadius: 9999px)
    expect(badge.style.borderRadius).toBe('9999px');
    // Badge has pill styling (verified by borderRadius above) and "true" text
    expect(badge.textContent).toBe('true');
  });

  it('renders boolean false as a badge with "false" text', () => {
    const rows: PropertyRow[] = [{ label: 'Tagged', value: false }];
    render(<PropertyTable rows={rows} />);

    const badge = screen.getByText('false');
    expect(badge).toBeDefined();
    expect(badge.style.borderRadius).toBe('9999px');
    // Default badge — should NOT have "success" in the background variable
    expect(badge.style.backgroundColor).not.toContain('success');
  });

  it('renders number values', () => {
    const rows: PropertyRow[] = [{ label: 'Page count', value: 42 }];
    render(<PropertyTable rows={rows} />);

    expect(screen.getByText('Page count')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders an em dash for undefined values', () => {
    const rows: PropertyRow[] = [{ label: 'Subject', value: undefined }];
    render(<PropertyTable rows={rows} />);

    expect(screen.getByText('Subject')).toBeDefined();
    expect(screen.getByText('\u2014')).toBeDefined();
  });

  it('renders an em dash for null values', () => {
    const rows: PropertyRow[] = [{ label: 'Producer', value: null }];
    render(<PropertyTable rows={rows} />);

    expect(screen.getByText('Producer')).toBeDefined();
    expect(screen.getByText('\u2014')).toBeDefined();
  });

  it('applies inline styles', () => {
    const rows: PropertyRow[] = [{ label: 'Test', value: 'value' }];
    const { container } = render(<PropertyTable rows={rows} style={{ padding: '16px' }} />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.padding).toBe('16px');
    // Should also have grid display from the component
    expect(root.style.display).toBe('grid');
  });
});
