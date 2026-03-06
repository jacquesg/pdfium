/**
 * Browser tests for the PDF annotation editor.
 *
 * Runs against the Vite demo app and verifies end-to-end editor behavior
 * in a real browser environment (no mocks).
 */

import { expect, type Locator, type Page, test } from '@playwright/test';

const EDITOR_BASE_URL = process.env.EDITOR_E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5199';
const PAGE_SELECTOR = '[data-page-index="0"]';
const HIT_TARGET_SELECTOR = '[data-testid="select-hit-target"]';
const VIEWER_SELECT_TEXT_BUTTON_LABELS = ['Select text (V)', 'Pointer tool'] as const;
const VIEWER_HAND_BUTTON_LABELS = ['Hand tool (H)', 'Hand tool'] as const;
const EDITOR_ACTION_TOOL_BUTTON_LABELS = new Set(['Highlight', 'Underline', 'Strikeout']);

interface MarkupCase {
  readonly toolLabel: 'Highlight' | 'Underline' | 'Strikeout';
  readonly expectedTypeLabel: 'Highlight' | 'Underline' | 'Strikeout';
  readonly expectedOpacityPercent: number;
}

// Note: PDFium does not round-trip Highlight colour/alpha via annotation serialisation
// in this build for some environments. In the current editor wiring, highlight
// uses the configured default opacity (50%).
const MARKUP_CASES: readonly MarkupCase[] = [
  { toolLabel: 'Highlight', expectedTypeLabel: 'Highlight', expectedOpacityPercent: 50 },
  { toolLabel: 'Underline', expectedTypeLabel: 'Underline', expectedOpacityPercent: 100 },
  { toolLabel: 'Strikeout', expectedTypeLabel: 'Strikeout', expectedOpacityPercent: 100 },
];

interface PageBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LineEndpoints {
  readonly start: { x: number; y: number };
  readonly end: { x: number; y: number };
}

/** Find an editor tool button by aria-label. */
function editorBtn(page: Page, label: string): Locator {
  return page.locator(`button[aria-label="${label}"]`);
}

/** Find viewer buttons that represent canonical text-selection/pointer mode. */
function viewerSelectTextButtons(page: Page): Locator {
  const selectors = VIEWER_SELECT_TEXT_BUTTON_LABELS.map((label) => `button[aria-label="${label}"]`);
  return page.locator(selectors.join(', '));
}

function viewerSelectTextBtnByLabel(page: Page, label: (typeof VIEWER_SELECT_TEXT_BUTTON_LABELS)[number]): Locator {
  return page.locator(`button[aria-label="${label}"]`).first();
}

function viewerHandToolButtonByLabel(page: Page, label: (typeof VIEWER_HAND_BUTTON_LABELS)[number]): Locator {
  return page.locator(`button[aria-label="${label}"]`).first();
}

async function isViewerSelectTextActive(page: Page): Promise<boolean> {
  for (const label of VIEWER_SELECT_TEXT_BUTTON_LABELS) {
    const button = viewerSelectTextBtnByLabel(page, label);
    if ((await button.count()) === 0) continue;
    if ((await button.getAttribute('aria-pressed')) === 'true') return true;
  }
  return false;
}

async function isViewerHandToolActive(page: Page): Promise<boolean> {
  for (const label of VIEWER_HAND_BUTTON_LABELS) {
    const button = viewerHandToolButtonByLabel(page, label);
    if ((await button.count()) === 0) continue;
    if ((await button.getAttribute('aria-pressed')) === 'true') return true;
  }
  return false;
}

async function getPageBox(page: Page, pageIndex: number): Promise<PageBox> {
  const selector = `[data-page-index="${String(pageIndex)}"]`;
  const pageRoot = page.locator(selector);
  await expect(pageRoot).toBeVisible({ timeout: 10_000 });
  await pageRoot.scrollIntoViewIfNeeded();
  const box = await pageRoot.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function switchToTool(page: Page, label: string): Promise<void> {
  const button = editorBtn(page, label);
  await expect(button).toBeVisible();
  await button.click();
  if (!EDITOR_ACTION_TOOL_BUTTON_LABELS.has(label)) {
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
}

async function switchToViewerSelectText(page: Page): Promise<void> {
  for (const label of VIEWER_SELECT_TEXT_BUTTON_LABELS) {
    const button = viewerSelectTextBtnByLabel(page, label);
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      return;
    }
  }

  // Fallback for responsive/overflow toolbar layouts where the button is not visible.
  await page.keyboard.press('v');
  await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
}

async function switchToViewerHandTool(page: Page): Promise<void> {
  for (const label of VIEWER_HAND_BUTTON_LABELS) {
    const button = viewerHandToolButtonByLabel(page, label);
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      return;
    }
  }

  await page.keyboard.press('h');
  await expect.poll(async () => isViewerHandToolActive(page)).toBe(true);
}

async function clickViewerToolbarButton(page: Page, label: string): Promise<void> {
  const button = page.locator(`button[aria-label="${label}"]`).first();
  await expect(button).toBeVisible();
  await button.click();
}

async function zoomInViewer(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await clickViewerToolbarButton(page, 'Zoom in');
  }
}

async function rotateViewerClockwise(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await clickViewerToolbarButton(page, 'Rotate clockwise');
  }
}

async function getFirstPageBox(page: Page): Promise<PageBox> {
  return getPageBox(page, 0);
}

async function clickBlankPointOnPage(page: Page, pageIndex: number): Promise<void> {
  const resolveBlankPoint = async () => {
    return page.evaluate((targetPageIndex) => {
      const pageRoot = document.querySelector<HTMLElement>(`[data-page-index="${String(targetPageIndex)}"]`);
      if (!pageRoot) {
        return null;
      }

      const rect = pageRoot.getBoundingClientRect();
      const left = Math.max(rect.left + 8, 8);
      const top = Math.max(rect.top + 8, 8);
      const right = Math.min(rect.right - 8, window.innerWidth - 8);
      const bottom = Math.min(rect.bottom - 8, window.innerHeight - 8);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      const safePoints: Array<{ x: number; y: number }> = [];
      const steps = 15;

      const isOccupied = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y);
        const hasPageElement = elements.some((element) => {
          return element === pageRoot || (element instanceof HTMLElement && pageRoot.contains(element));
        });
        if (!hasPageElement) {
          return true;
        }
        return elements.some((element) => {
          if (!(element instanceof HTMLElement)) return false;
          return (
            element.closest('[data-testid="selection-overlay"]') !== null ||
            element.closest('[data-testid="select-hit-target"]') !== null ||
            element.closest('[data-testid="shape-creation-overlay"]') !== null ||
            element.dataset.annotationIndex !== undefined
          );
        });
      };

      const cornerCandidates = [
        { x: left + 12, y: top + 12 },
        { x: right - 12, y: top + 12 },
        { x: left + 12, y: bottom - 12 },
        { x: right - 12, y: bottom - 12 },
        { x: left + 12, y: top + height * 0.5 },
        { x: right - 12, y: top + height * 0.5 },
        { x: left + width * 0.5, y: top + 12 },
        { x: left + width * 0.5, y: bottom - 12 },
      ];
      for (const candidate of cornerCandidates) {
        if (!isOccupied(candidate.x, candidate.y)) {
          safePoints.push(candidate);
        }
      }

      for (let row = 0; row <= steps; row++) {
        for (let col = 0; col <= steps; col++) {
          const x = left + width * ((col + 0.5) / (steps + 1));
          const y = top + height * ((row + 0.5) / (steps + 1));
          if (!isOccupied(x, y)) {
            safePoints.push({ x, y });
          }
        }
      }

      return safePoints[0] ?? null;
    }, pageIndex);
  };

  let point = await resolveBlankPoint();
  if (point === null) {
    await page
      .locator(`[data-page-index="${String(pageIndex)}"]`)
      .first()
      .evaluate((node) => {
        if (node instanceof HTMLElement) {
          node.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      });
    point = await resolveBlankPoint();
  }

  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

async function clearSelectionByClickingBlankPoint(page: Page, pageIndex: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await clickBlankPointOnPage(page, pageIndex);
    if ((await page.locator('[data-testid="selection-overlay"]').count()) === 0) {
      return;
    }
  }
}

async function getPageCanvasDataUrl(page: Page): Promise<string> {
  const canvas = page.locator(`${PAGE_SELECTOR} canvas`).first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  return canvas.evaluate((node) => {
    if (!(node instanceof HTMLCanvasElement)) return '';
    return node.toDataURL();
  });
}

async function findReachableHandlePoint(
  page: Page,
  handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end',
): Promise<{ x: number; y: number }> {
  const selector = `[data-testid="handle-${handle}"]`;
  const resolvePoint = async () => {
    return page.evaluate((handleSelector) => {
      const handleElement = document.querySelector<HTMLElement>(handleSelector);
      if (!handleElement) {
        return null;
      }

      const rect = handleElement.getBoundingClientRect();
      const left = Math.max(rect.left, 0);
      const top = Math.max(rect.top, 0);
      const right = Math.min(rect.right, window.innerWidth);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      const steps = 4;

      for (let row = 0; row <= steps; row++) {
        for (let col = 0; col <= steps; col++) {
          const x = left + (right - left) * ((col + 0.5) / (steps + 1));
          const y = top + (bottom - top) * ((row + 0.5) / (steps + 1));
          const elements = document.elementsFromPoint(x, y);
          const hitsHandle = elements.some((element) => {
            return element === handleElement || (element instanceof HTMLElement && handleElement.contains(element));
          });
          if (hitsHandle) {
            return { x, y };
          }
        }
      }

      return null;
    }, selector);
  };

  let point = await resolvePoint();
  if (point === null) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    point = await resolvePoint();
  }

  expect(point).not.toBeNull();
  return point!;
}

