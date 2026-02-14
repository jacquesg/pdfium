import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest browser mode doesn't auto-cleanup Testing Library renders.
// Explicitly clean up after each test to prevent DOM accumulation.
afterEach(() => {
  cleanup();
});
