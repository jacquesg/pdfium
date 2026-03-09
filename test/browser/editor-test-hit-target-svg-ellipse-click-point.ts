export function resolveSvgEllipseReachableClickPoint(target: Element): { x: number; y: number } | null {
  if (!(target instanceof SVGEllipseElement)) {
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
      if (!target.isPointInFill(createSvgPoint(x, y)) && !target.isPointInStroke(createSvgPoint(x, y))) {
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

  const cx = Number.parseFloat(target.getAttribute('cx') ?? '0');
  const cy = Number.parseFloat(target.getAttribute('cy') ?? '0');
  const rx = Number.parseFloat(target.getAttribute('rx') ?? '0');
  const ry = Number.parseFloat(target.getAttribute('ry') ?? '0');
  const candidates = [
    { x: cx, y: cy },
    { x: cx + rx * 0.25, y: cy },
    { x: cx - rx * 0.25, y: cy },
    { x: cx, y: cy + ry * 0.25 },
    { x: cx, y: cy - ry * 0.25 },
  ];

  for (const candidate of candidates) {
    const screenPoint = toReachableScreenPoint(candidate.x, candidate.y);
    if (screenPoint !== null) {
      return screenPoint;
    }
  }

  return null;
}
