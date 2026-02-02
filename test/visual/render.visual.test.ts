/**
 * Visual regression tests for PDF rendering.
 *
 * These tests verify that PDF rendering produces consistent visual output.
 * Reference snapshots are stored in test/visual/snapshots/ and compared
 * against current renders to detect visual regressions.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';
import { type ComparisonResult, calculateSSIM, compareImages } from '../utils/visual-comparator.js';

/** Directory for snapshot files. */
const SNAPSHOTS_DIR = 'test/visual/snapshots';

/** Maximum allowed diff percentage for passing tests. */
const MAX_DIFF_PERCENTAGE = 0.1;

/** Per-channel tolerance for pixel comparison. */
const PIXEL_TOLERANCE = 5;

/** Minimum SSIM score for passing tests. */
const MIN_SSIM_SCORE = 0.99;

/** Whether to update snapshots (set via environment variable). */
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === 'true';

/**
 * Save or load a reference snapshot.
 */
async function getSnapshot(
  name: string,
  width: number,
  height: number,
  currentData: Uint8Array,
): Promise<{ expected: Uint8Array; isNew: boolean }> {
  const snapshotPath = join(SNAPSHOTS_DIR, `${name}.raw`);
  const metaPath = join(SNAPSHOTS_DIR, `${name}.meta.json`);

  if (UPDATE_SNAPSHOTS || !existsSync(snapshotPath)) {
    // Save new snapshot
    await mkdir(dirname(snapshotPath), { recursive: true });
    await writeFile(snapshotPath, currentData);
    await writeFile(metaPath, JSON.stringify({ width, height, format: 'rgba' }));
    return { expected: currentData, isNew: true };
  }

  // Load existing snapshot
  const expectedBuffer = await readFile(snapshotPath);
  const meta = JSON.parse(await readFile(metaPath, 'utf-8')) as { width: number; height: number };

  if (meta.width !== width || meta.height !== height) {
    throw new Error(
      `Snapshot dimension mismatch for ${name}: ` +
        `expected ${meta.width}x${meta.height}, got ${width}x${height}. ` +
        'Run with UPDATE_SNAPSHOTS=true to regenerate.',
    );
  }

  return { expected: new Uint8Array(expectedBuffer), isNew: false };
}

/**
 * Save a diff image for debugging.
 */
async function saveDiffImage(name: string, result: ComparisonResult, width: number, height: number): Promise<void> {
  if (result.diffImage === undefined) {
    return;
  }

  const diffDir = join(SNAPSHOTS_DIR, '__diff__');
  await mkdir(diffDir, { recursive: true });

  const diffPath = join(diffDir, `${name}.diff.raw`);
  const metaPath = join(diffDir, `${name}.diff.meta.json`);

  await writeFile(diffPath, result.diffImage);
  await writeFile(metaPath, JSON.stringify({ width, height, format: 'rgba', diffPercentage: result.diffPercentage }));
}

describe('Visual Regression', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('test_1.pdf', () => {
    test('page 0 renders correctly at 1x scale', async () => {
      using page = document.getPage(0);
      const result = page.render({ scale: 1 });

      const { expected, isNew } = await getSnapshot('test_1_page0_1x', result.width, result.height, result.data);

      if (isNew) {
        // New snapshot created, test passes
        return;
      }

      const comparison = compareImages(result.data, expected, result.width, result.height, {
        tolerance: PIXEL_TOLERANCE,
        generateDiff: true,
      });

      if (!comparison.match) {
        await saveDiffImage('test_1_page0_1x', comparison, result.width, result.height);
      }

      expect(comparison.diffPercentage).toBeLessThan(MAX_DIFF_PERCENTAGE);
    });

    test('page 0 renders correctly at 0.5x scale', async () => {
      using page = document.getPage(0);
      const result = page.render({ scale: 0.5 });

      const { expected, isNew } = await getSnapshot('test_1_page0_0.5x', result.width, result.height, result.data);

      if (isNew) {
        return;
      }

      const comparison = compareImages(result.data, expected, result.width, result.height, {
        tolerance: PIXEL_TOLERANCE,
        generateDiff: true,
      });

      if (!comparison.match) {
        await saveDiffImage('test_1_page0_0.5x', comparison, result.width, result.height);
      }

      expect(comparison.diffPercentage).toBeLessThan(MAX_DIFF_PERCENTAGE);
    });

    test('page 0 has high SSIM score', async () => {
      using page = document.getPage(0);
      const result = page.render({ scale: 1 });

      const { expected, isNew } = await getSnapshot('test_1_page0_1x', result.width, result.height, result.data);

      if (isNew) {
        return;
      }

      const ssim = calculateSSIM(result.data, expected, result.width, result.height);
      expect(ssim).toBeGreaterThanOrEqual(MIN_SSIM_SCORE);
    });
  });

  describe('test_3_with_images.pdf', () => {
    let imageDocument: PDFiumDocument;

    beforeAll(async () => {
      imageDocument = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    });

    afterAll(() => {
      imageDocument?.dispose();
    });

    test('page 0 renders images correctly', async () => {
      using page = imageDocument.getPage(0);
      const result = page.render({ scale: 1 });

      const { expected, isNew } = await getSnapshot('test_3_images_page0_1x', result.width, result.height, result.data);

      if (isNew) {
        return;
      }

      const comparison = compareImages(result.data, expected, result.width, result.height, {
        tolerance: PIXEL_TOLERANCE,
        generateDiff: true,
      });

      if (!comparison.match) {
        await saveDiffImage('test_3_images_page0_1x', comparison, result.width, result.height);
      }

      expect(comparison.diffPercentage).toBeLessThan(MAX_DIFF_PERCENTAGE);
    });
  });

  describe('test_6_with_form.pdf', () => {
    let formDocument: PDFiumDocument;

    beforeAll(async () => {
      formDocument = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    });

    afterAll(() => {
      formDocument?.dispose();
    });

    test('page 0 renders form fields correctly', async () => {
      using page = formDocument.getPage(0);
      const result = page.render({ scale: 1, renderFormFields: true });

      const { expected, isNew } = await getSnapshot('test_6_form_page0_1x', result.width, result.height, result.data);

      if (isNew) {
        return;
      }

      const comparison = compareImages(result.data, expected, result.width, result.height, {
        tolerance: PIXEL_TOLERANCE,
        generateDiff: true,
      });

      if (!comparison.match) {
        await saveDiffImage('test_6_form_page0_1x', comparison, result.width, result.height);
      }

      expect(comparison.diffPercentage).toBeLessThan(MAX_DIFF_PERCENTAGE);
    });
  });

  describe('Rotation rendering', () => {
    test('page rotated 90 degrees renders correctly', async () => {
      using page = document.getPage(0);
      const result = page.render({ scale: 0.5, rotation: 1 }); // 90 degrees clockwise

      const { expected, isNew } = await getSnapshot('test_1_page0_rot90', result.width, result.height, result.data);

      if (isNew) {
        return;
      }

      const comparison = compareImages(result.data, expected, result.width, result.height, {
        tolerance: PIXEL_TOLERANCE,
        generateDiff: true,
      });

      if (!comparison.match) {
        await saveDiffImage('test_1_page0_rot90', comparison, result.width, result.height);
      }

      expect(comparison.diffPercentage).toBeLessThan(MAX_DIFF_PERCENTAGE);
    });
  });
});
