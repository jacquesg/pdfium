/**
 * Visual comparison utilities for pixel-based testing.
 *
 * @module test/utils/visual-comparator
 */

/**
 * Result of comparing two images.
 */
export interface ComparisonResult {
  /** Whether the images match within tolerance. */
  match: boolean;
  /** Number of pixels that differ. */
  diffPixels: number;
  /** Percentage of pixels that differ (0-100). */
  diffPercentage: number;
  /** Optional diff image (RGBA data) highlighting differences. */
  diffImage?: Uint8Array;
}

/**
 * Options for image comparison.
 */
export interface ComparisonOptions {
  /** Per-channel tolerance (0-255). Default: 0 (exact match). */
  tolerance?: number;
  /** Whether to generate a diff image. Default: false. */
  generateDiff?: boolean;
  /** Colour for highlighting differences in the diff image. Default: [255, 0, 0, 255] (red). */
  diffColour?: [number, number, number, number];
}

/**
 * Compare two RGBA images and return a comparison result.
 *
 * @param actual - The actual rendered image (RGBA pixel data).
 * @param expected - The expected reference image (RGBA pixel data).
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param options - Comparison options.
 * @returns The comparison result.
 * @throws {Error} If image dimensions don't match.
 */
export function compareImages(
  actual: Uint8Array,
  expected: Uint8Array,
  width: number,
  height: number,
  options: ComparisonOptions = {},
): ComparisonResult {
  const { tolerance = 0, generateDiff = false, diffColour = [255, 0, 0, 255] } = options;
  const expectedSize = width * height * 4;

  if (actual.length !== expectedSize) {
    throw new Error(`Actual image size (${actual.length}) doesn't match expected size (${expectedSize})`);
  }
  if (expected.length !== expectedSize) {
    throw new Error(`Expected image size (${expected.length}) doesn't match expected size (${expectedSize})`);
  }

  let diffPixels = 0;
  const totalPixels = width * height;
  const diffImage = generateDiff ? new Uint8Array(expectedSize) : undefined;

  for (let i = 0; i < expectedSize; i += 4) {
    const rDiff = Math.abs((actual[i] ?? 0) - (expected[i] ?? 0));
    const gDiff = Math.abs((actual[i + 1] ?? 0) - (expected[i + 1] ?? 0));
    const bDiff = Math.abs((actual[i + 2] ?? 0) - (expected[i + 2] ?? 0));
    const aDiff = Math.abs((actual[i + 3] ?? 0) - (expected[i + 3] ?? 0));

    const isDifferent = rDiff > tolerance || gDiff > tolerance || bDiff > tolerance || aDiff > tolerance;

    if (isDifferent) {
      diffPixels++;
      if (diffImage !== undefined) {
        diffImage[i] = diffColour[0];
        diffImage[i + 1] = diffColour[1];
        diffImage[i + 2] = diffColour[2];
        diffImage[i + 3] = diffColour[3];
      }
    } else if (diffImage !== undefined) {
      // Copy original pixel (dimmed)
      diffImage[i] = Math.floor((actual[i] ?? 0) * 0.3);
      diffImage[i + 1] = Math.floor((actual[i + 1] ?? 0) * 0.3);
      diffImage[i + 2] = Math.floor((actual[i + 2] ?? 0) * 0.3);
      diffImage[i + 3] = actual[i + 3] ?? 255;
    }
  }

  const diffPercentage = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0;

  const result: ComparisonResult = {
    match: diffPixels === 0,
    diffPixels,
    diffPercentage,
  };

  if (diffImage !== undefined) {
    result.diffImage = diffImage;
  }

  return result;
}

/**
 * Calculate the structural similarity index (simplified SSIM) between two images.
 *
 * This is a simplified approximation that compares local regions.
 *
 * @param actual - The actual rendered image (RGBA pixel data).
 * @param expected - The expected reference image (RGBA pixel data).
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @returns A value between 0 (completely different) and 1 (identical).
 */
export function calculateSSIM(actual: Uint8Array, expected: Uint8Array, width: number, height: number): number {
  const expectedSize = width * height * 4;

  if (actual.length !== expectedSize || expected.length !== expectedSize) {
    throw new Error('Image sizes do not match expected dimensions');
  }

  // Calculate luminance for each pixel (simplified - just R channel for now)
  let sumActual = 0;
  let sumExpected = 0;
  let sumActualSq = 0;
  let sumExpectedSq = 0;
  let sumCross = 0;
  const n = width * height;

  for (let i = 0; i < expectedSize; i += 4) {
    // Use luminance approximation: 0.299*R + 0.587*G + 0.114*B
    const actualLum = 0.299 * (actual[i] ?? 0) + 0.587 * (actual[i + 1] ?? 0) + 0.114 * (actual[i + 2] ?? 0);
    const expectedLum = 0.299 * (expected[i] ?? 0) + 0.587 * (expected[i + 1] ?? 0) + 0.114 * (expected[i + 2] ?? 0);

    sumActual += actualLum;
    sumExpected += expectedLum;
    sumActualSq += actualLum * actualLum;
    sumExpectedSq += expectedLum * expectedLum;
    sumCross += actualLum * expectedLum;
  }

  const meanActual = sumActual / n;
  const meanExpected = sumExpected / n;
  const varActual = sumActualSq / n - meanActual * meanActual;
  const varExpected = sumExpectedSq / n - meanExpected * meanExpected;
  const covariance = sumCross / n - meanActual * meanExpected;

  // SSIM formula constants
  const k1 = 0.01;
  const k2 = 0.03;
  const L = 255; // Dynamic range
  const c1 = (k1 * L) ** 2;
  const c2 = (k2 * L) ** 2;

  const numerator = (2 * meanActual * meanExpected + c1) * (2 * covariance + c2);
  const denominator = (meanActual * meanActual + meanExpected * meanExpected + c1) * (varActual + varExpected + c2);

  return denominator > 0 ? numerator / denominator : 1;
}

/**
 * Check if two images are visually similar within a tolerance.
 *
 * @param actual - The actual rendered image.
 * @param expected - The expected reference image.
 * @param width - Image width.
 * @param height - Image height.
 * @param maxDiffPercentage - Maximum percentage of differing pixels (default: 0.1).
 * @param tolerance - Per-channel tolerance (default: 5).
 * @returns True if the images are visually similar.
 */
export function imagesMatch(
  actual: Uint8Array,
  expected: Uint8Array,
  width: number,
  height: number,
  maxDiffPercentage = 0.1,
  tolerance = 5,
): boolean {
  const result = compareImages(actual, expected, width, height, { tolerance });
  return result.diffPercentage <= maxDiffPercentage;
}
