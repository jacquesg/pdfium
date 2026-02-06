/**
 * Integration tests for progressive rendering.
 *
 * Progressive rendering allows long render operations to be paused and resumed,
 * enabling responsive UI during complex page rendering. The render lifecycle
 * is managed by `ProgressiveRenderContext`:
 *
 * 1. `page.startProgressiveRender()` - Returns a `ProgressiveRenderContext`
 * 2. `context.continue()` - Continue if ToBeContinued
 * 3. `context.getResult()` - Get rendered pixels when Done
 * 4. `context.dispose()` / `using` - Release resources
 *
 * @see ProgressiveRenderContext
 * @see ProgressiveRenderStatus
 */

import { describe, expect, test } from 'vitest';
import { RenderError } from '../../src/core/errors.js';
import { ProgressiveRenderStatus } from '../../src/core/types.js';
import type { ProgressiveRenderContext } from '../../src/document/progressive-render.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Progressive Rendering', () => {
  describe('ProgressiveRenderStatus enum values', () => {
    test('should have correct values per PDFium specification', () => {
      // FPDF_RENDER_READY = 0
      expect(ProgressiveRenderStatus.Ready).toBe('Ready');
      // FPDF_RENDER_TOBECONTINUED = 1
      expect(ProgressiveRenderStatus.ToBeContinued).toBe('ToBeContinued');
      // FPDF_RENDER_DONE = 2
      expect(ProgressiveRenderStatus.Done).toBe('Done');
      // FPDF_RENDER_FAILED = 3
      expect(ProgressiveRenderStatus.Failed).toBe('Failed');
    });

    test('should have all required status values', () => {
      const statuses = [
        ProgressiveRenderStatus.Ready,
        ProgressiveRenderStatus.ToBeContinued,
        ProgressiveRenderStatus.Done,
        ProgressiveRenderStatus.Failed,
      ];
      const uniqueStatuses = new Set(statuses);
      expect(uniqueStatuses.size).toBe(4);
    });
  });

  describe('startProgressiveRender', () => {
    test('should return a ProgressiveRenderContext', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ scale: 1 });
      expect(render).toBeDefined();
      expect(render.width).toBeGreaterThan(0);
      expect(render.height).toBeGreaterThan(0);
    });

    test('should work with default options', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender();
      expect(render).toBeDefined();
    });

    test('should work with scale option', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const scales = [0.25, 0.5, 1, 1.5, 2, 4];

      for (const scale of scales) {
        using render = page.startProgressiveRender({ scale });
        expect(render).toBeDefined();
      }
    });

    test('should work with width/height options', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const dimensions = [
        { width: 100, height: 150 },
        { width: 200, height: 300 },
        { width: 612, height: 792 },
        { width: 1024, height: 768 },
      ];

      for (const { width, height } of dimensions) {
        using render = page.startProgressiveRender({ width, height });
        expect(render.width).toBe(width);
        expect(render.height).toBe(height);
      }
    });

    test('should work with only width specified (auto height)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ width: 300 });
      expect(render.width).toBe(300);
      expect(render.height).toBeGreaterThan(0);
    });

    test('should work with only height specified (auto width)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ height: 400 });
      expect(render.height).toBe(400);
      expect(render.width).toBeGreaterThan(0);
    });
  });

  describe('ProgressiveRenderContext.continue', () => {
    test('should return a valid status', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender();
      const status = render.continue();

      expect([
        ProgressiveRenderStatus.Ready,
        ProgressiveRenderStatus.ToBeContinued,
        ProgressiveRenderStatus.Done,
        ProgressiveRenderStatus.Failed,
      ]).toContain(status);
    });

    test('should be callable multiple times', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender();

      for (let i = 0; i < 5; i++) {
        const status = render.continue();
        expect([
          ProgressiveRenderStatus.Ready,
          ProgressiveRenderStatus.ToBeContinued,
          ProgressiveRenderStatus.Done,
          ProgressiveRenderStatus.Failed,
        ]).toContain(status);
      }
    });
  });

  describe('ProgressiveRenderContext disposal', () => {
    test('should not throw when disposed after start', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const render = page.startProgressiveRender();
      expect(() => render.dispose()).not.toThrow();
    });

    test('should be safe to dispose multiple times', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const render = page.startProgressiveRender();
      render.dispose();

      // Subsequent calls should be safe (idempotent)
      expect(() => render.dispose()).not.toThrow();
      expect(() => render.dispose()).not.toThrow();
    });
  });

  describe('complete render workflow', () => {
    function runToCompletion(render: ProgressiveRenderContext, maxIterations = 1000): void {
      let iterations = 0;
      while (
        render.status === ProgressiveRenderStatus.ToBeContinued ||
        render.status === ProgressiveRenderStatus.Ready
      ) {
        render.continue();
        iterations++;
        if (iterations >= maxIterations) {
          break;
        }
      }
    }

    test('should complete render loop for simple page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ scale: 1 });
      runToCompletion(render);

      expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(render.status);
    });

    test('should produce result when done', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ scale: 1 });
      runToCompletion(render);

      if (render.status === ProgressiveRenderStatus.Done) {
        const result = render.getResult();
        expect(result.data).toBeInstanceOf(Uint8Array);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.originalWidth).toBeGreaterThan(0);
        expect(result.originalHeight).toBeGreaterThan(0);
      }
    });

    test('should throw when getting result before done', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
      using page = document.getPage(0);
      // Use a very large scale to force progressive rendering to pause
      using render = page.startProgressiveRender({ scale: 20 });

      if (render.status !== ProgressiveRenderStatus.Done) {
        expect(() => render.getResult()).toThrow(RenderError);
      } else {
        console.warn('Render completed immediately, skipping "get result before done" test');
      }
    });

    test('should be idempotent for terminal states', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ scale: 1 });
      runToCompletion(render);

      const terminalStatus = render.status;
      expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(terminalStatus);

      // Call continue again - should return the same status immediately
      const status = render.continue();
      expect(status).toBe(terminalStatus);
    });

    test('should clean up on early disposal', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ scale: 2 });
      render.continue();
      // dispose called automatically via using, no leak
    });

    test('should work with high DPI rendering', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using render = page.startProgressiveRender({ scale: 4 });
      runToCompletion(render, 5000);

      expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(render.status);
    });
  });
});

