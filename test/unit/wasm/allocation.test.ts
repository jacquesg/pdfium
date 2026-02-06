/**
 * Unit tests for WASMAllocation and NativeHandle.
 */

import { describe, expect, test, vi } from 'vitest';

import { MemoryError } from '../../../src/core/errors.js';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { NativeHandle, WASMAllocation } from '../../../src/wasm/allocation.js';
import { initPdfium } from '../../utils/helpers.js';

describe('WASMAllocation', () => {
  test('ptr returns the allocated pointer', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const alloc = memory.alloc(64);
    expect(alloc.ptr).not.toBe(0);
    alloc[Symbol.dispose]();
  });

  test('ptr throws MemoryError after dispose', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const alloc = memory.alloc(64);
    alloc[Symbol.dispose]();
    expect(() => alloc.ptr).toThrow(MemoryError);
  });

  test('ptr throws MemoryError after take()', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const alloc = memory.alloc(64);
    const ptr = alloc.take();
    expect(() => alloc.ptr).toThrow(MemoryError);
    memory.free(ptr);
  });

  test('take() returns the pointer and disarms disposal', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const initialCount = memory.activeAllocations;
    const alloc = memory.alloc(64);
    expect(memory.activeAllocations).toBe(initialCount + 1);

    const ptr = alloc.take();
    expect(ptr).not.toBe(0);

    // Dispose should be a no-op now
    alloc[Symbol.dispose]();
    // Pointer still tracked in memory manager (not freed)
    expect(memory.activeAllocations).toBe(initialCount + 1);

    // Clean up manually
    memory.free(ptr);
    expect(memory.activeAllocations).toBe(initialCount);
  });

  test('take() throws on second call', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const alloc = memory.alloc(64);
    const ptr = alloc.take();
    expect(() => alloc.take()).toThrow(MemoryError);
    memory.free(ptr);
  });

  test('[Symbol.dispose]() frees the allocation', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const initialCount = memory.activeAllocations;
    const alloc = memory.alloc(64);
    expect(memory.activeAllocations).toBe(initialCount + 1);
    alloc[Symbol.dispose]();
    expect(memory.activeAllocations).toBe(initialCount);
  });

  test('[Symbol.dispose]() is idempotent', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const initialCount = memory.activeAllocations;
    const alloc = memory.alloc(64);
    alloc[Symbol.dispose]();
    alloc[Symbol.dispose]();
    expect(memory.activeAllocations).toBe(initialCount);
  });

  test('using keyword auto-frees at block exit', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const initialCount = memory.activeAllocations;
    {
      using _alloc = memory.alloc(64);
      expect(memory.activeAllocations).toBe(initialCount + 1);
    }
    expect(memory.activeAllocations).toBe(initialCount);
  });

  describe('factory methods', () => {
    test('alloc creates a disposable allocation', async () => {
      using pdfium = await initPdfium();
      const memory = pdfium[INTERNAL].memory;
      using alloc = memory.alloc(128);
      expect(alloc.ptr).not.toBe(0);
      expect(alloc).toBeInstanceOf(WASMAllocation);
    });

    test('allocFrom copies data and creates a disposable allocation', async () => {
      using pdfium = await initPdfium();
      const memory = pdfium[INTERNAL].memory;
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      using alloc = memory.allocFrom(data);
      const copied = memory.copyFromWASM(alloc.ptr, data.length);
      expect(copied).toEqual(data);
    });

    test('allocString copies a string and creates a disposable allocation', async () => {
      using pdfium = await initPdfium();
      const memory = pdfium[INTERNAL].memory;
      using alloc = memory.allocString('hello');
      const bytes = memory.copyFromWASM(alloc.ptr, 6);
      expect(bytes[0]).toBe(104); // 'h'
      expect(bytes[5]).toBe(0); // null terminator
    });

    test('allocBuffer copies an ArrayBuffer and creates a disposable allocation', async () => {
      using pdfium = await initPdfium();
      const memory = pdfium[INTERNAL].memory;
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      view.set([10, 20, 30, 40]);

      using alloc = memory.allocBuffer(buffer);
      const copied = memory.copyFromWASM(alloc.ptr, 4);
      expect(copied).toEqual(view);
    });
  });
});

describe('NativeHandle', () => {
  test('handle returns the value', () => {
    const destroy = vi.fn();
    const nh = new NativeHandle(42, destroy);
    expect(nh.handle).toBe(42);
    nh[Symbol.dispose]();
  });

  test('handle throws MemoryError after dispose', () => {
    const destroy = vi.fn();
    const nh = new NativeHandle(42, destroy);
    nh[Symbol.dispose]();
    expect(() => nh.handle).toThrow(MemoryError);
  });

  test('[Symbol.dispose]() calls destroy callback once', () => {
    const destroy = vi.fn();
    const nh = new NativeHandle(42, destroy);
    nh[Symbol.dispose]();
    expect(destroy).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledWith(42);
  });

  test('[Symbol.dispose]() is idempotent', () => {
    const destroy = vi.fn();
    const nh = new NativeHandle(42, destroy);
    nh[Symbol.dispose]();
    nh[Symbol.dispose]();
    expect(destroy).toHaveBeenCalledOnce();
  });

  test('using keyword auto-destroys at block exit', () => {
    const destroy = vi.fn();
    {
      using _nh = new NativeHandle(99, destroy);
      expect(destroy).not.toHaveBeenCalled();
    }
    expect(destroy).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledWith(99);
  });

  test('zero handle is treated as disposed (destroy not called)', () => {
    const destroy = vi.fn();
    const nh = new NativeHandle(0, destroy);
    expect(() => nh.handle).toThrow(MemoryError);
    nh[Symbol.dispose]();
    expect(destroy).not.toHaveBeenCalled();
  });
});
