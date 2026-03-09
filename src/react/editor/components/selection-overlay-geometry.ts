export {
  clampScreenRectOrigin,
  isSamePoint,
  isSameRect,
  isSameScreenLine,
  isSameScreenRect,
  screenLineToPdfRect,
  screenPointToPdfPoint,
  screenRectToPdfRect,
} from './selection-overlay-coordinate-utils.js';
export {
  buildInitialLinePreview,
  buildSquigglyPath,
  getHandleOffset,
  getLineBounds,
  getLineHandleOffset,
  getLineOverlayRect,
  midpoint,
  setScreenLineEndpoint,
  translateScreenLine,
} from './selection-overlay-line-geometry.js';
export {
  isPenOrTouchPointerType,
  isSecondaryMouseButton,
  releasePointerCaptureIfHeld,
  toCssColour,
} from './selection-overlay-pointer-utils.js';
