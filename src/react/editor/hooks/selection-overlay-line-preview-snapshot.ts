import type { ScreenLine } from '../components/selection-overlay.types.js';
import { cloneScreenLine } from './selection-overlay-line-drag.js';

export function clonePreviewLine(getPreviewLineSnapshot: () => ScreenLine | null): ScreenLine | null {
  const previewLineSnapshot = getPreviewLineSnapshot();
  return previewLineSnapshot === null ? null : cloneScreenLine(previewLineSnapshot);
}
