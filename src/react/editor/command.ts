/**
 * Command pattern for editor undo/redo.
 *
 * All annotation commands use a `PageAccessor` — a factory that opens a fresh
 * page handle on each execute/undo call. This is essential because page handles
 * are short-lived resources that get disposed after each operation in the CRUD
 * hook. Holding a stale reference would cause "already disposed" errors.
 *
 * @module react/editor/command
 */

import type { SerialisedAnnotation, SerialisedQuadPoints } from '../../context/protocol.js';
import type { WorkerPDFiumDocument, WorkerPDFiumPage } from '../../context/worker-client.js';
import {
  type AnnotationBorder,
  type AnnotationColourType,
  AnnotationType,
  type Colour,
  type Rect,
} from '../../core/types.js';
import { LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE } from '../../internal/annotation-markers.js';

// ────────────────────────────────────────────────────────────
// Command interface
// ────────────────────────────────────────────────────────────

/**
 * A reversible editor operation.
 */
export interface EditorCommand {
  /** Human-readable description of what this command does. */
  readonly description: string;
  /** Execute the command (first time or redo). */
  execute(): Promise<void>;
  /** Reverse the command. */
  undo(): Promise<void>;
}

interface CoalescibleCommand extends EditorCommand {
  coalesce(next: EditorCommand): EditorCommand | null;
}

/**
 * Factory that opens a fresh page handle. Commands call this on every
 * execute/undo to avoid holding stale disposed references. The caller
 * is responsible for disposing the returned page.
 */
export type PageAccessor = () => Promise<WorkerPDFiumPage>;

/**
 * Function that opens a temporary worker-backed document from bytes.
 *
 * Used by snapshot-backed commands that need lossless undo/redo.
 */
export type DocumentOpener = (data: Uint8Array | ArrayBuffer) => Promise<WorkerPDFiumDocument>;

// ────────────────────────────────────────────────────────────
// Page lifecycle helper
// ────────────────────────────────────────────────────────────

/**
 * Open a page, run an operation, then dispose the page handle.
 */
async function withPage<T>(getPage: PageAccessor, fn: (page: WorkerPDFiumPage) => Promise<T>): Promise<T> {
  const page = await getPage();
  try {
    return await fn(page);
  } finally {
    await page[Symbol.asyncDispose]();
  }
}

/**
 * Replace all pages in `targetDocument` with pages from `snapshotBytes`.
 *
 * This is intentionally document-level to preserve unsupported or lossy
 * annotation fields (appearance streams, link destinations, etc.) when
 * command-level reconstruction is insufficient.
 */
async function restoreDocumentFromSnapshot(
  targetDocument: WorkerPDFiumDocument,
  snapshotBytes: Uint8Array,
  openDocument: DocumentOpener,
): Promise<void> {
  const snapshotDocument = await openDocument(snapshotBytes);
  try {
    const existingPageCount = (await targetDocument.getAllPageDimensions()).length;
    await targetDocument.importPages(snapshotDocument, { insertIndex: existingPageCount });
    for (let index = existingPageCount - 1; index >= 0; index--) {
      await targetDocument.deletePage(index);
    }
  } finally {
    await snapshotDocument[Symbol.asyncDispose]();
  }
}

function defaultColourTypeForSubtype(subtype: AnnotationType): AnnotationColourType {
  if (subtype === AnnotationType.Highlight || subtype === AnnotationType.Redact) {
    return 'interior';
  }
  return 'stroke';
}

function assertMutationSucceeded(operation: string, success: boolean): void {
  if (success) return;
  throw new Error(`Failed to ${operation}`);
}

function assertInkStrokeSucceeded(strokeIndex: number): void {
  if (strokeIndex >= 0) return;
  throw new Error('Failed to add ink stroke');
}

function isCoalescibleCommand(command: EditorCommand): command is CoalescibleCommand {
  return typeof (command as CoalescibleCommand).coalesce === 'function';
}

const COMMAND_COALESCE_WINDOW_MS = 400;
const INVALID_CLEAN_CURSOR = Number.MIN_SAFE_INTEGER;

// ────────────────────────────────────────────────────────────
// Command stack
// ────────────────────────────────────────────────────────────

