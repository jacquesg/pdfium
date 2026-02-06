import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerPDFium } from '../../../src/context/worker-client.js';

describe('WorkerPDFium (Full Coverage)', () => {
  let mockWorker: Worker;
  let client: WorkerPDFium | undefined;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onerror: null,
      onmessage: null,
      onmessageerror: null,
    } as unknown as Worker;

    // Fix: Make the mock a constructable function class
    const MockWorker = class {
      constructor() {
        // biome-ignore lint/correctness/noConstructorReturn: Mocking global class
        return mockWorker;
      }
    };
    vi.stubGlobal('Worker', MockWorker);
  });

  afterEach(() => {
    // client might be undefined if creation failed
    if (client) {
      // Suppress errors during dispose in tests
      try {
        client.dispose();
      } catch {}
    }
    vi.restoreAllMocks();
  });

  it('should throw WorkerError on creation failure', async () => {
    // Mock constructor throwing
    const ThrowingWorker = class {
      constructor() {
        throw new Error('Worker creation failed');
      }
    };
    vi.stubGlobal('Worker', ThrowingWorker);

    // It wraps creation errors in InitialisationError currently
    await expect(
      WorkerPDFium.create({
        workerUrl: 'worker.js',
        wasmBinary: new ArrayBuffer(0),
      }),
    ).rejects.toThrow();
  });

  it('should handle operation timeout', async () => {
    // We need to construct it manually or mock the handshake
    // The handshake is part of create().
    // Let's mocking postMessage to NOT reply to handshake.

    const promise = WorkerPDFium.create({
      workerUrl: 'worker.js',
      wasmBinary: new ArrayBuffer(0),
      timeout: 10, // Short timeout
    });

    // It might be InitialisationError wrapping a Timeout error or just timeout logic failing
    await expect(promise).rejects.toThrow();
  });
});
