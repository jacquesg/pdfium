import { describe, expect, it, vi } from 'vitest';
import { flushPendingEditorCommits } from '../../../../../src/react/editor/internal/flush-pending-editor-commits.js';

describe('flushPendingEditorCommits', () => {
  it('blurs the active editable element, dispatches the flush event, and waits for idle', async () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    const waitForIdle = vi.fn().mockResolvedValue(undefined);

    try {
      await flushPendingEditorCommits({ waitForIdle });

      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);
      expect(waitForIdle).toHaveBeenCalledTimes(1);
    } finally {
      input.remove();
      dispatchSpy.mockRestore();
    }
  });

  it('skips blur when the active element is not editable', async () => {
    const container = document.createElement('div');
    container.tabIndex = 0;
    document.body.append(container);
    container.focus();
    const blurSpy = vi.spyOn(container, 'blur');
    const waitForIdle = vi.fn().mockResolvedValue(undefined);

    try {
      await flushPendingEditorCommits({ waitForIdle });

      expect(blurSpy).not.toHaveBeenCalled();
      expect(waitForIdle).toHaveBeenCalledTimes(1);
    } finally {
      container.remove();
    }
  });
});
