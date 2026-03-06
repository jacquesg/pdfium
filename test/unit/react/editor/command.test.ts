import { describe, expect, it, vi } from 'vitest';
import type { SerialisedAnnotation } from '../../../../src/context/protocol.js';
import type { WorkerPDFiumPage } from '../../../../src/context/worker-client.js';
import { ActionType, AnnotationType } from '../../../../src/core/types.js';
import { LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE } from '../../../../src/internal/annotation-markers.js';
import {
  ApplyRedactionsCommand,
  CommandStack,
  CompositeCommand,
  CreateAnnotationCommand,
  DeletePageCommand,
  type EditorCommand,
  InsertBlankPageCommand,
  MovePageCommand,
  RemoveAnnotationCommand,
  SetAnnotationBorderCommand,
  SetAnnotationColourCommand,
  SetAnnotationRectCommand,
  SetAnnotationStringCommand,
  SetAnnotationStyleCommand,
} from '../../../../src/react/editor/command.js';

function createMockCommand(description = 'test'): EditorCommand & {
  executeFn: ReturnType<typeof vi.fn>;
  undoFn: ReturnType<typeof vi.fn>;
} {
  const executeFn = vi.fn();
  const undoFn = vi.fn();
  return {
    description,
    execute: executeFn,
    undo: undoFn,
    executeFn,
    undoFn,
  };
}

