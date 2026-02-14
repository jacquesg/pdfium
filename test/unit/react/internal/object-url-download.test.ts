import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearObjectUrlRevokeTimers,
  DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
  triggerObjectUrlDownload,
} from '../../../../src/react/internal/object-url-download.js';

describe('object-url download utilities', () => {
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('downloads via anchor and revokes URL after default delay', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:utility-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const documentRef = {
      createElement: vi.fn(() => mockAnchor as unknown as HTMLAnchorElement),
    } as unknown as Document;
    const revokeTimers = new Set<ReturnType<typeof setTimeout>>();

    triggerObjectUrlDownload({
      blob: new Blob(['abc'], { type: 'text/plain' }),
      filename: 'file.txt',
      documentRef,
      revokeTimers,
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(mockAnchor.href).toBe('blob:utility-url');
    expect(mockAnchor.download).toBe('file.txt');
    expect(mockAnchor.click).toHaveBeenCalledOnce();
    expect(revokeTimers.size).toBe(1);

    vi.advanceTimersByTime(DEFAULT_OBJECT_URL_REVOKE_DELAY_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:utility-url');
    expect(revokeTimers.size).toBe(0);
  });

  it('still schedules URL revocation when anchor click throws', () => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:throwing-utility-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    mockAnchor.click.mockImplementation(() => {
      throw new Error('download-click-failed');
    });

    const documentRef = {
      createElement: vi.fn(() => mockAnchor as unknown as HTMLAnchorElement),
    } as unknown as Document;
    const revokeTimers = new Set<ReturnType<typeof setTimeout>>();

    expect(() =>
      triggerObjectUrlDownload({
        blob: new Blob(['abc'], { type: 'text/plain' }),
        filename: 'file.txt',
        documentRef,
        revokeTimers,
      }),
    ).toThrow('download-click-failed');

    expect(revokeTimers.size).toBe(1);
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:throwing-utility-url');
    expect(revokeTimers.size).toBe(0);
  });

  it('clears pending revoke timers without revoking URLs', () => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cancelled-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const documentRef = {
      createElement: vi.fn(() => mockAnchor as unknown as HTMLAnchorElement),
    } as unknown as Document;
    const revokeTimers = new Set<ReturnType<typeof setTimeout>>();

    triggerObjectUrlDownload({
      blob: new Blob(['abc'], { type: 'text/plain' }),
      filename: 'file.txt',
      documentRef,
      revokeTimers,
    });
    expect(revokeTimers.size).toBe(1);

    clearObjectUrlRevokeTimers(revokeTimers);
    expect(revokeTimers.size).toBe(0);

    vi.runAllTimers();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});
