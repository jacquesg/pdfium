import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPanel } from '../../../../src/react/components/search-panel.js';

describe('SearchPanel', () => {
  const defaultProps = {
    query: '',
    onQueryChange: vi.fn(),
    totalMatches: 0,
    currentIndex: 0,
    isSearching: false,
    onNext: vi.fn(),
    onPrev: vi.fn(),
  };

  it('renders a search input', () => {
    render(<SearchPanel {...defaultProps} />);

    const input = screen.getByRole('searchbox');
    expect(input).toBeDefined();
  });

  it('renders with search landmark', () => {
    const { container } = render(<SearchPanel {...defaultProps} />);

    const search = container.querySelector('[role="search"]');
    expect(search).not.toBeNull();
    expect(search?.getAttribute('aria-label')).toBe('Search in document');
  });

  it('calls onQueryChange when typing', () => {
    const onQueryChange = vi.fn();
    render(<SearchPanel {...defaultProps} onQueryChange={onQueryChange} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'hello' } });

    expect(onQueryChange).toHaveBeenCalledWith('hello');
  });

  it('calls onNext on Enter key', () => {
    const onNext = vi.fn();
    render(<SearchPanel {...defaultProps} onNext={onNext} />);

    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onPrev on Shift+Enter key', () => {
    const onPrev = vi.fn();
    render(<SearchPanel {...defaultProps} onPrev={onPrev} />);

    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(onPrev).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<SearchPanel {...defaultProps} onClose={onClose} />);

    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows match count when there are results', () => {
    render(<SearchPanel {...defaultProps} totalMatches={42} currentIndex={2} />);

    expect(screen.getByText('3 of 42')).toBeDefined();
  });

  it('shows "No results" for non-empty query with no matches', () => {
    render(<SearchPanel {...defaultProps} query="xyz" totalMatches={0} />);

    expect(screen.getByText('No results')).toBeDefined();
  });

  it('shows searching state', () => {
    render(<SearchPanel {...defaultProps} isSearching totalMatches={5} />);

    expect(screen.getByText('Searching\u2026 5 found')).toBeDefined();
  });

  it('disables nav buttons when no matches', () => {
    render(<SearchPanel {...defaultProps} totalMatches={0} />);

    const prevBtn = screen.getByRole('button', { name: 'Previous match' });
    const nextBtn = screen.getByRole('button', { name: 'Next match' });

    expect(prevBtn.hasAttribute('disabled')).toBe(true);
    expect(nextBtn.hasAttribute('disabled')).toBe(true);
  });

  it('enables nav buttons when matches exist', () => {
    render(<SearchPanel {...defaultProps} totalMatches={5} />);

    const prevBtn = screen.getByRole('button', { name: 'Previous match' });
    const nextBtn = screen.getByRole('button', { name: 'Next match' });

    expect(prevBtn.hasAttribute('disabled')).toBe(false);
    expect(nextBtn.hasAttribute('disabled')).toBe(false);
  });

  it('renders close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<SearchPanel {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Close search' });
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render close button when onClose is not provided', () => {
    render(<SearchPanel {...defaultProps} />);

    expect(screen.queryByRole('button', { name: 'Close search' })).toBeNull();
  });

  it('applies className and style', () => {
    const { container } = render(<SearchPanel {...defaultProps} className="my-class" style={{ padding: 10 }} />);

    const search = container.querySelector('[role="search"]');
    expect(search?.className).toContain('my-class');
  });
});
