import { renderHook, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { InteractionModeState } from '../../../../src/react/hooks/use-interaction-mode.js';

const mockUseInteractionMode = vi.fn();

vi.mock('../../../../src/react/hooks/use-interaction-mode.js', () => ({
  useInteractionMode: (...args: unknown[]) => mockUseInteractionMode(...args),
}));

const { useViewerInteractionState } = await import('../../../../src/react/internal/use-viewer-interaction-state.js');

function createInteractionState(overrides?: Partial<InteractionModeState>): InteractionModeState {
  return {
    mode: 'pointer',
    setMode: vi.fn(),
    isDragging: false,
    marqueeRect: null,
    ...overrides,
  };
}

describe('useViewerInteractionState', () => {
  it('applies initial interaction mode once when provided', async () => {
    const interaction = createInteractionState();
    mockUseInteractionMode.mockReturnValue(interaction);

    const containerRef = createRef<HTMLDivElement>();
    const zoomAnchorRef = createRef<{ x: number; y: number } | null>();

    const { result } = renderHook(() =>
      useViewerInteractionState({
        containerRef,
        scale: 1,
        setScale: vi.fn(),
        scrollMode: 'continuous',
        zoomAnchorRef: zoomAnchorRef as never,
        initialInteractionMode: 'pan',
      }),
    );

    await waitFor(() => {
      expect(interaction.setMode).toHaveBeenCalledWith('pan');
    });
    expect(result.current).toBe(interaction);
  });

  it('does not call setMode when initialInteractionMode is omitted', async () => {
    const interaction = createInteractionState();
    mockUseInteractionMode.mockReturnValue(interaction);

    const containerRef = createRef<HTMLDivElement>();
    const zoomAnchorRef = createRef<{ x: number; y: number } | null>();

    renderHook(() =>
      useViewerInteractionState({
        containerRef,
        scale: 1,
        setScale: vi.fn(),
        scrollMode: 'continuous',
        zoomAnchorRef: zoomAnchorRef as never,
      }),
    );

    await waitFor(() => {
      expect(mockUseInteractionMode).toHaveBeenCalledOnce();
    });
    expect(interaction.setMode).not.toHaveBeenCalled();
  });
});