describe('CommandStack', () => {
  it('starts empty with no undo/redo available', () => {
    const stack = new CommandStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.isDirty).toBe(false);
    expect(stack.size).toBe(0);
  });

  it('push executes the command and enables undo', async () => {
    const stack = new CommandStack();
    const cmd = createMockCommand();

    await stack.push(cmd);

    expect(cmd.executeFn).toHaveBeenCalledOnce();
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
    expect(stack.size).toBe(1);
  });

  it('undo reverses the most recent command', async () => {
    const stack = new CommandStack();
    const cmd = createMockCommand();

    await stack.push(cmd);
    await stack.undo();

    expect(cmd.undoFn).toHaveBeenCalledOnce();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it('redo replays an undone command', async () => {
    const stack = new CommandStack();
    const cmd = createMockCommand();

    await stack.push(cmd);
    await stack.undo();
    await stack.redo();

    expect(cmd.executeFn).toHaveBeenCalledTimes(2);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it('push truncates redo history', async () => {
    const stack = new CommandStack();
    const cmd1 = createMockCommand('first');
    const cmd2 = createMockCommand('second');
    const cmd3 = createMockCommand('third');

    await stack.push(cmd1);
    await stack.push(cmd2);
    await stack.undo(); // undo cmd2
    await stack.push(cmd3); // should truncate cmd2 from redo

    expect(stack.canRedo).toBe(false);
    expect(stack.size).toBe(2); // cmd1 + cmd3
  });

  it('coalesces rapid colour edits into a single undoable command', async () => {
    const stack = new CommandStack();
    const page = createMockPage();
    const getPage = async () => page;
    const oldColour = { r: 0, g: 0, b: 0, a: 255 };
    const midColour = { r: 0, g: 0, b: 0, a: 180 };
    const newColour = { r: 0, g: 0, b: 0, a: 102 };

    await stack.push(new SetAnnotationColourCommand(getPage, 0, 'stroke', oldColour, midColour));
    await stack.push(new SetAnnotationColourCommand(getPage, 0, 'stroke', midColour, newColour));

    expect(stack.size).toBe(1);
    expect(stack.canUndo).toBe(true);

    await stack.undo();
    expect(page.setAnnotationColour).toHaveBeenLastCalledWith(0, 'stroke', oldColour);
  });

  it('does not coalesce edits outside the coalesce time window', async () => {
    const stack = new CommandStack();
    const page = createMockPage();
    const getPage = async () => page;
    const first = { r: 0, g: 0, b: 0, a: 255 };
    const second = { r: 0, g: 0, b: 0, a: 200 };
    const third = { r: 0, g: 0, b: 0, a: 120 };
    let nowCalls = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      nowCalls += 1;
      return nowCalls === 1 ? 1_000 : 1_600;
    });

    try {
      await stack.push(new SetAnnotationColourCommand(getPage, 0, 'stroke', first, second));
      await stack.push(new SetAnnotationColourCommand(getPage, 0, 'stroke', second, third));
    } finally {
      nowSpy.mockRestore();
    }

    expect(stack.size).toBe(2);
  });

  it('serializes concurrent push calls to preserve execution order', async () => {
    const stack = new CommandStack();
    const first = createMockCommand('first');
    const second = createMockCommand('second');

    let releaseFirst = () => {};
    first.executeFn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = () => {
            resolve();
          };
        }),
    );

    const firstPush = stack.push(first);
    const secondPush = stack.push(second);

    await Promise.resolve();
    expect(second.executeFn).not.toHaveBeenCalled();

    releaseFirst();
    await Promise.all([firstPush, secondPush]);

    expect(first.executeFn).toHaveBeenCalledOnce();
    expect(second.executeFn).toHaveBeenCalledOnce();
    expect(stack.size).toBe(2);

    await stack.undo();
    expect(second.undoFn).toHaveBeenCalledOnce();
  });

  it('multiple undo/redo traverses the full stack', async () => {
    const stack = new CommandStack();
    const cmd1 = createMockCommand('first');
    const cmd2 = createMockCommand('second');
    const cmd3 = createMockCommand('third');

    await stack.push(cmd1);
    await stack.push(cmd2);
    await stack.push(cmd3);

    await stack.undo(); // undo cmd3
    await stack.undo(); // undo cmd2
    expect(stack.canUndo).toBe(true); // cmd1 still undoable

    await stack.undo(); // undo cmd1
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);

    await stack.redo(); // redo cmd1
    await stack.redo(); // redo cmd2
    await stack.redo(); // redo cmd3
    expect(stack.canRedo).toBe(false);
  });

  it('evicts oldest command when max size is exceeded', async () => {
    const stack = new CommandStack(3);
    const cmds = Array.from({ length: 4 }, (_, i) => createMockCommand(`cmd${String(i)}`));

    for (const cmd of cmds) {
      await stack.push(cmd);
    }

    expect(stack.size).toBe(3);
    // After undo 3 times, should not be able to undo the evicted first command
    await stack.undo();
    await stack.undo();
    await stack.undo();
    expect(stack.canUndo).toBe(false);
  });

  it('undo does nothing when stack is empty', async () => {
    const stack = new CommandStack();
    await stack.undo(); // should not throw
    expect(stack.canUndo).toBe(false);
  });

  it('redo does nothing when no redo available', async () => {
    const stack = new CommandStack();
    await stack.redo(); // should not throw
    expect(stack.canRedo).toBe(false);
  });

  describe('dirty state', () => {
    it('is clean initially', () => {
      const stack = new CommandStack();
      expect(stack.isDirty).toBe(false);
    });

    it('is dirty after pushing a command', async () => {
      const stack = new CommandStack();
      await stack.push(createMockCommand());
      expect(stack.isDirty).toBe(true);
    });

    it('is clean after markClean', async () => {
      const stack = new CommandStack();
      await stack.push(createMockCommand());
      stack.markClean();
      expect(stack.isDirty).toBe(false);
    });

    it('is dirty after undo past clean point', async () => {
      const stack = new CommandStack();
      await stack.push(createMockCommand());
      stack.markClean();
      await stack.undo();
      expect(stack.isDirty).toBe(true);
    });

    it('is clean again after redo to clean point', async () => {
      const stack = new CommandStack();
      await stack.push(createMockCommand());
      stack.markClean();
      await stack.undo();
      await stack.redo();
      expect(stack.isDirty).toBe(false);
    });

    it('is dirty after pushing a new command past clean point', async () => {
      const stack = new CommandStack();
      await stack.push(createMockCommand());
      stack.markClean();
      await stack.push(createMockCommand());
      expect(stack.isDirty).toBe(true);
    });

    it('is dirty when redo truncation removes the clean snapshot', async () => {
      const stack = new CommandStack();
      await stack.push(createMockCommand('first'));
      await stack.push(createMockCommand('second'));
      stack.markClean();

      await stack.undo();
      await stack.push(createMockCommand('replacement'));

      expect(stack.canRedo).toBe(false);
      expect(stack.isDirty).toBe(true);
    });

    it('is dirty when command coalescing overwrites the clean snapshot', async () => {
      const stack = new CommandStack();
      const page = createMockPage();
      const getPage = async () => page;
      const first = { r: 0, g: 0, b: 0, a: 255 };
      const second = { r: 0, g: 0, b: 0, a: 200 };
      const third = { r: 0, g: 0, b: 0, a: 120 };

      await stack.push(new SetAnnotationColourCommand(getPage, 0, 'stroke', first, second));
      stack.markClean();

      await stack.push(new SetAnnotationColourCommand(getPage, 0, 'stroke', second, third));

      expect(stack.size).toBe(1);
      expect(stack.isDirty).toBe(true);
    });

    it('stays dirty when clean snapshot is evicted from bounded history', async () => {
      const stack = new CommandStack(2);
      await stack.push(createMockCommand('saved'));
      stack.markClean();
      await stack.push(createMockCommand('second'));
      await stack.push(createMockCommand('third')); // evicts saved

      expect(stack.isDirty).toBe(true);

      await stack.undo();
      await stack.undo();
      expect(stack.canUndo).toBe(false);
      expect(stack.isDirty).toBe(true);
    });
  });

  it('clear resets the stack', async () => {
    const stack = new CommandStack();
    await stack.push(createMockCommand());
    await stack.push(createMockCommand());
    stack.clear();

    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.isDirty).toBe(false);
    expect(stack.size).toBe(0);
  });
});

describe('CompositeCommand', () => {
  it('executes all sub-commands in order', async () => {
    const order: number[] = [];
    const cmd1: EditorCommand = {
      description: 'first',
      execute: async () => {
        order.push(1);
      },
      undo: async () => {
        order.push(-1);
      },
    };
    const cmd2: EditorCommand = {
      description: 'second',
      execute: async () => {
        order.push(2);
      },
      undo: async () => {
        order.push(-2);
      },
    };

    const composite = new CompositeCommand('batch', [cmd1, cmd2]);
    await composite.execute();

    expect(order).toEqual([1, 2]);
  });

  it('undoes sub-commands in reverse order', async () => {
    const order: number[] = [];
    const cmd1: EditorCommand = {
      description: 'first',
      execute: vi.fn(),
      undo: async () => {
        order.push(1);
      },
    };
    const cmd2: EditorCommand = {
      description: 'second',
      execute: vi.fn(),
      undo: async () => {
        order.push(2);
      },
    };

    const composite = new CompositeCommand('batch', [cmd1, cmd2]);
    await composite.undo();

    expect(order).toEqual([2, 1]);
  });
});

