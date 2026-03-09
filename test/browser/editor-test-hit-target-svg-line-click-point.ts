export function resolveSvgLineReachableClickPoint(target: Element): { x: number; y: number } | null {
  if (!(target instanceof SVGLineElement)) {
    return null;
  }

  const svg = target.ownerSVGElement;
  const ctm = target.getScreenCTM();
  if (svg === null || ctm === null) {
    return null;
  }

  const clampToViewport = (value: number, max: number) => Math.min(Math.max(value, 1), Math.max(1, max - 1));
  const createSvgPoint = (x: number, y: number) => {
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    return point;
  };
  const isTargetReachable = (x: number, y: number) =>
    document.elementsFromPoint(x, y).some((element) => element === target || target.contains(element));
  const toReachableScreenPoint = (x: number, y: number) => {
    try {
      if (!target.isPointInStroke(createSvgPoint(x, y))) {
        return null;
      }
    } catch {
      return null;
    }
    const transformed = createSvgPoint(x, y).matrixTransform(ctm);
    const point = {
      x: clampToViewport(transformed.x, window.innerWidth),
      y: clampToViewport(transformed.y, window.innerHeight),
    };
    return isTargetReachable(point.x, point.y) ? point : null;
  };

  const x1 = Number.parseFloat(target.getAttribute('x1') ?? '0');
  const y1 = Number.parseFloat(target.getAttribute('y1') ?? '0');
  const x2 = Number.parseFloat(target.getAttribute('x2') ?? '0');
  const y2 = Number.parseFloat(target.getAttribute('y2') ?? '0');
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };

  for (const fraction of [0.5, 0.25, 0.75, 0.125, 0.875]) {
    const baseX = x1 + dx * fraction;
    const baseY = y1 + dy * fraction;
    for (const offset of [0, -2, 2, -4, 4]) {
      const localX = baseX + normal.x * offset;
      const localY = baseY + normal.y * offset;
      const screenPoint = toReachableScreenPoint(localX, localY);
      if (screenPoint !== null) {
        return screenPoint;
      }
    }
  }

  return null;
}