/**
 * Manages a stack of undoable/redoable editor commands.
 *
 * The stack maintains a cursor that tracks the current position.
 * Pushing a new command truncates any redo history.
 */
export class CommandStack {
  readonly #commands: EditorCommand[] = [];
  readonly #commandTimestamps: number[] = [];
  #cursor = -1;
  #cleanCursor = -1;
  readonly #maxSize: number;
  #operationQueue: Promise<void> = Promise.resolve();

  constructor(maxSize = 100) {
    this.#maxSize = maxSize;
  }

  /**
   * Ensure stack mutations run strictly in sequence.
   *
   * UI actions may trigger multiple command operations in rapid succession
   * (for example color + opacity updates). Serializing here prevents races
   * that can corrupt cursor/history state or apply operations out of order.
   */
  #enqueueStackMutation<T>(operation: () => Promise<T>): Promise<T> {
    const queued = this.#operationQueue.then(operation, operation);
    this.#operationQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  /** Whether there are commands that can be undone. */
  get canUndo(): boolean {
    return this.#cursor >= 0;
  }

  /** Whether there are commands that can be redone. */
  get canRedo(): boolean {
    return this.#cursor < this.#commands.length - 1;
  }

  /** Whether the document has been modified since last save. */
  get isDirty(): boolean {
    return this.#cursor !== this.#cleanCursor;
  }

  /** The number of commands in the stack. */
  get size(): number {
    return this.#commands.length;
  }

  /**
   * Execute a command and push it onto the stack.
   *
   * Truncates any redo history. If the stack exceeds `maxSize`,
   * the oldest command is evicted.
   */
  async push(command: EditorCommand): Promise<void> {
    await this.#enqueueStackMutation(async () => {
      await command.execute();

      if (this.#cleanCursor > this.#cursor) {
        this.#cleanCursor = INVALID_CLEAN_CURSOR;
      }

      // Truncate redo history
      this.#commands.length = this.#cursor + 1;
      this.#commandTimestamps.length = this.#cursor + 1;

      const now = Date.now();
      const previous = this.#commands[this.#cursor];
      const previousTimestamp = this.#commandTimestamps[this.#cursor] ?? 0;
      if (
        previous !== undefined &&
        now - previousTimestamp <= COMMAND_COALESCE_WINDOW_MS &&
        isCoalescibleCommand(previous)
      ) {
        const merged = previous.coalesce(command);
        if (merged !== null) {
          this.#commands[this.#cursor] = merged;
          this.#commandTimestamps[this.#cursor] = now;
          if (this.#cleanCursor === this.#cursor) {
            this.#cleanCursor = INVALID_CLEAN_CURSOR;
          }
          return;
        }
      }

      this.#commands.push(command);
      this.#commandTimestamps.push(now);

      // Evict oldest if over capacity
      if (this.#commands.length > this.#maxSize) {
        this.#commands.shift();
        this.#commandTimestamps.shift();
        // Adjust clean cursor if it was tracking a now-evicted command
        if (this.#cleanCursor > 0) {
          this.#cleanCursor--;
        } else if (this.#cleanCursor === 0) {
          this.#cleanCursor = INVALID_CLEAN_CURSOR;
        }
      } else {
        this.#cursor++;
      }
    });
  }

  /** Undo the most recent command. */
  async undo(): Promise<void> {
    await this.#enqueueStackMutation(async () => {
      if (!this.canUndo) return;

      const command = this.#commands[this.#cursor];
      if (command === undefined) return;

      await command.undo();
      this.#cursor--;
    });
  }

  /** Redo the most recently undone command. */
  async redo(): Promise<void> {
    await this.#enqueueStackMutation(async () => {
      if (!this.canRedo) return;

      this.#cursor++;
      const command = this.#commands[this.#cursor];
      if (command === undefined) {
        this.#cursor--;
        return;
      }

      await command.execute();
    });
  }

  /** Mark the current state as "clean" (saved). */
  markClean(): void {
    this.#cleanCursor = this.#cursor;
  }

  /** Clear all commands from the stack. */
  clear(): void {
    this.#commands.length = 0;
    this.#commandTimestamps.length = 0;
    this.#cursor = -1;
    this.#cleanCursor = -1;
  }
}

