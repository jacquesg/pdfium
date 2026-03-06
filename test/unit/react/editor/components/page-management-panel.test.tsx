import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageManagementPanel } from '../../../../../src/react/editor/components/page-management-panel.js';
import type { PageManagementActions } from '../../../../../src/react/editor/hooks/use-page-management.js';

function createMockActions(): PageManagementActions {
  return {
    deletePage: vi.fn().mockResolvedValue(undefined),
    insertBlankPage: vi.fn().mockResolvedValue(undefined),
    movePage: vi.fn().mockResolvedValue(undefined),
  };
}

const defaultProps = {
  pageIndex: 2,
  pageCount: 5,
  pageWidth: 612,
  pageHeight: 792,
};

describe('PageManagementPanel', () => {
  describe('rendering', () => {
    it('renders with data-testid="page-management-panel"', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} actions={actions} />);
      expect(screen.getByTestId('page-management-panel')).toBeDefined();
    });

    it('displays "Page N of M" text (1-based)', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={2} pageCount={5} actions={actions} />);
      expect(screen.getByText('Page 3 of 5')).toBeDefined();
    });

    it('displays "Page 1 of 1" when single page', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={0} pageCount={1} actions={actions} />);
      expect(screen.getByText('Page 1 of 1')).toBeDefined();
    });
  });

  describe('delete button', () => {
    it('is disabled when pageCount is 1', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageCount={1} pageIndex={0} actions={actions} />);
      const btn = screen.getByTestId('delete-page-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('is enabled when pageCount > 1', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageCount={3} actions={actions} />);
      const btn = screen.getByTestId('delete-page-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('calls actions.deletePage with pageIndex, pageWidth, pageHeight on click', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} actions={actions} />);
      fireEvent.click(screen.getByTestId('delete-page-button'));
      expect(actions.deletePage).toHaveBeenCalledWith(2, 612, 792);
    });

    it('does not call actions.deletePage when disabled', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageCount={1} pageIndex={0} actions={actions} />);
      fireEvent.click(screen.getByTestId('delete-page-button'));
      expect(actions.deletePage).not.toHaveBeenCalled();
    });
  });

  describe('insert buttons', () => {
    it('insert before calls actions.insertBlankPage with pageIndex', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={2} actions={actions} />);
      fireEvent.click(screen.getByTestId('insert-before-button'));
      expect(actions.insertBlankPage).toHaveBeenCalledWith(2);
    });

    it('insert after calls actions.insertBlankPage with pageIndex + 1', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={2} actions={actions} />);
      fireEvent.click(screen.getByTestId('insert-after-button'));
      expect(actions.insertBlankPage).toHaveBeenCalledWith(3);
    });
  });

  describe('move buttons', () => {
    it('move up is disabled when pageIndex is 0', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={0} actions={actions} />);
      const btn = screen.getByTestId('move-up-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('move up is enabled when pageIndex > 0', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={2} actions={actions} />);
      const btn = screen.getByTestId('move-up-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('move down is disabled when pageIndex is the last page', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={4} pageCount={5} actions={actions} />);
      const btn = screen.getByTestId('move-down-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('move down is enabled when pageIndex < pageCount - 1', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={2} pageCount={5} actions={actions} />);
      const btn = screen.getByTestId('move-down-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('move up calls actions.movePage(pageIndex, pageIndex - 1)', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={3} actions={actions} />);
      fireEvent.click(screen.getByTestId('move-up-button'));
      expect(actions.movePage).toHaveBeenCalledWith(3, 2);
    });

    it('move down calls actions.movePage(pageIndex, pageIndex + 2)', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={2} pageCount={5} actions={actions} />);
      fireEvent.click(screen.getByTestId('move-down-button'));
      expect(actions.movePage).toHaveBeenCalledWith(2, 4);
    });

    it('move up does not call movePage when already at first page', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={0} actions={actions} />);
      fireEvent.click(screen.getByTestId('move-up-button'));
      expect(actions.movePage).not.toHaveBeenCalled();
    });

    it('move down does not call movePage when already at last page', () => {
      const actions = createMockActions();
      render(<PageManagementPanel {...defaultProps} pageIndex={4} pageCount={5} actions={actions} />);
      fireEvent.click(screen.getByTestId('move-down-button'));
      expect(actions.movePage).not.toHaveBeenCalled();
    });
  });
});
