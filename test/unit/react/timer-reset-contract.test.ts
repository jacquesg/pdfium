import { describe, expect, it, vi } from 'vitest';

describe('react timer reset contract', () => {
  it('can switch to fake timers when a test requires it', () => {
    vi.useFakeTimers();
    expect(vi.isFakeTimers()).toBe(true);
  });

  it('starts each test with real timers restored', () => {
    expect(vi.isFakeTimers()).toBe(false);
  });
});
