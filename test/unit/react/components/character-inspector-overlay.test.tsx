import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const mockCharInspector = {
  charInfo: undefined as Record<string, unknown> | undefined,
  charBox: undefined as Record<string, unknown> | undefined,
  onMouseMove: vi.fn(),
  onMouseLeave: vi.fn(),
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

    expect(children).toHaveBeenCalledWith({ charInfo, charBox });
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
});
