type Box = { x: number; y: number; width: number; height: number };

export function resolveMarkupGapPoint(firstBox: Box, secondBox: Box): { x: number; y: number } {
  const [upper, lower] =
    firstBox.y <= secondBox.y ? ([firstBox, secondBox] as const) : ([secondBox, firstBox] as const);
  const overlapLeft = Math.max(upper.x, lower.x);
  const overlapRight = Math.min(upper.x + upper.width, lower.x + lower.width);
  return {
    x: overlapRight > overlapLeft ? (overlapLeft + overlapRight) / 2 : (upper.x + lower.x + lower.width) / 2,
    y: (upper.y + upper.height + lower.y) / 2,
  };
}
