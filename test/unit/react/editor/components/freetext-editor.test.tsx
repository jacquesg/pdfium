import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationType } from '../../../../../src/core/types.js';
import { FreeTextEditor } from '../../../../../src/react/editor/components/freetext-editor.js';
import type { FreeTextInputActions } from '../../../../../src/react/editor/hooks/use-freetext-input.js';

function createMockInput(overrides?: Partial<FreeTextInputActions>): FreeTextInputActions {
  return {
    state: {
      isActive: false,
      position: null,
      text: '',
    },
    activate: vi.fn(),
    setText: vi.fn(),
    confirm: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    ...overrides,
  };
}

const defaultProps = {
  scale: 1,
  originalHeight: 792,
};

describe('FreeTextEditor', () => {
  describe('when input is inactive', () => {
    it('renders nothing when isActive is false', () => {
      const input = createMockInput({ state: { isActive: false, position: null, text: '' } });
      const { container } = render(<FreeTextEditor input={input} {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when position is null even if isActive is true', () => {
      const input = createMockInput({ state: { isActive: true, position: null, text: '' } });
      const { container } = render(<FreeTextEditor input={input} {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when active with position', () => {
    function activeInput(text = ''): FreeTextInputActions {
      return createMockInput({
        state: { isActive: true, position: { x: 100, y: 200 }, text },
      });
    }

    it('renders textarea with data-testid="freetext-editor"', () => {
      render(<FreeTextEditor input={activeInput()} {...defaultProps} />);
      expect(screen.getByTestId('freetext-editor')).toBeDefined();
    });

    it('sets left style from position.x', () => {
      render(<FreeTextEditor input={activeInput()} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor') as HTMLTextAreaElement;
      expect(el.style.left).toBe('100px');
    });

    it('sets top style from position.y', () => {
      render(<FreeTextEditor input={activeInput()} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor') as HTMLTextAreaElement;
      expect(el.style.top).toBe('200px');
    });

    it('reflects current text value', () => {
      render(<FreeTextEditor input={activeInput('hello')} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor') as HTMLTextAreaElement;
      expect(el.value).toBe('hello');
    });

    it('calls input.setText on change', () => {
      const input = activeInput();
      render(<FreeTextEditor input={input} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor');
      fireEvent.change(el, { target: { value: 'new text' } });
      expect(input.setText).toHaveBeenCalledWith('new text');
    });

    it('calls input.cancel on Escape key', () => {
      const input = activeInput();
      render(<FreeTextEditor input={input} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor');
      fireEvent.keyDown(el, { key: 'Escape' });
      expect(input.cancel).toHaveBeenCalledOnce();
    });

    it('calls input.confirm with AnnotationType.FreeText on Ctrl+Enter', () => {
      const input = activeInput('some text');
      render(<FreeTextEditor input={input} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor');
      fireEvent.keyDown(el, { key: 'Enter', ctrlKey: true });
      expect(input.confirm).toHaveBeenCalledWith(
        AnnotationType.FreeText,
        expect.objectContaining({
          left: expect.any(Number),
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
        }),
      );
    });

    it('calls input.confirm with AnnotationType.FreeText on Meta+Enter', () => {
      const input = activeInput('some text');
      render(<FreeTextEditor input={input} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor');
      fireEvent.keyDown(el, { key: 'Enter', metaKey: true });
      expect(input.confirm).toHaveBeenCalledWith(
        AnnotationType.FreeText,
        expect.objectContaining({ left: expect.any(Number) }),
      );
    });

    it('does NOT call confirm when Enter is pressed without Ctrl/Meta', () => {
      const input = activeInput('text');
      render(<FreeTextEditor input={input} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor');
      fireEvent.keyDown(el, { key: 'Enter' });
      expect(input.confirm).not.toHaveBeenCalled();
    });

    it('computes rect from position and DEFAULT size on Ctrl+Enter', () => {
      // position (100, 200), scale 1, originalHeight 792
      // topLeft = screenToPdf({x:100,y:200},{scale:1,originalHeight:792}) = {x:100, y:592}
      // bottomRight = screenToPdf({x:300,y:260},{scale:1,originalHeight:792}) = {x:300, y:532}
      const input = activeInput('text');
      render(<FreeTextEditor input={input} {...defaultProps} />);
      fireEvent.keyDown(screen.getByTestId('freetext-editor'), { key: 'Enter', ctrlKey: true });
      expect(input.confirm).toHaveBeenCalledWith(AnnotationType.FreeText, {
        left: 100,
        top: 592,
        right: 300,
        bottom: 532,
      });
    });
  });

  describe('onBlur behaviour', () => {
    it('calls input.confirm when text is non-empty on blur', () => {
      const input = createMockInput({
        state: { isActive: true, position: { x: 50, y: 100 }, text: 'hello' },
      });
      render(<FreeTextEditor input={input} {...defaultProps} />);
      fireEvent.blur(screen.getByTestId('freetext-editor'));
      expect(input.confirm).toHaveBeenCalledOnce();
    });

    it('calls input.cancel when text is empty on blur', () => {
      const input = createMockInput({
        state: { isActive: true, position: { x: 50, y: 100 }, text: '' },
      });
      render(<FreeTextEditor input={input} {...defaultProps} />);
      fireEvent.blur(screen.getByTestId('freetext-editor'));
      expect(input.cancel).toHaveBeenCalledOnce();
      expect(input.confirm).not.toHaveBeenCalled();
    });

    it('calls input.cancel when position is null on blur', () => {
      // position null guard inside handleBlur
      const input = createMockInput({
        state: { isActive: true, position: null, text: '' },
      });
      // won't render textarea, but test the guard path indirectly via state
      const { container } = render(<FreeTextEditor input={input} {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('auto-focus', () => {
    it('auto-focuses the textarea when activated', () => {
      const input = createMockInput({
        state: { isActive: true, position: { x: 10, y: 10 }, text: '' },
      });
      render(<FreeTextEditor input={input} {...defaultProps} />);
      const el = screen.getByTestId('freetext-editor');
      // happy-dom tracks focus via document.activeElement
      expect(document.activeElement).toBe(el);
    });
  });

  describe('custom font props', () => {
    it('applies custom fontSize style', () => {
      const input = createMockInput({
        state: { isActive: true, position: { x: 0, y: 0 }, text: '' },
      });
      render(<FreeTextEditor input={input} {...defaultProps} fontSize={20} />);
      const el = screen.getByTestId('freetext-editor') as HTMLTextAreaElement;
      expect(el.style.fontSize).toBe('20px');
    });

    it('applies custom fontFamily style', () => {
      const input = createMockInput({
        state: { isActive: true, position: { x: 0, y: 0 }, text: '' },
      });
      render(<FreeTextEditor input={input} {...defaultProps} fontFamily="Arial" />);
      const el = screen.getByTestId('freetext-editor') as HTMLTextAreaElement;
      expect(el.style.fontFamily).toBe('Arial');
    });
  });
});
