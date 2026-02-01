import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncDisposable, Disposable } from '../../src/core/disposable.js';
import { PDFiumError, PDFiumErrorCode } from '../../src/core/errors.js';

// Concrete implementation for testing
class TestDisposable extends Disposable {
  public cleanupCalled = false;

  constructor(name = 'TestResource') {
    super(name);
  }

  protected disposeInternal(): void {
    this.cleanupCalled = true;
  }

  public doSomething(): string {
    this.ensureNotDisposed();
    return 'done';
  }
}

// Async version for testing
class TestAsyncDisposable extends AsyncDisposable {
  public cleanupCalled = false;
  public cleanupDelay: number;

  constructor(name = 'TestAsyncResource', cleanupDelay = 0) {
    super(name);
    this.cleanupDelay = cleanupDelay;
  }

  protected async disposeInternalAsync(): Promise<void> {
    if (this.cleanupDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.cleanupDelay));
    }
    this.cleanupCalled = true;
  }

  public doSomething(): string {
    this.ensureNotDisposed();
    return 'done';
  }
}

describe('Disposable', () => {
  describe('constructor', () => {
    it('creates undisposed resource', () => {
      const resource = new TestDisposable();
      expect(resource.disposed).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('marks resource as disposed', () => {
      const resource = new TestDisposable();
      resource.dispose();
      expect(resource.disposed).toBe(true);
    });

    it('calls disposeInternal', () => {
      const resource = new TestDisposable();
      resource.dispose();
      expect(resource.cleanupCalled).toBe(true);
    });

    it('is idempotent', () => {
      const resource = new TestDisposable();
      resource.dispose();
      resource.dispose();
      resource.dispose();
      expect(resource.cleanupCalled).toBe(true);
    });
  });

  describe('Symbol.dispose', () => {
    it('disposes resource', () => {
      const resource = new TestDisposable();
      resource[Symbol.dispose]();
      expect(resource.disposed).toBe(true);
      expect(resource.cleanupCalled).toBe(true);
    });

    it('works with using keyword', () => {
      let resource: TestDisposable | undefined;
      {
        using r = new TestDisposable();
        resource = r;
        expect(r.disposed).toBe(false);
      }
      expect(resource?.disposed).toBe(true);
      expect(resource?.cleanupCalled).toBe(true);
    });
  });

  describe('ensureNotDisposed()', () => {
    it('allows operations on active resource', () => {
      const resource = new TestDisposable();
      expect(resource.doSomething()).toBe('done');
    });

    it('throws PDFiumError on disposed resource', () => {
      const resource = new TestDisposable();
      resource.dispose();
      expect(() => resource.doSomething()).toThrow(PDFiumError);
    });

    it('throws with correct error code', () => {
      const resource = new TestDisposable();
      resource.dispose();
      try {
        resource.doSomething();
      } catch (e) {
        expect(e).toBeInstanceOf(PDFiumError);
        expect((e as PDFiumError).code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
      }
    });

    it('includes resource name in error message', () => {
      const resource = new TestDisposable('MyResource');
      resource.dispose();
      try {
        resource.doSomething();
      } catch (e) {
        expect((e as Error).message).toContain('MyResource');
      }
    });
  });

  describe('FinalizationRegistry warning', () => {
    let originalWarn: typeof console.warn;
    let warnSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      originalWarn = console.warn;
      warnSpy = vi.fn();
      console.warn = warnSpy;
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    it('does not warn for properly disposed resources', () => {
      const resource = new TestDisposable();
      resource.dispose();
      // No way to trigger GC reliably, but we can verify no immediate warning
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('AsyncDisposable', () => {
  describe('constructor', () => {
    it('creates undisposed resource', () => {
      const resource = new TestAsyncDisposable();
      expect(resource.disposed).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('marks resource as disposed', async () => {
      const resource = new TestAsyncDisposable();
      await resource.dispose();
      expect(resource.disposed).toBe(true);
    });

    it('calls disposeInternalAsync', async () => {
      const resource = new TestAsyncDisposable();
      await resource.dispose();
      expect(resource.cleanupCalled).toBe(true);
    });

    it('waits for async cleanup', async () => {
      const resource = new TestAsyncDisposable('Test', 10);
      const start = Date.now();
      await resource.dispose();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(9);
      expect(resource.cleanupCalled).toBe(true);
    });

    it('is idempotent', async () => {
      const resource = new TestAsyncDisposable();
      await resource.dispose();
      await resource.dispose();
      await resource.dispose();
      expect(resource.cleanupCalled).toBe(true);
    });
  });

  describe('Symbol.asyncDispose', () => {
    it('disposes resource', async () => {
      const resource = new TestAsyncDisposable();
      await resource[Symbol.asyncDispose]();
      expect(resource.disposed).toBe(true);
      expect(resource.cleanupCalled).toBe(true);
    });

    it('works with await using keyword', async () => {
      let resource: TestAsyncDisposable | undefined;
      {
        await using r = new TestAsyncDisposable();
        resource = r;
        expect(r.disposed).toBe(false);
      }
      expect(resource?.disposed).toBe(true);
      expect(resource?.cleanupCalled).toBe(true);
    });
  });

  describe('ensureNotDisposed()', () => {
    it('allows operations on active resource', () => {
      const resource = new TestAsyncDisposable();
      expect(resource.doSomething()).toBe('done');
    });

    it('throws PDFiumError on disposed resource', async () => {
      const resource = new TestAsyncDisposable();
      await resource.dispose();
      expect(() => resource.doSomething()).toThrow(PDFiumError);
    });
  });
});
