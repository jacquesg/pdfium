export {
  countHitTargets,
  countHitTargetsOnPage,
  countRedactionsOnPage,
  createTextMarkupAndOpenProperties,
  drawInkStroke,
  drawRectangle,
  ensureNewestHitTargetOnPageOpensProperties,
  ensureRectangleCreatedOnPage,
  ensureRedactionCreatedOnPage,
  getHitTargetIndices,
  getSidebarAnnotationIndices,
  MARKUP_CASES,
  selectHitTargetByIndex,
  selectNewestHitTarget,
  selectNewestHitTargetOnPage,
} from './editor-test-annotation-support.js';
export {
  EDITOR_BASE_URL,
  editorBtn,
  ensureAtLeastTwoPages,
  isViewerHandToolActive,
  isViewerSelectTextActive,
  rotateViewerClockwise,
  switchToEditor,
  switchToTool,
  switchToViewerHandTool,
  switchToViewerSelectText,
  viewerSelectTextButtons,
  zoomInViewer,
} from './editor-test-controls.js';
export {
  saveEditedDocument,
  setColourInput,
  setNumberInput,
  setRangeInput,
  uploadPdfFile,
} from './editor-test-document-support.js';
export type { DrawRectangleOptions, PageBox } from './editor-test-geometry.js';
export {
  centerPageInView,
  clearSelectionByClickingBlankPoint,
  clickBlankPointOnPage,
  clickReachableLocator,
  dragAnnotationHandle,
  dragSelectionHandle,
  drawRectangleOnPage,
  getFirstPageBox,
  getPageBox,
  getPageCanvasDataUrl,
  getSelectionOverlayBox,
  HIT_TARGET_SELECTOR,
  lineLength,
  PAGE_SELECTOR,
  parseLineEndpoints,
  waitForCanvasStable,
} from './editor-test-geometry.js';
export { expectNoPageErrors } from './editor-test-page-errors.js';
export { selectTextAcrossTwoLinesOnFirstPage, selectTextOnFirstPage } from './editor-test-text-selection.js';
