import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const mockCharInspector = {
  charInfo: undefined as Record<string, unknown> | undefined,
  charBox: undefined as Record<string, unknown> | undefined,
  isPinned: false,
  onMouseMove: vi.fn(),
  onMouseLeave: vi.fn(),
  onClick: vi.fn(),
  overlayRef: { current: null as HTMLCanvasElement | null },
};

vi.mock('../../../../src/react/hooks/use-character-inspector.js', () => ({
  useCharacterInspector: () => mockCharInspector,
}));

const { CharacterInspectorOverlay } = await import('../../../../src/react/components/character-inspector-overlay.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockCharInspector.charInfo = undefined;
  mockCharInspector.charBox = undefined;
  mockCharInspector.isPinned = false;
});

describe('CharacterInspectorOverlay', () => {
  const mockDoc = { id: 'doc-1' } as never;

  it('renders a canvas overlay', () => {
    const children = vi.fn().mockReturnValue(null);
    const { container } = render(
      <CharacterInspectorOverlay
        document={mockDoc}
        pageIndex={0}
        width={612}
        height={792}
        originalWidth={612}
        originalHeight={792}
      >
        {children}
      </CharacterInspectorOverlay>,
    );

    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('calls children with null when no character is hovered', () => {
    const children = vi.fn().mockReturnValue(null);
    render(
      <CharacterInspectorOverlay
        document={mockDoc}
        pageIndex={0}
        width={612}
        height={792}
        originalWidth={612}
        originalHeight={792}
      >
        {children}
      </CharacterInspectorOverlay>,
    );

    expect(children).toHaveBeenCalledWith(null);
  });

  it('calls children with char info when character is hovered', () => {
    const charInfo = { index: 5, unicode: 65, char: 'A', fontSize: 12, fontWeight: 400 };
    const charBox = { left: 10, right: 20, top: 30, bottom: 20 };
    mockCharInspector.charInfo = charInfo;
    mockCharInspector.charBox = charBox;

    const children = vi.fn().mockReturnValue(<div data-testid="char-info">A</div>);
    const { container } = render(
      <CharacterInspectorOverlay
        document={mockDoc}
        pageIndex={0}
        width={612}
        height={792}
        originalWidth={612}
        originalHeight={792}
      >
        {children}
      </CharacterInspectorOverlay>,
    );

    expect(children).toHaveBeenCalledWith({ charInfo, charBox, isPinned: false });
    expect(container.querySelector('[data-testid="char-info"]')).not.toBeNull();
  });

  it('sets crosshair cursor when character is hovered', () => {
    mockCharInspector.charInfo = { index: 0, unicode: 66, char: 'B' };

    const children = vi.fn().mockReturnValue(null);
    const { container } = render(
      <CharacterInspectorOverlay
        document={mockDoc}
        pageIndex={0}
        width={612}
        height={792}
        originalWidth={612}
        originalHeight={792}
      >
        {children}
      </CharacterInspectorOverlay>,
    );

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.style.cursor).toBe('crosshair');
  });

  it('applies className and style props to the canvas', () => {
    const children = vi.fn().mockReturnValue(null);
    const { container } = render(
      <CharacterInspectorOverlay
        document={mockDoc}
        pageIndex={0}
        width={612}
        height={792}
        originalWidth={612}
        originalHeight={792}
        className="custom-class"
      >
        {children}
      </CharacterInspectorOverlay>,
    );

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.className).toContain('custom-class');
  });

  it('draws the hovered character box and emits onCharacterChange', () => {
    const charInfo = { index: 1, unicode: 67, char: 'C' };
    const charBox = { left: 10, right: 20, top: 30, bottom: 20 };
    const onCharacterChange = vi.fn();
    mockCharInspector.charInfo = charInfo;
    mockCharInspector.charBox = charBox;
    mockCharInspector.isPinned = true;

    const ctx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    };
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    try {
      render(
        <CharacterInspectorOverlay
          document={mockDoc}
          pageIndex={0}
          width={612}
          height={792}
          originalWidth={612}
          originalHeight={792}
          onCharacterChange={onCharacterChange}
        />,
      );

      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 612, 792);
      expect(ctx.fillRect).toHaveBeenCalledWith(10, 762, 10, 10);
      expect(ctx.strokeRect).toHaveBeenCalledWith(10, 762, 10, 10);
      expect(ctx.fillStyle).toBe('rgba(59, 130, 246, 0.2)');
      expect(ctx.strokeStyle).toBe('rgba(59, 130, 246, 1)');
      expect(ctx.lineWidth).toBe(2);
      expect(onCharacterChange).toHaveBeenCalledWith({ charInfo, charBox, isPinned: true });
    } finally {
      getContextSpy.mockRestore();
    }
  });

  it('skips drawing when the canvas 2D context is unavailable', () => {
    mockCharInspector.charInfo = { index: 2, unicode: 68, char: 'D' };
    mockCharInspector.charBox = { left: 10, right: 20, top: 30, bottom: 20 };
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    try {
      render(
        <CharacterInspectorOverlay
          document={mockDoc}
          pageIndex={0}
          width={612}
          height={792}
          originalWidth={612}
          originalHeight={792}
        />,
      );

      expect(getContextSpy).toHaveBeenCalledWith('2d');
    } finally {
      getContextSpy.mockRestore();
    }
  });
});