async function clickReachableLocator(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const alreadySelected = await locator.evaluate((node) => {
    const pointerEvents = getComputedStyle(node).pointerEvents;
    const presentationPointerEvents = node.getAttribute('pointer-events');
    if (pointerEvents !== 'none' && presentationPointerEvents !== 'none') {
      return false;
    }
    return (
      document.querySelector('[data-testid="annotation-property-panel"]') !== null ||
      document.querySelector('[data-testid="selection-overlay"]') !== null ||
      document.querySelector('[data-testid="selection-markup-overlay"]') !== null
    );
  });
  if (alreadySelected) {
    return;
  }

  const resolvePoint = async () => {
    return locator.evaluate((target) => {
      const clampToViewport = (value: number, max: number) => Math.min(Math.max(value, 1), Math.max(1, max - 1));
      const clampScreenPoint = (point: { x: number; y: number } | null) => {
        if (point === null) {
          return null;
        }
        return {
          x: clampToViewport(point.x, window.innerWidth),
          y: clampToViewport(point.y, window.innerHeight),
        };
      };
      const isTargetReachable = (x: number, y: number) =>
        document.elementsFromPoint(x, y).some((element) => element === target || target.contains(element));
      const tryScreenCandidates = (candidates: Array<{ x: number; y: number } | null>) => {
        const nudges = [
          { x: 0, y: 0 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: -1 },
          { x: 0, y: 1 },
          { x: -2, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: -2 },
          { x: 0, y: 2 },
        ];
        for (const candidate of candidates) {
          if (candidate === null) {
            continue;
          }
          for (const nudge of nudges) {
            const point = clampScreenPoint({
              x: candidate.x + nudge.x,
              y: candidate.y + nudge.y,
            });
            if (point !== null && isTargetReachable(point.x, point.y)) {
              return point;
            }
          }
        }
        return null;
      };

      const toScreenPoint = (element: SVGGraphicsElement, x: number, y: number) => {
        const svg = element.ownerSVGElement;
        const ctm = element.getScreenCTM();
        if (svg === null || ctm === null) {
          return null;
        }
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const transformed = point.matrixTransform(ctm);
        return { x: transformed.x, y: transformed.y };
      };
      const createLocalPoint = (element: SVGGraphicsElement, x: number, y: number) => {
        const svg = element.ownerSVGElement;
        if (svg === null) {
          return null;
        }
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        return point;
      };
      const hitsSvgGeometry = (element: SVGGraphicsElement, x: number, y: number) => {
        const point = createLocalPoint(element, x, y);
        if (point === null) {
          return false;
        }
        try {
          if (element instanceof SVGLineElement) {
            return element.isPointInStroke(point);
          }
          if (element instanceof SVGPolygonElement || element instanceof SVGEllipseElement) {
            return element.isPointInFill(point) || element.isPointInStroke(point);
          }
        } catch {
          return false;
        }
        return false;
      };
      const tryLocalGeometryCandidates = (element: SVGGraphicsElement, candidates: Array<{ x: number; y: number }>) => {
        return tryScreenCandidates(
          candidates
            .filter((candidate) => hitsSvgGeometry(element, candidate.x, candidate.y))
            .map((candidate) => toScreenPoint(element, candidate.x, candidate.y)),
        );
      };

      if (target instanceof SVGLineElement) {
        const x1 = Number.parseFloat(target.getAttribute('x1') ?? '0');
        const y1 = Number.parseFloat(target.getAttribute('y1') ?? '0');
        const x2 = Number.parseFloat(target.getAttribute('x2') ?? '0');
        const y2 = Number.parseFloat(target.getAttribute('y2') ?? '0');
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy) || 1;
        const normal = { x: -dy / length, y: dx / length };
        const candidate = tryLocalGeometryCandidates(
          target,
          [0.5, 0.25, 0.75, 0.125, 0.875].flatMap((fraction) => {
            const baseX = x1 + dx * fraction;
            const baseY = y1 + dy * fraction;
            return [0, -2, 2, -4, 4].map((offset) => ({
              x: baseX + normal.x * offset,
              y: baseY + normal.y * offset,
            }));
          }),
        );
        if (candidate !== null) {
          return candidate;
        }
      }

      if (target instanceof SVGPolygonElement) {
        const points = Array.from(target.points);
        if (points.length > 0) {
          const average = points.reduce(
            (acc, point) => ({
              x: acc.x + point.x / points.length,
              y: acc.y + point.y / points.length,
            }),
            { x: 0, y: 0 },
          );
          const bbox = points.reduce(
            (acc, point) => ({
              minX: Math.min(acc.minX, point.x),
              minY: Math.min(acc.minY, point.y),
              maxX: Math.max(acc.maxX, point.x),
              maxY: Math.max(acc.maxY, point.y),
            }),
            {
              minX: Number.POSITIVE_INFINITY,
              minY: Number.POSITIVE_INFINITY,
              maxX: Number.NEGATIVE_INFINITY,
              maxY: Number.NEGATIVE_INFINITY,
            },
          );
          let signedArea = 0;
          let centroidX = 0;
          let centroidY = 0;
          for (let index = 0; index < points.length; index++) {
            const current = points[index]!;
            const next = points[(index + 1) % points.length]!;
            const cross = current.x * next.y - next.x * current.y;
            signedArea += cross;
            centroidX += (current.x + next.x) * cross;
            centroidY += (current.y + next.y) * cross;
          }
          const areaFactor = signedArea * 3;
          const polygonCentroid =
            Math.abs(areaFactor) > 1e-6
              ? {
                  x: centroidX / areaFactor,
                  y: centroidY / areaFactor,
                }
              : null;
          const candidate = tryLocalGeometryCandidates(target, [
            ...(polygonCentroid === null ? [] : [polygonCentroid]),
            average,
            {
              x: (bbox.minX + bbox.maxX) / 2,
              y: (bbox.minY + bbox.maxY) / 2,
            },
          ]);
          if (candidate !== null) {
            return candidate;
          }
        }
      }

      if (target instanceof SVGEllipseElement) {
        const cx = Number.parseFloat(target.getAttribute('cx') ?? '0');
        const cy = Number.parseFloat(target.getAttribute('cy') ?? '0');
        const rx = Number.parseFloat(target.getAttribute('rx') ?? '0');
        const ry = Number.parseFloat(target.getAttribute('ry') ?? '0');
        const candidate = tryLocalGeometryCandidates(target, [
          { x: cx, y: cy },
          { x: cx + rx * 0.25, y: cy },
          { x: cx - rx * 0.25, y: cy },
          { x: cx, y: cy + ry * 0.25 },
          { x: cx, y: cy - ry * 0.25 },
        ]);
        if (candidate !== null) {
          return candidate;
        }
      }

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const left = Math.max(rect.left + 1, 1);
      const top = Math.max(rect.top + 1, 1);
      const right = Math.min(rect.right - 1, window.innerWidth - 1);
      const bottom = Math.min(rect.bottom - 1, window.innerHeight - 1);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      const steps = rect.width <= 24 || rect.height <= 24 ? 15 : 7;
      for (let row = 0; row <= steps; row++) {
        for (let col = 0; col <= steps; col++) {
          const x = left + width * ((col + 0.5) / (steps + 1));
          const y = top + height * ((row + 0.5) / (steps + 1));
          if (isTargetReachable(x, y)) {
            return { x, y };
          }
        }
      }

      return tryScreenCandidates([
        {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
      ]);
    });
  };

  let point = await resolvePoint().catch(() => null);
  if (point === null) {
    await locator.scrollIntoViewIfNeeded();
    point = await resolvePoint().catch(() => null);
  }

  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

async function waitForCanvasStable(page: Page): Promise<string> {
  let baseline = await getPageCanvasDataUrl(page);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(80);
    const next = await getPageCanvasDataUrl(page);
    if (next === baseline) {
      return next;
    }
    baseline = next;
  }
  return baseline;
}

async function countHitTargets(page: Page): Promise<number> {
  return page.locator(HIT_TARGET_SELECTOR).count();
}

async function ensureSampleLoaded(page: Page): Promise<void> {
  const pageLocator = page.locator(PAGE_SELECTOR);
  if (await pageLocator.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  // Empty-state sample gallery in the current Vite demo.
  const sampleTile = page.locator('main button').filter({ hasText: /\.pdf/i }).first();
  if (await sampleTile.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sampleTile.click();
    return;
  }

  // Legacy fallback if a "Sample PDFs" picker button is shown.
  const sampleButton = page.locator('button', { hasText: 'Sample PDFs' });
  if (await sampleButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sampleButton.click();
  }
}

/** Navigate to the editor and wait until the first page + text layer are ready. */
async function switchToEditor(page: Page): Promise<void> {
  await page.goto(`${EDITOR_BASE_URL}/#editor`);
  await ensureSampleLoaded(page);

  await expect(page.locator(PAGE_SELECTOR)).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => viewerSelectTextButtons(page).count()).toBeGreaterThan(0);
  await expect(editorBtn(page, 'Draw')).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => page.locator(`${PAGE_SELECTOR} span`).count()).toBeGreaterThan(0);
  await switchToViewerSelectText(page);
}

async function tryLoadSampleFromPicker(page: Page, sampleName: string): Promise<boolean> {
  const pickerButton = page.getByRole('button', { name: 'Sample PDFs' }).first();
  await expect(pickerButton).toBeVisible({ timeout: 10_000 });
  await pickerButton.click();

  const option = page.locator('button').filter({ hasText: sampleName }).first();
  if ((await option.count()) === 0) {
    await page.keyboard.press('Escape');
    return false;
  }

  await option.click();
  await expect(page.locator(PAGE_SELECTOR)).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.locator(`${PAGE_SELECTOR} span`).count(), { timeout: 20_000 }).toBeGreaterThan(0);
  return true;
}