function bordersEqual(a: AnnotationBorder | null, b: AnnotationBorder | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    Math.abs(a.horizontalRadius - b.horizontalRadius) < 1e-6 &&
    Math.abs(a.verticalRadius - b.verticalRadius) < 1e-6 &&
    Math.abs(a.borderWidth - b.borderWidth) < 1e-6
  );
}

// ────────────────────────────────────────────────────────────
// Concrete commands — Annotation operations
// ────────────────────────────────────────────────────────────

/**
 * Create an annotation on a page.
 *
 * Undo removes it. Redo re-creates it at the same rect.
 */
export class CreateAnnotationCommand implements EditorCommand {
  readonly description: string;
  readonly #getPage: PageAccessor;
  readonly #subtype: AnnotationType;
  readonly #rect: Rect;
  readonly #options: CreateAnnotationOptions;
  #createdIndex: number | undefined;

  constructor(getPage: PageAccessor, subtype: AnnotationType, rect: Rect, options: CreateAnnotationOptions = {}) {
    this.#getPage = getPage;
    this.#subtype = subtype;
    this.#rect = rect;
    this.#options = options;
    this.description = `Create ${subtype} annotation`;
  }

  /** The index of the created annotation (available after execute). */
  get createdIndex(): number | undefined {
    return this.#createdIndex;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      const result = await page.createAnnotation(this.#subtype);
      this.#createdIndex = result.index;
      assertMutationSucceeded(
        `set ${this.#subtype} annotation rect`,
        await page.setAnnotationRect(result.index, this.#rect),
      );

      if (this.#options.contents !== undefined) {
        assertMutationSucceeded(
          `set ${this.#subtype} annotation contents`,
          await page.setAnnotationString(result.index, 'Contents', this.#options.contents),
        );
      }

      if (this.#options.quadPoints !== undefined) {
        for (const quad of this.#options.quadPoints) {
          assertMutationSucceeded(
            `append ${this.#subtype} annotation quad points`,
            await page.appendAnnotationAttachmentPoints(result.index, quad),
          );
        }
      }

      if (this.#options.inkPaths !== undefined) {
        for (const path of this.#options.inkPaths) {
          assertInkStrokeSucceeded(await page.addInkStroke(result.index, [...path]));
        }
      }

      if (this.#options.stampType !== undefined) {
        assertMutationSucceeded(
          `set ${this.#subtype} stamp name`,
          await page.setAnnotationString(result.index, 'Name', this.#options.stampType),
        );
      }
      if (this.#options.isLineFallback) {
        assertMutationSucceeded(
          'mark line fallback annotation',
          await page.setAnnotationString(result.index, LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE),
        );
      }

      // Apply colour after subtype-specific geometry/data. For text markup
      // annotations, appending QuadPoints can reset appearance defaults.
      if (this.#options.colour !== undefined) {
        const colourType = defaultColourTypeForSubtype(this.#subtype);
        assertMutationSucceeded(
          `set ${this.#subtype} annotation colour`,
          await page.setAnnotationColour(result.index, colourType, this.#options.colour),
        );
      }
      if (this.#options.strokeColour !== undefined) {
        assertMutationSucceeded(
          `set ${this.#subtype} annotation stroke colour`,
          await page.setAnnotationColour(result.index, 'stroke', this.#options.strokeColour),
        );
      }
      if (this.#options.interiorColour !== undefined) {
        assertMutationSucceeded(
          `set ${this.#subtype} annotation interior colour`,
          await page.setAnnotationColour(result.index, 'interior', this.#options.interiorColour),
        );
      }
      if (this.#options.borderWidth !== undefined) {
        assertMutationSucceeded(
          `set ${this.#subtype} annotation border`,
          await page.setAnnotationBorder(result.index, 0, 0, this.#options.borderWidth),
        );
      }

      // Some annotation types can normalise colour alpha during initial
      // creation/border setup. Reapply non-opaque colours after border setup
      // so preset opacity values (for example shape defaults) persist.
      if (this.#options.borderWidth !== undefined) {
        const defaultColourType = defaultColourTypeForSubtype(this.#subtype);
        if (this.#options.colour !== undefined && this.#options.colour.a < 255) {
          assertMutationSucceeded(
            `reapply ${this.#subtype} annotation ${defaultColourType} alpha`,
            await page.setAnnotationColour(result.index, defaultColourType, this.#options.colour),
          );
        }
        if (this.#options.strokeColour !== undefined && this.#options.strokeColour.a < 255) {
          assertMutationSucceeded(
            `reapply ${this.#subtype} annotation stroke alpha`,
            await page.setAnnotationColour(result.index, 'stroke', this.#options.strokeColour),
          );
        }
        if (this.#options.interiorColour !== undefined && this.#options.interiorColour.a < 255) {
          assertMutationSucceeded(
            `reapply ${this.#subtype} annotation interior alpha`,
            await page.setAnnotationColour(result.index, 'interior', this.#options.interiorColour),
          );
        }
      }

      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    const index = this.#createdIndex;
    if (index === undefined) return;
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded('remove created annotation', await page.removeAnnotation(index));
      await page.generateContent();
    });
    this.#createdIndex = undefined;
  }
}

/**
 * Options for creating an annotation.
 */
export interface CreateAnnotationOptions {
  readonly colour?: Colour;
  readonly strokeColour?: Colour;
  readonly interiorColour?: Colour;
  readonly borderWidth?: number;
  readonly isLineFallback?: boolean;
  readonly contents?: string;
  readonly quadPoints?: readonly SerialisedQuadPoints[];
  readonly inkPaths?: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>;
  readonly stampType?: string;
}

/**
 * Optional lossless restore settings for removal-style commands.
 *
 * When provided, undo/redo are applied by restoring full document snapshots
 * instead of attempting field-by-field annotation reconstruction.
 */
export interface SnapshotRestoreOptions {
  readonly document: WorkerPDFiumDocument;
  readonly openDocument: DocumentOpener;
}

/**
 * Remove an annotation from a page.
 *
 * Stores a snapshot of the annotation data for undo (re-creation).
 */
export class RemoveAnnotationCommand implements EditorCommand {
  readonly description = 'Remove annotation';
  readonly #getPage: PageAccessor;
  #annotationIndex: number;
  #snapshot: SerialisedAnnotation | undefined;
  readonly #snapshotRestore: SnapshotRestoreOptions | undefined;
  #beforeDocumentBytes: Uint8Array | undefined;
  #afterDocumentBytes: Uint8Array | undefined;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    snapshot: SerialisedAnnotation,
    snapshotRestore?: SnapshotRestoreOptions,
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#snapshot = snapshot;
    this.#snapshotRestore = snapshotRestore;
  }

  async execute(): Promise<void> {
    if (
      this.#snapshotRestore !== undefined &&
      this.#beforeDocumentBytes !== undefined &&
      this.#afterDocumentBytes !== undefined
    ) {
      await restoreDocumentFromSnapshot(
        this.#snapshotRestore.document,
        this.#afterDocumentBytes,
        this.#snapshotRestore.openDocument,
      );
      return;
    }

    if (this.#snapshotRestore !== undefined && this.#beforeDocumentBytes === undefined) {
      this.#beforeDocumentBytes = await this.#snapshotRestore.document.save();
    }

    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded('remove annotation', await page.removeAnnotation(this.#annotationIndex));
      await page.generateContent();
    });

    if (this.#snapshotRestore !== undefined && this.#afterDocumentBytes === undefined) {
      this.#afterDocumentBytes = await this.#snapshotRestore.document.save();
    }
  }

  async undo(): Promise<void> {
    if (this.#snapshot === undefined) return;

    if (
      this.#snapshotRestore !== undefined &&
      this.#beforeDocumentBytes !== undefined &&
      this.#afterDocumentBytes !== undefined
    ) {
      await restoreDocumentFromSnapshot(
        this.#snapshotRestore.document,
        this.#beforeDocumentBytes,
        this.#snapshotRestore.openDocument,
      );
      return;
    }

    const snapshot = this.#snapshot;
    await withPage(this.#getPage, async (page) => {
      // Re-create the annotation from snapshot
      const result = await page.createAnnotation(snapshot.type);
      this.#annotationIndex = result.index;
      assertMutationSucceeded('restore annotation bounds', await page.setAnnotationRect(result.index, snapshot.bounds));

      if (snapshot.colour.stroke !== undefined) {
        assertMutationSucceeded(
          'restore annotation stroke colour',
          await page.setAnnotationColour(result.index, 'stroke', snapshot.colour.stroke),
        );
      }
      if (snapshot.colour.interior !== undefined) {
        assertMutationSucceeded(
          'restore annotation interior colour',
          await page.setAnnotationColour(result.index, 'interior', snapshot.colour.interior),
        );
      }
      if (snapshot.contents) {
        assertMutationSucceeded(
          'restore annotation contents',
          await page.setAnnotationString(result.index, 'Contents', snapshot.contents),
        );
      }
      if (snapshot.author) {
        assertMutationSucceeded(
          'restore annotation author',
          await page.setAnnotationString(result.index, 'T', snapshot.author),
        );
      }
      if (snapshot.subject) {
        assertMutationSucceeded(
          'restore annotation subject',
          await page.setAnnotationString(result.index, 'Subj', snapshot.subject),
        );
      }
      if (snapshot.flags !== 0) {
        assertMutationSucceeded(
          'restore annotation flags',
          await page.setAnnotationFlags(result.index, snapshot.flags),
        );
      }
      if (snapshot.border !== null) {
        assertMutationSucceeded(
          'restore annotation border',
          await page.setAnnotationBorder(
            result.index,
            snapshot.border.horizontalRadius,
            snapshot.border.verticalRadius,
            snapshot.border.borderWidth,
          ),
        );
      }
      if (snapshot.lineFallback === true) {
        assertMutationSucceeded(
          'restore line fallback marker',
          await page.setAnnotationString(result.index, LINE_FALLBACK_MARKER_KEY, LINE_FALLBACK_MARKER_VALUE),
        );
      }
      if (snapshot.attachmentPoints !== undefined) {
        for (const quad of snapshot.attachmentPoints) {
          assertMutationSucceeded(
            'restore annotation quad points',
            await page.appendAnnotationAttachmentPoints(result.index, quad),
          );
        }
      }
      if (snapshot.inkPaths !== undefined) {
        for (const path of snapshot.inkPaths) {
          assertInkStrokeSucceeded(await page.addInkStroke(result.index, path));
        }
      }

      if (snapshot.link?.action?.uri) {
        assertMutationSucceeded(
          'restore annotation URI',
          await page.setAnnotationURI(result.index, snapshot.link.action.uri),
        );
      }

      await page.generateContent();
    });
  }
}

/**
 * Set an annotation's rect (move or resize).
 */
export class SetAnnotationRectCommand implements EditorCommand {
  readonly description: string;
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #oldRect: Rect;
  readonly #newRect: Rect;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    oldRect: Rect,
    newRect: Rect,
    description = 'Set annotation rect',
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#oldRect = oldRect;
    this.#newRect = newRect;
    this.description = description;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'set annotation rect',
        await page.setAnnotationRect(this.#annotationIndex, this.#newRect),
      );
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'restore annotation rect',
        await page.setAnnotationRect(this.#annotationIndex, this.#oldRect),
      );
      await page.generateContent();
    });
  }
}

/**
 * Change an annotation's colour.
 */
export class SetAnnotationColourCommand implements EditorCommand {
  readonly description = 'Change annotation colour';
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #colourType: AnnotationColourType;
  readonly #oldColour: Colour;
  readonly #newColour: Colour;
  readonly #preserveBorder: AnnotationBorder | null;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    colourType: AnnotationColourType,
    oldColour: Colour,
    newColour: Colour,
    preserveBorder: AnnotationBorder | null = null,
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#colourType = colourType;
    this.#oldColour = oldColour;
    this.#newColour = newColour;
    this.#preserveBorder = preserveBorder;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'set annotation colour',
        await page.setAnnotationColour(this.#annotationIndex, this.#colourType, this.#newColour),
      );
      if (this.#preserveBorder !== null) {
        assertMutationSucceeded(
          'preserve annotation border',
          await page.setAnnotationBorder(
            this.#annotationIndex,
            this.#preserveBorder.horizontalRadius,
            this.#preserveBorder.verticalRadius,
            this.#preserveBorder.borderWidth,
          ),
        );
      }
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'restore annotation colour',
        await page.setAnnotationColour(this.#annotationIndex, this.#colourType, this.#oldColour),
      );
      if (this.#preserveBorder !== null) {
        assertMutationSucceeded(
          'restore preserved annotation border',
          await page.setAnnotationBorder(
            this.#annotationIndex,
            this.#preserveBorder.horizontalRadius,
            this.#preserveBorder.verticalRadius,
            this.#preserveBorder.borderWidth,
          ),
        );
      }
      await page.generateContent();
    });
  }

  coalesce(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof SetAnnotationColourCommand)) return null;
    if (this.#getPage !== next.#getPage) return null;
    if (this.#annotationIndex !== next.#annotationIndex) return null;
    if (this.#colourType !== next.#colourType) return null;
    if (!bordersEqual(this.#preserveBorder, next.#preserveBorder)) return null;
    return new SetAnnotationColourCommand(
      this.#getPage,
      this.#annotationIndex,
      this.#colourType,
      this.#oldColour,
      next.#newColour,
      this.#preserveBorder,
    );
  }
}

/**
 * Colour mutation for a combined style command.
 */
export interface AnnotationStyleColourMutation {
  readonly colourType: AnnotationColourType;
  readonly oldColour: Colour;
  readonly newColour: Colour;
  readonly preserveBorder?: AnnotationBorder | null;
}

/**
 * Border mutation for a combined style command.
 */
export interface AnnotationStyleBorderMutation {
  readonly oldBorder: AnnotationBorder;
  readonly newBorder: AnnotationBorder;
}

/**
 * Style payload for a combined annotation style mutation.
 */
export interface SetAnnotationStyleCommandOptions {
  readonly stroke?: AnnotationStyleColourMutation;
  readonly interior?: AnnotationStyleColourMutation;
  readonly border?: AnnotationStyleBorderMutation;
}

/**
 * Change multiple style fields (stroke/fill/border) in a single page render pass.
 */
export class SetAnnotationStyleCommand implements EditorCommand {
  readonly description = 'Change annotation style';
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #style: SetAnnotationStyleCommandOptions;

  constructor(getPage: PageAccessor, annotationIndex: number, style: SetAnnotationStyleCommandOptions) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#style = style;
  }

  async #applyColourMutation(
    page: WorkerPDFiumPage,
    mutation: AnnotationStyleColourMutation,
    restore: boolean,
  ): Promise<void> {
    const targetColour = restore ? mutation.oldColour : mutation.newColour;
    assertMutationSucceeded(
      restore ? 'restore annotation colour' : 'set annotation colour',
      await page.setAnnotationColour(this.#annotationIndex, mutation.colourType, targetColour),
    );
    const preserveBorder = mutation.preserveBorder;
    if (preserveBorder === null || preserveBorder === undefined) {
      return;
    }
    assertMutationSucceeded(
      restore ? 'restore preserved annotation border' : 'preserve annotation border',
      await page.setAnnotationBorder(
        this.#annotationIndex,
        preserveBorder.horizontalRadius,
        preserveBorder.verticalRadius,
        preserveBorder.borderWidth,
      ),
    );
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      if (this.#style.stroke !== undefined) {
        await this.#applyColourMutation(page, this.#style.stroke, false);
      }
      if (this.#style.interior !== undefined) {
        await this.#applyColourMutation(page, this.#style.interior, false);
      }
      if (this.#style.border !== undefined) {
        assertMutationSucceeded(
          'set annotation border',
          await page.setAnnotationBorder(
            this.#annotationIndex,
            this.#style.border.newBorder.horizontalRadius,
            this.#style.border.newBorder.verticalRadius,
            this.#style.border.newBorder.borderWidth,
          ),
        );
      }
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      if (this.#style.border !== undefined) {
        assertMutationSucceeded(
          'restore annotation border',
          await page.setAnnotationBorder(
            this.#annotationIndex,
            this.#style.border.oldBorder.horizontalRadius,
            this.#style.border.oldBorder.verticalRadius,
            this.#style.border.oldBorder.borderWidth,
          ),
        );
      }
      if (this.#style.interior !== undefined) {
        await this.#applyColourMutation(page, this.#style.interior, true);
      }
      if (this.#style.stroke !== undefined) {
        await this.#applyColourMutation(page, this.#style.stroke, true);
      }
      await page.generateContent();
    });
  }
}

/**
 * Change an annotation's border properties.
 */
export class SetAnnotationBorderCommand implements EditorCommand {
  readonly description = 'Change annotation border';
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #oldBorder: AnnotationBorder;
  readonly #newBorder: AnnotationBorder;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    oldBorder: AnnotationBorder,
    newBorder: AnnotationBorder,
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#oldBorder = oldBorder;
    this.#newBorder = newBorder;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'set annotation border',
        await page.setAnnotationBorder(
          this.#annotationIndex,
          this.#newBorder.horizontalRadius,
          this.#newBorder.verticalRadius,
          this.#newBorder.borderWidth,
        ),
      );
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        'restore annotation border',
        await page.setAnnotationBorder(
          this.#annotationIndex,
          this.#oldBorder.horizontalRadius,
          this.#oldBorder.verticalRadius,
          this.#oldBorder.borderWidth,
        ),
      );
      await page.generateContent();
    });
  }

  coalesce(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof SetAnnotationBorderCommand)) return null;
    if (this.#getPage !== next.#getPage) return null;
    if (this.#annotationIndex !== next.#annotationIndex) return null;
    return new SetAnnotationBorderCommand(this.#getPage, this.#annotationIndex, this.#oldBorder, next.#newBorder);
  }
}

/**
 * Change an annotation's string value (Contents, Author, Subject, etc.).
 */
export class SetAnnotationStringCommand implements EditorCommand {
  readonly description: string;
  readonly #getPage: PageAccessor;
  readonly #annotationIndex: number;
  readonly #key: string;
  readonly #oldValue: string;
  readonly #newValue: string;

  constructor(getPage: PageAccessor, annotationIndex: number, key: string, oldValue: string, newValue: string) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#key = key;
    this.#oldValue = oldValue;
    this.#newValue = newValue;
    this.description = `Set annotation ${key}`;
  }

  async execute(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        `set annotation ${this.#key}`,
        await page.setAnnotationString(this.#annotationIndex, this.#key, this.#newValue),
      );
      await page.generateContent();
    });
  }

  async undo(): Promise<void> {
    await withPage(this.#getPage, async (page) => {
      assertMutationSucceeded(
        `restore annotation ${this.#key}`,
        await page.setAnnotationString(this.#annotationIndex, this.#key, this.#oldValue),
      );
      await page.generateContent();
    });
  }
}

