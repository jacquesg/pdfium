import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationType } from '../../../../../src/core/types.js';
import { AnnotationPropertyPanel } from '../../../../../src/react/editor/components/annotation-property-panel.js';
import type { AnnotationCrudActions } from '../../../../../src/react/editor/hooks/use-annotation-crud.js';

function createMockCrud(): AnnotationCrudActions {
  return {
    createAnnotation: vi.fn().mockResolvedValue(undefined),
    removeAnnotation: vi.fn().mockResolvedValue(undefined),
    moveAnnotation: vi.fn().mockResolvedValue(undefined),
    resizeAnnotation: vi.fn().mockResolvedValue(undefined),
    setAnnotationColour: vi.fn().mockResolvedValue(undefined),
    setAnnotationBorder: vi.fn().mockResolvedValue(undefined),
    setAnnotationString: vi.fn().mockResolvedValue(undefined),
    replaceLineFallback: vi.fn().mockResolvedValue(undefined),
  };
}

const baseAnnotation = {
  index: 0,
  type: AnnotationType.Square,
  bounds: { left: 10, top: 100, right: 200, bottom: 50 },
  colour: {
    stroke: { r: 255, g: 0, b: 0, a: 255 },
    interior: { r: 0, g: 0, b: 255, a: 255 },
  },
  flags: 0,
  contents: 'Hello world',
  author: 'John Doe',
  subject: 'Test subject',
  border: null,
  appearance: null,
  fontSize: 12,
  line: undefined,
  vertices: undefined,
  inkPaths: undefined,
  attachmentPoints: undefined,
  widget: undefined,
  link: undefined,
} as const;