async function ensureAtLeastTwoPages(page: Page): Promise<void> {
  if ((await page.locator('[data-page-index="1"]').count()) > 0) {
    return;
  }

  const loadedReference = await tryLoadSampleFromPicker(page, 'Reference (Multi-page)');
  if (!loadedReference) {
    await tryLoadSampleFromPicker(page, 'Sample Document');
  }

  await expect.poll(async () => page.locator('[data-page-index="1"]').count(), { timeout: 20_000 }).toBeGreaterThan(0);
  await switchToViewerSelectText(page);
}

/** Programmatically create a browser text selection in the first page text layer. */
async function selectTextOnFirstPage(page: Page): Promise<void> {
  const didSelect = await page.locator(PAGE_SELECTOR).evaluate((pageEl) => {
    const spans = Array.from(pageEl.querySelectorAll('span'));

    for (const span of spans) {
      const node = span.firstChild;
      if (node === null || node.nodeType !== Node.TEXT_NODE) continue;

      const raw = node.textContent ?? '';
      const text = raw.trim();
      if (text.length < 2) continue;

      const start = 0;
      const end = Math.max(1, Math.min(raw.length, 8));

      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);

      const selection = window.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(range);

      return selection.toString().length > 0;
    }

    return false;
  });

  expect(didSelect).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
}

async function selectTextAcrossTwoLinesOnFirstPage(page: Page): Promise<void> {
  const didSelect = await page.locator(PAGE_SELECTOR).evaluate((pageEl) => {
    const spans = Array.from(pageEl.querySelectorAll('span'))
      .map((span) => {
        const node = span.firstChild;
        const raw = node?.textContent ?? '';
        const text = raw.trim();
        if (node === null || node.nodeType !== Node.TEXT_NODE || text.length < 2) {
          return null;
        }
        const rect = span.getBoundingClientRect();
        return {
          node,
          raw,
          text,
          top: rect.top,
          left: rect.left,
          height: rect.height,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => (Math.abs(a.top - b.top) > 1 ? a.top - b.top : a.left - b.left));

    if (spans.length < 2) {
      return false;
    }

    const start = spans[0]!;
    const lineThreshold = Math.max(4, start.height * 0.5);
    const end = spans.find((span) => Math.abs(span.top - start.top) > lineThreshold);
    if (!end) {
      return false;
    }

    const range = document.createRange();
    range.setStart(start.node, 0);
    range.setEnd(end.node, Math.max(1, Math.min(end.raw.length, 8)));

    const selection = window.getSelection();
    if (!selection) {
      return false;
    }
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim().length > 0;
  });

  expect(didSelect).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
}

async function createTextMarkupAndOpenProperties(page: Page, scenario: MarkupCase): Promise<void> {
  await switchToViewerSelectText(page);
  const countBefore = await countHitTargets(page);

  // Selection-first flow: create text selection, then click the markup tool.
  await selectTextOnFirstPage(page);
  await switchToTool(page, scenario.toolLabel);

  // Markup creation pushes a command.
  await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });

  // Return to select tool and pick the newly created annotation.
  await switchToViewerSelectText(page);
  await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

  await selectNewestHitTarget(page);

  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  await expect(propertyPanel).toBeVisible();
  await expect(page.locator('[data-testid^="handle-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="annotation-type-label"]')).toContainText(
    `Type: ${scenario.expectedTypeLabel}`,
  );
  await expect(propertyPanel).toContainText(`${String(scenario.expectedOpacityPercent)}%`);
}

/** Draw an ink stroke on page 0. */
async function drawInkStroke(page: Page): Promise<void> {
  const box = await getFirstPageBox(page);
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.3;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(startX + i * 12, startY + i * 8);
  }
  await page.mouse.up();
}

async function drawRectangle(page: Page): Promise<void> {
  await drawRectangleOnPage(page, 0);
}

async function ensureRectangleCreatedOnPage(page: Page, pageIndex: number, baselineCount: number): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    await switchToTool(page, 'Rectangle');
    await drawRectangleOnPage(page, pageIndex);
    await switchToViewerSelectText(page);
    try {
      await expect
        .poll(() => countHitTargetsOnPage(page, pageIndex), { timeout: 7_500 })
        .toBeGreaterThan(baselineCount);
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to create rectangle on page ${String(pageIndex + 1)} after retries`);
}

async function countRedactionsOnPage(page: Page, pageIndex: number): Promise<number> {
  return page.locator(`[data-page-index="${String(pageIndex)}"] [data-testid^="redaction-rect-"]`).count();
}

async function ensureRedactionCreatedOnPage(page: Page, pageIndex: number, baselineCount: number): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    await switchToTool(page, 'Redact');
    await drawRectangleOnPage(page, pageIndex);
    try {
      await expect
        .poll(() => countRedactionsOnPage(page, pageIndex), { timeout: 7_500 })
        .toBeGreaterThan(baselineCount);
      await expect(editorBtn(page, 'Redact')).toHaveAttribute('aria-pressed', 'false');
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to create redaction on page ${String(pageIndex + 1)} after retries`);
}

interface DrawRectangleOptions {
  readonly shiftKey?: boolean;
}

async function drawRectangleOnPage(page: Page, pageIndex: number, options: DrawRectangleOptions = {}): Promise<void> {
  const shapeOverlay = page
    .locator(`[data-page-index="${String(pageIndex)}"] [data-testid="shape-creation-overlay"]`)
    .first();
  await expect(shapeOverlay).toBeVisible({ timeout: 10_000 });
  const pageRoot = page.locator(`[data-page-index="${String(pageIndex)}"]`).first();

  const resolveDragPoints = async () => {
    return page.evaluate((targetPageIndex) => {
      const overlay = document.querySelector<HTMLElement>(
        `[data-page-index="${String(targetPageIndex)}"] [data-testid="shape-creation-overlay"]`,
      );
      if (!overlay) {
        return null;
      }

      const rect = overlay.getBoundingClientRect();
      const left = Math.max(rect.left + 8, 8);
      const top = Math.max(rect.top + 8, 8);
      const right = Math.min(rect.right - 8, window.innerWidth - 8);
      const bottom = Math.min(rect.bottom - 8, window.innerHeight - 8);
      const width = right - left;
      const height = bottom - top;
      if (width < 40 || height < 30) {
        return null;
      }

      const safePoints: Array<{ x: number; y: number }> = [];
      const steps = 10;
      for (let row = 0; row <= steps; row++) {
        for (let col = 0; col <= steps; col++) {
          const x = left + (right - left) * ((col + 0.5) / (steps + 1));
          const y = top + (bottom - top) * ((row + 0.5) / (steps + 1));
          const elements = document.elementsFromPoint(x, y);
          const hitsOverlay = elements.some((element) => {
            return element === overlay || (element instanceof HTMLElement && overlay.contains(element));
          });
          if (hitsOverlay) {
            safePoints.push({ x, y });
          }
        }
      }

      if (safePoints.length < 2) {
        return null;
      }

      const pickNearest = (
        targetX: number,
        targetY: number,
        points: Array<{ x: number; y: number }>,
      ): { x: number; y: number } | null => {
        let bestPoint: { x: number; y: number } | null = null;
        let bestDistanceSq = Number.POSITIVE_INFINITY;
        for (const point of points) {
          const dx = point.x - targetX;
          const dy = point.y - targetY;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq < bestDistanceSq) {
            bestDistanceSq = distanceSq;
            bestPoint = point;
          }
        }
        return bestPoint;
      };

      const start = pickNearest(left + width * 0.22, top + height * 0.22, safePoints);
      if (!start) {
        return null;
      }

      const minimumWidth = Math.max(30, width * 0.18);
      const minimumHeight = Math.max(20, height * 0.16);
      const endCandidates = safePoints.filter((point) => {
        return point.x - start.x >= minimumWidth && point.y - start.y >= minimumHeight;
      });
      const end =
        pickNearest(left + width * 0.68, top + height * 0.58, endCandidates) ??
        pickNearest(left + width * 0.62, top + height * 0.52, endCandidates);

      if (!end) {
        return null;
      }

      return { start, end };
    }, pageIndex);
  };

  let dragPoints = await resolveDragPoints();
  if (dragPoints === null) {
    await pageRoot.evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    });
    await expect(shapeOverlay).toBeVisible({ timeout: 10_000 });
    dragPoints = await resolveDragPoints();
  }

  expect(dragPoints).not.toBeNull();
  const startX = dragPoints!.start.x;
  const startY = dragPoints!.start.y;
  const endX = dragPoints!.end.x;
  const endY = dragPoints!.end.y;

  if (options.shiftKey) {
    await page.keyboard.down('Shift');
  }
  try {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();
  } finally {
    if (options.shiftKey) {
      await page.keyboard.up('Shift');
    }
  }
}

async function countHitTargetsOnPage(page: Page, pageIndex: number): Promise<number> {
  return page.locator(`[data-page-index="${String(pageIndex)}"] ${HIT_TARGET_SELECTOR}`).count();
}

async function getHitTargetIndices(page: Page): Promise<number[]> {
  const hitTargets = page.locator(HIT_TARGET_SELECTOR);
  return hitTargets.evaluateAll((nodes) =>
    nodes
      .map((node) => Number.parseInt((node as HTMLElement).dataset.annotationIndex ?? '', 10))
      .filter((index) => Number.isFinite(index)),
  );
}

