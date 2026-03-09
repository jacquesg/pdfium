import type { LineEndpoints } from './editor-test-hit-target.types.js';

export function parseLineEndpoints(text: string): LineEndpoints | null {
  const match = text.match(/Line:\s*\(([-\d.]+),\s*([-\d.]+)\)\s+to\s+\(([-\d.]+),\s*([-\d.]+)\)/);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) {
    return null;
  }
  const start = { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) };
  const end = { x: Number.parseFloat(match[3]), y: Number.parseFloat(match[4]) };
  return { start, end };
}

export function lineLength(endpoints: LineEndpoints): number {
  const dx = endpoints.end.x - endpoints.start.x;
  const dy = endpoints.end.y - endpoints.start.y;
  return Math.hypot(dx, dy);
}