// ────────────────────────────────────────────────────────────
// Concrete commands — Page operations
// ────────────────────────────────────────────────────────────

/**
 * Options for applying page redactions in a command.
 */
export interface ApplyRedactionsCommandOptions {
  readonly fillColour?: Colour;
  readonly removeIntersectingAnnotations?: boolean;
}

/**
 * Apply pending redactions on a page.
 *
 * Undo/redo are lossless via full-document snapshots because page-level
 * redaction application is destructive and cannot be reconstructed reliably
 * from annotation primitives.
 */
export class ApplyRedactionsCommand implements EditorCommand {
  readonly description: string;
  readonly #document: WorkerPDFiumDocument;
  readonly #openDocument: DocumentOpener;
  readonly #pageIndex: number;
  readonly #options: ApplyRedactionsCommandOptions;
  #beforeDocumentBytes: Uint8Array | undefined;
  #afterDocumentBytes: Uint8Array | undefined;

  constructor(
    document: WorkerPDFiumDocument,
    openDocument: DocumentOpener,
    pageIndex: number,
    options: ApplyRedactionsCommandOptions = {},
  ) {
    this.#document = document;
    this.#openDocument = openDocument;
    this.#pageIndex = pageIndex;
    this.#options = options;
    this.description = `Apply redactions on page ${String(pageIndex + 1)}`;
  }

