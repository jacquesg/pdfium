import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SubTabNav } from '../SubTabNav';

const tabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

describe('SubTabNav', () => {
  it('renders all tabs', () => {
    render(
      <SubTabNav tabs={tabs} activeTab="tab1" onChange={vi.fn()}>
        <div>Content</div>
      </SubTabNav>,
    );

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeDefined();
  });

  it('marks active tab with aria-selected', () => {
    render(
      <SubTabNav tabs={tabs} activeTab="tab2" onChange={vi.fn()}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });

    expect(tab1.getAttribute('aria-selected')).toBe('false');
    expect(tab2.getAttribute('aria-selected')).toBe('true');
    expect(tab3.getAttribute('aria-selected')).toBe('false');
  });

  it('sets data-state active only on selected tab', () => {
    render(
      <SubTabNav tabs={tabs} activeTab="tab2" onChange={vi.fn()}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });

    expect(tab1.getAttribute('data-state')).toBe('inactive');
    expect(tab2.getAttribute('data-state')).toBe('active');
    expect(tab3.getAttribute('data-state')).toBe('inactive');
  });

  it('calls onChange on tab click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SubTabNav tabs={tabs} activeTab="tab1" onChange={onChange}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2);

    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('has correct ARIA roles', () => {
    render(
      <SubTabNav tabs={tabs} activeTab="tab1" onChange={vi.fn()}>
        <div>Panel content</div>
      </SubTabNav>,
    );

    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.getByRole('tabpanel')).toBeDefined();
  });

  it('renders children in tabpanel', () => {
    render(
      <SubTabNav tabs={tabs} activeTab="tab1" onChange={vi.fn()}>
        <div>Panel content</div>
      </SubTabNav>,
    );

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel.textContent).toContain('Panel content');
  });

  it('navigates to next tab on ArrowRight key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SubTabNav tabs={tabs} activeTab="tab1" onChange={onChange}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('navigates to previous tab on ArrowLeft key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SubTabNav tabs={tabs} activeTab="tab2" onChange={onChange}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    tab2.focus();
    await user.keyboard('{ArrowLeft}');

    expect(onChange).toHaveBeenCalledWith('tab1');
  });

  it('navigates to first tab on Home key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SubTabNav tabs={tabs} activeTab="tab3" onChange={onChange}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
    tab3.focus();
    await user.keyboard('{Home}');

    expect(onChange).toHaveBeenCalledWith('tab1');
  });

  it('navigates to last tab on End key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SubTabNav tabs={tabs} activeTab="tab1" onChange={onChange}>
        <div>Content</div>
      </SubTabNav>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();
    await user.keyboard('{End}');

    expect(onChange).toHaveBeenCalledWith('tab3');
  });
});
