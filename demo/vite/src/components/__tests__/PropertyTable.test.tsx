import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PropertyTable } from '../PropertyTable';

describe('PropertyTable', () => {
  it('renders rows with labels and values', () => {
    render(
      <PropertyTable
        rows={[
          { label: 'Name', value: 'Test' },
          { label: 'Count', value: 42 },
        ]}
      />,
    );

    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Test')).toBeDefined();
    expect(screen.getByText('Count')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders boolean values as Yes/No badges', () => {
    render(
      <PropertyTable
        rows={[
          { label: 'Enabled', value: true },
          { label: 'Disabled', value: false },
        ]}
      />,
    );

    expect(screen.getByText('Yes')).toBeDefined();
    expect(screen.getByText('No')).toBeDefined();
  });

  it('renders undefined values as N/A', () => {
    render(
      <PropertyTable
        rows={[{ label: 'Missing', value: undefined }]}
      />,
    );

    expect(screen.getByText('N/A')).toBeDefined();
  });

  it('has default aria-label when none provided', () => {
    const { container } = render(
      <PropertyTable rows={[{ label: 'Test', value: 'val' }]} />,
    );

    const table = container.querySelector('table');
    expect(table?.getAttribute('aria-label')).toBe('Property table');
  });

  it('uses custom aria-label when provided', () => {
    const { container } = render(
      <PropertyTable
        rows={[{ label: 'Test', value: 'val' }]}
        aria-label="Document permissions"
      />,
    );

    const table = container.querySelector('table');
    expect(table?.getAttribute('aria-label')).toBe('Document permissions');
  });
});
