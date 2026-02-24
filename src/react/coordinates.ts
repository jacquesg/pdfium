interface ScaleParams {
  scale: number;
  originalHeight: number;
}

/** Convert PDF point (bottom-left origin) to screen point (top-left origin). */
function pdfToScreen(point: { x: number; y: number }, params: ScaleParams): { x: number; y: number } {
  return {
    x: point.x * params.scale,
    y: (params.originalHeight - point.y) * params.scale,
  };
}

/** Convert PDF rect { left, top, right, bottom } to screen rect { x, y, width, height }. */
function pdfRectToScreen(
  rect: { left: number; top: number; right: number; bottom: number },
  params: ScaleParams,
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.left * params.scale,
    y: (params.originalHeight - rect.top) * params.scale,
    width: (rect.right - rect.left) * params.scale,
    height: (rect.top - rect.bottom) * params.scale,
  };
}

/** Convert screen point (top-left origin) to PDF point (bottom-left origin). */
function screenToPdf(point: { x: number; y: number }, params: ScaleParams): { x: number; y: number } {
  return {
    x: point.x / params.scale,
    y: params.originalHeight - point.y / params.scale,
  };
}

export { pdfToScreen, screenToPdf, pdfRectToScreen };
