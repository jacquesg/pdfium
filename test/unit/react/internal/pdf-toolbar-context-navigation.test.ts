import { describe, expect, it, vi } from 'vitest';
import {
  createGoToPage,
  createNavigationRenderProps,
} from '../../../../src/react/internal/pdf-toolbar-context-navigation.js';
import { TOOLBAR_LABELS } from '../../../../src/react/internal/toolbar-config.js';

describe('pdf-toolbar-context-navigation', () => {
  it('clamps go-to page requests and ignores invalid values', () => {
    const setPageIndex = vi.fn();
    const goToPage = createGoToPage(4, setPageIndex);

    goToPage(100);
    goToPage(0);
    goToPage(Number.NaN);

    expect(setPageIndex).toHaveBeenNthCalledWith(1, 3);
    expect(setPageIndex).toHaveBeenNthCalledWith(2, 0);
    expect(setPageIndex).toHaveBeenCalledTimes(2);
  });

  it('builds navigation props with expected disabled states and handlers', () => {
    const setPageIndex = vi.fn();
    const next = vi.fn();
    const prev = vi.fn();
    const goToPage = vi.fn();

    const navigation = createNavigationRenderProps({
      pageIndex: 1,
      setPageIndex,
      next,
      prev,
      canNext: false,
      canPrev: true,
      pageCount: 3,
      goToPage,
    });

    const prevProps = navigation.getPrevProps();
    const nextProps = navigation.getNextProps();
    const inputProps = navigation.getInputProps();

    expect(navigation.pageNumber).toBe(2);
    expect(prevProps.disabled).toBe(false);
    expect(nextProps.disabled).toBe(true);
    expect(prevProps['aria-label']).toBe(TOOLBAR_LABELS.previousPage);
    expect(nextProps['aria-label']).toBe(TOOLBAR_LABELS.nextPage);

    prevProps.onClick();
    nextProps.onClick();
    inputProps.onChange({ target: { value: '3' } } as never);
    inputProps.onChange({ target: { value: 'invalid' } } as never);

    expect(prev).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(goToPage).toHaveBeenCalledTimes(1);
    expect(goToPage).toHaveBeenCalledWith(3);
  });

  it('disables page input when no pages exist', () => {
    const navigation = createNavigationRenderProps({
      pageIndex: 0,
      setPageIndex: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      canNext: false,
      canPrev: false,
      pageCount: 0,
      goToPage: vi.fn(),
    });

    const inputProps = navigation.getInputProps();

    expect(navigation.pageNumber).toBe(0);
    expect(inputProps.min).toBe(0);
    expect(inputProps.max).toBe(0);
    expect(inputProps.disabled).toBe(true);
  });
});
