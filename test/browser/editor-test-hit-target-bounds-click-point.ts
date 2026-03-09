export function resolveBoundsReachableClickPoint(target: Element): { x: number; y: number } | null {
  const clampToViewport = (value: number, max: number) => Math.min(Math.max(value, 1), Math.max(1, max - 1));
  const isTargetReachable = (x: number, y: number) =>
    document.elementsFromPoint(x, y).some((element) => element === target || target.contains(element));
  const resolveReachablePoint = (candidate: { x: number; y: number } | null) => {
    if (candidate === null) {
      return null;
    }
    for (const nudge of [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: -2 },
      { x: 0, y: 2 },
    ]) {
      const point = {
        x: clampToViewport(candidate.x + nudge.x, window.innerWidth),
        y: clampToViewport(candidate.y + nudge.y, window.innerHeight),
      };
      if (isTargetReachable(point.x, point.y)) {
        return point;
      }
    }
    return null;
  };

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const left = Math.max(rect.left + 1, 1);
  const top = Math.max(rect.top + 1, 1);
  const right = Math.min(rect.right - 1, window.innerWidth - 1);
  const bottom = Math.min(rect.bottom - 1, window.innerHeight - 1);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const steps = rect.width <= 24 || rect.height <= 24 ? 15 : 7;
  for (let row = 0; row <= steps; row++) {
    for (let col = 0; col <= steps; col++) {
      const point = {
        x: left + width * ((col + 0.5) / (steps + 1)),
        y: top + height * ((row + 0.5) / (steps + 1)),
      };
      if (isTargetReachable(point.x, point.y)) {
        return point;
      }
    }
  }

  return resolveReachablePoint({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
}
