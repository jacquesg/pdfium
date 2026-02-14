import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DragDropZone } from '../../../../src/react/components/drag-drop-zone.js';

/** Creates a mock File with arrayBuffer support. */
function createMockFile(name: string, content: Uint8Array): File {
  return new File([content.buffer as ArrayBuffer], name, { type: 'application/pdf' });
}

/** Creates a mock DataTransfer with the given files. */
function createDataTransfer(files: File[]): DataTransfer {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('DragDropZone', () => {
  it('calls onFileSelect when a valid PDF file is dropped', async () => {
    const onFileSelect = vi.fn();
    const file = createMockFile('document.pdf', new Uint8Array([37, 80, 68, 70]));

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const dataTransfer = createDataTransfer([file]);

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledOnce();
    });

    expect(onFileSelect).toHaveBeenCalledWith(expect.any(Uint8Array), 'document.pdf');
  });

  it('rejects non-PDF files by default', async () => {
    const onFileSelect = vi.fn();
    const file = createMockFile('image.png', new Uint8Array([137, 80, 78, 71]));

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const dataTransfer = createDataTransfer([file]);

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion!.textContent).toContain('.pdf');
    });

    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('does not toggle overlay on nested dragenter/dragleave', () => {
    const onFileSelect = vi.fn();

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div data-testid="child">Child element</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const child = container.querySelector('[data-testid="child"]') as HTMLElement;

    // Simulate dragenter on parent — dragCounter becomes 1, overlay appears
    fireEvent.dragEnter(zone);

    // Simulate dragenter on child (nested) — dragCounter becomes 2
    fireEvent.dragEnter(child);

    // Simulate dragleave on parent — dragCounter becomes 1, overlay still visible
    fireEvent.dragLeave(zone);

    // Simulate final dragleave — dragCounter becomes 0, overlay disappears
    fireEvent.dragLeave(child);

    // After all drag events settle, the drop overlay text should not be present
    const overlayText = container.querySelector('p');
    // No "Drop PDF here" text should be visible
    expect(overlayText?.textContent !== 'Drop PDF here' || overlayText === null).toBe(true);
  });

  it('announces loaded file via aria-live region', async () => {
    const onFileSelect = vi.fn();
    const file = createMockFile('report.pdf', new Uint8Array([37, 80, 68, 70]));

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const dataTransfer = createDataTransfer([file]);

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion!.textContent).toBe('Loaded report.pdf');
    });
  });

  it('triggers hidden file input on Enter key press', () => {
    const onFileSelect = vi.fn();

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(hiddenInput, 'click');

    fireEvent.keyDown(zone, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('triggers hidden file input on Space key press', () => {
    const onFileSelect = vi.fn();

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(hiddenInput, 'click');

    fireEvent.keyDown(zone, { key: ' ' });

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('has role="button" and tabIndex={0}', () => {
    const onFileSelect = vi.fn();

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    expect(zone).not.toBeNull();
    expect(zone.getAttribute('tabindex')).toBe('0');
  });

  it('renders children inside the drop zone', () => {
    const onFileSelect = vi.fn();

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <p>Upload your PDF here</p>
      </DragDropZone>,
    );

    expect(container.textContent).toContain('Upload your PDF here');
  });

  it('applies className and style props', () => {
    const onFileSelect = vi.fn();

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect} className="custom-zone" style={{ minHeight: '300px' }}>
        <div>Content</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    expect(zone.className).toBe('custom-zone');
    expect(zone.style.minHeight).toBe('300px');
  });

  it('ignores stale drop completion when a newer drop starts before the first resolves', async () => {
    const onFileSelect = vi.fn();
    const firstDeferred = deferred<ArrayBuffer>();
    const secondDeferred = deferred<ArrayBuffer>();
    const firstFile = createMockFile('first.pdf', new Uint8Array([1]));
    const secondFile = createMockFile('second.pdf', new Uint8Array([2]));
    vi.spyOn(firstFile, 'arrayBuffer').mockReturnValue(firstDeferred.promise);
    vi.spyOn(secondFile, 'arrayBuffer').mockReturnValue(secondDeferred.promise);

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;

    fireEvent.drop(zone, { dataTransfer: createDataTransfer([firstFile]) });
    fireEvent.drop(zone, { dataTransfer: createDataTransfer([secondFile]) });

    await act(async () => {
      secondDeferred.resolve(new Uint8Array([2]).buffer);
      await secondDeferred.promise;
    });

    await act(async () => {
      firstDeferred.resolve(new Uint8Array([1]).buffer);
      await firstDeferred.promise;
    });

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledTimes(1);
    });
    expect(onFileSelect).toHaveBeenCalledWith(expect.any(Uint8Array), 'second.pdf');
  });

  it('does not call onFileSelect when dropped file resolves after unmount', async () => {
    const onFileSelect = vi.fn();
    const pending = deferred<ArrayBuffer>();
    const file = createMockFile('late.pdf', new Uint8Array([9]));
    vi.spyOn(file, 'arrayBuffer').mockReturnValue(pending.promise);

    const { container, unmount } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: createDataTransfer([file]) });

    unmount();

    await act(async () => {
      pending.resolve(new Uint8Array([9]).buffer);
      await pending.promise;
    });

    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('uses the latest onFileSelect callback when props change before file read resolves', async () => {
    const firstOnFileSelect = vi.fn();
    const secondOnFileSelect = vi.fn();
    const pending = deferred<ArrayBuffer>();
    const file = createMockFile('retarget.pdf', new Uint8Array([7]));
    vi.spyOn(file, 'arrayBuffer').mockReturnValue(pending.promise);

    const { container, rerender } = render(
      <DragDropZone onFileSelect={firstOnFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: createDataTransfer([file]) });

    rerender(
      <DragDropZone onFileSelect={secondOnFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    await act(async () => {
      pending.resolve(new Uint8Array([7]).buffer);
      await pending.promise;
    });

    await waitFor(() => {
      expect(secondOnFileSelect).toHaveBeenCalledTimes(1);
    });
    expect(secondOnFileSelect).toHaveBeenCalledWith(expect.any(Uint8Array), 'retarget.pdf');
    expect(firstOnFileSelect).not.toHaveBeenCalled();
  });

  it('does not trigger file picker for non-activation keys', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(hiddenInput, 'click');

    fireEvent.keyDown(zone, { key: 'a' });
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('announces unsupported type when drop has no files', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );

    const zone = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: createDataTransfer([]) });

    await waitFor(() => {
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Only .pdf files are supported.');
    });
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('handles hidden input selection with unsupported extension', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('not-pdf.txt', new Uint8Array([1, 2, 3]));

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Only .pdf files are supported.');
    });
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('announces unknown read error when file read throws non-Error', async () => {
    const onFileSelect = vi.fn();
    const file = createMockFile('broken.pdf', new Uint8Array([37, 80, 68, 70]));
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('boom');

    const { container } = render(
      <DragDropZone onFileSelect={onFileSelect}>
        <div>Drop area</div>
      </DragDropZone>,
    );
    const zone = container.querySelector('[role="button"]') as HTMLElement;

    fireEvent.drop(zone, { dataTransfer: createDataTransfer([file]) });

    await waitFor(() => {
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toBe('Failed to read file: Unknown error');
    });
    expect(onFileSelect).not.toHaveBeenCalled();
  });
});
