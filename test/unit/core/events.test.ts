import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../../../src/core/events.js';

describe('EventEmitter', () => {
  type TestEvents = {
    test: { value: number };
    other: string;
  };

  it('should register and invoke listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();

    emitter.on('test', listener);
    emitter.emit('test', { value: 42 });

    expect(listener).toHaveBeenCalledWith({ value: 42 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should remove listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();

    emitter.on('test', listener);
    emitter.off('test', listener);
    emitter.emit('test', { value: 42 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    emitter.on('test', listenerA);
    emitter.on('test', listenerB);
    emitter.emit('test', { value: 42 });

    expect(listenerA).toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalled();
  });

  it('should catch errors in listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const listener = vi.fn().mockImplementation(() => {
      throw new Error('Boom');
    });

    emitter.on('test', listener);

    // Should not throw
    emitter.emit('test', { value: 1 });

    expect(listener).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in event listener for test'),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('should handle removing unknown listener', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();

    // Should not throw
    emitter.off('test', listener);
    // Should not throw
    emitter.off('other', listener);
  });
});
