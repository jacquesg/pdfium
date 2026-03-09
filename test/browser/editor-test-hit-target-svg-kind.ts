export function resolveSvgHitTargetKind(target: Element): 'line' | 'polygon' | 'ellipse' | 'other' {
  if (target instanceof SVGLineElement) {
    return 'line';
  }
  if (target instanceof SVGPolygonElement) {
    return 'polygon';
  }
  if (target instanceof SVGEllipseElement) {
    return 'ellipse';
  }
  return 'other';
}