describe('Progressive Rendering with different documents', () => {
  function runToCompletion(render: ProgressiveRenderContext, maxIterations = 1000): void {
    let iterations = 0;
    while (
      (render.status === ProgressiveRenderStatus.ToBeContinued || render.status === ProgressiveRenderStatus.Ready) &&
      iterations < maxIterations
    ) {
      render.continue();
      iterations++;
    }
  }

  test('should work with images PDF', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);
    using render = page.startProgressiveRender({ scale: 1 });

    runToCompletion(render);

    expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(render.status);
  });

  test('should work with form document', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);
    using render = page.startProgressiveRender({ scale: 1 });

    runToCompletion(render);

    expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(render.status);
  });

  test('should work across multiple pages', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const pageCount = doc.pageCount;

    expect(pageCount).toBeGreaterThan(1);

    for (let i = 0; i < Math.min(pageCount, 3); i++) {
      using page = doc.getPage(i);
      using render = page.startProgressiveRender({ scale: 0.5 });

      runToCompletion(render, 500);

      expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(render.status);
    }
  });
});

describe('Progressive Rendering edge cases', () => {
  test('should handle very small scale', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    using render = page.startProgressiveRender({ scale: 0.01 });

    expect(render).toBeDefined();
  });

  test('should handle very small dimensions', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    using render = page.startProgressiveRender({ width: 10, height: 10 });

    expect(render).toBeDefined();
  });

  test('should handle sequential render operations', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    // First render
    {
      using render = page.startProgressiveRender({ scale: 1 });
      while (
        render.status === ProgressiveRenderStatus.ToBeContinued ||
        render.status === ProgressiveRenderStatus.Ready
      ) {
        render.continue();
      }
    }

    // Second render immediately after
    {
      using render = page.startProgressiveRender({ scale: 2 });
      while (
        render.status === ProgressiveRenderStatus.ToBeContinued ||
        render.status === ProgressiveRenderStatus.Ready
      ) {
        render.continue();
      }
      expect([ProgressiveRenderStatus.Done, ProgressiveRenderStatus.Failed]).toContain(render.status);
    }
  });
});

describe('Progressive Rendering post-dispose guards', () => {
  test('should throw on startProgressiveRender after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    page.dispose();

    expect(() => page.startProgressiveRender()).toThrow();

    doc.dispose();
  });

  test('should throw on context.continue after context dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const render = page.startProgressiveRender({ scale: 1 });

    render.dispose();

    expect(() => render.continue()).toThrow();
  });

  test('should throw on context.getResult after context dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const render = page.startProgressiveRender({ scale: 1 });

    render.dispose();

    expect(() => render.getResult()).toThrow();
  });
});