// ── Helpers for concrete command tests ──────────────────────

function createMockPage(): WorkerPDFiumPage {
  return {
    createAnnotation: vi.fn().mockResolvedValue({ index: 0, type: 'Ink' }),
    removeAnnotation: vi.fn().mockResolvedValue(true),
    setAnnotationRect: vi.fn().mockResolvedValue(true),
    setAnnotationColour: vi.fn().mockResolvedValue(true),
    setAnnotationFlags: vi.fn().mockResolvedValue(true),
    setAnnotationString: vi.fn().mockResolvedValue(true),
    setAnnotationBorder: vi.fn().mockResolvedValue(true),
    setAnnotationAttachmentPoints: vi.fn().mockResolvedValue(true),
    appendAnnotationAttachmentPoints: vi.fn().mockResolvedValue(true),
    setAnnotationURI: vi.fn().mockResolvedValue(true),
    addInkStroke: vi.fn().mockResolvedValue(0),
    generateContent: vi.fn().mockResolvedValue(true),
    [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined),
  } as unknown as WorkerPDFiumPage;
}

function createMockWorkerDocument(overrides?: Record<string, unknown>) {
  return {
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    getPage: vi.fn().mockResolvedValue(createMockPage()),
    getAllPageDimensions: vi.fn().mockResolvedValue([
      { width: 612, height: 792 },
      { width: 612, height: 792 },
    ]),
    importPages: vi.fn().mockResolvedValue(undefined),
    deletePage: vi.fn().mockResolvedValue(undefined),
    [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── PageAccessor factory verification ──────────────────────

describe('PageAccessor factory', () => {
  it('opens a fresh page for each execute() and undo() call', async () => {
    const pages = [createMockPage(), createMockPage()];
    let callCount = 0;
    const factory = vi.fn(async () => {
      const page = pages[callCount];
      if (!page) throw new Error('Too many factory calls');
      callCount++;
      return page;
    });

    const oldRect = { left: 0, top: 100, right: 100, bottom: 0 };
    const newRect = { left: 50, top: 150, right: 150, bottom: 50 };
    const cmd = new SetAnnotationRectCommand(factory, 0, oldRect, newRect);

    await cmd.execute();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(pages[0]!.setAnnotationRect).toHaveBeenCalledWith(0, newRect);
    expect(pages[0]![Symbol.asyncDispose]).toHaveBeenCalledOnce();

    await cmd.undo();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(pages[1]!.setAnnotationRect).toHaveBeenCalledWith(0, oldRect);
    expect(pages[1]![Symbol.asyncDispose]).toHaveBeenCalledOnce();
  });
});

// ── SetAnnotationRectCommand ───────────────────────────────

describe('SetAnnotationRectCommand', () => {
  const oldRect = { left: 10, top: 100, right: 110, bottom: 0 };
  const newRect = { left: 50, top: 140, right: 150, bottom: 40 };

  it('execute calls setAnnotationRect with newRect and generateContent', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationRectCommand(async () => page, 0, oldRect, newRect);

    await cmd.execute();

    expect(page.setAnnotationRect).toHaveBeenCalledWith(0, newRect);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('undo calls setAnnotationRect with oldRect and generateContent', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationRectCommand(async () => page, 0, oldRect, newRect);

    await cmd.undo();

    expect(page.setAnnotationRect).toHaveBeenCalledWith(0, oldRect);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('throws when execute cannot set rect', async () => {
    const page = createMockPage();
    page.setAnnotationRect = vi.fn().mockResolvedValue(false);
    const cmd = new SetAnnotationRectCommand(async () => page, 0, oldRect, newRect);

    await expect(cmd.execute()).rejects.toThrow('Failed to set annotation rect');
    expect(page.generateContent).not.toHaveBeenCalled();
  });

  it('uses custom description when provided', () => {
    const page = createMockPage();
    const cmd = new SetAnnotationRectCommand(async () => page, 0, oldRect, newRect, 'Move annotation');

    expect(cmd.description).toBe('Move annotation');
  });

  it('uses default description when not provided', () => {
    const page = createMockPage();
    const cmd = new SetAnnotationRectCommand(async () => page, 0, oldRect, newRect);

    expect(cmd.description).toBe('Set annotation rect');
  });
});

// ── SetAnnotationBorderCommand ─────────────────────────────

describe('SetAnnotationBorderCommand', () => {
  const oldBorder = { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 };
  const newBorder = { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 };

  it('execute applies the new border and generates content', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationBorderCommand(async () => page, 0, oldBorder, newBorder);

    await cmd.execute();

    expect(page.setAnnotationBorder).toHaveBeenCalledWith(0, 0, 0, 3);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('undo restores the old border and generates content', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationBorderCommand(async () => page, 0, oldBorder, newBorder);

    await cmd.undo();

    expect(page.setAnnotationBorder).toHaveBeenCalledWith(0, 0, 0, 1);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('throws when border mutation fails', async () => {
    const page = createMockPage();
    page.setAnnotationBorder = vi.fn().mockResolvedValue(false);
    const cmd = new SetAnnotationBorderCommand(async () => page, 0, oldBorder, newBorder);

    await expect(cmd.execute()).rejects.toThrow('Failed to set annotation border');
    expect(page.generateContent).not.toHaveBeenCalled();
  });
});

// ── CreateAnnotationCommand with inkPaths ──────────────────

describe('CreateAnnotationCommand', () => {
  it('calls addInkStroke for each ink path after creating the annotation', async () => {
    const page = createMockPage();
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const inkPaths = [
      [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      [
        { x: 50, y: 60 },
        { x: 70, y: 80 },
      ],
    ];

    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Ink, rect, { inkPaths });
    await cmd.execute();

    expect(page.createAnnotation).toHaveBeenCalledWith(AnnotationType.Ink);
    expect(page.setAnnotationRect).toHaveBeenCalledWith(0, rect);
    expect(page.addInkStroke).toHaveBeenCalledTimes(2);
    expect(page.addInkStroke).toHaveBeenCalledWith(0, [...inkPaths[0]!]);
    expect(page.addInkStroke).toHaveBeenCalledWith(0, [...inkPaths[1]!]);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('throws when creating annotation cannot set rect', async () => {
    const page = createMockPage();
    page.setAnnotationRect = vi.fn().mockResolvedValue(false);
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Square, rect);

    await expect(cmd.execute()).rejects.toThrow('Failed to set Square annotation rect');
    expect(page.generateContent).not.toHaveBeenCalled();
  });

  it('applies colour after quad points for markup annotations', async () => {
    const page = createMockPage();
    const rect = { left: 10, top: 100, right: 200, bottom: 80 };
    const quadPoints = [{ x1: 10, y1: 80, x2: 200, y2: 80, x3: 10, y3: 100, x4: 200, y4: 100 }];
    const colour = { r: 255, g: 255, b: 0, a: 128 };

    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Highlight, rect, { quadPoints, colour });
    await cmd.execute();

    expect(page.appendAnnotationAttachmentPoints).toHaveBeenCalledWith(0, quadPoints[0]);
    expect(page.setAnnotationColour).toHaveBeenCalledWith(0, 'interior', colour);

    const appendOrder = vi.mocked(page.appendAnnotationAttachmentPoints).mock.invocationCallOrder.at(-1) ?? 0;
    const colourOrder = vi.mocked(page.setAnnotationColour).mock.invocationCallOrder[0] ?? 0;
    expect(colourOrder).toBeGreaterThan(appendOrder);
  });

  it('marks line-tool Ink fallback annotations on create', async () => {
    const page = createMockPage();
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Ink, rect, {
      inkPaths: [
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      ],
      isLineFallback: true,
    });

    await cmd.execute();

    expect(page.setAnnotationString).toHaveBeenCalledWith(0, LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE);
  });

  it('reapplies non-opaque stroke colour after border setup', async () => {
    const page = createMockPage();
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const strokeColour = { r: 34, g: 136, b: 51, a: 153 };
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Square, rect, {
      strokeColour,
      borderWidth: 4,
    });

    await cmd.execute();

    const strokeCalls = vi
      .mocked(page.setAnnotationColour)
      .mock.calls.filter(([, colourType, colour]) => colourType === 'stroke' && colour === strokeColour);
    expect(strokeCalls).toHaveLength(2);

    const borderOrder = vi.mocked(page.setAnnotationBorder).mock.invocationCallOrder[0] ?? 0;
    const colourOrders = vi.mocked(page.setAnnotationColour).mock.invocationCallOrder.filter((_, index) => {
      const call = vi.mocked(page.setAnnotationColour).mock.calls[index];
      return call?.[1] === 'stroke';
    });
    const finalStrokeOrder = colourOrders.at(-1) ?? 0;
    expect(finalStrokeOrder).toBeGreaterThan(borderOrder);
  });

  it('applies contents, stamp name, and quad points during creation', async () => {
    const page = createMockPage();
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const quadPoints = [{ x1: 0, y1: 100, x2: 200, y2: 100, x3: 0, y3: 0, x4: 200, y4: 0 }];
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Stamp, rect, {
      contents: 'Approved',
      stampType: 'Approved',
      quadPoints,
    });

    await cmd.execute();

    expect(page.setAnnotationString).toHaveBeenCalledWith(0, 'Contents', 'Approved');
    expect(page.setAnnotationString).toHaveBeenCalledWith(0, 'Name', 'Approved');
    expect(page.appendAnnotationAttachmentPoints).toHaveBeenCalledWith(0, quadPoints[0]);
  });

  it('throws when appending quad points fails', async () => {
    const page = createMockPage();
    page.appendAnnotationAttachmentPoints = vi.fn().mockResolvedValue(false);
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const quadPoints = [{ x1: 0, y1: 100, x2: 200, y2: 100, x3: 0, y3: 0, x4: 200, y4: 0 }];
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Highlight, rect, { quadPoints });

    await expect(cmd.execute()).rejects.toThrow('Failed to append Highlight annotation quad points');
  });

  it('throws when adding an ink stroke fails', async () => {
    const page = createMockPage();
    page.addInkStroke = vi.fn().mockResolvedValue(-1);
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Ink, rect, {
      inkPaths: [
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      ],
    });

    await expect(cmd.execute()).rejects.toThrow('Failed to add ink stroke');
  });

  it('undo is a no-op before execute runs', async () => {
    const page = createMockPage();
    const rect = { left: 0, top: 100, right: 200, bottom: 0 };
    const cmd = new CreateAnnotationCommand(async () => page, AnnotationType.Text, rect);

    await cmd.undo();

    expect(page.removeAnnotation).not.toHaveBeenCalled();
  });
});

// ── RemoveAnnotationCommand ────────────────────────────────

describe('RemoveAnnotationCommand', () => {
  it('undo restores flags, border, subject, attachment points, and ink paths', async () => {
    const page = createMockPage();
    const snapshot: SerialisedAnnotation = {
      index: 3,
      type: AnnotationType.Ink,
      bounds: { left: 10, top: 100, right: 200, bottom: 0 },
      colour: {
        stroke: { r: 255, g: 0, b: 0, a: 255 },
        interior: { r: 0, g: 255, b: 0, a: 255 },
      },
      flags: 4,
      contents: 'test contents',
      author: 'Author',
      subject: 'Subject',
      border: { horizontalRadius: 2, verticalRadius: 3, borderWidth: 1 },
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: [
        [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
        [
          { x: 50, y: 60 },
          { x: 70, y: 80 },
        ],
      ],
      attachmentPoints: [{ x1: 0, y1: 10, x2: 100, y2: 10, x3: 100, y3: 0, x4: 0, y4: 0 }],
      widget: undefined,
      link: undefined,
    };

    const cmd = new RemoveAnnotationCommand(async () => page, 3, snapshot);
    await cmd.undo();

    // Re-creates the annotation
    expect(page.createAnnotation).toHaveBeenCalledWith(AnnotationType.Ink);
    expect(page.setAnnotationRect).toHaveBeenCalledWith(0, snapshot.bounds);

    // Restores colours
    expect(page.setAnnotationColour).toHaveBeenCalledWith(0, 'stroke', snapshot.colour.stroke);
    expect(page.setAnnotationColour).toHaveBeenCalledWith(0, 'interior', snapshot.colour.interior);

    // Restores contents and author
    expect(page.setAnnotationString).toHaveBeenCalledWith(0, 'Contents', 'test contents');
    expect(page.setAnnotationString).toHaveBeenCalledWith(0, 'T', 'Author');

    // Restores subject
    expect(page.setAnnotationString).toHaveBeenCalledWith(0, 'Subj', 'Subject');

    // Restores flags
    expect(page.setAnnotationFlags).toHaveBeenCalledWith(0, 4);

    // Restores border
    expect(page.setAnnotationBorder).toHaveBeenCalledWith(0, 2, 3, 1);

    // Restores attachment points
    expect(page.appendAnnotationAttachmentPoints).toHaveBeenCalledWith(0, snapshot.attachmentPoints![0]);

    // Restores ink paths
    expect(page.addInkStroke).toHaveBeenCalledTimes(2);
    expect(page.addInkStroke).toHaveBeenCalledWith(0, snapshot.inkPaths![0]);
    expect(page.addInkStroke).toHaveBeenCalledWith(0, snapshot.inkPaths![1]);

    // Generates content after restoration
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('undo restores link URI when snapshot has a link action', async () => {
    const page = createMockPage();
    const snapshot: SerialisedAnnotation = {
      index: 5,
      type: AnnotationType.Link,
      bounds: { left: 0, top: 100, right: 200, bottom: 80 },
      colour: { stroke: { r: 0, g: 0, b: 255, a: 255 }, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: undefined,
      attachmentPoints: undefined,
      widget: undefined,
      link: {
        action: { type: ActionType.URI, uri: 'https://example.com', filePath: undefined },
        destination: undefined,
      },
    };

    const cmd = new RemoveAnnotationCommand(async () => page, 5, snapshot);
    await cmd.undo();

    expect(page.createAnnotation).toHaveBeenCalledWith(AnnotationType.Link);
    expect(page.setAnnotationRect).toHaveBeenCalledWith(0, snapshot.bounds);
    expect(page.setAnnotationURI).toHaveBeenCalledWith(0, 'https://example.com');
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('undo does not call setAnnotationURI when snapshot has no link', async () => {
    const page = createMockPage();
    const snapshot: SerialisedAnnotation = {
      index: 2,
      type: AnnotationType.Text,
      bounds: { left: 0, top: 50, right: 100, bottom: 0 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 0,
      contents: 'Note',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: undefined,
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    const cmd = new RemoveAnnotationCommand(async () => page, 2, snapshot);
    await cmd.undo();

    expect(page.setAnnotationURI).not.toHaveBeenCalled();
  });

  it('redo after undo removes the re-created annotation at its new index', async () => {
    const page = createMockPage();
    (page.createAnnotation as ReturnType<typeof vi.fn>).mockResolvedValue({ index: 7, type: 'Text' });

    const snapshot: SerialisedAnnotation = {
      index: 3,
      type: AnnotationType.Text,
      bounds: { left: 0, top: 50, right: 100, bottom: 0 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: undefined,
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    const cmd = new RemoveAnnotationCommand(async () => page, 3, snapshot);

    // Execute removes at index 3
    await cmd.execute();
    expect(page.removeAnnotation).toHaveBeenCalledWith(3);

    // Undo re-creates — mock returns index 7
    await cmd.undo();

    // Redo (execute again) should now remove at index 7, not the original 3
    (page.removeAnnotation as ReturnType<typeof vi.fn>).mockClear();
    await cmd.execute();
    expect(page.removeAnnotation).toHaveBeenCalledWith(7);
  });

  it('undo restores line fallback marker for line-tool Ink annotations', async () => {
    const page = createMockPage();
    const snapshot: SerialisedAnnotation = {
      index: 4,
      type: AnnotationType.Ink,
      bounds: { left: 10, top: 100, right: 200, bottom: 0 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      lineFallback: true,
      line: undefined,
      vertices: undefined,
      inkPaths: [
        [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      ],
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    const cmd = new RemoveAnnotationCommand(async () => page, 4, snapshot);
    await cmd.undo();

    expect(page.setAnnotationString).toHaveBeenCalledWith(0, LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE);
  });

  it('uses snapshot restore for lossless undo/redo when configured', async () => {
    const page = createMockPage();
    const beforeBytes = new Uint8Array([1, 2, 3]);
    const afterBytes = new Uint8Array([4, 5, 6]);

    const snapshotDocument = createMockWorkerDocument();
    const openDocument = vi.fn().mockResolvedValue(snapshotDocument);
    const targetDocument = createMockWorkerDocument({
      save: vi.fn().mockResolvedValueOnce(beforeBytes).mockResolvedValueOnce(afterBytes),
      getAllPageDimensions: vi.fn().mockResolvedValue([{ width: 612, height: 792 }]),
      importPages: vi.fn().mockResolvedValue(undefined),
      deletePage: vi.fn().mockResolvedValue(undefined),
    });

    const snapshot: SerialisedAnnotation = {
      index: 1,
      type: AnnotationType.Square,
      bounds: { left: 10, top: 100, right: 200, bottom: 0 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: undefined,
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    const cmd = new RemoveAnnotationCommand(async () => page, 1, snapshot, {
      document: targetDocument as never,
      openDocument,
    });

    await cmd.execute();
    expect(page.removeAnnotation).toHaveBeenCalledTimes(1);
    expect(page.removeAnnotation).toHaveBeenCalledWith(1);
    expect(targetDocument.save).toHaveBeenCalledTimes(2);

    await cmd.undo();
    expect(openDocument).toHaveBeenNthCalledWith(1, beforeBytes);
    expect(targetDocument.importPages).toHaveBeenCalledTimes(1);
    expect(targetDocument.deletePage).toHaveBeenCalledWith(0);

    await cmd.execute();
    expect(page.removeAnnotation).toHaveBeenCalledTimes(1);
    expect(openDocument).toHaveBeenNthCalledWith(2, afterBytes);
    expect(targetDocument.importPages).toHaveBeenCalledTimes(2);
    expect(snapshotDocument[Symbol.asyncDispose]).toHaveBeenCalledTimes(2);
  });
});

// ── ApplyRedactionsCommand ────────────────────────────────

describe('ApplyRedactionsCommand', () => {
  it('applies redactions and captures document snapshots on first execute', async () => {
    const beforeBytes = new Uint8Array([11, 12, 13]);
    const afterBytes = new Uint8Array([21, 22, 23]);
    const fillColour = { r: 10, g: 20, b: 30, a: 255 };
    const page = createMockPage() as WorkerPDFiumPage & {
      applyRedactions: ReturnType<typeof vi.fn>;
    };
    page.applyRedactions = vi.fn().mockResolvedValue(undefined);

    const document = createMockWorkerDocument({
      save: vi.fn().mockResolvedValueOnce(beforeBytes).mockResolvedValueOnce(afterBytes),
      getPage: vi.fn().mockResolvedValue(page),
    });

    const cmd = new ApplyRedactionsCommand(
      document as never,
      vi.fn().mockRejectedValue(new Error('openDocument should not be called on first execute')),
      2,
      {
        fillColour,
        removeIntersectingAnnotations: true,
      },
    );

    await cmd.execute();

    expect(document.save).toHaveBeenCalledTimes(2);
    expect(document.getPage).toHaveBeenCalledWith(2);
    expect(page.applyRedactions).toHaveBeenCalledWith(fillColour, true);
    expect(page[Symbol.asyncDispose]).toHaveBeenCalledOnce();
  });

  it('undo/redo restore snapshots without re-running page redaction', async () => {
    const beforeBytes = new Uint8Array([31, 32, 33]);
    const afterBytes = new Uint8Array([41, 42, 43]);
    const page = createMockPage() as WorkerPDFiumPage & {
      applyRedactions: ReturnType<typeof vi.fn>;
    };
    page.applyRedactions = vi.fn().mockResolvedValue(undefined);

    const snapshotDocument = createMockWorkerDocument();
    const openDocument = vi.fn().mockResolvedValue(snapshotDocument);

    const document = createMockWorkerDocument({
      save: vi.fn().mockResolvedValueOnce(beforeBytes).mockResolvedValueOnce(afterBytes),
      getPage: vi.fn().mockResolvedValue(page),
      getAllPageDimensions: vi.fn().mockResolvedValue([{ width: 612, height: 792 }]),
      importPages: vi.fn().mockResolvedValue(undefined),
      deletePage: vi.fn().mockResolvedValue(undefined),
    });

    const cmd = new ApplyRedactionsCommand(document as never, openDocument, 0);
    await cmd.execute();
    await cmd.undo();
    await cmd.execute();

    expect(page.applyRedactions).toHaveBeenCalledTimes(1);
    expect(document.save).toHaveBeenCalledTimes(2);
    expect(openDocument).toHaveBeenNthCalledWith(1, beforeBytes);
    expect(openDocument).toHaveBeenNthCalledWith(2, afterBytes);
    expect(document.importPages).toHaveBeenCalledTimes(2);
    expect(document.deletePage).toHaveBeenCalledWith(0);
    expect(snapshotDocument[Symbol.asyncDispose]).toHaveBeenCalledTimes(2);
  });
});

// ── MovePageCommand ───────────────────────────────────────

describe('MovePageCommand', () => {
  it('throws when constructed with multiple page indices', () => {
    const mockDocument = { movePages: vi.fn(), deletePage: vi.fn(), insertBlankPage: vi.fn() };
    expect(() => {
      new MovePageCommand(mockDocument as never, [0, 1], 3);
    }).toThrow('MovePageCommand only supports single-page moves');
  });

  it('moves a page on execute and moves it back on undo', async () => {
    const mockDocument = { movePages: vi.fn().mockResolvedValue(undefined) };
    const cmd = new MovePageCommand(mockDocument as never, [2], 5);

    await cmd.execute();
    await cmd.undo();

    expect(mockDocument.movePages).toHaveBeenNthCalledWith(1, [2], 5);
    expect(mockDocument.movePages).toHaveBeenNthCalledWith(2, [5], 2);
  });

  it('does nothing on undo when there is no original index', async () => {
    const mockDocument = { movePages: vi.fn().mockResolvedValue(undefined) };
    const cmd = new MovePageCommand(mockDocument as never, [], 5);

    await cmd.undo();

    expect(mockDocument.movePages).not.toHaveBeenCalled();
  });
});

describe('DeletePageCommand', () => {
  it('deletes on execute and inserts a blank page on undo', async () => {
    const mockDocument = {
      deletePage: vi.fn().mockResolvedValue(undefined),
      insertBlankPage: vi.fn().mockResolvedValue(undefined),
    };
    const cmd = new DeletePageCommand(mockDocument as never, 2, 612, 792);

    await cmd.execute();
    await cmd.undo();

    expect(mockDocument.deletePage).toHaveBeenCalledWith(2);
    expect(mockDocument.insertBlankPage).toHaveBeenCalledWith(2, 612, 792);
  });
});

describe('InsertBlankPageCommand', () => {
  it('inserts on execute and deletes on undo', async () => {
    const mockDocument = {
      deletePage: vi.fn().mockResolvedValue(undefined),
      insertBlankPage: vi.fn().mockResolvedValue(undefined),
    };
    const cmd = new InsertBlankPageCommand(mockDocument as never, 1, 400, 300);

    await cmd.execute();
    await cmd.undo();

    expect(mockDocument.insertBlankPage).toHaveBeenCalledWith(1, 400, 300);
    expect(mockDocument.deletePage).toHaveBeenCalledWith(1);
  });
});

// ── SetAnnotationColourCommand ────────────────────────────

describe('SetAnnotationColourCommand', () => {
  const oldColour = { r: 0, g: 0, b: 0, a: 255 };
  const newColour = { r: 255, g: 0, b: 0, a: 255 };

  it('execute calls setAnnotationColour with newColour and generateContent', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationColourCommand(async () => page, 0, 'stroke', oldColour, newColour);

    await cmd.execute();

    expect(page.setAnnotationColour).toHaveBeenCalledWith(0, 'stroke', newColour);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('undo calls setAnnotationColour with oldColour and generateContent', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationColourCommand(async () => page, 0, 'stroke', oldColour, newColour);

    await cmd.undo();

    expect(page.setAnnotationColour).toHaveBeenCalledWith(0, 'stroke', oldColour);
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('passes the correct colourType through to setAnnotationColour', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationColourCommand(async () => page, 3, 'interior', oldColour, newColour);

    await cmd.execute();

    expect(page.setAnnotationColour).toHaveBeenCalledWith(3, 'interior', newColour);
  });

  it('reapplies border after execute when preserveBorder is provided', async () => {
    const page = createMockPage();
    const preserveBorder = { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 };
    const cmd = new SetAnnotationColourCommand(async () => page, 3, 'stroke', oldColour, newColour, preserveBorder);

    await cmd.execute();

    expect(page.setAnnotationColour).toHaveBeenCalledWith(3, 'stroke', newColour);
    expect(page.setAnnotationBorder).toHaveBeenCalledWith(3, 0, 0, 2);
  });

  it('reapplies border after undo when preserveBorder is provided', async () => {
    const page = createMockPage();
    const preserveBorder = { horizontalRadius: 1, verticalRadius: 1, borderWidth: 4 };
    const cmd = new SetAnnotationColourCommand(async () => page, 2, 'stroke', oldColour, newColour, preserveBorder);

    await cmd.undo();

    expect(page.setAnnotationColour).toHaveBeenCalledWith(2, 'stroke', oldColour);
    expect(page.setAnnotationBorder).toHaveBeenCalledWith(2, 1, 1, 4);
  });

  it('coalesces compatible colour commands by keeping the original old colour', () => {
    const page = createMockPage();
    const getPage = async () => page;
    const first = new SetAnnotationColourCommand(getPage, 0, 'stroke', oldColour, { r: 1, g: 2, b: 3, a: 255 });
    const second = new SetAnnotationColourCommand(
      getPage,
      0,
      'stroke',
      { r: 1, g: 2, b: 3, a: 255 },
      { r: 9, g: 8, b: 7, a: 200 },
    );

    const merged = first.coalesce(second);

    expect(merged).toBeInstanceOf(SetAnnotationColourCommand);
  });

  it('does not coalesce colour commands when preserveBorder differs', () => {
    const page = createMockPage();
    const getPage = async () => page;
    const first = new SetAnnotationColourCommand(getPage, 0, 'stroke', oldColour, newColour, {
      horizontalRadius: 0,
      verticalRadius: 0,
      borderWidth: 1,
    });
    const second = new SetAnnotationColourCommand(getPage, 0, 'stroke', newColour, oldColour, {
      horizontalRadius: 0,
      verticalRadius: 0,
      borderWidth: 2,
    });

    expect(first.coalesce(second)).toBeNull();
  });
});

// ── SetAnnotationStyleCommand ──────────────────────────────

describe('SetAnnotationStyleCommand', () => {
  it('executes combined stroke/interior/border mutation and renders once', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationStyleCommand(async () => page, 5, {
      stroke: {
        colourType: 'stroke',
        oldColour: { r: 0, g: 0, b: 0, a: 255 },
        newColour: { r: 20, g: 40, b: 60, a: 200 },
        preserveBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      },
      interior: {
        colourType: 'interior',
        oldColour: { r: 255, g: 255, b: 255, a: 255 },
        newColour: { r: 90, g: 100, b: 110, a: 140 },
      },
      border: {
        oldBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
        newBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
      },
    });

    await cmd.execute();

    expect(page.setAnnotationColour).toHaveBeenCalledWith(5, 'stroke', { r: 20, g: 40, b: 60, a: 200 });
    expect(page.setAnnotationColour).toHaveBeenCalledWith(5, 'interior', { r: 90, g: 100, b: 110, a: 140 });
    expect(page.setAnnotationBorder).toHaveBeenCalledWith(5, 0, 0, 2);
    expect(page.setAnnotationBorder).toHaveBeenCalledWith(5, 0, 0, 4);
    expect(page.generateContent).toHaveBeenCalledTimes(1);
  });

  it('undo restores combined style state and renders once', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationStyleCommand(async () => page, 2, {
      stroke: {
        colourType: 'stroke',
        oldColour: { r: 10, g: 20, b: 30, a: 255 },
        newColour: { r: 11, g: 21, b: 31, a: 200 },
        preserveBorder: { horizontalRadius: 1, verticalRadius: 1, borderWidth: 3 },
      },
      border: {
        oldBorder: { horizontalRadius: 1, verticalRadius: 1, borderWidth: 3 },
        newBorder: { horizontalRadius: 2, verticalRadius: 2, borderWidth: 6 },
      },
    });

    await cmd.undo();

    expect(page.setAnnotationBorder).toHaveBeenCalledWith(2, 1, 1, 3);
    expect(page.setAnnotationColour).toHaveBeenCalledWith(2, 'stroke', { r: 10, g: 20, b: 30, a: 255 });
    expect(page.setAnnotationBorder).toHaveBeenCalledWith(2, 1, 1, 3);
    expect(page.generateContent).toHaveBeenCalledTimes(1);
  });

  it('handles interior-only style mutations without border preservation', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationStyleCommand(async () => page, 1, {
      interior: {
        colourType: 'interior',
        oldColour: { r: 1, g: 2, b: 3, a: 255 },
        newColour: { r: 4, g: 5, b: 6, a: 128 },
        preserveBorder: null,
      },
    });

    await cmd.execute();
    await cmd.undo();

    expect(page.setAnnotationColour).toHaveBeenNthCalledWith(1, 1, 'interior', { r: 4, g: 5, b: 6, a: 128 });
    expect(page.setAnnotationBorder).not.toHaveBeenCalled();
  });
});

describe('SetAnnotationBorderCommand coalescing', () => {
  it('coalesces compatible border mutations', () => {
    const page = createMockPage();
    const getPage = async () => page;
    const first = new SetAnnotationBorderCommand(
      getPage,
      0,
      { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
      { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
    );
    const second = new SetAnnotationBorderCommand(
      getPage,
      0,
      { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
    );

    expect(first.coalesce(second)).toBeInstanceOf(SetAnnotationBorderCommand);
  });
});

// ── SetAnnotationStringCommand ────────────────────────────

describe('SetAnnotationStringCommand', () => {
  it('execute calls setAnnotationString with newValue and generateContent', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationStringCommand(async () => page, 1, 'Contents', 'old text', 'new text');

    await cmd.execute();

    expect(page.setAnnotationString).toHaveBeenCalledWith(1, 'Contents', 'new text');
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('undo calls setAnnotationString with oldValue and generateContent', async () => {
    const page = createMockPage();
    const cmd = new SetAnnotationStringCommand(async () => page, 1, 'Contents', 'old text', 'new text');

    await cmd.undo();

    expect(page.setAnnotationString).toHaveBeenCalledWith(1, 'Contents', 'old text');
    expect(page.generateContent).toHaveBeenCalledOnce();
  });

  it('sets description based on key name', () => {
    const page = createMockPage();
    const cmd = new SetAnnotationStringCommand(async () => page, 0, 'T', '', 'Author Name');

    expect(cmd.description).toBe('Set annotation T');
  });
});
