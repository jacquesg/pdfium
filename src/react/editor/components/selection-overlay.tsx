/**
 * Selection overlay for a selected annotation.
 *
 * Uses box semantics for generic annotations and endpoint semantics for
 * line-like annotations. During active transforms it renders live vector
 * previews so the user sees the actual geometry change, not just a bounds box.
 *
 * @module react/editor/components/selection-overlay
 */

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Colour, Point, Rect } from '../../../core/types.js';
import { pdfRectToScreen, pdfToScreen, screenToPdf } from '../../coordinates.js';
import {
  applyConstrainedCreationPoint,
  type BoxResizeHandle,
  clampScreenPoint,
  getBoxHandlePoint,
  resizeScreenRectFromHandle,
  type ScreenPoint,
  type ScreenRect,
} from '../shape-constraints.js';

const HANDLE_VISUAL_SIZE = 8;
const HANDLE_HIT_SIZE = 20;
const HALF_HANDLE_VISUAL = HANDLE_VISUAL_SIZE / 2;
const HANDLE_HIT_PADDING = (HANDLE_HIT_SIZE - HANDLE_VISUAL_SIZE) / 2;
const MIN_RESIZE_SIZE = 10;
const MOUSE_DRAG_POINTER_ID = -1;
const RECT_EPSILON = 0.01;
const LINE_INTERACTION_PADDING = 12;
const DEFAULT_STROKE_PREVIEW_COLOUR = 'rgba(15, 23, 42, 0.78)';
const DEFAULT_HANDLE_BORDER_COLOUR = 'rgba(15, 23, 42, 0.78)';
const DEFAULT_HANDLE_FILL_COLOUR = '#ffffff';
const DEFAULT_BOUNDS_BORDER_COLOUR = 'rgba(15, 23, 42, 0.24)';
const DEFAULT_DISABLED_BOUNDS_BORDER_COLOUR = 'rgba(15, 23, 42, 0.28)';
const DEFAULT_DISABLED_BOUNDS_BACKGROUND = 'rgba(15, 23, 42, 0.03)';
const DEFAULT_MARKUP_SELECTION_STROKE = 'rgba(15, 23, 42, 0.34)';
const DEFAULT_MARKUP_SELECTION_FILL = 'rgba(15, 23, 42, 0.06)';

type HandlePosition = BoxResizeHandle;
type LineHandlePosition = 'start' | 'end';
type TextMarkupSelectionKind = 'highlight' | 'underline' | 'strikeout' | 'squiggly';

const BOX_HANDLES: readonly HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const BOX_CURSOR_MAP: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

interface ScreenLine {
  start: ScreenPoint;
  end: ScreenPoint;
}

interface SelectionMarkupQuad {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

type SelectionOverlayAppearance =
  | {
      kind: 'bounds';
    }
  | {
      kind: 'rectangle';
      strokeColour?: Colour;
      fillColour?: Colour | null;
      strokeWidth?: number;
    }
  | {
      kind: 'ellipse';
      strokeColour?: Colour;
      fillColour?: Colour | null;
      strokeWidth?: number;
    }
  | {
      kind: 'line';
      endpoints: {
        start: Point;
        end: Point;
      };
      strokeColour?: Colour;
      strokeWidth?: number;
    }
  | {
      kind: 'text-markup';
      markupType: TextMarkupSelectionKind;
      quads: readonly SelectionMarkupQuad[];
    };

interface BoxMoveDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenRect: ScreenRect;
  mode: 'move';
}

interface BoxResizeDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenRect: ScreenRect;
  mode: 'resize';
  handle: HandlePosition;
}

interface LineMoveDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenLine: ScreenLine;
  mode: 'line-move';
}

interface LineResizeDragSession {
  pointerId: number;
  captureElement: Element | null;
  x: number;
  y: number;
  screenLine: ScreenLine;
  mode: 'line-resize';
  handle: LineHandlePosition;
}

type DragSession = BoxMoveDragSession | BoxResizeDragSession | LineMoveDragSession | LineResizeDragSession;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampScreenRectOrigin(screenRect: ScreenRect, maxWidth: number, maxHeight: number): ScreenRect {
  const maxX = Number.isFinite(maxWidth) ? Math.max(0, maxWidth - screenRect.width) : Number.POSITIVE_INFINITY;
  const maxY = Number.isFinite(maxHeight) ? Math.max(0, maxHeight - screenRect.height) : Number.POSITIVE_INFINITY;
  return {
    ...screenRect,
    x: clamp(screenRect.x, 0, maxX),
    y: clamp(screenRect.y, 0, maxY),
  };
}

function getHandleOffset(handle: HandlePosition, width: number, height: number): { x: number; y: number } {
  const xMap: Record<HandlePosition, number> = {
    nw: 0,
    n: width / 2,
    ne: width,
    e: width,
    se: width,
    s: width / 2,
    sw: 0,
    w: 0,
  };
  const yMap: Record<HandlePosition, number> = {
    nw: 0,
    n: 0,
    ne: 0,
    e: height / 2,
    se: height,
    s: height,
    sw: height,
    w: height / 2,
  };
  return {
    x: xMap[handle] - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
    y: yMap[handle] - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
  };
}

