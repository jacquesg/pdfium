/**
 * Memory profiling utilities for WASM allocation tracking.
 *
 * @module test/utils/memory-profiler
 */

import type { WASMMemoryManager } from '../../src/wasm/memory.js';

/**
 * A snapshot of WASM memory state.
 */
export interface MemorySnapshot {
  /** Number of active allocations. */
  allocations: number;
  /** Timestamp when the snapshot was taken. */
  timestamp: number;
}

/**
 * Result of comparing two memory snapshots.
 */
export interface LeakCheckResult {
  /** Whether a potential leak was detected. */
  hasLeak: boolean;
  /** Number of allocations that were not freed. */
  leakedAllocations: number;
  /** Detailed message about the leak check. */
  message: string;
}

/**
 * Capture the current state of WASM memory allocations.
 *
 * @param memory - The WASM memory manager to snapshot.
 * @returns A snapshot of the current memory state.
 */
export function captureMemorySnapshot(memory: WASMMemoryManager): MemorySnapshot {
  return {
    allocations: memory.activeAllocations,
    timestamp: Date.now(),
  };
}

/**
 * Check for memory leaks by comparing two snapshots.
 *
 * @param before - Snapshot taken before the operation.
 * @param after - Snapshot taken after the operation.
 * @returns The result of the leak check.
 */
export function detectLeaks(before: MemorySnapshot, after: MemorySnapshot): LeakCheckResult {
  const leakedAllocations = after.allocations - before.allocations;

  if (leakedAllocations > 0) {
    return {
      hasLeak: true,
      leakedAllocations,
      message: `Memory leak detected: ${leakedAllocations} allocation(s) not freed`,
    };
  }

  if (leakedAllocations < 0) {
    return {
      hasLeak: false,
      leakedAllocations: 0,
      message: `More allocations freed (${Math.abs(leakedAllocations)}) than expected (possible cleanup of pre-existing allocations)`,
    };
  }

  return {
    hasLeak: false,
    leakedAllocations: 0,
    message: 'No memory leaks detected',
  };
}

/**
 * Run a function and check for memory leaks.
 *
 * @param memory - The WASM memory manager.
 * @param fn - The function to test for leaks.
 * @returns The leak check result.
 */
export async function checkForLeaks(
  memory: WASMMemoryManager,
  fn: () => void | Promise<void>,
): Promise<LeakCheckResult> {
  const before = captureMemorySnapshot(memory);
  await fn();
  const after = captureMemorySnapshot(memory);
  return detectLeaks(before, after);
}

/**
 * Create a memory profiler for tracking allocations over time.
 */
export class MemoryProfiler {
  readonly #memory: WASMMemoryManager;
  readonly #snapshots: MemorySnapshot[] = [];
  #startSnapshot: MemorySnapshot | undefined;

  constructor(memory: WASMMemoryManager) {
    this.#memory = memory;
  }

  /**
   * Start profiling by taking an initial snapshot.
   */
  start(): void {
    this.#startSnapshot = captureMemorySnapshot(this.#memory);
    this.#snapshots.length = 0;
    this.#snapshots.push(this.#startSnapshot);
  }

  /**
   * Take a checkpoint snapshot.
   *
   * @param label - Optional label for the checkpoint.
   * @returns The snapshot.
   */
  checkpoint(label?: string): MemorySnapshot & { label?: string } {
    const snapshot = captureMemorySnapshot(this.#memory);
    this.#snapshots.push(snapshot);
    const result: MemorySnapshot & { label?: string } = { ...snapshot };
    if (label !== undefined) {
      result.label = label;
    }
    return result;
  }

  /**
   * Stop profiling and return a summary.
   *
   * @returns Summary of allocations during the profiling period.
   */
  stop(): {
    totalSnapshots: number;
    startAllocations: number;
    endAllocations: number;
    peakAllocations: number;
    leakCheckResult: LeakCheckResult;
  } {
    const endSnapshot = captureMemorySnapshot(this.#memory);
    this.#snapshots.push(endSnapshot);

    const start = this.#startSnapshot ?? this.#snapshots[0];
    if (start === undefined) {
      throw new Error('No start snapshot found. Call start() first.');
    }

    const peakAllocations = Math.max(...this.#snapshots.map((s) => s.allocations));

    return {
      totalSnapshots: this.#snapshots.length,
      startAllocations: start.allocations,
      endAllocations: endSnapshot.allocations,
      peakAllocations,
      leakCheckResult: detectLeaks(start, endSnapshot),
    };
  }

  /**
   * Get the current allocation count.
   */
  get currentAllocations(): number {
    return this.#memory.activeAllocations;
  }

  /**
   * Get all captured snapshots.
   */
  get snapshots(): readonly MemorySnapshot[] {
    return this.#snapshots;
  }
}

/**
 * Assert that no memory leaks occurred during a function execution.
 *
 * @param memory - The WASM memory manager.
 * @param fn - The function to test.
 * @throws {Error} If a memory leak is detected.
 */
export async function assertNoLeaks(memory: WASMMemoryManager, fn: () => void | Promise<void>): Promise<void> {
  const result = await checkForLeaks(memory, fn);
  if (result.hasLeak) {
    throw new Error(result.message);
  }
}
