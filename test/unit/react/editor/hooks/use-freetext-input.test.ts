import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationType } from '../../../../../src/core/types.js';
import type { AnnotationCrudActions } from '../../../../../src/react/editor/hooks/use-annotation-crud.js';
import { useFreeTextInput } from '../../../../../src/react/editor/hooks/use-freetext-input.js';

function createMockCrud(): AnnotationCrudActions {
  return {
    createAnnotation: vi.fn().mockResolvedValue(3),
    removeAnnotation: vi.fn().mockResolvedValue(undefined),
    moveAnnotation: vi.fn().mockResolvedValue(undefined),
    resizeAnnotation: vi.fn().mockResolvedValue(undefined),
    setAnnotationColour: vi.fn().mockResolvedValue(undefined),
    setAnnotationBorder: vi.fn().mockResolvedValue(undefined),
    setAnnotationString: vi.fn().mockResolvedValue(undefined),
    replaceLineFallback: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useFreeTextInput', () => {
  it('starts inactive with no position', () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useFreeTextInput(crud));

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.position).toBeNull();
    expect(result.current.state.text).toBe('');
  });

  it('activate sets position and isActive', () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useFreeTextInput(crud));

    act(() => {
      result.current.activate({ x: 50, y: 100 });
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.position).toEqual({ x: 50, y: 100 });
    expect(result.current.state.text).toBe('');
  });

  it('setText updates text', () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useFreeTextInput(crud));

    act(() => {
      result.current.activate({ x: 0, y: 0 });
      result.current.setText('Hello');
    });

    expect(result.current.state.text).toBe('Hello');
  });

  it('confirm creates annotation with text', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useFreeTextInput(crud));

    act(() => {
      result.current.activate({ x: 10, y: 20 });
      result.current.setText('My annotation');
    });

    const rect = { left: 10, top: 20, right: 200, bottom: 50 };
    let returnValue: number | undefined;
    await act(async () => {
      returnValue = await result.current.confirm(AnnotationType.FreeText, rect);
    });

    expect(crud.createAnnotation).toHaveBeenCalledWith(AnnotationType.FreeText, rect, { contents: 'My annotation' });
    expect(returnValue).toBe(3);
    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.text).toBe('');
  });

  it('confirm returns undefined for empty text', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useFreeTextInput(crud));

    act(() => {
      result.current.activate({ x: 0, y: 0 });
    });

    let returnValue: number | undefined = 999;
    await act(async () => {
      returnValue = await result.current.confirm(AnnotationType.FreeText, { left: 0, top: 0, right: 100, bottom: 20 });
    });

    expect(returnValue).toBeUndefined();
    expect(crud.createAnnotation).not.toHaveBeenCalled();
    expect(result.current.state.isActive).toBe(false);
  });

  it('cancel resets state', () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useFreeTextInput(crud));

    act(() => {
      result.current.activate({ x: 5, y: 5 });
      result.current.setText('Draft');
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.position).toBeNull();
    expect(result.current.state.text).toBe('');
  });
});