function getLineBounds(line: ScreenLine): ScreenRect {
  return {
    x: Math.min(line.start.x, line.end.x),
    y: Math.min(line.start.y, line.end.y),
    width: Math.max(0, Math.abs(line.end.x - line.start.x)),
    height: Math.max(0, Math.abs(line.end.y - line.start.y)),
  };
}

function getLineOverlayRect(line: ScreenLine, maxWidth: number, maxHeight: number): ScreenRect {
  const bounds = getLineBounds(line);
  const left = Number.isFinite(maxWidth)
    ? clamp(bounds.x - LINE_INTERACTION_PADDING, 0, maxWidth)
    : bounds.x - LINE_INTERACTION_PADDING;
  const top = Number.isFinite(maxHeight)
    ? clamp(bounds.y - LINE_INTERACTION_PADDING, 0, maxHeight)
    : bounds.y - LINE_INTERACTION_PADDING;
  const right = Number.isFinite(maxWidth)
    ? clamp(bounds.x + bounds.width + LINE_INTERACTION_PADDING, left, maxWidth)
    : bounds.x + bounds.width + LINE_INTERACTION_PADDING;
  const bottom = Number.isFinite(maxHeight)
    ? clamp(bounds.y + bounds.height + LINE_INTERACTION_PADDING, top, maxHeight)
    : bounds.y + bounds.height + LINE_INTERACTION_PADDING;
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function screenRectToPdfRect(screenRect: ScreenRect, scale: number, originalHeight: number): Rect {
  const topLeft = screenToPdf({ x: screenRect.x, y: screenRect.y }, { scale, originalHeight });
  const bottomRight = screenToPdf(
    { x: screenRect.x + screenRect.width, y: screenRect.y + screenRect.height },
    { scale, originalHeight },
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
}

function screenPointToPdfPoint(point: ScreenPoint, scale: number, originalHeight: number): Point {
  return screenToPdf(point, { scale, originalHeight });
}

function screenLineToPdfRect(line: ScreenLine, scale: number, originalHeight: number): Rect {
  return screenRectToPdfRect(getLineBounds(line), scale, originalHeight);
}

function isSameRect(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.left - b.left) < RECT_EPSILON &&
    Math.abs(a.top - b.top) < RECT_EPSILON &&
    Math.abs(a.right - b.right) < RECT_EPSILON &&
    Math.abs(a.bottom - b.bottom) < RECT_EPSILON
  );
}

function isSameScreenRect(a: ScreenRect, b: ScreenRect): boolean {
  return (
    Math.abs(a.x - b.x) < RECT_EPSILON &&
    Math.abs(a.y - b.y) < RECT_EPSILON &&
    Math.abs(a.width - b.width) < RECT_EPSILON &&
    Math.abs(a.height - b.height) < RECT_EPSILON
  );
}

function isSamePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < RECT_EPSILON && Math.abs(a.y - b.y) < RECT_EPSILON;
}

function releasePointerCaptureIfHeld(element: Element | null, pointerId: number): void {
  if (!element || !('releasePointerCapture' in element)) return;
  const releasePointerCapture = element.releasePointerCapture;
  if (typeof releasePointerCapture !== 'function') return;
  const hasPointerCapture =
    'hasPointerCapture' in element && typeof element.hasPointerCapture === 'function'
      ? element.hasPointerCapture(pointerId)
      : true;
  if (hasPointerCapture) {
    releasePointerCapture.call(element, pointerId);
  }
}

function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

function isPenOrTouchPointerType(pointerType: string): boolean {
  return pointerType === 'pen' || pointerType === 'touch';
}

function toCssColour(colour: Colour | null | undefined, fallback = DEFAULT_STROKE_PREVIEW_COLOUR): string {
  if (colour === undefined || colour === null) {
    return fallback;
  }
  return `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a / 255})`;
}

function translateScreenLine(
  line: ScreenLine,
  dx: number,
  dy: number,
  maxWidth: number,
  maxHeight: number,
): ScreenLine {
  const minX = Math.min(line.start.x, line.end.x);
  const minY = Math.min(line.start.y, line.end.y);
  const maxX = Math.max(line.start.x, line.end.x);
  const maxY = Math.max(line.start.y, line.end.y);
  const allowedDx = Number.isFinite(maxWidth) ? clamp(dx, -minX, maxWidth - maxX) : dx;
  const allowedDy = Number.isFinite(maxHeight) ? clamp(dy, -minY, maxHeight - maxY) : dy;
  return {
    start: { x: line.start.x + allowedDx, y: line.start.y + allowedDy },
    end: { x: line.end.x + allowedDx, y: line.end.y + allowedDy },
  };
}

