export interface ShapeDragPoint {
  readonly x: number;
  readonly y: number;
}

export interface ShapeDragSnapshot {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly safePoints: ShapeDragPoint[];
}

export function resolveShapeDragSnapshot(pageIndex: number): ShapeDragSnapshot | null {
  const overlay = document.querySelector<HTMLElement>(
    `[data-page-index="${String(pageIndex)}"] [data-testid="shape-creation-overlay"]`,
  );
  if (!overlay) {
    return null;
  }

  const rect = overlay.getBoundingClientRect();
  const left = Math.max(rect.left + 8, 8);
  const top = Math.max(rect.top + 8, 8);
  const right = Math.min(rect.right - 8, window.innerWidth - 8);
  const bottom = Math.min(rect.bottom - 8, window.innerHeight - 8);
  const width = right - left;
  const height = bottom - top;
  if (width < 40 || height < 30) {
    return null;
  }

  const safePoints: ShapeDragPoint[] = [];
  const steps = 10;
  for (let row = 0; row <= steps; row++) {
    for (let col = 0; col <= steps; col++) {
      const x = left + width * ((col + 0.5) / (steps + 1));
      const y = top + height * ((row + 0.5) / (steps + 1));
      const elements = document.elementsFromPoint(x, y);
      const hitsOverlay = elements.some((element) => {
        return element === overlay || (element instanceof HTMLElement && overlay.contains(element));
      });
      if (hitsOverlay) {
        safePoints.push({ x, y });
      }
    }
  }

  return { left, top, right, bottom, safePoints };
}