async function getSidebarAnnotationIndices(page: Page): Promise<number[]> {
  const panelItems = page.locator('[data-panel-item]');
  return panelItems.evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const text = (node.textContent ?? '').trim();
        const match = text.match(/^#(\d+)\b/);
        return match ? Number.parseInt(match[1]!, 10) : Number.NaN;
      })
      .filter((index) => Number.isFinite(index)),
  );
}

async function selectHitTargetByIndex(page: Page, annotationIndex: number): Promise<Locator> {
  const selector = `${HIT_TARGET_SELECTOR}[data-annotation-index="${String(annotationIndex)}"]`;
  const target = page.locator(selector).first();
  await expect.poll(async () => page.locator(selector).count()).toBeGreaterThan(0);
  await clickReachableLocator(page, target);
  return target;
}

async function selectNewestHitTarget(page: Page): Promise<Locator> {
  const indices = await getHitTargetIndices(page);
  expect(indices.length).toBeGreaterThan(0);
  const newestIndex = Math.max(...indices);
  return selectHitTargetByIndex(page, newestIndex);
}

async function saveEditedDocument(page: Page): Promise<import('@playwright/test').Download> {
  const saveButton = page.locator('button[aria-label="Save"]');
  await expect(saveButton).toHaveAttribute('title', 'Save document');
  const downloadPromise = page.waitForEvent('download');
  await saveButton.click();
  const download = await downloadPromise;
  await expect(saveButton).toHaveAttribute('title', 'No unsaved changes');
  await expect(page.locator('[title="Unsaved changes"]')).toHaveCount(0);
  return download;
}

async function centerPageInView(page: Page, pageIndex: number): Promise<void> {
  await page
    .locator(`[data-page-index="${String(pageIndex)}"]`)
    .first()
    .evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    });
}

async function uploadPdfFile(page: Page, filePath: string, expectedName: string): Promise<void> {
  await page.locator('input[type="file"]').first().setInputFiles(filePath);
  await expect(page.locator('header').first()).toContainText(expectedName);
  await expect(page.locator(PAGE_SELECTOR)).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => page.locator(`${PAGE_SELECTOR} span`).count(), { timeout: 20_000 }).toBeGreaterThan(0);
}

async function selectNewestHitTargetOnPage(page: Page, pageIndex: number): Promise<Locator> {
  await centerPageInView(page, pageIndex);
  const scopedHitTargets = page.locator(`[data-page-index="${String(pageIndex)}"] ${HIT_TARGET_SELECTOR}`);
  const indices = await scopedHitTargets.evaluateAll((nodes) =>
    nodes
      .map((node) => Number.parseInt((node as HTMLElement).dataset.annotationIndex ?? '', 10))
      .filter((index) => Number.isFinite(index)),
  );
  expect(indices.length).toBeGreaterThan(0);
  const newestIndex = Math.max(...indices);
  const selector = `[data-page-index="${String(pageIndex)}"] ${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`;
  const target = page.locator(selector).first();
  await expect.poll(async () => page.locator(selector).count()).toBeGreaterThan(0);
  await clickReachableLocator(page, target);
  return target;
}

async function ensureNewestHitTargetOnPageOpensProperties(page: Page, pageIndex: number): Promise<Locator> {
  const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
  let target: Locator | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    await centerPageInView(page, pageIndex);
    target = await selectNewestHitTargetOnPage(page, pageIndex);
    if (await propertyPanel.isVisible().catch(() => false)) {
      return target;
    }
    await clearSelectionByClickingBlankPoint(page, pageIndex);
  }
  await expect(propertyPanel).toBeVisible();
  return target!;
}

async function setColourInput(locator: Locator, hex: string): Promise<void> {
  await locator.fill(hex);
}

async function setNumberInput(locator: Locator, value: number): Promise<void> {
  await locator.fill(String(value));
  await locator.blur();
}

async function setRangeInput(page: Page, locator: Locator, value: number): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const min = Number((await locator.getAttribute('min')) ?? '0');
  const max = Number((await locator.getAttribute('max')) ?? '1');
  const clamped = Math.max(min, Math.min(max, value));
  const ratio = max === min ? 0 : (clamped - min) / (max - min);

  const targetX = box!.x + ratio * box!.width;
  const targetY = box!.y + box!.height / 2;
  await page.mouse.move(targetX, targetY);
  await page.mouse.down();
  await page.mouse.up();
}

async function getSelectionOverlayBox(page: Page): Promise<PageBox> {
  const overlay = page.locator('[data-testid="selection-overlay"]');
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function dragAnnotationHandle(
  page: Page,
  handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end',
  delta: { x: number; y: number },
  options: { shiftKey?: boolean } = {},
): Promise<void> {
  const handleLocator = page.locator(`[data-testid="handle-${handle}"]`);
  await expect(handleLocator).toBeVisible();
  await handleLocator.hover();
  const start = await findReachableHandlePoint(page, handle);
  const startX = start.x;
  const startY = start.y;
  const steps = Math.max(16, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / 4));
  if (options.shiftKey) {
    await page.keyboard.down('Shift');
  }
  try {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + delta.x, startY + delta.y, { steps });
    await page.mouse.up();
  } finally {
    if (options.shiftKey) {
      await page.keyboard.up('Shift');
    }
  }
}

async function dragSelectionHandle(
  page: Page,
  handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
  delta: { x: number; y: number },
  options: { shiftKey?: boolean } = {},
): Promise<void> {
  await dragAnnotationHandle(page, handle, delta, options);
}

function parseLineEndpoints(text: string): LineEndpoints | null {
  const match = text.match(/Line:\s*\(([-\d.]+),\s*([-\d.]+)\)\s+to\s+\(([-\d.]+),\s*([-\d.]+)\)/);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) {
    return null;
  }
  const start = { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) };
  const end = { x: Number.parseFloat(match[3]), y: Number.parseFloat(match[4]) };
  return { start, end };
}

function lineLength(endpoints: LineEndpoints): number {
  const dx = endpoints.end.x - endpoints.start.x;
  const dy = endpoints.end.y - endpoints.start.y;
  return Math.hypot(dx, dy);
}

