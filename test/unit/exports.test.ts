import { describe, expect, test } from 'vitest';

describe('public exports', () => {
  test('index.ts exports INTERNAL symbol', async () => {
    const mod = await import('../../src/index.js');
    expect(mod.INTERNAL).toBeDefined();
    expect(typeof mod.INTERNAL).toBe('symbol');
  });

  test('index.ts exports core classes', async () => {
    const mod = await import('../../src/index.js');
    expect(mod.PDFium).toBeDefined();
    expect(mod.PDFiumDocument).toBeDefined();
    expect(mod.PDFiumPage).toBeDefined();
    expect(mod.PDFiumDocumentBuilder).toBeDefined();
    expect(mod.ProgressivePDFLoader).toBeDefined();
    expect(mod.WorkerProxy).toBeDefined();
  });

  test('index.ts exports enums', async () => {
    const mod = await import('../../src/index.js');
    expect(mod.BitmapFormat).toBeDefined();
    expect(mod.RenderFlags).toBeDefined();
    expect(mod.PDFiumNativeErrorCode).toBeDefined();
  });

  test('index.ts does not export WASM internals', async () => {
    const mod = await import('../../src/index.js');
    expect('WASMMemoryManager' in mod).toBe(false);
    expect('WASMAllocation' in mod).toBe(false);
    expect('PDFiumWASM' in mod).toBe(false);
  });

  test('browser.ts exports builders and progressive loader', async () => {
    const mod = await import('../../src/browser.js');
    expect(mod.PDFiumDocumentBuilder).toBeDefined();
    expect(mod.PDFiumPageBuilder).toBeDefined();
    expect(mod.ProgressivePDFLoader).toBeDefined();
    expect(mod.INTERNAL).toBeDefined();
  });

  test('node.ts exports workers and builders', async () => {
    const mod = await import('../../src/node.js');
    expect(mod.WorkerProxy).toBeDefined();
    expect(mod.PDFiumDocumentBuilder).toBeDefined();
    expect(mod.ProgressivePDFLoader).toBeDefined();
    expect(mod.INTERNAL).toBeDefined();
  });

  test('internal module exports handles and INTERNAL symbol', async () => {
    const mod = await import('../../src/internal/index.js');
    expect(mod.INTERNAL).toBeDefined();
    expect(typeof mod.INTERNAL).toBe('symbol');
  });
});
