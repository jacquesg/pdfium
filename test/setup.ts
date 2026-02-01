/**
 * Vitest test setup file.
 * This file is loaded before each test file.
 */

import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { expect } from 'vitest';

// Extend Vitest's expect with image snapshot matcher
expect.extend({ toMatchImageSnapshot });

// Declare the matcher type for TypeScript
declare module 'vitest' {
  interface Assertion<T> {
    toMatchImageSnapshot(options?: {
      customSnapshotIdentifier?: string;
      failureThreshold?: number;
      failureThresholdType?: 'percent' | 'pixel';
    }): T;
  }
}