function setScreenLineEndpoint(
  line: ScreenLine,
  handle: LineHandlePosition,
  point: ScreenPoint,
  maxWidth: number,
  maxHeight: number,
): ScreenLine {
  const clampedPoint = clampScreenPoint(point, { width: maxWidth, height: maxHeight });
  return handle === 'start' ? { start: clampedPoint, end: line.end } : { start: line.start, end: clampedPoint };
}

function getLineHandleOffset(point: ScreenPoint, overlayRect: ScreenRect): { x: number; y: number } {
  return {
    x: point.x - overlayRect.x - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
    y: point.y - overlayRect.y - HALF_HANDLE_VISUAL - HANDLE_HIT_PADDING,
  };
}

function buildInitialLinePreview(
  endpoints: { start: Point; end: Point },
  scale: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): ScreenLine {
  const screenLine = {
    start: pdfToScreen(endpoints.start, { scale, originalHeight }),
    end: pdfToScreen(endpoints.end, { scale, originalHeight }),
  };
  return {
    start: clampScreenPoint(screenLine.start, { width: maxWidth, height: maxHeight }),
    end: clampScreenPoint(screenLine.end, { width: maxWidth, height: maxHeight }),
  };
}

function renderHandle(
  key: string,
  dataTestId: string,
  left: number,
  top: number,
  cursor: string,
  interactive: boolean,
  onPointerDown?: (event: ReactPointerEvent) => void,
  onMouseDown?: (event: ReactMouseEvent) => void,
): ReactNode {
  if (!interactive) {
    return null;
  }
  const ariaLabel = dataTestId.replaceAll('-', ' ');
  return (
    /* biome-ignore lint/a11y/useSemanticElements: custom drag handles need pointer-driven geometry control rather than native button behavior. */
    <div
      key={key}
      data-testid={dataTestId}
      role="button"
      aria-label={ariaLabel}
      tabIndex={-1}
      style={{
        position: 'absolute',
        left,
        top,
        width: HANDLE_HIT_SIZE,
        height: HANDLE_HIT_SIZE,
        display: 'grid',
        placeItems: 'center',
        cursor,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
    >
      <div
        style={{
          width: HANDLE_VISUAL_SIZE,
          height: HANDLE_VISUAL_SIZE,
          backgroundColor: DEFAULT_HANDLE_FILL_COLOUR,
          border: `1.5px solid ${DEFAULT_HANDLE_BORDER_COLOUR}`,
          borderRadius: HANDLE_VISUAL_SIZE,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function buildSquigglyPath(start: ScreenPoint, end: ScreenPoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.01) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const step = 6;
  const amplitude = 1.8;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const segmentCount = Math.max(2, Math.round(length / step));
  let path = `M ${start.x} ${start.y}`;
  for (let index = 1; index < segmentCount; index++) {
    const t = index / segmentCount;
    const baseX = start.x + dx * t;
    const baseY = start.y + dy * t;
    const direction = index % 2 === 0 ? -1 : 1;
    path += ` L ${baseX + px * amplitude * direction} ${baseY + py * amplitude * direction}`;
  }
  path += ` L ${end.x} ${end.y}`;
  return path;
}

/**
 * Props
 */
export interface SelectionOverlayProps {
  /** The annotation's bounding rect in PDF coordinates. */
  readonly rect: Rect;
  /** Scale factor for PDF-to-screen conversion. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Optional screen-space width bound for clamping move/resize. */
  readonly maxWidth?: number;
  /** Optional screen-space height bound for clamping move/resize. */
  readonly maxHeight?: number;
  /** Selected annotation visual/interaction shape. */
  readonly appearance?: SelectionOverlayAppearance;
  /** Whether move/resize interactions are enabled for this selection. */
  readonly interactive?: boolean;
  /** Called with a transient preview rect while dragging/resizing a box-like annotation. */
  onPreviewRect?(previewRect: Rect): void;
  /** Called with transient preview endpoints while dragging/resizing a line-like annotation. */
  onPreviewLine?(previewLine: { start: Point; end: Point }): void;
  /** Called when any active transform preview should be cleared. */
  onPreviewClear?(): void;
  /** Called when the annotation is moved to a new rect (PDF coordinates). */
  onMove?(newRect: Rect): void;
  /** Called when the annotation is resized to a new rect (PDF coordinates). */
  onResize?(newRect: Rect): void;
  /** Called when a line-like annotation is moved to new endpoints. */
  onMoveLine?(nextLine: { start: Point; end: Point }): void;
  /** Called when a line-like annotation is resized to new endpoints. */
  onResizeLine?(nextLine: { start: Point; end: Point }): void;
}

/**
 * Component
 */
export function SelectionOverlay({
  rect,
  scale,
  originalHeight,
  maxWidth = Number.POSITIVE_INFINITY,
  maxHeight = Number.POSITIVE_INFINITY,
  appearance = { kind: 'bounds' },
  interactive = true,
  onPreviewRect,
  onPreviewLine,
  onPreviewClear,
  onMove,
  onResize,
  onMoveLine,
  onResizeLine,
}: SelectionOverlayProps): ReactNode {
  const initialScreenRect = clampScreenRectOrigin(
    pdfRectToScreen(rect, { scale, originalHeight }),
    maxWidth,
    maxHeight,
  );
  const initialLine = useMemo(
    () =>
      appearance.kind === 'line'
        ? buildInitialLinePreview(appearance.endpoints, scale, originalHeight, maxWidth, maxHeight)
        : null,
    [appearance, scale, originalHeight, maxWidth, maxHeight],
  );
  const [previewRect, setPreviewRect] = useState<ScreenRect>(initialScreenRect);
  const [previewLine, setPreviewLine] = useState<ScreenLine | null>(initialLine);
  const previewRectRef = useRef<ScreenRect>(initialScreenRect);
  const previewLineRef = useRef<ScreenLine | null>(initialLine);
  const previewClearRef = useRef(onPreviewClear);
  const dragModifierStateRef = useRef<{ shiftKey: boolean }>({ shiftKey: false });
  const [dragging, setDragging] = useState(false);
  const dragSession = useRef<DragSession | null>(null);

  useEffect(() => {
    if (dragging) return;
    const nextScreenRect = clampScreenRectOrigin(pdfRectToScreen(rect, { scale, originalHeight }), maxWidth, maxHeight);
    if (!isSameScreenRect(previewRectRef.current, nextScreenRect)) {
      previewRectRef.current = nextScreenRect;
      setPreviewRect(nextScreenRect);
    }
    const nextLine =
      appearance.kind === 'line'
        ? buildInitialLinePreview(appearance.endpoints, scale, originalHeight, maxWidth, maxHeight)
        : null;
    const lineChanged =
      nextLine === null || previewLineRef.current === null
        ? nextLine !== previewLineRef.current
        : !(
            Math.abs(previewLineRef.current.start.x - nextLine.start.x) < RECT_EPSILON &&
            Math.abs(previewLineRef.current.start.y - nextLine.start.y) < RECT_EPSILON &&
            Math.abs(previewLineRef.current.end.x - nextLine.end.x) < RECT_EPSILON &&
            Math.abs(previewLineRef.current.end.y - nextLine.end.y) < RECT_EPSILON
          );
    if (lineChanged) {
      previewLineRef.current = nextLine;
      setPreviewLine(nextLine);
    }
  }, [appearance, rect, scale, originalHeight, maxWidth, maxHeight, dragging]);

  useEffect(() => {
    previewClearRef.current = onPreviewClear;
  }, [onPreviewClear]);

  useEffect(() => {
    return () => {
      previewClearRef.current?.();
    };
  }, []);

  const publishRectPreview = useCallback(
    (screenRect: ScreenRect) => {
      onPreviewRect?.(screenRectToPdfRect(screenRect, scale, originalHeight));
    },
    [onPreviewRect, scale, originalHeight],
  );

  const publishLinePreview = useCallback(
    (screenLine: ScreenLine) => {
      if (!onPreviewLine) return;
      onPreviewLine({
        start: screenPointToPdfPoint(screenLine.start, scale, originalHeight),
        end: screenPointToPdfPoint(screenLine.end, scale, originalHeight),
      });
    },
    [onPreviewLine, scale, originalHeight],
  );

  const resolveShiftKey = useCallback((eventShiftKey?: boolean): boolean => {
    return eventShiftKey === true || dragModifierStateRef.current.shiftKey;
  }, []);

  const handleBoxBodyPointerDown = useCallback((event: ReactPointerEvent) => {
    if (isSecondaryMouseButton(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragSession.current = {
      pointerId: event.pointerId,
      captureElement: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      screenRect: { ...previewRectRef.current },
      mode: 'move',
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleBoxHandlePointerDown = useCallback((handle: HandlePosition, event: ReactPointerEvent) => {
    if (isSecondaryMouseButton(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragSession.current = {
      pointerId: event.pointerId,
      captureElement: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      screenRect: { ...previewRectRef.current },
      mode: 'resize',
      handle,
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleLineBodyPointerDown = useCallback((event: ReactPointerEvent) => {
    if (isSecondaryMouseButton(event) || previewLineRef.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragSession.current = {
      pointerId: event.pointerId,
      captureElement: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      screenLine: {
        start: { ...previewLineRef.current.start },
        end: { ...previewLineRef.current.end },
      },
      mode: 'line-move',
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleLineHandlePointerDown = useCallback((handle: LineHandlePosition, event: ReactPointerEvent) => {
    if (isSecondaryMouseButton(event) || previewLineRef.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragSession.current = {
      pointerId: event.pointerId,
      captureElement: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      screenLine: {
        start: { ...previewLineRef.current.start },
        end: { ...previewLineRef.current.end },
      },
      mode: 'line-resize',
      handle,
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleBoxBodyMouseDown = useCallback((event: ReactMouseEvent) => {
    if (event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragSession.current = {
      pointerId: MOUSE_DRAG_POINTER_ID,
      captureElement: null,
      x: event.clientX,
      y: event.clientY,
      screenRect: { ...previewRectRef.current },
      mode: 'move',
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleBoxHandleMouseDown = useCallback((handle: HandlePosition, event: ReactMouseEvent) => {
    if (event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragSession.current = {
      pointerId: MOUSE_DRAG_POINTER_ID,
      captureElement: null,
      x: event.clientX,
      y: event.clientY,
      screenRect: { ...previewRectRef.current },
      mode: 'resize',
      handle,
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleLineBodyMouseDown = useCallback((event: ReactMouseEvent) => {
    if (event.button > 0 || previewLineRef.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    dragSession.current = {
      pointerId: MOUSE_DRAG_POINTER_ID,
      captureElement: null,
      x: event.clientX,
      y: event.clientY,
      screenLine: {
        start: { ...previewLineRef.current.start },
        end: { ...previewLineRef.current.end },
      },
      mode: 'line-move',
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const handleLineHandleMouseDown = useCallback((handle: LineHandlePosition, event: ReactMouseEvent) => {
    if (event.button > 0 || previewLineRef.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    dragSession.current = {
      pointerId: MOUSE_DRAG_POINTER_ID,
      captureElement: null,
      x: event.clientX,
      y: event.clientY,
      screenLine: {
        start: { ...previewLineRef.current.start },
        end: { ...previewLineRef.current.end },
      },
      mode: 'line-resize',
      handle,
    };
    dragModifierStateRef.current = { shiftKey: event.shiftKey };
    setDragging(true);
  }, []);

  const applyDragAtClientPosition = useCallback(
    (session: DragSession, clientX: number, clientY: number, modifiers?: { shiftKey?: boolean }) => {
      const dx = clientX - session.x;
      const dy = clientY - session.y;

      if (session.mode === 'move') {
        const maxX = Number.isFinite(maxWidth)
          ? Math.max(0, maxWidth - session.screenRect.width)
          : Number.POSITIVE_INFINITY;
        const maxY = Number.isFinite(maxHeight)
          ? Math.max(0, maxHeight - session.screenRect.height)
          : Number.POSITIVE_INFINITY;
        const nextRect: ScreenRect = {
          x: clamp(session.screenRect.x + dx, 0, maxX),
          y: clamp(session.screenRect.y + dy, 0, maxY),
          width: session.screenRect.width,
          height: session.screenRect.height,
        };
        previewRectRef.current = nextRect;
        setPreviewRect(nextRect);
        publishRectPreview(nextRect);
        return;
      }

      if (session.mode === 'resize') {
        const handleOrigin = getBoxHandlePoint(session.screenRect, session.handle);
        const handlePoint = {
          x: handleOrigin.x + dx,
          y: handleOrigin.y + dy,
        };
        const nextRect = resizeScreenRectFromHandle(
          session.screenRect,
          session.handle,
          handlePoint,
          { width: maxWidth, height: maxHeight },
          {
            lockAspectRatio:
              modifiers?.shiftKey === true && (appearance.kind === 'rectangle' || appearance.kind === 'ellipse'),
            minSize: MIN_RESIZE_SIZE,
          },
        );
        previewRectRef.current = nextRect;
        setPreviewRect(nextRect);
        publishRectPreview(nextRect);
        return;
      }

      if (session.mode === 'line-move') {
        const nextLine = translateScreenLine(session.screenLine, dx, dy, maxWidth, maxHeight);
        previewLineRef.current = nextLine;
        setPreviewLine(nextLine);
        publishLinePreview(nextLine);
        return;
      }

      const nextPoint = {
        x: session.handle === 'start' ? session.screenLine.start.x + dx : session.screenLine.end.x + dx,
        y: session.handle === 'start' ? session.screenLine.start.y + dy : session.screenLine.end.y + dy,
      };
      const anchorPoint = session.handle === 'start' ? session.screenLine.end : session.screenLine.start;
      const constrainedPoint = applyConstrainedCreationPoint(
        'line',
        anchorPoint,
        nextPoint,
        modifiers?.shiftKey === true,
        { width: maxWidth, height: maxHeight },
      );
      const nextLine = setScreenLineEndpoint(session.screenLine, session.handle, constrainedPoint, maxWidth, maxHeight);
      previewLineRef.current = nextLine;
      setPreviewLine(nextLine);
      publishLinePreview(nextLine);
    },
    [appearance.kind, maxWidth, maxHeight, publishRectPreview, publishLinePreview],
  );

  const finishDragSession = useCallback(
    (session: DragSession) => {
      if (session.mode === 'move') {
        const oldRect = screenRectToPdfRect(session.screenRect, scale, originalHeight);
        const newRect = screenRectToPdfRect(previewRectRef.current, scale, originalHeight);
        if (!isSameRect(oldRect, newRect)) {
          onMove?.(newRect);
        }
      } else if (session.mode === 'resize') {
        const oldRect = screenRectToPdfRect(session.screenRect, scale, originalHeight);
        const newRect = screenRectToPdfRect(previewRectRef.current, scale, originalHeight);
        if (!isSameRect(oldRect, newRect)) {
          onResize?.(newRect);
        }
      } else if (previewLineRef.current !== null) {
        const oldLine = {
          start: screenPointToPdfPoint(session.screenLine.start, scale, originalHeight),
          end: screenPointToPdfPoint(session.screenLine.end, scale, originalHeight),
        };
        const newLine = {
          start: screenPointToPdfPoint(previewLineRef.current.start, scale, originalHeight),
          end: screenPointToPdfPoint(previewLineRef.current.end, scale, originalHeight),
        };
        const lineChanged = !isSamePoint(oldLine.start, newLine.start) || !isSamePoint(oldLine.end, newLine.end);
        if (lineChanged) {
          if (session.mode === 'line-move') {
            if (onMoveLine) {
              onMoveLine(newLine);
            } else {
              onMove?.(screenLineToPdfRect(previewLineRef.current, scale, originalHeight));
            }
          } else if (onResizeLine) {
            onResizeLine(newLine);
          } else {
            onResize?.(screenLineToPdfRect(previewLineRef.current, scale, originalHeight));
          }
        }
      }

      onPreviewClear?.();
      releasePointerCaptureIfHeld(session.captureElement, session.pointerId);
      dragModifierStateRef.current = { shiftKey: false };
      setDragging(false);
      dragSession.current = null;
    },
    [onMove, onResize, onMoveLine, onResizeLine, onPreviewClear, scale, originalHeight],
  );

  const cancelDragSession = useCallback(
    (session: DragSession | null) => {
      if (session) {
        releasePointerCaptureIfHeld(session.captureElement, session.pointerId);
      }
      setDragging(false);
      dragSession.current = null;
      dragModifierStateRef.current = { shiftKey: false };
      const nextScreenRect = clampScreenRectOrigin(
        pdfRectToScreen(rect, { scale, originalHeight }),
        maxWidth,
        maxHeight,
      );
      previewRectRef.current = nextScreenRect;
      setPreviewRect(nextScreenRect);
      const nextLine =
        appearance.kind === 'line'
          ? buildInitialLinePreview(appearance.endpoints, scale, originalHeight, maxWidth, maxHeight)
          : null;
      previewLineRef.current = nextLine;
      setPreviewLine(nextLine);
      onPreviewClear?.();
    },
    [appearance, rect, scale, originalHeight, maxWidth, maxHeight, onPreviewClear],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const session = dragSession.current;
      if (!session || !dragging) return;
      if (event.pointerId !== session.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      applyDragAtClientPosition(session, event.clientX, event.clientY, { shiftKey: resolveShiftKey(event.shiftKey) });
    },
    [dragging, applyDragAtClientPosition, resolveShiftKey],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const session = dragSession.current;
      if (!session || event.pointerId !== session.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      finishDragSession(session);
    },
    [finishDragSession],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent) => {
      if (!isPenOrTouchPointerType(event.pointerType)) return;
      const session = dragSession.current;
      if (session && event.pointerId !== session.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      cancelDragSession(session);
    },
    [cancelDragSession],
  );

  const handleLostPointerCapture = useCallback(() => {
    // Keep the active session alive until explicit up/cancel handlers run.
  }, []);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        dragModifierStateRef.current = { shiftKey: true };
      }
    };
    const handleDocumentKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        dragModifierStateRef.current = { shiftKey: false };
      }
    };
    const handleDocumentMouseMove = (event: MouseEvent) => {
      const session = dragSession.current;
      if (!session || !dragging) return;
      applyDragAtClientPosition(session, event.clientX, event.clientY, { shiftKey: resolveShiftKey(event.shiftKey) });
    };
    const handleDocumentMouseUp = () => {
      const session = dragSession.current;
      if (!session) return;
      finishDragSession(session);
    };

    globalThis.document.addEventListener('keydown', handleDocumentKeyDown);
    globalThis.document.addEventListener('keyup', handleDocumentKeyUp);
    globalThis.document.addEventListener('mousemove', handleDocumentMouseMove);
    globalThis.document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      globalThis.document.removeEventListener('keydown', handleDocumentKeyDown);
      globalThis.document.removeEventListener('keyup', handleDocumentKeyUp);
      globalThis.document.removeEventListener('mousemove', handleDocumentMouseMove);
      globalThis.document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [dragging, applyDragAtClientPosition, finishDragSession, resolveShiftKey]);

  const overlayRect =
    appearance.kind === 'line' && previewLine !== null
      ? getLineOverlayRect(previewLine, maxWidth, maxHeight)
      : previewRect;
  const linePreview = appearance.kind === 'line' && previewLine !== null ? previewLine : null;
  const markupPreview =
    appearance.kind === 'text-markup'
      ? appearance.quads.map((quad) => {
          const p1 = pdfToScreen({ x: quad.x1, y: quad.y1 }, { scale, originalHeight });
          const p2 = pdfToScreen({ x: quad.x2, y: quad.y2 }, { scale, originalHeight });
          const p3 = pdfToScreen({ x: quad.x3, y: quad.y3 }, { scale, originalHeight });
          const p4 = pdfToScreen({ x: quad.x4, y: quad.y4 }, { scale, originalHeight });
          return {
            p1: { x: p1.x - overlayRect.x, y: p1.y - overlayRect.y },
            p2: { x: p2.x - overlayRect.x, y: p2.y - overlayRect.y },
            p3: { x: p3.x - overlayRect.x, y: p3.y - overlayRect.y },
            p4: { x: p4.x - overlayRect.x, y: p4.y - overlayRect.y },
          };
        })
      : null;
  const liveStrokeWidth = Math.max(
    1,
    (appearance.kind === 'bounds' || appearance.kind === 'text-markup' ? 1 : (appearance.strokeWidth ?? 1)) * scale,
  );
  const showLivePreview = dragging && appearance.kind !== 'bounds';
  const lineLocalStart =
    linePreview !== null ? { x: linePreview.start.x - overlayRect.x, y: linePreview.start.y - overlayRect.y } : null;
  const lineLocalEnd =
    linePreview !== null ? { x: linePreview.end.x - overlayRect.x, y: linePreview.end.y - overlayRect.y } : null;
  const boxFillColour =
    appearance.kind === 'rectangle' || appearance.kind === 'ellipse'
      ? toCssColour(appearance.fillColour ?? null, 'transparent')
      : 'transparent';
  const boxStrokeColour =
    appearance.kind === 'rectangle' || appearance.kind === 'ellipse'
      ? toCssColour(appearance.strokeColour)
      : DEFAULT_STROKE_PREVIEW_COLOUR;
  const lineStrokeColour =
    appearance.kind === 'line' ? toCssColour(appearance.strokeColour) : DEFAULT_STROKE_PREVIEW_COLOUR;
  const markupStrokeWidth = Math.max(1.5, scale);

  return (
    <div
      data-testid="selection-overlay"
      style={{
        position: 'absolute',
        left: overlayRect.x,
        top: overlayRect.y,
        width: overlayRect.width,
        height: overlayRect.height,
        overflow: 'visible',
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: interactive ? 'none' : 'auto',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    >
      {appearance.kind === 'text-markup' && markupPreview !== null ? (
        <svg
          data-testid="selection-body"
          data-selection-kind="text-markup"
          aria-hidden="true"
          focusable="false"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <g data-testid="selection-markup-overlay">
            {appearance.markupType === 'highlight' &&
              markupPreview.map((quad, index) => (
                <polygon
                  key={`markup-highlight-${String(index)}`}
                  data-testid="selection-markup-segment"
                  points={`${quad.p3.x},${quad.p3.y} ${quad.p4.x},${quad.p4.y} ${quad.p2.x},${quad.p2.y} ${quad.p1.x},${quad.p1.y}`}
                  fill={DEFAULT_MARKUP_SELECTION_FILL}
                  stroke={DEFAULT_MARKUP_SELECTION_STROKE}
                  strokeWidth={1}
                />
              ))}
            {appearance.markupType === 'underline' &&
              markupPreview.map((quad, index) => (
                <line
                  key={`markup-underline-${String(index)}`}
                  data-testid="selection-markup-segment"
                  x1={quad.p1.x}
                  y1={quad.p1.y}
                  x2={quad.p2.x}
                  y2={quad.p2.y}
                  stroke={DEFAULT_MARKUP_SELECTION_STROKE}
                  strokeWidth={markupStrokeWidth}
                  strokeLinecap="round"
                />
              ))}
            {appearance.markupType === 'strikeout' &&
              markupPreview.map((quad, index) => {
                const leftMid = midpoint(quad.p1, quad.p3);
                const rightMid = midpoint(quad.p2, quad.p4);
                return (
                  <line
                    key={`markup-strikeout-${String(index)}`}
                    data-testid="selection-markup-segment"
                    x1={leftMid.x}
                    y1={leftMid.y}
                    x2={rightMid.x}
                    y2={rightMid.y}
                    stroke={DEFAULT_MARKUP_SELECTION_STROKE}
                    strokeWidth={markupStrokeWidth}
                    strokeLinecap="round"
                  />
                );
              })}
            {appearance.markupType === 'squiggly' &&
              markupPreview.map((quad, index) => (
                <path
                  key={`markup-squiggly-${String(index)}`}
                  data-testid="selection-markup-segment"
                  d={buildSquigglyPath(quad.p1, quad.p2)}
                  fill="none"
                  stroke={DEFAULT_MARKUP_SELECTION_STROKE}
                  strokeWidth={Math.max(1.25, scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
          </g>
        </svg>
      ) : linePreview !== null && lineLocalStart !== null && lineLocalEnd !== null ? (
        <>
          <svg
            aria-hidden="true"
            focusable="false"
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'visible',
            }}
          >
            {showLivePreview && (
              <line
                data-testid="selection-shape-preview"
                x1={lineLocalStart.x}
                y1={lineLocalStart.y}
                x2={lineLocalEnd.x}
                y2={lineLocalEnd.y}
                stroke={lineStrokeColour}
                strokeWidth={liveStrokeWidth}
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}
            {/* biome-ignore lint/a11y/useSemanticElements: SVG line body is a custom drag surface; there is no semantic SVG equivalent to a button here. */}
            <line
              data-testid="selection-body"
              role="button"
              aria-label="Move line annotation"
              tabIndex={-1}
              x1={lineLocalStart.x}
              y1={lineLocalStart.y}
              x2={lineLocalEnd.x}
              y2={lineLocalEnd.y}
              stroke="transparent"
              strokeWidth={Math.max(HANDLE_HIT_SIZE, liveStrokeWidth + 10)}
              strokeLinecap="round"
              pointerEvents={interactive ? 'stroke' : 'none'}
              style={{
                cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'default',
              }}
              onPointerDown={interactive ? handleLineBodyPointerDown : undefined}
              onMouseDown={interactive ? handleLineBodyMouseDown : undefined}
            />
          </svg>
          {renderHandle(
            'line-handle-start',
            'handle-start',
            getLineHandleOffset(linePreview.start, overlayRect).x,
            getLineHandleOffset(linePreview.start, overlayRect).y,
            'grab',
            interactive,
            (event) => handleLineHandlePointerDown('start', event),
            (event) => handleLineHandleMouseDown('start', event),
          )}
          {renderHandle(
            'line-handle-end',
            'handle-end',
            getLineHandleOffset(linePreview.end, overlayRect).x,
            getLineHandleOffset(linePreview.end, overlayRect).y,
            'grab',
            interactive,
            (event) => handleLineHandlePointerDown('end', event),
            (event) => handleLineHandleMouseDown('end', event),
          )}
        </>
      ) : (
        <>
          {(appearance.kind === 'bounds' || showLivePreview) && (
            /* biome-ignore lint/a11y/useSemanticElements: selection bounds act as a composite drag surface, not a semantic button. */
            <div
              data-testid="selection-body"
              role="button"
              aria-label="Move annotation"
              tabIndex={-1}
              style={{
                position: 'absolute',
                inset: 0,
                border:
                  appearance.kind === 'bounds'
                    ? interactive
                      ? `1px solid ${DEFAULT_BOUNDS_BORDER_COLOUR}`
                      : `1px dashed ${DEFAULT_DISABLED_BOUNDS_BORDER_COLOUR}`
                    : 'none',
                backgroundColor:
                  appearance.kind === 'bounds' && !interactive ? DEFAULT_DISABLED_BOUNDS_BACKGROUND : 'transparent',
                cursor: interactive ? (dragging ? 'grabbing' : 'move') : 'default',
              }}
              onPointerDown={interactive ? handleBoxBodyPointerDown : undefined}
              onMouseDown={interactive ? handleBoxBodyMouseDown : undefined}
            >
              {showLivePreview && (appearance.kind === 'rectangle' || appearance.kind === 'ellipse') && (
                <svg
                  data-testid="selection-shape-preview"
                  aria-hidden="true"
                  focusable="false"
                  style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                  {appearance.kind === 'rectangle' ? (
                    <rect
                      x={liveStrokeWidth / 2}
                      y={liveStrokeWidth / 2}
                      width={Math.max(0, overlayRect.width - liveStrokeWidth)}
                      height={Math.max(0, overlayRect.height - liveStrokeWidth)}
                      fill={boxFillColour}
                      stroke={boxStrokeColour}
                      strokeWidth={liveStrokeWidth}
                    />
                  ) : (
                    <ellipse
                      cx={overlayRect.width / 2}
                      cy={overlayRect.height / 2}
                      rx={Math.max(0, overlayRect.width / 2 - liveStrokeWidth / 2)}
                      ry={Math.max(0, overlayRect.height / 2 - liveStrokeWidth / 2)}
                      fill={boxFillColour}
                      stroke={boxStrokeColour}
                      strokeWidth={liveStrokeWidth}
                    />
                  )}
                </svg>
              )}
            </div>
          )}
          {appearance.kind !== 'bounds' && !showLivePreview && (
            /* biome-ignore lint/a11y/useSemanticElements: selection bounds act as a composite drag surface, not a semantic button. */
            <div
              data-testid="selection-body"
              role="button"
              aria-label="Move annotation"
              tabIndex={-1}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: interactive ? 'move' : 'default',
              }}
              onPointerDown={interactive ? handleBoxBodyPointerDown : undefined}
              onMouseDown={interactive ? handleBoxBodyMouseDown : undefined}
            />
          )}
          {BOX_HANDLES.map((handle) => {
            const offset = getHandleOffset(handle, overlayRect.width, overlayRect.height);
            return renderHandle(
              handle,
              `handle-${handle}`,
              offset.x,
              offset.y,
              BOX_CURSOR_MAP[handle],
              interactive,
              (event) => handleBoxHandlePointerDown(handle, event),
              (event) => handleBoxHandleMouseDown(handle, event),
            );
          })}
        </>
      )}
    </div>
  );
}

export type { SelectionOverlayAppearance };
