import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandStack } from '../../../../../src/react/editor/command.js';
import { usePageManagement } from '../../../../../src/react/editor/hooks/use-page-management.js';
import { createMockDocument } from '../../../../react-setup.js';

const mockBumpDocumentRevision = vi.fn();
const mockCommandStack = new CommandStack();

vi.mock('../../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => ({
    bumpDocumentRevision: mockBumpDocumentRevision,
  }),
}));

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    commandStack: mockCommandStack,
  }),
}));

describe('usePageManagement', () => {
  it('deletePage returns early when document is null', async () => {
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => usePageManagement(null));

    await act(async () => {
      await result.current.deletePage(0, 612, 792);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();
  });

  it('deletePage pushes command, bumps revision', async () => {
    const mockDoc = createMockDocument({
      deletePage: vi.fn().mockResolvedValue(undefined),
      insertPage: vi.fn().mockResolvedValue(undefined),
    });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => usePageManagement(mockDoc as never));

    await act(async () => {
      await result.current.deletePage(1, 612, 792);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
  });

  it('insertBlankPage returns early when document is null', async () => {
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => usePageManagement(null));

    await act(async () => {
      await result.current.insertBlankPage(0);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();
  });

  it('insertBlankPage pushes command, bumps revision', async () => {
    const mockDoc = createMockDocument({
      insertBlankPage: vi.fn().mockResolvedValue(undefined),
      deletePage: vi.fn().mockResolvedValue(undefined),
    });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => usePageManagement(mockDoc as never));

    await act(async () => {
      await result.current.insertBlankPage(2, 595, 842);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
  });

  it('insertBlankPage uses default dimensions', async () => {
    const mockDoc = createMockDocument({
      insertBlankPage: vi.fn().mockResolvedValue(undefined),
      deletePage: vi.fn().mockResolvedValue(undefined),
    });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => usePageManagement(mockDoc as never));

    await act(async () => {
      await result.current.insertBlankPage(0);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
  });

  it('movePage returns early when document is null', async () => {
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => usePageManagement(null));

    await act(async () => {
      await result.current.movePage(0, 3);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();
  });

  it('movePage pushes command, bumps revision', async () => {
    const mockDoc = createMockDocument({
      movePages: vi.fn().mockResolvedValue(undefined),
    });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => usePageManagement(mockDoc as never));

    await act(async () => {
      await result.current.movePage(0, 3);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
  });
});
