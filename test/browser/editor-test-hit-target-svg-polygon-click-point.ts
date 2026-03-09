export function resolveSvgPolygonReachableClickPoint(target: Element): { x: number; y: number } | null {
  if (!(target instanceof SVGPolygonElement)) {
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
  const buildCentroidCandidate = (points: SVGPointList) => {
    let signedArea = 0;
    let centroidX = 0;
    let centroidY = 0;
    for (let index = 0; index < points.length; index++) {
      const current = points[index]!;
      const next = points[(index + 1) % points.length]!;
      const cross = current.x * next.y - next.x * current.y;
      signedArea += cross;
      centroidX += (current.x + next.x) * cross;
      centroidY += (current.y + next.y) * cross;
    }
    const areaFactor = signedArea * 3;
    return Math.abs(areaFactor) > 1e-6 ? { x: centroidX / areaFactor, y: centroidY / areaFactor } : null;
  };

  const points = Array.from(target.points);
  if (points.length === 0) {
    return null;
  }

  const average = points.reduce(
    (acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }),
    { x: 0, y: 0 },
  );
  const bbox = points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  const candidates = [
    buildCentroidCandidate(target.points),
    average,
    { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 },
  ].filter((candidate): candidate is { x: number; y: number } => candidate !== null);

  for (const candidate of candidates) {
    const screenPoint = toReachableScreenPoint(candidate.x, candidate.y);
    if (screenPoint !== null) {
      return screenPoint;
    }
  }

  return null;
}