describe('AnnotationPropertyPanel', () => {
  describe('rendering', () => {
    it('renders with data-testid="annotation-property-panel"', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('annotation-property-panel')).toBeDefined();
    });

    it('renders stroke colour input', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('stroke-colour-input')).toBeDefined();
    });

    it('renders interior colour input', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('interior-colour-input')).toBeDefined();
    });

    it('renders contents textarea', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('contents-input')).toBeDefined();
    });

    it('renders author input', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('author-input')).toBeDefined();
    });

    it('renders subject input', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('subject-input')).toBeDefined();
    });

    it('displays current contents value', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const textarea = screen.getByTestId('contents-input') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Hello world');
    });

    it('displays current author value', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const input = screen.getByTestId('author-input') as HTMLInputElement;
      expect(input.value).toBe('John Doe');
    });

    it('displays current subject value', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const input = screen.getByTestId('subject-input') as HTMLInputElement;
      expect(input.value).toBe('Test subject');
    });

    it('displays stroke colour as hex', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const input = screen.getByTestId('stroke-colour-input') as HTMLInputElement;
      expect(input.value).toBe('#ff0000');
    });

    it('displays interior colour as hex', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const input = screen.getByTestId('interior-colour-input') as HTMLInputElement;
      expect(input.value).toBe('#0000ff');
    });

    it('renders opacity slider', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      expect(screen.getByTestId('opacity-input')).toBeDefined();
    });

    it('renders annotation type label', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const label = screen.getByTestId('annotation-type-label');
      expect(label.textContent).toContain('Rectangle');
    });

    it('shows ink stroke count for ink annotations', () => {
      const crud = createMockCrud();
      const inkAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Ink,
        inkPaths: [
          [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          [
            { x: 20, y: 20 },
            { x: 30, y: 30 },
          ],
        ],
      };
      render(<AnnotationPropertyPanel annotation={inkAnnotation} crud={crud} />);
      const inkInfo = screen.getByTestId('ink-info');
      expect(inkInfo.textContent).toContain('2');
    });

    it('shows border info when border is present', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      };
      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);
      const borderWidthInput = screen.getByTestId('border-width-input') as HTMLInputElement;
      expect(borderWidthInput.value).toBe('2');
      const borderInfo = screen.getByTestId('border-info');
      expect(borderInfo.textContent).toContain('Radius');
    });

    it('shows border controls for shape annotations even when border is missing', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const borderWidthInput = screen.getByTestId('border-width-input') as HTMLInputElement;
      expect(borderWidthInput.value).toBe('1');
      const borderInfo = screen.getByTestId('border-info');
      expect(borderInfo.textContent).toContain('Radius: 0px / 0px');
    });

    it('treats line-tool Ink fallback annotations as line-like in UI', () => {
      const crud = createMockCrud();
      const lineFallbackAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Ink,
        lineFallback: true,
        inkPaths: [
          [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        ],
      };

      render(<AnnotationPropertyPanel annotation={lineFallbackAnnotation} crud={crud} />);
      const label = screen.getByTestId('annotation-type-label');
      expect(label.textContent).toContain('Line');
      expect(screen.getByTestId('line-info').textContent).toContain('Line:');
      expect(screen.queryByTestId('ink-info')).toBeNull();
    });

    it('reflects transparent default fill for shapes with no interior colour', () => {
      const crud = createMockCrud();
      const unfilledAnnotation = {
        ...baseAnnotation,
        colour: {
          ...baseAnnotation.colour,
          interior: undefined,
        },
      };
      render(<AnnotationPropertyPanel annotation={unfilledAnnotation} crud={crud} />);

      const fillToggle = screen.getByTestId('fill-enabled-input') as HTMLInputElement;
      const fillInput = screen.getByTestId('interior-colour-input') as HTMLInputElement;
      expect(fillToggle.checked).toBe(false);
      expect(fillInput.disabled).toBe(true);
    });

    it('hides stroke controls for highlight annotations', () => {
      const crud = createMockCrud();
      const highlightAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Highlight,
      };
      render(<AnnotationPropertyPanel annotation={highlightAnnotation} crud={crud} />);
      expect(screen.queryByTestId('stroke-colour-input')).toBeNull();
    });

    it('marks panel as busy while mutation is pending', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} mutationPending />);

      const panel = screen.getByTestId('annotation-property-panel');
      expect(panel.getAttribute('aria-busy')).toBe('true');
    });

    it('does not clear preview state when the same annotation rerenders with live line geometry', () => {
      const onClearPreviewPatch = vi.fn();
      const initialLineAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Ink,
        lineFallback: true,
        bounds: { left: 10, top: 100, right: 120, bottom: 40 },
        inkPaths: [
          [
            { x: 10, y: 90 },
            { x: 120, y: 40 },
          ],
        ],
      };
      const { rerender } = render(
        <AnnotationPropertyPanel
          annotation={initialLineAnnotation}
          crud={createMockCrud()}
          onClearPreviewPatch={onClearPreviewPatch}
        />,
      );

      rerender(
        <AnnotationPropertyPanel
          annotation={{
            ...initialLineAnnotation,
            bounds: { left: 10, top: 100, right: 150, bottom: 20 },
            inkPaths: [
              [
                { x: 10, y: 90 },
                { x: 150, y: 20 },
              ],
            ],
          }}
          crud={createMockCrud()}
          onClearPreviewPatch={onClearPreviewPatch}
        />,
      );

      expect(onClearPreviewPatch).not.toHaveBeenCalled();
    });
  });

  describe('colour change interactions', () => {
    it('calls crud.setAnnotationColour with "stroke" when stroke colour changes', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const input = screen.getByTestId('stroke-colour-input');
      fireEvent.change(input, { target: { value: '#00ff00' } });
      fireEvent.blur(input);
      expect(crud.setAnnotationColour).toHaveBeenCalledWith(
        0,
        'stroke',
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 255, b: 0, a: 255 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      );
    });

    it('publishes transient stroke preview and clears it after commit', async () => {
      const crud = createMockCrud();
      const onPreviewPatch = vi.fn();
      const onClearPreviewPatch = vi.fn();
      render(
        <AnnotationPropertyPanel
          annotation={baseAnnotation}
          crud={crud}
          onPreviewPatch={onPreviewPatch}
          onClearPreviewPatch={onClearPreviewPatch}
        />,
      );
      const input = screen.getByTestId('stroke-colour-input');
      fireEvent.change(input, { target: { value: '#00ff00' } });

      expect(onPreviewPatch).toHaveBeenCalledWith(0, {
        colour: {
          stroke: { r: 0, g: 255, b: 0, a: 255 },
        },
      });
      expect(crud.setAnnotationColour).not.toHaveBeenCalled();

      fireEvent.blur(input);
      await Promise.resolve();
      expect(onClearPreviewPatch).toHaveBeenCalledWith(0);
    });

    it('calls crud.setAnnotationColour with "interior" when interior colour changes', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const input = screen.getByTestId('interior-colour-input');
      fireEvent.change(input, { target: { value: '#ffff00' } });
      fireEvent.blur(input);
      expect(crud.setAnnotationColour).toHaveBeenCalledWith(
        0,
        'interior',
        { r: 0, g: 0, b: 255, a: 255 },
        { r: 255, g: 255, b: 0, a: 255 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      );
    });

    it('uses the stroke channel for highlight fill edits so colour persists', () => {
      const crud = createMockCrud();
      const highlightAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Highlight,
        colour: {
          stroke: { r: 255, g: 255, b: 0, a: 128 },
          interior: undefined,
        },
      };
      render(<AnnotationPropertyPanel annotation={highlightAnnotation} crud={crud} />);
      const input = screen.getByTestId('interior-colour-input');
      fireEvent.change(input, { target: { value: '#00ff00' } });
      fireEvent.blur(input);

      expect(crud.setAnnotationColour).toHaveBeenCalledWith(
        0,
        'stroke',
        { r: 255, g: 255, b: 0, a: 128 },
        { r: 0, g: 255, b: 0, a: 128 },
        null,
      );
    });

    it('falls back to black when annotation stroke colour is undefined', () => {
      const crud = createMockCrud();
      const annotation = { ...baseAnnotation, colour: { stroke: undefined, interior: undefined } };
      render(<AnnotationPropertyPanel annotation={annotation} crud={crud} />);
      const input = screen.getByTestId('stroke-colour-input');
      fireEvent.change(input, { target: { value: '#aabbcc' } });
      fireEvent.blur(input);
      expect(crud.setAnnotationColour).toHaveBeenCalledWith(
        0,
        'stroke',
        { r: 0, g: 0, b: 0, a: 255 },
        expect.any(Object),
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      );
    });

    it('renders unsupported annotation types with fallback labels and default colours', () => {
      const crud = createMockCrud();
      const unsupportedAnnotation = {
        ...baseAnnotation,
        type: 999 as unknown as AnnotationType,
        colour: { stroke: undefined, interior: undefined },
      };

      render(<AnnotationPropertyPanel annotation={unsupportedAnnotation} crud={crud} />);

      expect(screen.getByTestId('annotation-type-label').textContent).toContain('Type 999');
      expect((screen.getByTestId('stroke-colour-input') as HTMLInputElement).value).toBe('#000000');
    });

    it('enables fill and applies an interior colour when fill toggle is checked', () => {
      const crud = createMockCrud();
      const unfilledAnnotation = {
        ...baseAnnotation,
        colour: {
          ...baseAnnotation.colour,
          interior: undefined,
        },
      };
      render(<AnnotationPropertyPanel annotation={unfilledAnnotation} crud={crud} />);

      vi.useFakeTimers();
      fireEvent.click(screen.getByTestId('fill-enabled-input'));
      act(() => {
        vi.runOnlyPendingTimers();
      });
      vi.useRealTimers();
      expect(crud.setAnnotationColour).toHaveBeenCalledWith(
        0,
        'interior',
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 255 },
        null,
      );
    });

    it('coalesces filled-shape stroke colour + opacity edits into one stroke commit plus one fill-opacity commit', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#00ff00' } });
      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.4' } });
      fireEvent.pointerUp(screen.getByTestId('opacity-input'));

      expect(crud.setAnnotationColour).toHaveBeenCalledTimes(2);
      expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
        1,
        0,
        'stroke',
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 255, b: 0, a: 102 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      );
      expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
        2,
        0,
        'interior',
        { r: 0, g: 0, b: 255, a: 255 },
        { r: 0, g: 0, b: 255, a: 102 },
        null,
      );
    });

    it('coalesces rapid filled-shape opacity slider changes into one stroke commit and one fill commit at pointer-up', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      const opacityInput = screen.getByTestId('opacity-input');
      fireEvent.change(opacityInput, { target: { value: '0.9' } });
      fireEvent.change(opacityInput, { target: { value: '0.6' } });
      fireEvent.change(opacityInput, { target: { value: '0.4' } });

      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
      fireEvent.pointerUp(opacityInput);

      expect(crud.setAnnotationColour).toHaveBeenCalledTimes(2);
      expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
        1,
        0,
        'stroke',
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 255, g: 0, b: 0, a: 102 },
        null,
      );
      expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
        2,
        0,
        'interior',
        { r: 0, g: 0, b: 255, a: 255 },
        { r: 0, g: 0, b: 255, a: 102 },
        null,
      );
    });

    it('debounces stroke colour commits while colour input is actively changing', () => {
      vi.useFakeTimers();
      try {
        const crud = createMockCrud();
        render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

        const strokeInput = screen.getByTestId('stroke-colour-input');
        fireEvent.change(strokeInput, { target: { value: '#00aa00' } });
        fireEvent.change(strokeInput, { target: { value: '#00bb00' } });
        fireEvent.change(strokeInput, { target: { value: '#00cc00' } });

        expect(crud.setAnnotationColour).not.toHaveBeenCalled();
        act(() => {
          vi.advanceTimersByTime(250);
        });

        expect(crud.setAnnotationColour).toHaveBeenCalledTimes(1);
        expect(crud.setAnnotationColour).toHaveBeenCalledWith(
          0,
          'stroke',
          { r: 255, g: 0, b: 0, a: 255 },
          { r: 0, g: 204, b: 0, a: 255 },
          { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('debounces filled-shape opacity commits when pointer-up is not emitted', () => {
      vi.useFakeTimers();
      try {
        const crud = createMockCrud();
        render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

        const opacityInput = screen.getByTestId('opacity-input');
        fireEvent.change(opacityInput, { target: { value: '0.9' } });
        fireEvent.change(opacityInput, { target: { value: '0.6' } });
        fireEvent.change(opacityInput, { target: { value: '0.4' } });

        expect(crud.setAnnotationColour).not.toHaveBeenCalled();
        act(() => {
          vi.advanceTimersByTime(250);
        });

        expect(crud.setAnnotationColour).toHaveBeenCalledTimes(2);
        expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
          1,
          0,
          'stroke',
          { r: 255, g: 0, b: 0, a: 255 },
          { r: 255, g: 0, b: 0, a: 102 },
          null,
        );
        expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
          2,
          0,
          'interior',
          { r: 0, g: 0, b: 255, a: 255 },
          { r: 0, g: 0, b: 255, a: 102 },
          null,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('persists both stroke and fill commits when both channels are edited before boundary commit', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#00ff00' } });
      fireEvent.change(screen.getByTestId('interior-colour-input'), { target: { value: '#ffff00' } });
      fireEvent.blur(screen.getByTestId('interior-colour-input'));

      expect(crud.setAnnotationColour).toHaveBeenCalledTimes(2);
      expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
        1,
        0,
        'stroke',
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 255, b: 0, a: 255 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      );
      expect(crud.setAnnotationColour).toHaveBeenNthCalledWith(
        2,
        0,
        'interior',
        { r: 0, g: 0, b: 255, a: 255 },
        { r: 255, g: 255, b: 0, a: 255 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      );
    });

    it('commits border width changes on blur', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);
      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.change(borderInput, { target: { value: '3' } });
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
      fireEvent.blur(borderInput);

      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
      );
    });

    it('publishes border preview while editing and clears preview on blur commit', async () => {
      const crud = createMockCrud();
      const onPreviewPatch = vi.fn();
      const onClearPreviewPatch = vi.fn();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(
        <AnnotationPropertyPanel
          annotation={annotationWithBorder}
          crud={crud}
          onPreviewPatch={onPreviewPatch}
          onClearPreviewPatch={onClearPreviewPatch}
        />,
      );
      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.change(borderInput, { target: { value: '3' } });

      expect(onPreviewPatch).toHaveBeenCalledWith(0, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
      });
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();

      fireEvent.blur(borderInput);
      await Promise.resolve();
      expect(onClearPreviewPatch).toHaveBeenCalledWith(0);
    });

    it('coalesces rapid border-width edits into one persisted commit on blur', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);

      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.change(borderInput, { target: { value: '2.5' } });
      fireEvent.change(borderInput, { target: { value: '4' } });
      fireEvent.change(borderInput, { target: { value: '2.5' } });
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
      fireEvent.blur(borderInput);

      expect(crud.setAnnotationBorder).toHaveBeenCalledTimes(1);
      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2.5 },
      );
    });

    it('coalesces browser-like input event bursts for border width into one commit', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);

      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.focus(borderInput);
      fireEvent.input(borderInput, { target: { value: '1.5' } });
      fireEvent.input(borderInput, { target: { value: '5' } });
      fireEvent.input(borderInput, { target: { value: '2.5' } });
      fireEvent.blur(borderInput);

      expect(crud.setAnnotationBorder).toHaveBeenCalledTimes(1);
      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2.5 },
      );
    });

    it('does not commit border width changes on pointer-up (commit happens on blur)', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);

      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.change(borderInput, { target: { value: '2.5' } });
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
      fireEvent.pointerUp(borderInput);
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
    });

    it('commits border width changes for synthetic shape borders when border is initially missing', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '4' } });
      fireEvent.blur(screen.getByTestId('border-width-input'));

      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
      );
    });

    it('does not call stroke mutation when colour is unchanged', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#ff0000' } });
      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
    });

    it('clamps border width input to max supported value', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '1000' } });
      fireEvent.blur(screen.getByTestId('border-width-input'));

      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 96 },
      );
    });

    it('flushes pending opacity commit on unmount', () => {
      vi.useFakeTimers();
      try {
        const crud = createMockCrud();
        const { unmount } = render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

        fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.4' } });
        expect(crud.setAnnotationColour).not.toHaveBeenCalled();

        unmount();
        expect(crud.setAnnotationColour).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('flushes pending border commit on unmount', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      const { unmount } = render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);

      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '4' } });
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();

      unmount();

      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
      );
    });

    it('does not persist colour changes when they are reverted before the commit boundary', () => {
      const crud = createMockCrud();
      const onClearPreviewPatch = vi.fn();
      render(
        <AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} onClearPreviewPatch={onClearPreviewPatch} />,
      );

      const strokeInput = screen.getByTestId('stroke-colour-input');
      fireEvent.change(strokeInput, { target: { value: '#00ff00' } });
      fireEvent.change(strokeInput, { target: { value: '#ff0000' } });
      fireEvent.blur(strokeInput);

      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
      expect(onClearPreviewPatch).toHaveBeenCalledWith(0);
    });

    it('does not persist border changes when they are reverted before blur', () => {
      const crud = createMockCrud();
      const onClearPreviewPatch = vi.fn();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(
        <AnnotationPropertyPanel
          annotation={annotationWithBorder}
          crud={crud}
          onClearPreviewPatch={onClearPreviewPatch}
        />,
      );

      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.focus(borderInput);
      fireEvent.change(borderInput, { target: { value: '4' } });
      fireEvent.change(borderInput, { target: { value: '1' } });
      fireEvent.blur(borderInput);

      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
      expect(onClearPreviewPatch).toHaveBeenCalledWith(0);
    });

    it('ignores non-finite opacity and border width edits', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: 'NaN' } });
      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: 'NaN' } });

      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
    });

    it('does not derive opacity changes from zero-width slider clicks', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      const opacity = screen.getByTestId('opacity-input');
      vi.spyOn(opacity, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        width: 0,
        height: 10,
        top: 0,
        left: 0,
        right: 0,
        bottom: 10,
        toJSON: () => ({}),
      });

      fireEvent.click(opacity, { clientX: 25 });

      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
    });

    it('does not flush style commits when focus stays inside the property panel', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      const strokeInput = screen.getByTestId('stroke-colour-input');
      const fillInput = screen.getByTestId('interior-colour-input');
      fireEvent.change(strokeInput, { target: { value: '#00ff00' } });
      fireEvent.blur(strokeInput, { relatedTarget: fillInput });

      expect(crud.setAnnotationColour).not.toHaveBeenCalled();

      fireEvent.blur(fillInput);
      expect(crud.setAnnotationColour).toHaveBeenCalledTimes(1);
    });

    it('updates redact opacity through the interior colour channel only', () => {
      const crud = createMockCrud();
      const redactAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Redact,
        colour: {
          stroke: undefined,
          interior: { r: 0, g: 0, b: 0, a: 255 },
        },
      };
      render(<AnnotationPropertyPanel annotation={redactAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.5' } });
      fireEvent.pointerUp(screen.getByTestId('opacity-input'));

      expect(crud.setAnnotationColour).toHaveBeenCalledTimes(1);
      expect(crud.setAnnotationColour).toHaveBeenCalledWith(
        0,
        'interior',
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 0, g: 0, b: 0, a: 128 },
        null,
      );
    });

    it('treats unchanged underline opacity edits as a no-op', () => {
      const crud = createMockCrud();
      const underlineAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Underline,
      };
      render(<AnnotationPropertyPanel annotation={underlineAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '1' } });

      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
    });
  });

  describe('tool preset syncing', () => {
    it('syncs circle tool preset for stroke, fill, and border width edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const circleAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Circle,
      };

      render(
        <AnnotationPropertyPanel annotation={circleAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#224466' } });
      fireEvent.change(screen.getByTestId('interior-colour-input'), { target: { value: '#335577' } });
      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '4' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('circle', {
        strokeColour: { r: 34, g: 68, b: 102, a: 255 },
      });
      expect(onToolConfigChange).toHaveBeenCalledWith('circle', {
        fillColour: { r: 51, g: 85, b: 119, a: 255 },
      });
      expect(onToolConfigChange).toHaveBeenCalledWith('circle', { strokeWidth: 4 });
    });

    it('syncs rectangle tool preset for stroke, fill, and border width edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      render(
        <AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#00ff00' } });
      fireEvent.click(screen.getByTestId('fill-enabled-input'));
      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '3' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', {
        strokeColour: { r: 0, g: 255, b: 0, a: 255 },
      });
      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', { fillColour: null });
      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', { strokeWidth: 3 });
    });

    it('syncs rectangle stroke preset when colour input emits an input event', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      render(
        <AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.input(screen.getByTestId('stroke-colour-input'), { target: { value: '#335577' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', {
        strokeColour: { r: 51, g: 85, b: 119, a: 255 },
      });
    });

    it('syncs rectangle fill preset when interior colour input emits an input event', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      render(
        <AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.input(screen.getByTestId('interior-colour-input'), { target: { value: '#224466' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', {
        fillColour: { r: 34, g: 68, b: 102, a: 255 },
      });
    });

    it('syncs rectangle opacity edits to both stroke and fill presets', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      render(
        <AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.5' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', {
        strokeColour: { r: 255, g: 0, b: 0, a: 128 },
      });
      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', {
        fillColour: { r: 0, g: 0, b: 255, a: 128 },
      });
    });

    it('re-enabling rectangle fill reuses the current shape opacity', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      render(
        <AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.click(screen.getByTestId('fill-enabled-input'));
      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.4' } });
      fireEvent.click(screen.getByTestId('fill-enabled-input'));

      expect(onToolConfigChange).toHaveBeenCalledWith('rectangle', {
        fillColour: { r: 0, g: 0, b: 255, a: 102 },
      });
    });

    it('syncs highlight preset for colour and opacity edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const highlightAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Highlight,
        colour: {
          stroke: undefined,
          interior: { r: 255, g: 255, b: 0, a: 128 },
        },
      };

      render(
        <AnnotationPropertyPanel
          annotation={highlightAnnotation}
          crud={crud}
          onToolConfigChange={onToolConfigChange}
        />,
      );

      fireEvent.change(screen.getByTestId('interior-colour-input'), { target: { value: '#00ff00' } });
      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.2' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('highlight', {
        colour: { r: 0, g: 255, b: 0, a: 255 },
        opacity: 128 / 255,
      });
      const highlightCalls = onToolConfigChange.mock.calls
        .filter(([tool]) => tool === 'highlight')
        .map(([, config]) => config as { opacity?: number });
      expect(highlightCalls.some((config) => Math.abs((config.opacity ?? -1) - 0.2) < 0.01)).toBe(true);
    });

    it('treats line-fallback ink annotations as line presets for style syncing', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const lineFallbackAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Ink,
        lineFallback: true,
        inkPaths: [
          [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        ],
      };
      render(
        <AnnotationPropertyPanel
          annotation={lineFallbackAnnotation}
          crud={crud}
          onToolConfigChange={onToolConfigChange}
        />,
      );

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#123456' } });
      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '4' } });
      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.5' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('line', { strokeColour: { r: 18, g: 52, b: 86, a: 255 } });
      expect(onToolConfigChange).toHaveBeenCalledWith('line', { strokeWidth: 4 });
      expect(onToolConfigChange).toHaveBeenCalledWith('line', { strokeColour: { r: 18, g: 52, b: 86, a: 128 } });
    });

    it('syncs redact fill colour preset on interior edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const redactAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Redact,
        colour: {
          stroke: undefined,
          interior: { r: 0, g: 0, b: 0, a: 255 },
        },
      };
      render(
        <AnnotationPropertyPanel annotation={redactAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.change(screen.getByTestId('interior-colour-input'), { target: { value: '#112233' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('redact', {
        fillColour: { r: 17, g: 34, b: 51, a: 255 },
      });
    });

    it('syncs freetext colour preset on stroke edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const freetextAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.FreeText,
      };

      render(
        <AnnotationPropertyPanel annotation={freetextAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#123456' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('freetext', {
        colour: { r: 18, g: 52, b: 86, a: 255 },
      });
    });

    it('syncs underline preset for colour and opacity edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const underlineAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Underline,
      };

      render(
        <AnnotationPropertyPanel
          annotation={underlineAnnotation}
          crud={crud}
          onToolConfigChange={onToolConfigChange}
        />,
      );

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#224466' } });
      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.25' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('underline', {
        colour: { r: 34, g: 68, b: 102, a: 255 },
        opacity: 1,
      });
      expect(onToolConfigChange).toHaveBeenCalledWith('underline', {
        opacity: 64 / 255,
      });
    });

    it('syncs strikeout preset for colour and opacity edits', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const strikeoutAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Strikeout,
      };

      render(
        <AnnotationPropertyPanel
          annotation={strikeoutAnnotation}
          crud={crud}
          onToolConfigChange={onToolConfigChange}
        />,
      );

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#884422' } });
      fireEvent.change(screen.getByTestId('opacity-input'), { target: { value: '0.5' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('strikeout', {
        colour: { r: 136, g: 68, b: 34, a: 255 },
        opacity: 1,
      });
      expect(onToolConfigChange).toHaveBeenCalledWith('strikeout', {
        opacity: 128 / 255,
      });
    });

    it('clamps ink preset stroke width to the minimum supported value', () => {
      const crud = createMockCrud();
      const onToolConfigChange = vi.fn();
      const inkAnnotation = {
        ...baseAnnotation,
        type: AnnotationType.Ink,
      };

      render(
        <AnnotationPropertyPanel annotation={inkAnnotation} crud={crud} onToolConfigChange={onToolConfigChange} />,
      );

      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '0' } });

      expect(onToolConfigChange).toHaveBeenCalledWith('ink', {
        strokeWidth: 0.25,
      });
    });
  });

  describe('atomic style commits', () => {
    it('flushes pending style edits through crud.setAnnotationStyle when available', () => {
      const crud = {
        ...createMockCrud(),
        setAnnotationStyle: vi.fn().mockResolvedValue(undefined),
      } satisfies AnnotationCrudActions;
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };

      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#00ff00' } });
      fireEvent.change(screen.getByTestId('interior-colour-input'), { target: { value: '#ffff00' } });
      fireEvent.change(screen.getByTestId('border-width-input'), { target: { value: '4' } });
      fireEvent.blur(screen.getByTestId('border-width-input'));

      expect(crud.setAnnotationStyle).toHaveBeenCalledTimes(1);
      expect(crud.setAnnotationStyle).toHaveBeenCalledWith(0, {
        stroke: {
          colourType: 'stroke',
          oldColour: { r: 255, g: 0, b: 0, a: 255 },
          newColour: { r: 0, g: 255, b: 0, a: 255 },
          preserveBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
        },
        interior: {
          colourType: 'interior',
          oldColour: { r: 0, g: 0, b: 255, a: 255 },
          newColour: { r: 255, g: 255, b: 0, a: 255 },
          preserveBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
        },
        border: {
          oldBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
          newBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
        },
      });
      expect(crud.setAnnotationColour).not.toHaveBeenCalled();
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
    });

    it('flushes pending style edits from the global commit event', () => {
      const crud = {
        ...createMockCrud(),
        setAnnotationStyle: vi.fn().mockResolvedValue(undefined),
      } satisfies AnnotationCrudActions;

      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);

      fireEvent.change(screen.getByTestId('stroke-colour-input'), { target: { value: '#00ff00' } });
      fireEvent.change(screen.getByTestId('interior-colour-input'), { target: { value: '#ffff00' } });

      act(() => {
        globalThis.dispatchEvent(new Event('pdfium-editor-flush-pending-commits'));
      });

      expect(crud.setAnnotationStyle).toHaveBeenCalledTimes(1);
      expect(crud.setAnnotationStyle).toHaveBeenCalledWith(0, {
        stroke: {
          colourType: 'stroke',
          oldColour: { r: 255, g: 0, b: 0, a: 255 },
          newColour: { r: 0, g: 255, b: 0, a: 255 },
          preserveBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        },
        interior: {
          colourType: 'interior',
          oldColour: { r: 0, g: 0, b: 255, a: 255 },
          newColour: { r: 255, g: 255, b: 0, a: 255 },
          preserveBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        },
      });
    });
  });

  describe('string change interactions', () => {
    it('does not commit contents on change — only updates local state', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('contents-input'), { target: { value: 'Updated contents' } });
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('commits contents on blur when value differs', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('contents-input'), { target: { value: 'Updated contents' } });
      fireEvent.blur(screen.getByTestId('contents-input'));
      expect(crud.setAnnotationString).toHaveBeenCalledWith(0, 'Contents', 'Hello world', 'Updated contents');
    });

    it('does not commit contents on blur when value is unchanged', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.blur(screen.getByTestId('contents-input'));
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('does not commit author on change — only updates local state', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('author-input'), { target: { value: 'Jane Smith' } });
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('commits author on blur when value differs', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('author-input'), { target: { value: 'Jane Smith' } });
      fireEvent.blur(screen.getByTestId('author-input'));
      expect(crud.setAnnotationString).toHaveBeenCalledWith(0, 'T', 'John Doe', 'Jane Smith');
    });

    it('does not commit author on blur when value is unchanged', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.blur(screen.getByTestId('author-input'));
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('does not commit subject on change — only updates local state', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('subject-input'), { target: { value: 'New subject' } });
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('commits subject on blur when value differs', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.change(screen.getByTestId('subject-input'), { target: { value: 'New subject' } });
      fireEvent.blur(screen.getByTestId('subject-input'));
      expect(crud.setAnnotationString).toHaveBeenCalledWith(0, 'Subj', 'Test subject', 'New subject');
    });

    it('does not commit subject on blur when value is unchanged', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      fireEvent.blur(screen.getByTestId('subject-input'));
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('Escape in contents restores original value and avoids commit', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const contents = screen.getByTestId('contents-input') as HTMLTextAreaElement;

      fireEvent.change(contents, { target: { value: 'Changed then canceled' } });
      contents.focus();
      fireEvent.keyDown(contents, { key: 'Escape' });

      expect(contents.value).toBe('Hello world');
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('Escape in author restores original value and avoids commit', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const author = screen.getByTestId('author-input') as HTMLInputElement;

      fireEvent.change(author, { target: { value: 'Changed then canceled' } });
      author.focus();
      fireEvent.keyDown(author, { key: 'Escape' });

      expect(author.value).toBe('John Doe');
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('Escape in subject restores original value and avoids commit', () => {
      const crud = createMockCrud();
      render(<AnnotationPropertyPanel annotation={baseAnnotation} crud={crud} />);
      const subject = screen.getByTestId('subject-input') as HTMLInputElement;

      fireEvent.change(subject, { target: { value: 'Changed then canceled' } });
      subject.focus();
      fireEvent.keyDown(subject, { key: 'Escape' });

      expect(subject.value).toBe('Test subject');
      expect(crud.setAnnotationString).not.toHaveBeenCalled();
    });

    it('commits the current border width when Enter is pressed', () => {
      const crud = createMockCrud();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      };
      render(<AnnotationPropertyPanel annotation={annotationWithBorder} crud={crud} />);

      const borderInput = screen.getByTestId('border-width-input');
      fireEvent.focus(borderInput);
      fireEvent.change(borderInput, { target: { value: '3' } });
      fireEvent.keyDown(borderInput, { key: 'Enter' });
      fireEvent.blur(borderInput);

      expect(crud.setAnnotationBorder).toHaveBeenCalledWith(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
      );
    });

    it('cancels border width edits on Escape and restores the persisted value', () => {
      const crud = createMockCrud();
      const onClearPreviewPatch = vi.fn();
      const annotationWithBorder = {
        ...baseAnnotation,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      };
      render(
        <AnnotationPropertyPanel
          annotation={annotationWithBorder}
          crud={crud}
          onClearPreviewPatch={onClearPreviewPatch}
        />,
      );

      const borderInput = screen.getByTestId('border-width-input') as HTMLInputElement;
      fireEvent.focus(borderInput);
      fireEvent.change(borderInput, { target: { value: '5' } });
      fireEvent.keyDown(borderInput, { key: 'Escape' });

      expect(borderInput.value).toBe('2');
      expect(crud.setAnnotationBorder).not.toHaveBeenCalled();
      expect(onClearPreviewPatch).toHaveBeenCalledWith(0);
    });
  });
});
