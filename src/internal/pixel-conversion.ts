/**
 * Pixel format conversion utilities.
 *
 * @module internal/pixel-conversion
 * @internal
 */

/**
 * Convert BGRA pixel data to RGBA in a single pass.
 *
 * Reads from the source and writes into a new buffer, swapping the
 * B and R channels while preserving G and A.
 *
 * @param source - BGRA pixel data
 * @param size - Number of bytes to convert (must be a multiple of 4)
 * @returns A new Uint8Array with RGBA pixel data
 */
export function convertBgraToRgba(source: Uint8Array, size: number): Uint8Array {
  const result = new Uint8Array(size);

  for (let i = 0; i < size; i += 4) {
    result[i] = source[i + 2] ?? 0; // R <- B
    result[i + 1] = source[i + 1] ?? 0; // G <- G
    result[i + 2] = source[i] ?? 0; // B <- R
    result[i + 3] = source[i + 3] ?? 0; // A <- A
  }

  return result;
}
