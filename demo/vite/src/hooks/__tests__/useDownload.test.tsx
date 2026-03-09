import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useDownload } from '../useDownload';

describe('useDownload', () => {
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:http://localhost/fake-blob');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns a stable download callback', () => {
    const { result, rerender } = renderHook(() => useDownload());
    const first = result.current.download;
    rerender();
    expect(result.current.download).toBe(first);
  });

  it('creates and revokes blob URL with delay', async () => {
    const { result } = renderHook(() => useDownload());
    const mockDoc = {
      save: vi.fn(() => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46]))),
    };

    const downloadPromise = result.current.download(mockDoc, 'test.pdf');

    // The async save() needs to resolve — advance microtasks
    await vi.advanceTimersByTimeAsync(0);
    await downloadPromise;

    // Blob URL should be created after the async save
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();

    // revokeObjectURL should NOT be called immediately
    expect(revokeObjectURL).not.toHaveBeenCalled();

    // After 1 second, it should be revoked
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-blob');
  });
});
