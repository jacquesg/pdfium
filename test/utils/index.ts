/**
 * Test utilities for PDFium WASM wrapper.
 *
 * @module test/utils
 */

export { test } from './fixtures.js';
export { initPdfium, loadTestDocument, loadWasmBinary } from './helpers.js';
export {
  assertNoLeaks,
  captureMemorySnapshot,
  checkForLeaks,
  detectLeaks,
  type LeakCheckResult,
  MemoryProfiler,
  type MemorySnapshot,
} from './memory-profiler.js';
export {
  createRoundTripTester,
  type RoundTripOptions,
  type RoundTripResult,
  roundTripDocument,
  verifyRoundTrip,
} from './round-trip.js';
export {
  type ComparisonOptions,
  type ComparisonResult,
  calculateSSIM,
  compareImages,
  imagesMatch,
} from './visual-comparator.js';
