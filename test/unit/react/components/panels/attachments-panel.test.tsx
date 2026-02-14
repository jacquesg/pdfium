import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedAttachment } from '../../../../../src/context/protocol.js';

const mockAttachments: SerialisedAttachment[] = [];
const mockSanitiseFilename = vi.fn((name: string) => `safe-${name}`);

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => ({
    viewer: {
      document: { id: 'doc-1' },
    },
  }),
}));

vi.mock('../../../../../src/react/hooks/use-attachments.js', () => ({
  useAttachments: () => ({ data: mockAttachments }),
}));

vi.mock('../../../../../src/react/internal/sanitise-filename.js', () => ({
  sanitiseFilename: (name: string) => mockSanitiseFilename(name),
}));

const { AttachmentsPanel } = await import('../../../../../src/react/components/panels/attachments-panel.js');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  mockAttachments.length = 0;
  mockSanitiseFilename.mockClear();
});

beforeEach(() => {
  mockAttachments.length = 0;
});

describe('AttachmentsPanel', () => {
  it('renders empty state when no attachments are available', () => {
    render(<AttachmentsPanel />);

    expect(screen.getByText('No attachments found.')).toBeDefined();
  });

  it('renders attachment table rows with byte sizes', () => {
    mockAttachments.push(
      { index: 1, name: 'foo.txt', data: new Uint8Array([1, 2, 3]).buffer },
      { index: 2, name: 'bar.bin', data: new Uint8Array([9, 8]).buffer },
    );

    render(<AttachmentsPanel />);

    expect(screen.getByText('foo.txt')).toBeDefined();
    expect(screen.getByText('bar.bin')).toBeDefined();
    expect(screen.getByText('3 bytes')).toBeDefined();
    expect(screen.getByText('2 bytes')).toBeDefined();
  });

  it('downloads attachment and revokes object URL after delay', () => {
    vi.useFakeTimers();
    mockAttachments.push({ index: 1, name: 'unsafe/../name.pdf', data: new Uint8Array([1, 2]).buffer });

    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<AttachmentsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(mockSanitiseFilename).toHaveBeenCalledWith('unsafe/../name.pdf');
    expect(clickSpy).toHaveBeenCalledOnce();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download-url');
  });

  it('still schedules URL revocation when anchor click throws', () => {
    vi.useFakeTimers();
    mockAttachments.push({ index: 1, name: 'file.bin', data: new Uint8Array([1]).buffer });

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:throwing-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click failed');
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AttachmentsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(consoleError).toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:throwing-url');
  });
});
