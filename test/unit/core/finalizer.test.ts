/**
 * Unit tests for FinalizationRegistry integration.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Disposable } from '../../../src/core/disposable.js';

class TestDisposable extends Disposable {
  constructor() {
    super('TestDisposable');
  }
  protected disposeInternal(): void {}
}

describe('FinalizationRegistry', () => {
  let registerSpy: ReturnType<typeof vi.fn>;
  let unregisterSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // We need to spy on the prototype because the registry is instantiated at module scope
    registerSpy = vi.spyOn(FinalizationRegistry.prototype, 'register');
    unregisterSpy = vi.spyOn(FinalizationRegistry.prototype, 'unregister');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should register resource on creation', () => {
    const resource = new TestDisposable();
    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerSpy).toHaveBeenCalledWith(
      resource,
      expect.objectContaining({ name: 'TestDisposable' }),
      expect.any(Object),
    );
  });

  test('should unregister resource on disposal', () => {
    const resource = new TestDisposable();
    resource.dispose();
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
    expect(unregisterSpy).toHaveBeenCalledWith(expect.any(Object));
  });

  test('should not unregister if already disposed', () => {
    const resource = new TestDisposable();
    resource.dispose();
    resource.dispose(); // Second call
    expect(unregisterSpy).toHaveBeenCalledTimes(1); // Still 1
  });
});