  async execute(): Promise<void> {
    if (this.#beforeDocumentBytes !== undefined && this.#afterDocumentBytes !== undefined) {
      await restoreDocumentFromSnapshot(this.#document, this.#afterDocumentBytes, this.#openDocument);
      return;
    }

    this.#beforeDocumentBytes = await this.#document.save();
    const page = await this.#document.getPage(this.#pageIndex);
    try {
      await page.applyRedactions(this.#options.fillColour, this.#options.removeIntersectingAnnotations);
    } finally {
      await page[Symbol.asyncDispose]();
    }
    this.#afterDocumentBytes = await this.#document.save();
  }

  async undo(): Promise<void> {
    if (this.#beforeDocumentBytes === undefined || this.#afterDocumentBytes === undefined) {
      return;
    }
    await restoreDocumentFromSnapshot(this.#document, this.#beforeDocumentBytes, this.#openDocument);
  }
}

/**
 * Delete a page from the document.
 *
 * Note: undo inserts a blank page (content cannot be fully restored
 * without re-importing from a saved copy).
 */
export class DeletePageCommand implements EditorCommand {
  readonly description: string;
  readonly #document: WorkerPDFiumDocument;
  readonly #pageIndex: number;
  readonly #width: number;
  readonly #height: number;

  constructor(document: WorkerPDFiumDocument, pageIndex: number, width: number, height: number) {
    this.#document = document;
    this.#pageIndex = pageIndex;
    this.#width = width;
    this.#height = height;
    this.description = `Delete page ${String(pageIndex + 1)}`;
  }

  async execute(): Promise<void> {
    await this.#document.deletePage(this.#pageIndex);
  }

  async undo(): Promise<void> {
    await this.#document.insertBlankPage(this.#pageIndex, this.#width, this.#height);
  }
}

/**
 * Insert a blank page into the document.
 */
export class InsertBlankPageCommand implements EditorCommand {
  readonly description: string;
  readonly #document: WorkerPDFiumDocument;
  readonly #pageIndex: number;
  readonly #width: number;
  readonly #height: number;

  constructor(document: WorkerPDFiumDocument, pageIndex: number, width = 612, height = 792) {
    this.#document = document;
    this.#pageIndex = pageIndex;
    this.#width = width;
    this.#height = height;
    this.description = `Insert blank page at ${String(pageIndex + 1)}`;
  }

  async execute(): Promise<void> {
    await this.#document.insertBlankPage(this.#pageIndex, this.#width, this.#height);
  }

  async undo(): Promise<void> {
    await this.#document.deletePage(this.#pageIndex);
  }
}

/**
 * Move pages within the document.
 */
export class MovePageCommand implements EditorCommand {
  readonly description = 'Move pages';
  readonly #document: WorkerPDFiumDocument;
  readonly #pageIndices: number[];
  readonly #destPageIndex: number;

  constructor(document: WorkerPDFiumDocument, pageIndices: number[], destPageIndex: number) {
    if (pageIndices.length > 1) {
      throw new Error('MovePageCommand only supports single-page moves');
    }
    this.#document = document;
    this.#pageIndices = pageIndices;
    this.#destPageIndex = destPageIndex;
  }

  async execute(): Promise<void> {
    await this.#document.movePages(this.#pageIndices, this.#destPageIndex);
  }

  async undo(): Promise<void> {
    // Compute reverse mapping: moved pages are now at destPageIndex..destPageIndex+N-1
    // Move them back to their original positions
    const count = this.#pageIndices.length;
    const movedIndices = Array.from({ length: count }, (_, i) => this.#destPageIndex + i);

    // The original first index is the destination for the reverse move
    const originalFirst = this.#pageIndices[0];
    if (originalFirst !== undefined) {
      await this.#document.movePages(movedIndices, originalFirst);
    }
  }
}

// ────────────────────────────────────────────────────────────
// Composite command
// ────────────────────────────────────────────────────────────

/**
 * Batches multiple commands into a single undoable operation.
 *
 * Execute runs commands in order; undo reverses them.
 */
export class CompositeCommand implements EditorCommand {
  readonly description: string;
  readonly #commands: readonly EditorCommand[];

  constructor(description: string, commands: readonly EditorCommand[]) {
    this.description = description;
    this.#commands = commands;
  }

  async execute(): Promise<void> {
    for (const command of this.#commands) {
      await command.execute();
    }
  }

  async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.#commands.length - 1; i >= 0; i--) {
      const command = this.#commands[i];
      if (command !== undefined) {
        await command.undo();
      }
    }
  }
}
