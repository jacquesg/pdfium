import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextCharactersPane, TextExtractionPane } from '../../../../src/react/internal/text-panel-view.js';

describe('text-panel-view', () => {
  it('renders character hover instructions and page summary when no character is selected', () => {
    render(
      <TextCharactersPane charDetail={null} pageIndex={0} dimensions={[{ width: 612, height: 792 }]} scale={1.5} />,
    );

    expect(screen.getByText(/Hover over a character/)).toBeDefined();
    expect(screen.getByText('Page 1: 612 x 792 pt @ 1.50x')).toBeDefined();
  });

  it('keeps coordinate value stable when invalid input is entered', () => {
    const setLeft = vi.fn();

    render(
      <TextExtractionPane
        fullText="hello"
        left={10}
        top={0}
        right={20}
        bottom={30}
        setLeft={setLeft}
        setTop={vi.fn()}
        setRight={vi.fn()}
        setBottom={vi.fn()}
        onExtract={vi.fn()}
        onCoordKeyDown={vi.fn()}
        extractError={null}
        extractedRect={null}
        hasDocument
      />,
    );

    fireEvent.change(screen.getByLabelText('Left coordinate'), { target: { value: 'invalid' } });

    expect(setLeft).toHaveBeenCalledWith(10);
  });

  it('shows empty extraction placeholder when extraction result is an empty string', () => {
    render(
      <TextExtractionPane
        fullText=""
        left={0}
        top={0}
        right={0}
        bottom={0}
        setLeft={vi.fn()}
        setTop={vi.fn()}
        setRight={vi.fn()}
        setBottom={vi.fn()}
        onExtract={vi.fn()}
        onCoordKeyDown={vi.fn()}
        extractError={null}
        extractedRect=""
        hasDocument
      />,
    );

    expect(screen.getByText('(empty result)')).toBeDefined();
  });

  it('renders selected character details with pinned badge', () => {
    render(
      <TextCharactersPane
        charDetail={{
          isPinned: true,
          charInfo: {
            index: 2,
            unicode: 65,
            char: 'A',
            fontName: null,
            fontSize: 12,
            fontWeight: 400,
            angle: 0,
            renderMode: 0,
            originX: 0,
            originY: 0,
            isGenerated: false,
            isHyphen: false,
            isUnmapped: false,
            fillColour: { r: 10, g: 20, b: 30, a: 255 },
          } as never,
          charBox: { left: 1, bottom: 2, right: 3, top: 4 },
        }}
        pageIndex={0}
        dimensions={[{ width: 612, height: 792 }]}
        scale={1}
      />,
    );

    expect(screen.getByText('Pinned')).toBeDefined();
    expect(screen.getByText('Index')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('hides page summary when dimensions for current page are unavailable', () => {
    render(<TextCharactersPane charDetail={null} pageIndex={1} dimensions={[{ width: 612, height: 792 }]} scale={2} />);

    expect(screen.getByText(/Hover over a character/)).toBeDefined();
    expect(screen.queryByText(/Page 2:/)).toBeNull();
  });

  it('renders extraction result and extraction call metadata', () => {
    render(
      <TextExtractionPane
        fullText="abcdef"
        left={1}
        top={2}
        right={3}
        bottom={4}
        setLeft={vi.fn()}
        setTop={vi.fn()}
        setRight={vi.fn()}
        setBottom={vi.fn()}
        onExtract={vi.fn()}
        onCoordKeyDown={vi.fn()}
        extractError={null}
        extractedRect="inside"
        hasDocument
      />,
    );

    expect(screen.getByText('inside')).toBeDefined();
    expect(screen.getByText('getTextInRect(1, 2, 3, 4)')).toBeDefined();
  });

  it('renders extraction error and disables extract when no document is present', () => {
    render(
      <TextExtractionPane
        fullText=""
        left={0}
        top={0}
        right={0}
        bottom={0}
        setLeft={vi.fn()}
        setTop={vi.fn()}
        setRight={vi.fn()}
        setBottom={vi.fn()}
        onExtract={vi.fn()}
        onCoordKeyDown={vi.fn()}
        extractError="Extraction failed"
        extractedRect="ignored"
        hasDocument={false}
      />,
    );

    expect(screen.getByText('Extraction failed')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Extract' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText('ignored')).toBeNull();
  });

  it('forwards keyboard events from coordinate inputs', () => {
    const onCoordKeyDown = vi.fn();
    render(
      <TextExtractionPane
        fullText=""
        left={0}
        top={0}
        right={0}
        bottom={0}
        setLeft={vi.fn()}
        setTop={vi.fn()}
        setRight={vi.fn()}
        setBottom={vi.fn()}
        onExtract={vi.fn()}
        onCoordKeyDown={onCoordKeyDown}
        extractError={null}
        extractedRect={null}
        hasDocument
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Left coordinate'), { key: 'Enter' });
    expect(onCoordKeyDown).toHaveBeenCalledOnce();
  });
});