test.describe('Editor — end-to-end in browser', () => {
  test('editor toolbar renders after loading PDF', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await expect(editorBtn(page, 'Select')).toHaveCount(0);
    await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test('ink tool draws stroke and enables undo/dirty state', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Draw');

    const undoBtn = editorBtn(page, 'Undo');
    await expect(undoBtn).toBeDisabled();

    await drawInkStroke(page);
    await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
    await expect(page.locator('[title="Unsaved changes"]')).toBeVisible();
    await expect(editorBtn(page, 'Save')).toBeEnabled();

    expect(errors).toHaveLength(0);
  });

  test('rectangle tool creates shape annotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');

    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    expect(errors).toHaveLength(0);
  });

  test('newly created rectangle is auto-selected for immediate editing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const sidebarCountBefore = (await getSidebarAnnotationIndices(page)).length;
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);

    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await expect.poll(async () => (await getSidebarAnnotationIndices(page)).length).toBe(sidebarCountBefore + 1);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="annotation-type-label"]')).toContainText('Rectangle');

    expect(errors).toHaveLength(0);
  });

  test('rectangle creation and resize remain stable at zoomed scale', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    await zoomInViewer(page, 2);
    await waitForCanvasStable(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const target = await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);

    await dragSelectionHandle(page, 'e', { x: 90, y: 0 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 35);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await clickReachableLocator(page, target);
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 35);

    expect(errors).toHaveLength(0);
  });

  test('line tool creates a visible annotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await expect(editorBtn(page, 'Line')).toHaveAttribute('aria-pressed', 'false');

    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    expect(errors).toHaveLength(0);
  });

  test('line tool works when activated from hand mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerHandTool(page);

    const countBefore = await countHitTargets(page);
    await switchToTool(page, 'Line');
    await expect(editorBtn(page, 'Line')).toHaveAttribute('aria-pressed', 'true');
    await drawRectangle(page);
    await expect(editorBtn(page, 'Line')).toHaveAttribute('aria-pressed', 'false');

    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    expect(errors).toHaveLength(0);
  });

  test('line selections use endpoint handles and show live preview while dragging', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await ensureNewestHitTargetOnPageOpensProperties(page, 0);

    await expect(page.locator('[data-testid="handle-start"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="handle-end"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="handle-se"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="handle-nw"]')).toHaveCount(0);

    const endHandle = page.locator('[data-testid="handle-end"]');
    await expect(endHandle).toBeVisible();
    const handleBox = await endHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 40, handleBox!.y + handleBox!.height / 2 + 20, {
      steps: 6,
    });

    await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="selection-committed-mask"]')).toHaveCount(1);

    await page.mouse.up();
    await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="selection-committed-mask"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('line info updates live while an endpoint drag is in progress', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await ensureNewestHitTargetOnPageOpensProperties(page, 0);
    const lineInfo = page.locator('[data-testid="line-info"]');
    await expect(lineInfo).toBeVisible();
    const beforeText = await lineInfo.innerText();

    const endHandle = page.locator('[data-testid="handle-end"]');
    await expect(endHandle).toBeVisible();
    const handleBox = await endHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 35, handleBox!.y + handleBox!.height / 2 + 20, {
      steps: 5,
    });

    await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(1);
    await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);

    await page.mouse.up();

    expect(errors).toHaveLength(0);
  });

  test('rectangle creation and resize repaint correctly after clockwise rotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await rotateViewerClockwise(page, 1);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const target = await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);
    const beforeCanvas = await waitForCanvasStable(page);

    await dragSelectionHandle(page, 'se', { x: 80, y: 50 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 20);
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).height, { timeout: 10_000 })
      .toBeGreaterThan(before.height + 15);
    await expect.poll(async () => await getPageCanvasDataUrl(page), { timeout: 10_000 }).not.toBe(beforeCanvas);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await clickReachableLocator(page, target);
    const persisted = await getSelectionOverlayBox(page);
    expect(persisted.width).toBeGreaterThan(before.width + 20);
    expect(persisted.height).toBeGreaterThan(before.height + 15);

    expect(errors).toHaveLength(0);
  });

  test('hand tool disables annotation selection hit targets', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await ensureRectangleCreatedOnPage(page, 0, countBefore);

    const hitTargets = page.locator(HIT_TARGET_SELECTOR);
    const countAfter = await hitTargets.count();
    expect(countAfter).toBeGreaterThan(countBefore);
    await selectNewestHitTarget(page);
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    await expect(propertyPanel).toBeVisible();

    await switchToViewerHandTool(page);
    await expect.poll(() => countHitTargets(page)).toBe(0);
    await expect(propertyPanel).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('redaction tool marks and then applies current-page redactions', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Redact');
    await drawRectangle(page);

    const flattenBtn = editorBtn(page, 'Apply redactions on current page');
    await expect.poll(async () => (await flattenBtn.isEnabled()) || (await flattenBtn.isDisabled())).toBe(true);

    await expect(flattenBtn).toBeEnabled({ timeout: 10_000 });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await flattenBtn.click();

    await expect(flattenBtn).toBeDisabled({ timeout: 10_000 });
    expect(errors).toHaveLength(0);
  });

  test('redaction tool works when activated from hand mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerHandTool(page);

    await switchToTool(page, 'Redact');
    await expect(editorBtn(page, 'Redact')).toHaveAttribute('aria-pressed', 'true');
    await drawRectangle(page);
    await expect(editorBtn(page, 'Redact')).toHaveAttribute('aria-pressed', 'false');

    const flattenBtn = editorBtn(page, 'Apply redactions on current page');
    await expect.poll(async () => (await flattenBtn.isEnabled()) || (await flattenBtn.isDisabled())).toBe(true);

    await expect(flattenBtn).toBeEnabled({ timeout: 10_000 });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await flattenBtn.click();
    await expect(flattenBtn).toBeDisabled({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });

  test('multi-page redaction status and apply messaging stay page-scoped', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await ensureAtLeastTwoPages(page);

    const page0RedactionsBefore = await countRedactionsOnPage(page, 0);
    await ensureRedactionCreatedOnPage(page, 0, page0RedactionsBefore);
    const page1RedactionsBefore = await countRedactionsOnPage(page, 1);
    await ensureRedactionCreatedOnPage(page, 1, page1RedactionsBefore);

    const status = page.locator('[data-testid="redaction-status"]');
    await expect.poll(async () => (await status.innerText()).includes('Page 2: 1')).toBe(true);
    await expect.poll(async () => (await status.innerText()).includes('Total: 2')).toBe(true);
    await expect(status).toHaveAttribute('title', /Pages:\s*P1: 1,\s*P2: 1/);

    const flattenBtn = editorBtn(page, 'Apply redactions on current page');
    await expect(flattenBtn).toHaveAttribute('title', /Apply 1 marked redaction on page 2 \(2 total marked\)/);

    let dialogMessage = '';
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await flattenBtn.click();

    await expect.poll(() => dialogMessage.length > 0).toBe(true);
    expect(dialogMessage).toContain('Apply 1 marked redaction region on page 2?');
    expect(dialogMessage).toContain('1 marked redaction on other pages will remain marked (not applied).');

    await expect.poll(async () => (await status.innerText()).includes('Page 2: 0')).toBe(true);
    await expect.poll(async () => (await status.innerText()).includes('Total: 1')).toBe(true);
    await expect(flattenBtn).toBeDisabled();
    await expect(flattenBtn).toHaveAttribute('title', /No marked redactions on page 2 \(1 on other pages\)/);

    expect(errors).toHaveLength(0);
  });

  for (const scenario of MARKUP_CASES) {
    test(`${scenario.toolLabel.toLowerCase()} tool creates ${scenario.expectedTypeLabel} annotation`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await switchToEditor(page);
      await createTextMarkupAndOpenProperties(page, scenario);

      expect(errors).toHaveLength(0);
    });
  }

  test('selected highlight uses text-markup selection chrome instead of bounds-box chrome', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await createTextMarkupAndOpenProperties(page, MARKUP_CASES[0]!);

    await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-markup-segment"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="handle-"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('annotations sidebar selection opens the editor property panel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const sidebarCountBefore = (await getSidebarAnnotationIndices(page)).length;

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await expect.poll(async () => (await getSidebarAnnotationIndices(page)).length).toBe(sidebarCountBefore + 1);

    const indices = await getSidebarAnnotationIndices(page);
    expect(indices.length).toBeGreaterThan(0);
    const newestIndex = Math.max(...indices);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    const panelItem = page.getByRole('button', { name: new RegExp(`#${String(newestIndex)} \\[`) }).first();
    await panelItem.click();

    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="annotation-type-label"]')).toContainText('Rectangle');

    expect(errors).toHaveLength(0);
  });

  test('highlight colour edits persist after deselect/reselect', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await createTextMarkupAndOpenProperties(page, MARKUP_CASES[0]!);

    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    await expect(fillInput).toBeVisible();
    await setColourInput(fillInput, '#00ff00');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#00ff00');

    const indices = await getHitTargetIndices(page);
    expect(indices.length).toBeGreaterThan(0);
    const newestIndex = Math.max(...indices);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    await selectHitTargetByIndex(page, newestIndex);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    await expect
      .poll(async () => await page.locator('[data-testid="interior-colour-input"]').inputValue())
      .toBe('#00ff00');

    expect(errors).toHaveLength(0);
  });

  test('multi-segment highlight hit targets do not select through the gap between quads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await selectTextAcrossTwoLinesOnFirstPage(page);
    await switchToTool(page, 'Highlight');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);

    const indices = await getHitTargetIndices(page);
    expect(indices.length).toBeGreaterThan(0);
    const newestIndex = Math.max(...indices);
    const segmentTargets = page.locator(`${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`);
    await expect(segmentTargets).toHaveCount(2);

    await clickReachableLocator(page, segmentTargets.first());
    await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();

    const firstBox = await segmentTargets.nth(0).boundingBox();
    const secondBox = await segmentTargets.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    const [upper, lower] =
      firstBox!.y <= secondBox!.y ? ([firstBox!, secondBox!] as const) : ([secondBox!, firstBox!] as const);
    const overlapLeft = Math.max(upper.x, lower.x);
    const overlapRight = Math.min(upper.x + upper.width, lower.x + lower.width);
    const gapPoint = {
      x: overlapRight > overlapLeft ? (overlapLeft + overlapRight) / 2 : (upper.x + lower.x + lower.width) / 2,
      y: (upper.y + upper.height + lower.y) / 2,
    };

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await page.mouse.click(gapPoint.x, gapPoint.y);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('multi-segment underline hit targets do not select through the gap between segments', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await selectTextAcrossTwoLinesOnFirstPage(page);
    await switchToTool(page, 'Underline');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);

    const indices = await getHitTargetIndices(page);
    expect(indices.length).toBeGreaterThan(0);
    const newestIndex = Math.max(...indices);
    const segmentTargets = page.locator(`${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`);
    await expect(segmentTargets).toHaveCount(2);

    await clickReachableLocator(page, segmentTargets.first());
    await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();

    const firstBox = await segmentTargets.nth(0).boundingBox();
    const secondBox = await segmentTargets.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    const [upper, lower] =
      firstBox!.y <= secondBox!.y ? ([firstBox!, secondBox!] as const) : ([secondBox!, firstBox!] as const);
    const overlapLeft = Math.max(upper.x, lower.x);
    const overlapRight = Math.min(upper.x + upper.width, lower.x + lower.width);
    const gapPoint = {
      x: overlapRight > overlapLeft ? (overlapLeft + overlapRight) / 2 : (upper.x + lower.x + lower.width) / 2,
      y: (upper.y + upper.height + lower.y) / 2,
    };

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await page.mouse.click(gapPoint.x, gapPoint.y);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('multi-segment strikeout hit targets do not select through the gap between segments', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await selectTextAcrossTwoLinesOnFirstPage(page);
    await switchToTool(page, 'Strikeout');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);

    const indices = await getHitTargetIndices(page);
    expect(indices.length).toBeGreaterThan(0);
    const newestIndex = Math.max(...indices);
    const segmentTargets = page.locator(`${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`);
    await expect(segmentTargets).toHaveCount(2);

    await clickReachableLocator(page, segmentTargets.first());
    await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();

    const firstBox = await segmentTargets.nth(0).boundingBox();
    const secondBox = await segmentTargets.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    const [upper, lower] =
      firstBox!.y <= secondBox!.y ? ([firstBox!, secondBox!] as const) : ([secondBox!, firstBox!] as const);
    const overlapLeft = Math.max(upper.x, lower.x);
    const overlapRight = Math.min(upper.x + upper.width, lower.x + lower.width);
    const gapPoint = {
      x: overlapRight > overlapLeft ? (overlapLeft + overlapRight) / 2 : (upper.x + lower.x + lower.width) / 2,
      y: (upper.y + upper.height + lower.y) / 2,
    };

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await page.mouse.click(gapPoint.x, gapPoint.y);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('saved rectangle styles round-trip through demo download and upload', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await ensureNewestHitTargetOnPageOpensProperties(page, 0);
    const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
    const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    await expect(strokeInput).toBeVisible();
    await expect(fillInput).toBeVisible();
    await setColourInput(strokeInput, '#ff0000');
    if (!(await fillEnabledInput.isChecked())) {
      await fillEnabledInput.check();
    }
    await setColourInput(fillInput, '#00ff00');
    await setNumberInput(borderWidthInput, 5);
    await expect(fillEnabledInput).toBeChecked();
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#ff0000');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#00ff00');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^5(?:\.0+)?$/);

    const download = await saveEditedDocument(page);
    const savedPath = testInfo.outputPath('edited.pdf');
    await download.saveAs(savedPath);

    await uploadPdfFile(page, savedPath, 'edited.pdf');
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countBefore + 1);

    await ensureNewestHitTargetOnPageOpensProperties(page, 0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="fill-enabled-input"]')).toBeChecked();
    await expect
      .poll(async () => await page.locator('[data-testid="stroke-colour-input"]').inputValue())
      .toBe('#ff0000');
    await expect
      .poll(async () => await page.locator('[data-testid="interior-colour-input"]').inputValue())
      .toBe('#00ff00');
    await expect
      .poll(async () => await page.locator('[data-testid="border-width-input"]').inputValue())
      .toMatch(/^5(?:\.0+)?$/);

    expect(errors).toHaveLength(0);
  });

  test('saved multi-segment highlight colour round-trips through demo download and upload', async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await selectTextAcrossTwoLinesOnFirstPage(page);
    await switchToTool(page, 'Highlight');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);
    const countAfterCreate = await countHitTargets(page);

    await selectNewestHitTargetOnPage(page, 0);
    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    await expect(fillInput).toBeVisible();
    await setColourInput(fillInput, '#00ff00');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#00ff00');

    const download = await saveEditedDocument(page);
    const savedPath = testInfo.outputPath('edited-highlight.pdf');
    await download.saveAs(savedPath);

    await uploadPdfFile(page, savedPath, 'edited-highlight.pdf');
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterCreate);

    const indices = await getHitTargetIndices(page);
    expect(indices.length).toBeGreaterThan(0);
    const newestIndex = Math.max(...indices);
    const segmentTargets = page.locator(`${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`);
    await expect(segmentTargets).toHaveCount(2);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await selectNewestHitTargetOnPage(page, 0);

    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();
    await expect
      .poll(async () => await page.locator('[data-testid="interior-colour-input"]').inputValue())
      .toBe('#00ff00');

    expect(errors).toHaveLength(0);
  });

  test('saved line geometry and style round-trip through demo download and upload', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    const countAfterCreate = await countHitTargets(page);

    await selectNewestHitTargetOnPage(page, 0);
    const lineInfo = page.locator('[data-testid="line-info"]');
    await expect(lineInfo).toBeVisible();
    const beforeText = await lineInfo.innerText();
    const beforeEndpoints = parseLineEndpoints(beforeText);
    expect(beforeEndpoints).not.toBeNull();
    const beforeLength = lineLength(beforeEndpoints!);

    await dragAnnotationHandle(page, 'end', { x: 90, y: 0 });
    await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);
    const afterText = await lineInfo.innerText();
    const afterEndpoints = parseLineEndpoints(afterText);
    expect(afterEndpoints).not.toBeNull();
    const afterLength = lineLength(afterEndpoints!);
    expect(afterLength).toBeGreaterThan(beforeLength + 5);

    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    await setNumberInput(borderWidthInput, 2);
    await setRangeInput(page, opacityInput, 0.5);
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2(?:\.0+)?$/);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toContainText(/(49|50|51)%/);

    const download = await saveEditedDocument(page);
    const savedPath = testInfo.outputPath('edited-line.pdf');
    await download.saveAs(savedPath);

    await uploadPdfFile(page, savedPath, 'edited-line.pdf');
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterCreate);

    await selectNewestHitTargetOnPage(page, 0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
    const persistedText = await page.locator('[data-testid="line-info"]').innerText();
    const persistedEndpoints = parseLineEndpoints(persistedText);
    expect(persistedEndpoints).not.toBeNull();
    const persistedLength = lineLength(persistedEndpoints!);
    expect(Math.abs(persistedLength - afterLength)).toBeLessThan(2);
    await expect
      .poll(async () => await page.locator('[data-testid="border-width-input"]').inputValue())
      .toMatch(/^2(?:\.0+)?$/);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toContainText(/(49|50|51)%/);

    expect(errors).toHaveLength(0);
  });

  test('markup action clicked from active drawing tool exits drawing mode first', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Rectangle');
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

    const countBefore = await countHitTargets(page);
    await selectTextOnFirstPage(page);
    await switchToTool(page, 'Highlight');

    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    expect(errors).toHaveLength(0);
  });

  test('selecting text clears the currently selected annotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const hitTargets = page.locator(HIT_TARGET_SELECTOR);
    const countAfter = await hitTargets.count();
    await clickReachableLocator(page, hitTargets.nth(countAfter - 1));
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    await expect(propertyPanel).toBeVisible();

    await selectTextOnFirstPage(page);
    await expect(propertyPanel).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('typing Backspace/Delete inside property fields does not delete the selected annotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const countAfterCreate = await countHitTargets(page);
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    await expect(propertyPanel).toBeVisible();

    const contentsInput = page.locator('[data-testid="contents-input"]');
    await contentsInput.fill('abc');
    await contentsInput.focus();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');

    await expect(contentsInput).toHaveValue('ab');
    await expect(propertyPanel).toBeVisible();
    await expect.poll(() => countHitTargets(page)).toBe(countAfterCreate);
    expect(errors).toHaveLength(0);
  });

  test('shape property edits persist for stroke, fill, and opacity', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const hitTargets = page.locator(HIT_TARGET_SELECTOR);
    const countAfter = await hitTargets.count();
    const target = hitTargets.nth(countAfter - 1);
    await clickReachableLocator(page, target);

    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
    const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    await expect(propertyPanel).toBeVisible();

    await setColourInput(strokeInput, '#00ff00');
    await fillEnabledInput.check();
    await setColourInput(fillInput, '#0000ff');
    await setNumberInput(borderWidthInput, 3);
    await setRangeInput(page, opacityInput, 0.4);

    await expect(fillEnabledInput).toBeChecked();
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#00ff00');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#0000ff');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^3(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(39|40|41)%/);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(propertyPanel).not.toBeVisible();

    await clickReachableLocator(page, target);
    await expect(propertyPanel).toBeVisible();
    await expect(fillEnabledInput).toBeChecked();
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#00ff00');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#0000ff');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^3(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(39|40|41)%/);

    expect(errors).toHaveLength(0);
  });

  test('rectangle style edits become defaults for newly created rectangles', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargetsOnPage(page, 0);

    await ensureRectangleCreatedOnPage(page, 0, countBefore);

    await ensureNewestHitTargetOnPageOpensProperties(page, 0);
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
    const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    await expect(propertyPanel).toBeVisible();

    if (!(await fillEnabledInput.isChecked())) {
      await fillEnabledInput.check();
    }
    await setColourInput(strokeInput, '#228833');
    await setColourInput(fillInput, '#1144aa');
    await setNumberInput(borderWidthInput, 4);
    await setRangeInput(page, opacityInput, 0.6);
    await expect(propertyPanel).toContainText(/(59|60|61)%/);

    const countAfterFirst = await countHitTargetsOnPage(page, 0);
    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(propertyPanel).not.toBeVisible();

    await ensureRectangleCreatedOnPage(page, 0, countAfterFirst);

    await ensureNewestHitTargetOnPageOpensProperties(page, 0);
    await expect(propertyPanel).toBeVisible();
    await expect(fillEnabledInput).toBeChecked();
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#228833');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#1144aa');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^4(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(59|60|61)%/);

    expect(errors).toHaveLength(0);
  });

  test('rapid rectangle property edits converge to the final values', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const target = await selectNewestHitTarget(page);
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
    const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    await expect(propertyPanel).toBeVisible();

    await fillEnabledInput.check();
    await setColourInput(strokeInput, '#ff0000');
    await setColourInput(strokeInput, '#00ff00');
    await setColourInput(strokeInput, '#112233');
    await setColourInput(fillInput, '#00ffff');
    await setColourInput(fillInput, '#445566');
    await setNumberInput(borderWidthInput, 1.5);
    await setNumberInput(borderWidthInput, 4);
    await setNumberInput(borderWidthInput, 2.5);
    await setRangeInput(page, opacityInput, 0.2);
    await setRangeInput(page, opacityInput, 0.8);
    await setRangeInput(page, opacityInput, 0.35);

    await expect.poll(async () => await strokeInput.inputValue()).toBe('#112233');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#445566');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);
    await expect(propertyPanel).toContainText(/(33|34|35|36)%/);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(propertyPanel).not.toBeVisible();

    await clickReachableLocator(page, target);
    await expect(propertyPanel).toBeVisible();
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#112233');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#445566');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);
    await expect(propertyPanel).toContainText(/(33|34|35|36)%/);

    expect(errors).toHaveLength(0);
  });

  test('property edits repaint only on commit boundaries at zoom + rotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await zoomInViewer(page, 2);
    await rotateViewerClockwise(page, 1);
    await waitForCanvasStable(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await ensureRectangleCreatedOnPage(page, 0, countBefore);
    await selectNewestHitTarget(page);

    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    await expect(propertyPanel).toBeVisible();
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^1(?:\.0+)?$/);

    await setNumberInput(borderWidthInput, 2.5);
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);

    const opacityBox = await opacityInput.boundingBox();
    expect(opacityBox).not.toBeNull();
    const min = Number((await opacityInput.getAttribute('min')) ?? '0');
    const max = Number((await opacityInput.getAttribute('max')) ?? '1');
    const startValue = 0.2;
    const endValue = 0.85;
    const startRatio = max === min ? 0 : (startValue - min) / (max - min);
    const endRatio = max === min ? 0 : (endValue - min) / (max - min);
    const y = opacityBox!.y + opacityBox!.height / 2;
    const startX = opacityBox!.x + startRatio * opacityBox!.width;
    const endX = opacityBox!.x + endRatio * opacityBox!.width;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++) {
      const t = step / 10;
      await page.mouse.move(startX + (endX - startX) * t, y, { steps: 1 });
    }
    await page.mouse.up();
    await expect(propertyPanel).toContainText(/(8[4-9]|90)%/);
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);

    expect(errors).toHaveLength(0);
  });

  test('shift-constrained creation enforces square and snapped line geometry', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangleOnPage(page, 0, { shiftKey: true });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const squareOverlay = page.locator('[data-testid="selection-overlay"]');
    const squareBox = await squareOverlay.boundingBox();
    expect(squareBox).not.toBeNull();
    const squareDelta = Math.abs((squareBox?.width ?? 0) - (squareBox?.height ?? 0));
    expect(squareDelta).toBeLessThanOrEqual(4);

    await switchToTool(page, 'Circle');
    await drawRectangleOnPage(page, 0, { shiftKey: true });
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);
    await selectNewestHitTarget(page);

    const circleOverlay = page.locator('[data-testid="selection-overlay"]');
    const circleBox = await circleOverlay.boundingBox();
    expect(circleBox).not.toBeNull();
    const circleDelta = Math.abs((circleBox?.width ?? 0) - (circleBox?.height ?? 0));
    expect(circleDelta).toBeLessThanOrEqual(4);

    const lineIndicesBefore = new Set(await getHitTargetIndices(page));
    await switchToTool(page, 'Line');
    await drawRectangleOnPage(page, 0, { shiftKey: true });
    await switchToViewerSelectText(page);

    let lineIndex = -1;
    await expect
      .poll(async () => {
        const current = await getHitTargetIndices(page);
        const created = current.filter((index) => !lineIndicesBefore.has(index));
        if (created.length > 0) {
          lineIndex = created[0] ?? -1;
        }
        return created.length;
      })
      .toBeGreaterThan(0);
    expect(lineIndex).toBeGreaterThanOrEqual(0);
    await selectHitTargetByIndex(page, lineIndex);

    const typeLabel = page.locator('[data-testid="annotation-type-label"]');
    await expect(typeLabel).toContainText('Type: Line');

    const lineInfo = page.locator('[data-testid="line-info"]');
    await expect(lineInfo).toBeVisible();
    const text = await lineInfo.innerText();
    const match = text.match(/Line:\s*\(([-\d.]+),\s*([-\d.]+)\)\s+to\s+\(([-\d.]+),\s*([-\d.]+)\)/);
    expect(match).not.toBeNull();
    const startX = Number.parseFloat(match?.[1] ?? 'NaN');
    const startY = Number.parseFloat(match?.[2] ?? 'NaN');
    const endX = Number.parseFloat(match?.[3] ?? 'NaN');
    const endY = Number.parseFloat(match?.[4] ?? 'NaN');
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    expect(dx < 1 || dy < 1 || Math.abs(dx - dy) < 1).toBe(true);

    expect(errors).toHaveLength(0);
  });

  test('changing rectangle border width repaints canvas without opacity change', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    await selectNewestHitTarget(page);

    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    await expect(borderWidthInput).toBeVisible();
    const beforeCanvas = await waitForCanvasStable(page);

    await setNumberInput(borderWidthInput, 5);
    await expect.poll(async () => await getPageCanvasDataUrl(page), { timeout: 10_000 }).not.toBe(beforeCanvas);

    expect(errors).toHaveLength(0);
  });

  test('resizing rectangle repaints canvas immediately', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    await selectNewestHitTarget(page);

    const handle = page.locator('[data-testid="handle-se"]');
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    const beforeCanvas = await waitForCanvasStable(page);

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2 + 50, {
      steps: 8,
    });
    await page.mouse.up();

    await expect.poll(async () => await getPageCanvasDataUrl(page), { timeout: 10_000 }).not.toBe(beforeCanvas);
    expect(errors).toHaveLength(0);
  });

  test('rectangle resize shows a live shape preview during drag', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    await selectNewestHitTarget(page);

    const handle = page.locator('[data-testid="handle-se"]');
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 50, handleBox!.y + handleBox!.height / 2 + 30, {
      steps: 6,
    });

    await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="selection-committed-mask"]')).toHaveCount(1);

    await page.mouse.up();
    await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="selection-committed-mask"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('rectangle east-handle resize changes width while preserving height', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const target = await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);

    await dragSelectionHandle(page, 'e', { x: 80, y: 0 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 40);

    const after = await getSelectionOverlayBox(page);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(6);

    await clearSelectionByClickingBlankPoint(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await clickReachableLocator(page, target);
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 40);
    const persisted = await getSelectionOverlayBox(page);
    expect(persisted.width).toBeGreaterThan(before.width + 40);
    expect(Math.abs(persisted.height - before.height)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('rectangle north-handle resize changes top edge while preserving bottom edge', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);
    const beforeBottom = before.y + before.height;

    await dragSelectionHandle(page, 'n', { x: 0, y: -70 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).height, { timeout: 10_000 })
      .toBeGreaterThan(before.height + 30);

    const after = await getSelectionOverlayBox(page);
    const afterBottom = after.y + after.height;
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(6);
    expect(Math.abs(afterBottom - beforeBottom)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('rectangle west-handle resize changes width while preserving right edge', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);
    const beforeRight = before.x + before.width;

    await dragSelectionHandle(page, 'w', { x: -70, y: 0 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 30);

    const after = await getSelectionOverlayBox(page);
    const afterRight = after.x + after.width;
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(6);
    expect(Math.abs(afterRight - beforeRight)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('rectangle south-handle resize changes bottom edge while preserving top edge', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);

    await dragSelectionHandle(page, 's', { x: 0, y: 70 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).height, { timeout: 10_000 })
      .toBeGreaterThan(before.height + 30);

    const after = await getSelectionOverlayBox(page);
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(6);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('rectangle shift-resize from a side handle produces a square without moving the anchored edge', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);
    const beforeCenterY = before.y + before.height / 2;

    await dragSelectionHandle(page, 'e', { x: 80, y: 0 }, { shiftKey: true });

    const after = await getSelectionOverlayBox(page);
    const afterCenterY = after.y + after.height / 2;
    expect(Math.abs(after.width - after.height)).toBeLessThanOrEqual(6);
    expect(after.width).toBeGreaterThan(before.width + 30);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(6);
    expect(Math.abs(afterCenterY - beforeCenterY)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('circle east-handle resize changes width while preserving height', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Circle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const target = await selectNewestHitTarget(page);
    const before = await getSelectionOverlayBox(page);

    await dragSelectionHandle(page, 'e', { x: 80, y: 0 });
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 40);

    const after = await getSelectionOverlayBox(page);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(6);

    await clickBlankPointOnPage(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await clickReachableLocator(page, target);
    await expect
      .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
      .toBeGreaterThan(before.width + 40);
    const persisted = await getSelectionOverlayBox(page);
    expect(persisted.width).toBeGreaterThan(before.width + 40);
    expect(Math.abs(persisted.height - before.height)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('circle shift-resize from a corner handle produces a circle preview and commit', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Circle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);

    await dragSelectionHandle(page, 'se', { x: 70, y: 20 }, { shiftKey: true });
    const after = await getSelectionOverlayBox(page);
    expect(Math.abs(after.width - after.height)).toBeLessThanOrEqual(6);

    expect(errors).toHaveLength(0);
  });

  test('clicking inside a circle bounding-box corner but away from the ellipse does not select it', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Circle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const hitTargets = page.locator(HIT_TARGET_SELECTOR);
    const target = hitTargets.nth((await hitTargets.count()) - 1);
    await clickReachableLocator(page, target);

    const targetBox = await target.boundingBox();
    expect(targetBox).not.toBeNull();
    const offEllipsePoint = {
      x: targetBox!.x + 4,
      y: targetBox!.y + 4,
    };

    await clickBlankPointOnPage(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await page.mouse.click(offEllipsePoint.x, offEllipsePoint.y);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('line property edits persist for opacity and border width', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const hitTargets = page.locator(HIT_TARGET_SELECTOR);
    const countAfter = await hitTargets.count();
    const target = hitTargets.nth(countAfter - 1);
    await clickReachableLocator(page, target);

    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    await expect(propertyPanel).toBeVisible();

    await setNumberInput(borderWidthInput, 2);
    await setRangeInput(page, opacityInput, 0.5);
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(49|50|51)%/);

    await clickBlankPointOnPage(page, 0);
    await expect(propertyPanel).not.toBeVisible();

    await clickReachableLocator(page, target);
    await expect(propertyPanel).toBeVisible();
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(49|50|51)%/);

    expect(errors).toHaveLength(0);
  });

  test('line endpoint resize updates line geometry and persists after reselection', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const target = await selectNewestHitTarget(page);
    const lineInfo = page.locator('[data-testid="line-info"]');
    await expect(lineInfo).toBeVisible();
    const beforeText = await lineInfo.innerText();
    const beforeEndpoints = parseLineEndpoints(beforeText);
    expect(beforeEndpoints).not.toBeNull();
    const beforeLength = lineLength(beforeEndpoints!);

    const handle = page.locator('[data-testid="handle-end"]');
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 90, handleBox!.y + handleBox!.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);

    const afterText = await lineInfo.innerText();
    const afterEndpoints = parseLineEndpoints(afterText);
    expect(afterEndpoints).not.toBeNull();
    const afterLength = lineLength(afterEndpoints!);
    expect(afterLength).toBeGreaterThan(beforeLength + 5);

    await clickBlankPointOnPage(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await clickReachableLocator(page, target);
    await expect(lineInfo).toBeVisible();
    const persistedText = await lineInfo.innerText();
    const persistedEndpoints = parseLineEndpoints(persistedText);
    expect(persistedEndpoints).not.toBeNull();
    const persistedLength = lineLength(persistedEndpoints!);
    expect(Math.abs(persistedLength - afterLength)).toBeLessThan(2);

    expect(errors).toHaveLength(0);
  });

  test('clicking inside a line bounding-box corner but away from the line does not select it', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const overlayBox = await getSelectionOverlayBox(page);
    const offLinePoint = {
      x: overlayBox.x + overlayBox.width - 4,
      y: overlayBox.y + 4,
    };

    await clickBlankPointOnPage(page, 0);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

    await page.mouse.click(offLinePoint.x, offLinePoint.y);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('line endpoint shift-resize snaps geometry to a cardinal or 45-degree angle', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Line');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const lineInfo = page.locator('[data-testid="line-info"]');
    await expect(lineInfo).toBeVisible();
    const beforeText = await lineInfo.innerText();

    await dragAnnotationHandle(page, 'end', { x: 90, y: -20 }, { shiftKey: true });

    await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);

    const endpoints = parseLineEndpoints(await lineInfo.innerText());
    expect(endpoints).not.toBeNull();
    const dx = Math.abs((endpoints?.end.x ?? 0) - (endpoints?.start.x ?? 0));
    const dy = Math.abs((endpoints?.end.y ?? 0) - (endpoints?.start.y ?? 0));
    const snapped = dx < 1 || dy < 1 || Math.abs(dx - dy) < 1;
    expect(snapped).toBe(true);

    expect(errors).toHaveLength(0);
  });

  test('Escape in property text field does not clear selected annotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const authorInput = page.locator('[data-testid="author-input"]');
    await expect(propertyPanel).toBeVisible();
    const originalAuthor = await authorInput.inputValue();

    await authorInput.fill('QA Escape Guard');
    await authorInput.focus();
    await page.keyboard.press('Escape');

    await expect(propertyPanel).toBeVisible();
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
    await expect(authorInput).toHaveValue(originalAuthor);

    expect(errors).toHaveLength(0);
  });

  test('selection moves cleanly between annotations on different pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await ensureAtLeastTwoPages(page);

    await switchToViewerSelectText(page);
    const page0Before = await countHitTargetsOnPage(page, 0);
    const page1Before = await countHitTargetsOnPage(page, 1);

    await ensureRectangleCreatedOnPage(page, 0, page0Before);
    await ensureRectangleCreatedOnPage(page, 1, page1Before);

    await selectNewestHitTargetOnPage(page, 0);
    await expect(page.locator('[data-page-index="0"] [data-testid="selection-overlay"]')).toHaveCount(1);
    await expect(page.locator('[data-page-index="1"] [data-testid="selection-overlay"]')).toHaveCount(0);

    await selectNewestHitTargetOnPage(page, 1);
    await expect(page.locator('[data-page-index="0"] [data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-page-index="1"] [data-testid="selection-overlay"]')).toHaveCount(1);

    expect(errors).toHaveLength(0);
  });

  test('Delete only removes the selection on the selected page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await ensureAtLeastTwoPages(page);

    await switchToViewerSelectText(page);
    const page0Before = await countHitTargetsOnPage(page, 0);
    const page1Before = await countHitTargetsOnPage(page, 1);

    await ensureRectangleCreatedOnPage(page, 0, page0Before);
    await ensureRectangleCreatedOnPage(page, 1, page1Before);

    const page0AfterCreate = await countHitTargetsOnPage(page, 0);
    const page1AfterCreate = await countHitTargetsOnPage(page, 1);

    await selectNewestHitTargetOnPage(page, 1);
    await page.keyboard.press('Delete');

    await expect.poll(() => countHitTargetsOnPage(page, 1), { timeout: 10_000 }).toBe(page1AfterCreate - 1);
    await expect.poll(() => countHitTargetsOnPage(page, 0), { timeout: 10_000 }).toBe(page0AfterCreate);

    expect(errors).toHaveLength(0);
  });

  test('repeated hand/pointer/editor tool switching stays stable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    const countBefore = await countHitTargets(page);

    for (let i = 0; i < 3; i++) {
      await switchToViewerHandTool(page);
      await expect.poll(() => countHitTargets(page)).toBe(0);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    }

    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    expect(errors).toHaveLength(0);
  });

  test('Escape returns active editor tool to neutral mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Rectangle');
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Escape');

    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test('viewer Select text control returns active editor tool to neutral mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Rectangle');
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

    await switchToViewerSelectText(page);

    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toHaveLength(0);
  });

  test('V shortcut returns active editor tool to neutral mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Rectangle');
    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('v');

    await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test('undo reverses last action and enables redo', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToTool(page, 'Draw');
    await drawInkStroke(page);

    const undoBtn = editorBtn(page, 'Undo');
    const redoBtn = editorBtn(page, 'Redo');
    await expect(undoBtn).toBeEnabled({ timeout: 10_000 });

    await undoBtn.click();
    await expect(redoBtn).toBeEnabled({ timeout: 10_000 });
    await expect(undoBtn).toBeDisabled();
    await expect(page.locator('[title="Unsaved changes"]')).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('undo flushes pending style drafts before history navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const indicesBefore = await getHitTargetIndices(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    const indicesAfterCreate = await getHitTargetIndices(page);
    const createdAnnotationIndex = indicesAfterCreate.find((index) => !indicesBefore.includes(index));
    expect(createdAnnotationIndex).toBeDefined();
    const countAfterCreate = await countHitTargets(page);
    await selectHitTargetByIndex(page, createdAnnotationIndex!);
    const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
    await expect(strokeInput).toBeVisible();

    // Intentionally do not blur/commit explicitly.
    await setColourInput(strokeInput, '#00ff00');

    await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
    await editorBtn(page, 'Undo').click();
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterCreate);
    await selectHitTargetByIndex(page, createdAnnotationIndex!);
    await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('style edits + create stay coherent across undo/redo chain', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await switchToTool(page, 'Rectangle');
    await drawRectangle(page);
    await switchToViewerSelectText(page);
    await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

    await selectNewestHitTarget(page);
    const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
    const strokeInput = page.locator('[data-testid="stroke-colour-input"]');
    const fillEnabledInput = page.locator('[data-testid="fill-enabled-input"]');
    const fillInput = page.locator('[data-testid="interior-colour-input"]');
    const borderWidthInput = page.locator('[data-testid="border-width-input"]');
    const opacityInput = page.locator('[data-testid="opacity-input"]');
    await expect(propertyPanel).toBeVisible();

    if (!(await fillEnabledInput.isChecked())) {
      await fillEnabledInput.check();
    }
    await setColourInput(strokeInput, '#228833');
    await setColourInput(fillInput, '#1144aa');
    await setNumberInput(borderWidthInput, 4);
    await setRangeInput(page, opacityInput, 0.6);
    await expect(propertyPanel).toContainText(/(59|60|61)%/);

    const countAfterFirst = await countHitTargets(page);
    await clickBlankPointOnPage(page, 0);

    await ensureRectangleCreatedOnPage(page, 0, countAfterFirst);
    const countAfterSecond = await countHitTargets(page);

    await selectNewestHitTarget(page);
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#228833');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#1144aa');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^4(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(59|60|61)%/);

    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('pdfium-editor-flush-pending-commits'));
    });
    const undoBtn = editorBtn(page, 'Undo');
    const redoBtn = editorBtn(page, 'Redo');
    await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
    await undoBtn.click({ force: true });
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterFirst);

    await expect(redoBtn).toBeEnabled({ timeout: 10_000 });
    await redoBtn.click({ force: true });
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countAfterSecond);

    await selectNewestHitTarget(page);
    await expect.poll(async () => await strokeInput.inputValue()).toBe('#228833');
    await expect.poll(async () => await fillInput.inputValue()).toBe('#1144aa');
    await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^4(?:\.0+)?$/);
    await expect(propertyPanel).toContainText(/(59|60|61)%/);

    expect(errors).toHaveLength(0);
  });

  test('undo clears selected annotation UI state (selection box + property sidebar)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await switchToEditor(page);
    await switchToViewerSelectText(page);
    const countBefore = await countHitTargets(page);

    await ensureRectangleCreatedOnPage(page, 0, countBefore);

    await selectNewestHitTarget(page);
    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="editor-property-sidebar"]')).toBeVisible();

    const undoBtn = editorBtn(page, 'Undo');
    await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
    await undoBtn.click({ force: true });

    await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="editor-property-sidebar"]')).toHaveCount(0);
    await expect.poll(() => countHitTargets(page), { timeout: 10_000 }).toBe(countBefore);

    expect(errors).toHaveLength(0);
  });

  test('all editor tools can be activated without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await switchToEditor(page);

    const tools = [
      { name: 'Highlight', shouldPress: false },
      { name: 'Underline', shouldPress: false },
      { name: 'Strikeout', shouldPress: false },
      { name: 'Draw', shouldPress: true },
      { name: 'Text', shouldPress: true },
      { name: 'Rectangle', shouldPress: true },
      { name: 'Circle', shouldPress: true },
      { name: 'Line', shouldPress: true },
      { name: 'Stamp', shouldPress: true },
      { name: 'Redact', shouldPress: true },
    ] as const;

    for (const { name, shouldPress } of tools) {
      const button = editorBtn(page, name);
      await expect(button).toBeVisible();
      await button.click();
      if (shouldPress) {
        await expect(button).toHaveAttribute('aria-pressed', 'true');
      } else {
        await expect(button).toHaveAttribute('aria-pressed', 'false');
      }
    }

    expect(pageErrors).toHaveLength(0);
  });
});
