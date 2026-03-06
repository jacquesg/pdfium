/**
 * Annotation property panel.
 *
 * Displays editable fields for the currently selected annotation:
 * colour pickers, opacity, border info, contents, author, subject,
 * and type-specific details.
 *
 * @module react/editor/components/annotation-property-panel
 */

import {
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { type AnnotationBorder, type AnnotationColourType, AnnotationType, type Colour } from '../../../core/types.js';
import type { AnnotationCrudActions } from '../hooks/use-annotation-crud.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import { getLineLikeEndpoints, isLineLikeAnnotation } from '../line-utils.js';
import type { ToolConfigKey, ToolConfigMap } from '../types.js';

/**
 * Props for the `AnnotationPropertyPanel` component.
 */
export interface AnnotationPropertyPanelProps {
  /** The selected annotation's serialised data. */
  readonly annotation: SerialisedAnnotation;
  /** Annotation CRUD actions for applying changes. */
  readonly crud: AnnotationCrudActions;
  /** Whether annotation mutations are currently in-flight for this selection. */
  readonly mutationPending?: boolean;
  /**
   * Optional callback for syncing edited annotation style values back into
   * tool defaults used for newly created annotations.
   */
  readonly onToolConfigChange?: <T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => void;
  /**
   * Optional callback to publish transient preview patches while a property
   * interaction is in progress (for live visual updates without persistence).
   */
  readonly onPreviewPatch?: (annotationIndex: number, patch: OptimisticAnnotationPatch) => void;
  /** Optional callback to clear any active preview patch for this annotation. */
  readonly onClearPreviewPatch?: (annotationIndex: number) => void;
}

function colourToHex(colour: Colour | undefined): string {
  if (!colour) return '#000000';
  const r = colour.r.toString(16).padStart(2, '0');
  const g = colour.g.toString(16).padStart(2, '0');
  const b = colour.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function annotationTypeName(type: AnnotationType): string {
  const names: Partial<Record<AnnotationType, string>> = {
    [AnnotationType.Text]: 'Text Note',
    [AnnotationType.Link]: 'Link',
    [AnnotationType.FreeText]: 'Free Text',
    [AnnotationType.Line]: 'Line',
    [AnnotationType.Square]: 'Rectangle',
    [AnnotationType.Circle]: 'Circle',
    [AnnotationType.Highlight]: 'Highlight',
    [AnnotationType.Underline]: 'Underline',
    [AnnotationType.Strikeout]: 'Strikeout',
    [AnnotationType.Stamp]: 'Stamp',
    [AnnotationType.Ink]: 'Ink',
    [AnnotationType.Redact]: 'Redaction',
  };
  return names[type] ?? `Type ${String(type)}`;
}

const labelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 } as const;
const columnLabelStyle = { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 } as const;
const DEFAULT_COLOUR: Colour = { r: 0, g: 0, b: 0, a: 255 };
const TRANSPARENT_COLOUR: Colour = { r: 0, g: 0, b: 0, a: 0 };
const HIGHLIGHT_DEFAULT_COLOUR: Colour = { r: 255, g: 255, b: 0, a: 128 };
const MAX_BORDER_WIDTH = 96;
const STYLE_COMMIT_DEBOUNCE_MS = 220;

function primaryColourTypeForAnnotation(type: AnnotationType): AnnotationColourType {
  if (type === AnnotationType.Redact) {
    return 'interior';
  }
  return 'stroke';
}

function coloursEqual(a: Colour, b: Colour): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function colourRgbEqual(a: Colour, b: Colour): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

function supportsFillColour(type: AnnotationType): boolean {
  return (
    type === AnnotationType.Square ||
    type === AnnotationType.Circle ||
    type === AnnotationType.Highlight ||
    type === AnnotationType.Redact
  );
}

function supportsFillToggle(type: AnnotationType): boolean {
  return type === AnnotationType.Square || type === AnnotationType.Circle;
}

function supportsStrokeColour(type: AnnotationType): boolean {
  return type !== AnnotationType.Highlight && type !== AnnotationType.Redact;
}

function supportsBorderEditing(type: AnnotationType): boolean {
  return (
    type === AnnotationType.Square ||
    type === AnnotationType.Circle ||
    type === AnnotationType.Line ||
    type === AnnotationType.Ink
  );
}

function opacityAffectsFill(type: AnnotationType): boolean {
  return type === AnnotationType.Square || type === AnnotationType.Circle;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampBorderWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clamp(value, 0, MAX_BORDER_WIDTH);
}

function clampOpacityAlpha(value: number): number {
  if (!Number.isFinite(value)) {
    return 255;
  }
  return Math.round(clamp(value, 0, 1) * 255);
}

function parseHexToColour(hex: string, alpha: number): Colour | null {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result?.[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
    a: alpha,
  };
}

function resolvePresetTarget(type: AnnotationType): ToolConfigKey | null {
  switch (type) {
    case AnnotationType.Square:
      return 'rectangle';
    case AnnotationType.Circle:
      return 'circle';
    case AnnotationType.Line:
      return 'line';
    case AnnotationType.Ink:
      return 'ink';
    case AnnotationType.FreeText:
      return 'freetext';
    case AnnotationType.Highlight:
      return 'highlight';
    case AnnotationType.Underline:
      return 'underline';
    case AnnotationType.Strikeout:
      return 'strikeout';
    case AnnotationType.Redact:
      return 'redact';
    default:
      return null;
  }
}

function withFullAlpha(colour: Colour): Colour {
  return { ...colour, a: 255 };
}

interface PendingColourCommit {
  readonly oldColour: Colour;
  readonly newColour: Colour;
}

interface PendingBorderCommit {
  readonly oldBorder: AnnotationBorder;
  readonly newBorder: AnnotationBorder;
}

type InputEvent = ChangeEvent<HTMLInputElement> | ReactFormEvent<HTMLInputElement>;

/**
 * Panel for editing properties of a selected annotation.
 *
 * Shows type label, colour pickers (stroke + interior), opacity slider,
 * border info, contents, author, and subject fields. Changes are applied
 * immediately via the CRUD hook.
 */
export function AnnotationPropertyPanel({
  annotation,
  crud,
  mutationPending = false,
  onToolConfigChange,
  onPreviewPatch,
  onClearPreviewPatch,
}: AnnotationPropertyPanelProps): ReactNode {
  const isLineLike = isLineLikeAnnotation(annotation);
  const effectiveType = isLineLike ? AnnotationType.Line : annotation.type;
  const lineEndpoints = isLineLike ? getLineLikeEndpoints(annotation) : undefined;
  const initialStrokeColour =
    annotation.colour.stroke ??
    (effectiveType === AnnotationType.Highlight
      ? (annotation.colour.interior ?? HIGHLIGHT_DEFAULT_COLOUR)
      : DEFAULT_COLOUR);
  const initialInteriorColour =
    effectiveType === AnnotationType.Highlight
      ? (annotation.colour.stroke ?? annotation.colour.interior ?? HIGHLIGHT_DEFAULT_COLOUR)
      : (annotation.colour.interior ?? TRANSPARENT_COLOUR);
  const initialFillEnabled =
    (effectiveType === AnnotationType.Highlight
      ? (annotation.colour.stroke?.a ?? annotation.colour.interior?.a ?? HIGHLIGHT_DEFAULT_COLOUR.a)
      : (annotation.colour.interior?.a ?? 0)) > 0;
  const [localStrokeColour, setLocalStrokeColour] = useState<Colour>(initialStrokeColour);
  const [localInteriorColour, setLocalInteriorColour] = useState<Colour>(initialInteriorColour);
  const liveStrokeColourRef = useRef<Colour>(initialStrokeColour);
  const liveInteriorColourRef = useRef<Colour>(initialInteriorColour);
  const [fillEnabled, setFillEnabled] = useState(initialFillEnabled);
  const canEditStroke = supportsStrokeColour(effectiveType);
  const canEditBorder = supportsBorderEditing(effectiveType);
  const [localBorderWidth, setLocalBorderWidth] = useState<number>(
    annotation.border?.borderWidth ?? (canEditBorder ? 1 : 0),
  );
  const canEditFill = supportsFillColour(effectiveType);
  const canToggleFill = supportsFillToggle(effectiveType);
  const presetTarget = resolvePresetTarget(effectiveType);
  const fillColourType: AnnotationColourType = effectiveType === AnnotationType.Highlight ? 'stroke' : 'interior';

  const primaryColourType = primaryColourTypeForAnnotation(effectiveType);
  const primaryColour = primaryColourType === 'interior' ? localInteriorColour : localStrokeColour;
  const primaryAlpha = primaryColour?.a ?? 255;

  // Local state for text fields — commit on blur, not on every keystroke
  const [localContents, setLocalContents] = useState(annotation.contents);
  const [localAuthor, setLocalAuthor] = useState(annotation.author);
  const [localSubject, setLocalSubject] = useState(annotation.subject);
  const pendingColourCommit = useRef<Record<AnnotationColourType, PendingColourCommit | null>>({
    stroke: null,
    interior: null,
  });
  const pendingBorderCommit = useRef<PendingBorderCommit | null>(null);
  const panelRootRef = useRef<HTMLDivElement | null>(null);
  const borderEditStartRef = useRef<AnnotationBorder | null>(null);
  const inFlightStyleCommitsRef = useRef(0);
  const styleCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipContentsCommitOnBlurRef = useRef(false);
  const skipAuthorCommitOnBlurRef = useRef(false);
  const skipSubjectCommitOnBlurRef = useRef(false);
  const skipBorderCommitOnBlurRef = useRef(false);
  const applyPreviewPatch = useCallback(
    (patch: OptimisticAnnotationPatch) => {
      onPreviewPatch?.(annotation.index, patch);
    },
    [annotation.index, onPreviewPatch],
  );
  const clearPreviewPatch = useCallback(() => {
    onClearPreviewPatch?.(annotation.index);
  }, [annotation.index, onClearPreviewPatch]);

  const hasQueuedStyleCommits = useCallback(() => {
    return (
      pendingColourCommit.current.stroke !== null ||
      pendingColourCommit.current.interior !== null ||
      pendingBorderCommit.current !== null
    );
  }, []);

  const flushPreviewIfStyleIdle = useCallback(() => {
    if (hasQueuedStyleCommits()) {
      return;
    }
    if (inFlightStyleCommitsRef.current > 0) {
      return;
    }
    clearPreviewPatch();
  }, [clearPreviewPatch, hasQueuedStyleCommits]);

  const applyStrokePreset = useCallback(
    (colour: Colour) => {
      if (!onToolConfigChange || !presetTarget) return;
      switch (presetTarget) {
        case 'rectangle':
        case 'circle':
        case 'line':
          onToolConfigChange(presetTarget, { strokeColour: colour });
          return;
        case 'ink':
          onToolConfigChange('ink', { colour, strokeWidth: Math.max(0.25, localBorderWidth) });
          return;
        case 'freetext':
          onToolConfigChange('freetext', { colour });
          return;
        case 'underline':
        case 'strikeout':
          onToolConfigChange(presetTarget, { colour: withFullAlpha(colour), opacity: colour.a / 255 });
          return;
      }
    },
    [localBorderWidth, onToolConfigChange, presetTarget],
  );

  const applyFillPreset = useCallback(
    (colour: Colour, enabled: boolean) => {
      if (!onToolConfigChange || !presetTarget) return;
      switch (presetTarget) {
        case 'rectangle':
        case 'circle':
          onToolConfigChange(presetTarget, { fillColour: enabled ? colour : null });
          return;
        case 'highlight':
          onToolConfigChange('highlight', { colour: withFullAlpha(colour), opacity: colour.a / 255 });
          return;
        case 'redact':
          onToolConfigChange('redact', { fillColour: colour });
          return;
      }
    },
    [onToolConfigChange, presetTarget],
  );

  const applyBorderPreset = useCallback(
    (borderWidth: number) => {
      if (!onToolConfigChange || !presetTarget) return;
      switch (presetTarget) {
        case 'rectangle':
        case 'circle':
        case 'line':
          onToolConfigChange(presetTarget, { strokeWidth: borderWidth });
          return;
        case 'ink':
          onToolConfigChange('ink', { strokeWidth: Math.max(0.25, borderWidth) });
          return;
      }
    },
    [onToolConfigChange, presetTarget],
  );

  const applyOpacityPreset = useCallback(
    (opacity: number) => {
      if (!onToolConfigChange || !presetTarget) return;
      if (presetTarget === 'highlight' || presetTarget === 'underline' || presetTarget === 'strikeout') {
        onToolConfigChange(presetTarget, { opacity });
      }
    },
    [onToolConfigChange, presetTarget],
  );

  const getEditableBorder = useCallback(
    (borderWidth: number): AnnotationBorder | null => {
      if (annotation.border !== null) {
        return {
          ...annotation.border,
          borderWidth: clampBorderWidth(borderWidth),
        };
      }
      if (!canEditBorder) {
        return null;
      }
      return {
        horizontalRadius: 0,
        verticalRadius: 0,
        borderWidth: clampBorderWidth(borderWidth),
      };
    },
    [annotation.border, canEditBorder],
  );

  const getPersistedEditableBorder = useCallback((): AnnotationBorder | null => {
    if (annotation.border !== null) {
      return {
        ...annotation.border,
        borderWidth: clampBorderWidth(annotation.border.borderWidth),
      };
    }
    if (!canEditBorder) {
      return null;
    }
    return {
      horizontalRadius: 0,
      verticalRadius: 0,
      borderWidth: 1,
    };
  }, [annotation.border, canEditBorder]);

  const getPreservedBorder = useCallback(() => {
    if (annotation.border === null) {
      if (canEditBorder) {
        return {
          horizontalRadius: 0,
          verticalRadius: 0,
          borderWidth: Math.max(1, clampBorderWidth(localBorderWidth)),
        };
      }
      return null;
    }
    return {
      ...annotation.border,
      borderWidth: clampBorderWidth(localBorderWidth),
    };
  }, [annotation.border, canEditBorder, localBorderWidth]);
  const getPreservedBorderRef = useRef(getPreservedBorder);
  getPreservedBorderRef.current = getPreservedBorder;
  const persistedBorderForCommitRef = useRef<AnnotationBorder | null>(getPersistedEditableBorder());

  const clearPendingColourCommit = useCallback((colourType?: AnnotationColourType) => {
    if (colourType !== undefined) {
      pendingColourCommit.current[colourType] = null;
      return;
    }
    pendingColourCommit.current.stroke = null;
    pendingColourCommit.current.interior = null;
  }, []);

  const clearPendingBorderCommit = useCallback(() => {
    pendingBorderCommit.current = null;
    borderEditStartRef.current = null;
  }, []);

  const clearStyleCommitTimer = useCallback(() => {
    const timer = styleCommitTimerRef.current;
    if (timer === null) return;
    clearTimeout(timer);
    styleCommitTimerRef.current = null;
  }, []);

  const flushStyleCommitsRef = useRef<() => void>(() => {});

  const scheduleStyleCommit = useCallback(() => {
    clearStyleCommitTimer();
    styleCommitTimerRef.current = setTimeout(() => {
      styleCommitTimerRef.current = null;
      flushStyleCommitsRef.current();
    }, STYLE_COMMIT_DEBOUNCE_MS);
  }, [clearStyleCommitTimer]);

  const commitPendingColour = useCallback(
    (colourType: AnnotationColourType) => {
      const pending = pendingColourCommit.current[colourType];
      if (!pending) return;
      pendingColourCommit.current[colourType] = null;

      if (coloursEqual(pending.oldColour, pending.newColour)) {
        flushPreviewIfStyleIdle();
        return;
      }

      inFlightStyleCommitsRef.current += 1;
      const preserveBorder = colourRgbEqual(pending.oldColour, pending.newColour)
        ? null
        : getPreservedBorderRef.current();
      void crud
        .setAnnotationColour(annotation.index, colourType, pending.oldColour, pending.newColour, preserveBorder)
        .finally(() => {
          inFlightStyleCommitsRef.current = Math.max(0, inFlightStyleCommitsRef.current - 1);
          flushPreviewIfStyleIdle();
        });
    },
    [annotation.index, crud, flushPreviewIfStyleIdle],
  );

  const commitPendingColours = useCallback(() => {
    commitPendingColour('stroke');
    commitPendingColour('interior');
  }, [commitPendingColour]);

  const queueColourCommit = useCallback(
    (colourType: AnnotationColourType, oldColour: Colour, newColour: Colour) => {
      const previousPending = pendingColourCommit.current[colourType];
      const baseOldColour = previousPending?.oldColour ?? oldColour;

      pendingColourCommit.current[colourType] = {
        oldColour: baseOldColour,
        newColour,
      };
      scheduleStyleCommit();
    },
    [scheduleStyleCommit],
  );

  const commitPendingBorder = useCallback(() => {
    const pending = pendingBorderCommit.current;
    if (!pending) {
      borderEditStartRef.current = null;
      return;
    }

    pendingBorderCommit.current = null;

    if (Math.abs(pending.oldBorder.borderWidth - pending.newBorder.borderWidth) < 0.001) {
      borderEditStartRef.current = null;
      flushPreviewIfStyleIdle();
      return;
    }

    inFlightStyleCommitsRef.current += 1;
    void crud.setAnnotationBorder(annotation.index, pending.oldBorder, pending.newBorder).finally(() => {
      borderEditStartRef.current = null;
      persistedBorderForCommitRef.current = pending.newBorder;
      inFlightStyleCommitsRef.current = Math.max(0, inFlightStyleCommitsRef.current - 1);
      flushPreviewIfStyleIdle();
    });
  }, [annotation.index, crud, flushPreviewIfStyleIdle]);

  const commitPendingStyleAtomic = useCallback(() => {
    if (crud.setAnnotationStyle === undefined) {
      commitPendingColours();
      commitPendingBorder();
      return;
    }

    const pendingStroke = pendingColourCommit.current.stroke;
    const pendingInterior = pendingColourCommit.current.interior;
    const pendingBorder = pendingBorderCommit.current;

    pendingColourCommit.current.stroke = null;
    pendingColourCommit.current.interior = null;
    pendingBorderCommit.current = null;
    borderEditStartRef.current = null;

    const stylePreserveBorder = pendingBorder?.newBorder ?? getPreservedBorderRef.current();
    const stroke =
      pendingStroke && !coloursEqual(pendingStroke.oldColour, pendingStroke.newColour)
        ? {
            colourType: 'stroke' as const,
            oldColour: pendingStroke.oldColour,
            newColour: pendingStroke.newColour,
            preserveBorder: colourRgbEqual(pendingStroke.oldColour, pendingStroke.newColour)
              ? null
              : stylePreserveBorder,
          }
        : undefined;
    const interior =
      pendingInterior && !coloursEqual(pendingInterior.oldColour, pendingInterior.newColour)
        ? {
            colourType: 'interior' as const,
            oldColour: pendingInterior.oldColour,
            newColour: pendingInterior.newColour,
            preserveBorder: colourRgbEqual(pendingInterior.oldColour, pendingInterior.newColour)
              ? null
              : stylePreserveBorder,
          }
        : undefined;
    const border =
      pendingBorder && Math.abs(pendingBorder.oldBorder.borderWidth - pendingBorder.newBorder.borderWidth) >= 0.001
        ? pendingBorder
        : undefined;

    if (stroke === undefined && interior === undefined && border === undefined) {
      flushPreviewIfStyleIdle();
      return;
    }

    inFlightStyleCommitsRef.current += 1;
    void crud
      .setAnnotationStyle(annotation.index, {
        ...(stroke !== undefined ? { stroke } : {}),
        ...(interior !== undefined ? { interior } : {}),
        ...(border !== undefined ? { border } : {}),
      })
      .finally(() => {
        if (border !== undefined) {
          persistedBorderForCommitRef.current = border.newBorder;
        }
        inFlightStyleCommitsRef.current = Math.max(0, inFlightStyleCommitsRef.current - 1);
        flushPreviewIfStyleIdle();
      });
  }, [annotation.index, commitPendingBorder, commitPendingColours, crud, flushPreviewIfStyleIdle]);

  const flushStyleCommits = useCallback(() => {
    clearStyleCommitTimer();
    commitPendingStyleAtomic();
  }, [clearStyleCommitTimer, commitPendingStyleAtomic]);

  flushStyleCommitsRef.current = flushStyleCommits;
  const clearPendingColourCommitRef = useRef(clearPendingColourCommit);
  clearPendingColourCommitRef.current = clearPendingColourCommit;
  const clearPendingBorderCommitRef = useRef(clearPendingBorderCommit);
  clearPendingBorderCommitRef.current = clearPendingBorderCommit;
  const flushPreviewIfStyleIdleRef = useRef(flushPreviewIfStyleIdle);
  flushPreviewIfStyleIdleRef.current = flushPreviewIfStyleIdle;
  const previousAnnotationIndexRef = useRef(annotation.index);

  const flushTransientEditingState = useCallback(() => {
    flushStyleCommitsRef.current();
    clearPendingColourCommitRef.current();
    clearPendingBorderCommitRef.current();
    flushPreviewIfStyleIdleRef.current();
  }, []);

  const queueBorderCommit = useCallback(
    (nextBorderWidth: number) => {
      const previousPending = pendingBorderCommit.current;
      const persistedBorder = persistedBorderForCommitRef.current;
      const templateBorder = previousPending?.newBorder ?? persistedBorder;
      if (templateBorder === null) return;
      const baseOldBorder = previousPending?.oldBorder ?? borderEditStartRef.current ?? templateBorder;
      const nextBorder: AnnotationBorder = {
        ...templateBorder,
        borderWidth: clampBorderWidth(nextBorderWidth),
      };

      pendingBorderCommit.current = {
        oldBorder: baseOldBorder,
        newBorder: nextBorder,
      };
      scheduleStyleCommit();
    },
    [scheduleStyleCommit],
  );

  // Sync local state from the selected annotation.
  useEffect(() => {
    setLocalContents(annotation.contents);
    setLocalAuthor(annotation.author);
    setLocalSubject(annotation.subject);
  }, [annotation.contents, annotation.author, annotation.subject]);

  // Flush/clear transient editing state when switching annotations.
  useEffect(() => {
    if (previousAnnotationIndexRef.current === annotation.index) {
      return;
    }

    flushTransientEditingState();
    skipContentsCommitOnBlurRef.current = false;
    skipAuthorCommitOnBlurRef.current = false;
    skipSubjectCommitOnBlurRef.current = false;
    skipBorderCommitOnBlurRef.current = false;
    previousAnnotationIndexRef.current = annotation.index;
  }, [annotation.index, flushTransientEditingState]);

  // Flush/clear transient editing state on unmount.
  useEffect(() => {
    return () => {
      flushTransientEditingState();
    };
  }, [flushTransientEditingState]);

  useEffect(() => {
    if (pendingColourCommit.current.stroke !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    if (effectiveType === AnnotationType.Highlight) {
      const nextStroke = annotation.colour.stroke ?? annotation.colour.interior ?? HIGHLIGHT_DEFAULT_COLOUR;
      setLocalStrokeColour(nextStroke);
      liveStrokeColourRef.current = nextStroke;
      return;
    }
    const nextStroke = annotation.colour.stroke ?? DEFAULT_COLOUR;
    setLocalStrokeColour(nextStroke);
    liveStrokeColourRef.current = nextStroke;
  }, [effectiveType, annotation.colour.stroke, annotation.colour.interior]);

  useEffect(() => {
    if (pendingColourCommit.current[fillColourType] !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    if (effectiveType === AnnotationType.Highlight) {
      const nextInterior = annotation.colour.stroke ?? annotation.colour.interior ?? HIGHLIGHT_DEFAULT_COLOUR;
      setLocalInteriorColour(nextInterior);
      liveInteriorColourRef.current = nextInterior;
      return;
    }
    const nextInterior = annotation.colour.interior ?? TRANSPARENT_COLOUR;
    setLocalInteriorColour(nextInterior);
    liveInteriorColourRef.current = nextInterior;
  }, [effectiveType, fillColourType, annotation.colour.stroke, annotation.colour.interior]);

  useEffect(() => {
    if (effectiveType !== AnnotationType.Highlight) return;
    setLocalInteriorColour(localStrokeColour);
    liveInteriorColourRef.current = localStrokeColour;
  }, [effectiveType, localStrokeColour]);

  useEffect(() => {
    liveStrokeColourRef.current = localStrokeColour;
  }, [localStrokeColour]);

  useEffect(() => {
    liveInteriorColourRef.current = localInteriorColour;
  }, [localInteriorColour]);

  useEffect(() => {
    if (pendingColourCommit.current[fillColourType] !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    const alpha =
      effectiveType === AnnotationType.Highlight
        ? (annotation.colour.stroke?.a ?? annotation.colour.interior?.a ?? HIGHLIGHT_DEFAULT_COLOUR.a)
        : (annotation.colour.interior?.a ?? 0);
    setFillEnabled(alpha > 0);
  }, [effectiveType, fillColourType, annotation.colour.stroke?.a, annotation.colour.interior?.a]);

  useEffect(() => {
    if (pendingBorderCommit.current !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    const persistedBorder = getPersistedEditableBorder();
    persistedBorderForCommitRef.current = persistedBorder;
    setLocalBorderWidth(persistedBorder?.borderWidth ?? 0);
  }, [getPersistedEditableBorder]);

  useEffect(() => {
    const handleFlushPendingCommits = () => {
      flushStyleCommitsRef.current();
    };

    globalThis.addEventListener('pdfium-editor-flush-pending-commits', handleFlushPendingCommits);
    return () => {
      globalThis.removeEventListener('pdfium-editor-flush-pending-commits', handleFlushPendingCommits);
    };
  }, []);

  const handleStrokeColourChange = useCallback(
    (e: InputEvent) => {
      if (!canEditStroke) return;
      const oldColour = liveStrokeColourRef.current;
      const newColour = parseHexToColour(e.currentTarget.value, oldColour.a);
      if (newColour === null) return;
      if (coloursEqual(oldColour, newColour)) return;
      setLocalStrokeColour(newColour);
      liveStrokeColourRef.current = newColour;
      applyPreviewPatch({
        colour: {
          stroke: newColour,
        },
      });
      applyStrokePreset(newColour);
      queueColourCommit('stroke', oldColour, newColour);
    },
    [applyPreviewPatch, applyStrokePreset, canEditStroke, queueColourCommit],
  );

  const handleInteriorColourChange = useCallback(
    (e: InputEvent) => {
      if (!canEditFill) return;
      const oldColour = fillColourType === 'stroke' ? liveStrokeColourRef.current : liveInteriorColourRef.current;
      const newColour = parseHexToColour(e.currentTarget.value, oldColour.a);
      if (newColour === null) return;
      if (coloursEqual(oldColour, newColour)) return;
      if (fillColourType === 'stroke') {
        setLocalStrokeColour(newColour);
        liveStrokeColourRef.current = newColour;
      }
      setLocalInteriorColour(newColour);
      liveInteriorColourRef.current = newColour;
      applyPreviewPatch({
        colour:
          fillColourType === 'stroke'
            ? {
                stroke: newColour,
              }
            : {
                interior: newColour,
              },
      });
      applyFillPreset(newColour, !canToggleFill || fillEnabled);
      queueColourCommit(fillColourType, oldColour, newColour);
    },
    [applyPreviewPatch, applyFillPreset, canEditFill, canToggleFill, fillColourType, fillEnabled, queueColourCommit],
  );

  const handleFillEnabledChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!canToggleFill) return;
      const nextEnabled = e.currentTarget.checked;
      const previousInterior = liveInteriorColourRef.current;
      const sourceInterior = annotation.colour.interior ?? previousInterior;
      const fallbackAlpha = liveStrokeColourRef.current.a > 0 ? liveStrokeColourRef.current.a : 255;
      const nextColour = nextEnabled
        ? { ...previousInterior, a: previousInterior.a > 0 ? previousInterior.a : fallbackAlpha }
        : { ...previousInterior, a: 0 };
      setFillEnabled(nextEnabled);
      setLocalInteriorColour(nextColour);
      liveInteriorColourRef.current = nextColour;
      applyPreviewPatch({
        colour: {
          interior: nextColour,
        },
      });
      applyFillPreset(nextColour, nextEnabled);
      if (!coloursEqual(sourceInterior, nextColour)) {
        queueColourCommit(fillColourType, sourceInterior, nextColour);
        return;
      }
      flushPreviewIfStyleIdle();
    },
    [
      annotation.colour.interior,
      applyPreviewPatch,
      applyFillPreset,
      canToggleFill,
      fillColourType,
      flushPreviewIfStyleIdle,
      queueColourCommit,
    ],
  );

  const handleOpacityChange = useCallback(
    (parsed: number) => {
      if (!Number.isFinite(parsed)) return;
      const nextAlpha = clampOpacityAlpha(parsed);
      const nextOpacity = nextAlpha / 255;
      if (opacityAffectsFill(effectiveType)) {
        const currentStroke = liveStrokeColourRef.current;
        const currentInterior = liveInteriorColourRef.current;
        const nextStroke = currentStroke.a === nextAlpha ? currentStroke : { ...currentStroke, a: nextAlpha };
        const nextInteriorAlpha = fillEnabled ? nextAlpha : 0;
        const nextInterior =
          currentInterior.a === nextInteriorAlpha ? currentInterior : { ...currentInterior, a: nextInteriorAlpha };
        const strokeChanged = currentStroke.a !== nextStroke.a;
        const interiorChanged = currentInterior.a !== nextInterior.a;
        if (!strokeChanged && !interiorChanged) {
          return;
        }
        if (strokeChanged) {
          setLocalStrokeColour(nextStroke);
          liveStrokeColourRef.current = nextStroke;
          applyStrokePreset(nextStroke);
          queueColourCommit('stroke', currentStroke, nextStroke);
        }
        if (interiorChanged) {
          setLocalInteriorColour(nextInterior);
          liveInteriorColourRef.current = nextInterior;
          applyFillPreset(nextInterior, !canToggleFill || fillEnabled);
          queueColourCommit('interior', currentInterior, nextInterior);
        }
        applyPreviewPatch({
          colour: {
            ...(strokeChanged ? { stroke: nextStroke } : {}),
            ...(interiorChanged ? { interior: nextInterior } : {}),
          },
        });
        applyOpacityPreset(nextOpacity);
        return;
      }
      if (primaryColourType === 'interior') {
        const currentInterior = liveInteriorColourRef.current;
        if (currentInterior.a === nextAlpha) {
          return;
        }
        const next = { ...currentInterior, a: nextAlpha };
        setLocalInteriorColour(next);
        liveInteriorColourRef.current = next;
        applyPreviewPatch({
          colour: {
            interior: next,
          },
        });
        applyFillPreset(next, !canToggleFill || fillEnabled);
        applyOpacityPreset(nextOpacity);
        queueColourCommit('interior', currentInterior, next);
        return;
      }
      const currentStroke = liveStrokeColourRef.current;
      if (currentStroke.a === nextAlpha) {
        return;
      }
      const next = { ...currentStroke, a: nextAlpha };
      setLocalStrokeColour(next);
      liveStrokeColourRef.current = next;
      applyPreviewPatch({
        colour: {
          stroke: next,
        },
      });
      applyStrokePreset(next);
      applyOpacityPreset(nextOpacity);
      queueColourCommit('stroke', currentStroke, next);
    },
    [
      applyPreviewPatch,
      applyFillPreset,
      applyOpacityPreset,
      applyStrokePreset,
      canToggleFill,
      effectiveType,
      fillEnabled,
      primaryColourType,
      queueColourCommit,
    ],
  );

  const handleOpacityInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleOpacityChange(Number(e.currentTarget.value));
    },
    [handleOpacityChange],
  );

  const applyOpacityFromClientX = useCallback(
    (slider: HTMLInputElement, clientX: number) => {
      const rect = slider.getBoundingClientRect();
      if (rect.width <= 0) return;
      const min = Number(slider.min || '0');
      const max = Number(slider.max || '1');
      const step = Number(slider.step || '0.01');
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      let pointerValue = min + ratio * (max - min);
      if (Number.isFinite(step) && step > 0) {
        pointerValue = Math.round(pointerValue / step) * step;
      }
      handleOpacityChange(pointerValue);
    },
    [handleOpacityChange],
  );

  const handleOpacityClick = useCallback(
    (event: ReactMouseEvent<HTMLInputElement>) => {
      applyOpacityFromClientX(event.currentTarget, event.clientX);
      flushStyleCommits();
    },
    [applyOpacityFromClientX, flushStyleCommits],
  );

  const handleOpacityPointerEnd = useCallback(
    (_event: ReactPointerEvent<HTMLInputElement>) => {
      flushStyleCommits();
    },
    [flushStyleCommits],
  );

  const handleOpacityMouseEnd = useCallback(
    (_event: ReactMouseEvent<HTMLInputElement>) => {
      flushStyleCommits();
    },
    [flushStyleCommits],
  );

  const handleStyleInputBlur = useCallback(
    (event: ReactFocusEvent<HTMLInputElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Element && panelRootRef.current?.contains(nextTarget)) {
        return;
      }
      flushStyleCommits();
    },
    [flushStyleCommits],
  );

  const handleBorderWidthChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(e.currentTarget.value);
      if (!Number.isFinite(parsed)) return;
      const nextBorderWidth = clampBorderWidth(parsed);
      if (Math.abs(nextBorderWidth - localBorderWidth) < 0.001) {
        return;
      }
      setLocalBorderWidth(nextBorderWidth);
      const previewBorder = getEditableBorder(nextBorderWidth);
      if (previewBorder !== null) {
        applyPreviewPatch({
          border: previewBorder,
        });
      }
      applyBorderPreset(nextBorderWidth);
      queueBorderCommit(nextBorderWidth);
    },
    [applyBorderPreset, applyPreviewPatch, getEditableBorder, queueBorderCommit, localBorderWidth],
  );

  const handleBorderWidthCommit = useCallback(
    (event?: { currentTarget: { value: string } }) => {
      if (skipBorderCommitOnBlurRef.current) {
        skipBorderCommitOnBlurRef.current = false;
        return;
      }
      if (pendingBorderCommit.current === null) {
        const fromEvent = event !== undefined ? Number(event.currentTarget.value) : localBorderWidth;
        const clamped = clampBorderWidth(fromEvent);
        const persisted = persistedBorderForCommitRef.current;
        const persistedWidth = persisted?.borderWidth ?? 0;
        if (Math.abs(clamped - persistedWidth) >= 0.001) {
          queueBorderCommit(clamped);
        }
      }
      clearStyleCommitTimer();
      flushStyleCommits();
    },
    [clearStyleCommitTimer, flushStyleCommits, localBorderWidth, queueBorderCommit],
  );

  const handleContentsChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContents(e.target.value);
  }, []);

  const handleContentsKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      skipContentsCommitOnBlurRef.current = true;
      setLocalContents(annotation.contents);
      e.currentTarget.blur();
    },
    [annotation.contents],
  );

  const handleContentsBlur = useCallback(() => {
    if (skipContentsCommitOnBlurRef.current) {
      skipContentsCommitOnBlurRef.current = false;
      return;
    }
    if (localContents !== annotation.contents) {
      void crud.setAnnotationString(annotation.index, 'Contents', annotation.contents, localContents);
    }
  }, [localContents, annotation.index, annotation.contents, crud]);

  const handleAuthorChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLocalAuthor(e.target.value);
  }, []);

  const handleAuthorKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      skipAuthorCommitOnBlurRef.current = true;
      setLocalAuthor(annotation.author);
      e.currentTarget.blur();
    },
    [annotation.author],
  );

  const handleAuthorBlur = useCallback(() => {
    if (skipAuthorCommitOnBlurRef.current) {
      skipAuthorCommitOnBlurRef.current = false;
      return;
    }
    if (localAuthor !== annotation.author) {
      void crud.setAnnotationString(annotation.index, 'T', annotation.author, localAuthor);
    }
  }, [localAuthor, annotation.index, annotation.author, crud]);

  const handleSubjectChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLocalSubject(e.target.value);
  }, []);

  const handleSubjectKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      skipSubjectCommitOnBlurRef.current = true;
      setLocalSubject(annotation.subject);
      e.currentTarget.blur();
    },
    [annotation.subject],
  );

  const handleSubjectBlur = useCallback(() => {
    if (skipSubjectCommitOnBlurRef.current) {
      skipSubjectCommitOnBlurRef.current = false;
      return;
    }
    if (localSubject !== annotation.subject) {
      void crud.setAnnotationString(annotation.index, 'Subj', annotation.subject, localSubject);
    }
  }, [localSubject, annotation.index, annotation.subject, crud]);

  const displayedBorder = getEditableBorder(localBorderWidth);

  return (
    <div
      ref={panelRootRef}
      data-testid="annotation-property-panel"
      aria-busy={mutationPending}
      style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ fontWeight: 600, fontSize: 13 }}>Annotation Properties</div>

      {/* Type label */}
      <div data-testid="annotation-type-label" style={{ fontSize: 11, color: '#666' }}>
        Type: {annotationTypeName(effectiveType)}
      </div>

      {/* Stroke colour */}
      {canEditStroke && (
        <label style={labelStyle}>
          Stroke
          <input
            data-testid="stroke-colour-input"
            type="color"
            value={colourToHex(localStrokeColour)}
            onChange={handleStrokeColourChange}
            onInput={handleStrokeColourChange}
            onBlur={handleStyleInputBlur}
          />
        </label>
      )}

      {/* Fill colour */}
      {canEditFill && (
        <label style={labelStyle}>
          Fill
          {canToggleFill && (
            <input
              data-testid="fill-enabled-input"
              type="checkbox"
              checked={fillEnabled}
              onChange={handleFillEnabledChange}
              title="Enable fill"
            />
          )}
          <input
            data-testid="interior-colour-input"
            type="color"
            value={colourToHex(localInteriorColour)}
            onChange={handleInteriorColourChange}
            onInput={handleInteriorColourChange}
            onBlur={handleStyleInputBlur}
            disabled={canToggleFill && !fillEnabled}
          />
          {canToggleFill && !fillEnabled && <span style={{ fontSize: 11, color: '#666' }}>None</span>}
        </label>
      )}

      {/* Opacity */}
      <label style={labelStyle}>
        Opacity
        <input
          data-testid="opacity-input"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={primaryAlpha / 255}
          onChange={handleOpacityInputChange}
          onBlur={handleStyleInputBlur}
          onClick={handleOpacityClick}
          onPointerUp={handleOpacityPointerEnd}
          onMouseUp={handleOpacityMouseEnd}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 11, minWidth: 32 }}>{Math.round((primaryAlpha / 255) * 100)}%</span>
      </label>

      {/* Border controls */}
      {displayedBorder !== null && (
        <>
          <label style={labelStyle}>
            Border
            <input
              data-testid="border-width-input"
              type="number"
              min="0"
              max={MAX_BORDER_WIDTH}
              step="0.5"
              value={localBorderWidth}
              onFocus={() => {
                borderEditStartRef.current = persistedBorderForCommitRef.current;
              }}
              onChange={handleBorderWidthChange}
              onBlur={handleBorderWidthCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                  return;
                }
                if (event.key === 'Escape') {
                  skipBorderCommitOnBlurRef.current = true;
                  borderEditStartRef.current = null;
                  clearPendingBorderCommit();
                  flushPreviewIfStyleIdle();
                  setLocalBorderWidth(annotation.border?.borderWidth ?? (canEditBorder ? 1 : 0));
                  event.currentTarget.blur();
                }
              }}
              style={{ width: 72 }}
            />
            <span style={{ fontSize: 11 }}>px</span>
          </label>
          <div data-testid="border-info" style={{ fontSize: 12, color: '#666' }}>
            Radius: {displayedBorder.horizontalRadius}px / {displayedBorder.verticalRadius}px
          </div>
        </>
      )}

      {/* Contents */}
      <label style={columnLabelStyle}>
        Contents
        <textarea
          data-testid="contents-input"
          value={localContents}
          onChange={handleContentsChange}
          onKeyDown={handleContentsKeyDown}
          onBlur={handleContentsBlur}
          rows={3}
          style={{ fontSize: 12, resize: 'vertical' }}
        />
      </label>

      {/* Author */}
      <label style={columnLabelStyle}>
        Author
        <input
          data-testid="author-input"
          type="text"
          value={localAuthor}
          onChange={handleAuthorChange}
          onKeyDown={handleAuthorKeyDown}
          onBlur={handleAuthorBlur}
          style={{ fontSize: 12 }}
        />
      </label>

      {/* Subject */}
      <label style={columnLabelStyle}>
        Subject
        <input
          data-testid="subject-input"
          type="text"
          value={localSubject}
          onChange={handleSubjectChange}
          onKeyDown={handleSubjectKeyDown}
          onBlur={handleSubjectBlur}
          style={{ fontSize: 12 }}
        />
      </label>

      {/* Type-specific info */}
      {effectiveType === AnnotationType.Ink && annotation.inkPaths !== undefined && (
        <div data-testid="ink-info" style={{ fontSize: 11, color: '#666' }}>
          Ink strokes: {annotation.inkPaths.length}
        </div>
      )}

      {effectiveType === AnnotationType.Line && lineEndpoints !== undefined && (
        <div data-testid="line-info" style={{ fontSize: 11, color: '#666' }}>
          Line: ({lineEndpoints.start.x.toFixed(1)}, {lineEndpoints.start.y.toFixed(1)}) to (
          {lineEndpoints.end.x.toFixed(1)}, {lineEndpoints.end.y.toFixed(1)})
        </div>
      )}

      {(effectiveType === AnnotationType.Highlight ||
        effectiveType === AnnotationType.Underline ||
        effectiveType === AnnotationType.Strikeout) &&
        annotation.attachmentPoints !== undefined && (
          <div data-testid="markup-info" style={{ fontSize: 11, color: '#666' }}>
            Quad points: {annotation.attachmentPoints.length}
          </div>
        )}
    </div>
  );
}
