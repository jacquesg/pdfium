import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorToolbar } from '../../../../../src/react/editor/components/editor-toolbar.js';

const mockSetActiveTool = vi.fn();
const mockTriggerMarkupAction = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockViewerSetMode = vi.fn();

let mockActiveTool = 'idle';
let mockCanUndo = true;
let mockCanRedo = true;
let mockViewerMode: 'pointer' | 'pan' | 'marquee-zoom' = 'pointer';
let hasViewerContext = false;

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    activeTool: mockActiveTool,
    setActiveTool: mockSetActiveTool,
    triggerMarkupAction: mockTriggerMarkupAction,
    canUndo: mockCanUndo,
    canRedo: mockCanRedo,
    undo: mockUndo,
    redo: mockRedo,
  }),
}));

vi.mock('../../../../../src/react/components/pdf-viewer-context.js', () => ({
  usePDFViewerOptional: () =>
    hasViewerContext
      ? {
          viewer: {
            interaction: {
              mode: mockViewerMode,
              setMode: mockViewerSetMode,
            },
          },
        }
      : null,
}));

describe('EditorToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewerMode = 'pointer';
    hasViewerContext = false;
  });

  it('renders all tool buttons', () => {
    mockActiveTool = 'idle';
    mockCanUndo = true;
    mockCanRedo = true;

    render(<EditorToolbar />);

    const tools = [
      'freetext',
      'highlight',
      'underline',
      'strikeout',
      'ink',
      'rectangle',
      'circle',
      'line',
      'stamp',
      'redact',
    ];
    for (const tool of tools) {
      expect(screen.getByTestId(`tool-${tool}`)).toBeDefined();
    }
  });

  it('active tool has aria-pressed true', () => {
    mockActiveTool = 'ink';
    mockCanUndo = true;
    mockCanRedo = true;

    render(<EditorToolbar />);

    const inkButton = screen.getByTestId('tool-ink');
    expect(inkButton.getAttribute('aria-pressed')).toBe('true');

    const rectangleButton = screen.getByTestId('tool-rectangle');
    expect(rectangleButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('markup buttons behave as one-shot actions (not pressed)', () => {
    mockActiveTool = 'idle';
    mockCanUndo = true;
    mockCanRedo = true;

    render(<EditorToolbar />);

    const highlightButton = screen.getByTestId('tool-highlight');
    expect(highlightButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('undo button disabled when canUndo is false', () => {
    mockActiveTool = 'idle';
    mockCanUndo = false;
    mockCanRedo = true;

    render(<EditorToolbar />);

    const undoButton = screen.getByTestId('undo-button') as HTMLButtonElement;
    expect(undoButton.disabled).toBe(true);
  });

  it('redo button disabled when canRedo is false', () => {
    mockActiveTool = 'idle';
    mockCanUndo = true;
    mockCanRedo = false;

    render(<EditorToolbar />);

    const redoButton = screen.getByTestId('redo-button') as HTMLButtonElement;
    expect(redoButton.disabled).toBe(true);
  });

  it('clicking a markup tool exits active drawing mode and triggers one-shot action', () => {
    mockActiveTool = 'rectangle';
    mockCanUndo = true;
    mockCanRedo = true;

    render(<EditorToolbar />);

    fireEvent.click(screen.getByTestId('tool-highlight'));

    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
    expect(mockTriggerMarkupAction).toHaveBeenCalledWith('highlight');
  });

  it('activating a tool from non-pointer viewer mode requests pointer mode first', () => {
    mockActiveTool = 'idle';
    mockCanUndo = true;
    mockCanRedo = true;
    hasViewerContext = true;
    mockViewerMode = 'pan';

    render(<EditorToolbar />);
    fireEvent.click(screen.getByTestId('tool-rectangle'));

    expect(mockViewerSetMode).toHaveBeenCalledWith('pointer');
    expect(mockSetActiveTool).toHaveBeenCalledWith('rectangle');
  });
});
