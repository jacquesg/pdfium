'use client';

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { VISUALLY_HIDDEN_STYLE } from '../internal/a11y.js';
import { useLatestRef, useMountedRef, useRequestCounter } from '../internal/async-guards.js';

interface DragDropZoneProps {
  children: ReactNode;
  /** Called with the file data when a valid file is dropped or selected.
   * Only the first file is processed when multiple files are dropped -- additional files are silently ignored.
   * This matches the single-document-per-provider design. */
  onFileSelect: (data: Uint8Array, name: string) => void;
  /** Custom overlay rendered while dragging. Defaults to a minimal unstyled message. */
  renderDragOverlay?: () => ReactNode;
  /** File extension filter. Default: ['.pdf']. */
  accept?: string[];
  className?: string;
  style?: CSSProperties;
}

function DragDropZone({
  children,
  onFileSelect,
  renderDragOverlay,
  accept = ['.pdf'],
  className,
  style,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  // Drag counter tracks nested dragenter/dragleave events from child elements.
  // Without this, dragging over a child element fires dragleave on the parent,
  // causing the overlay to flicker.
  const dragCounterRef = useRef(0);
  // Hidden file input ref for keyboard-accessible file selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useMountedRef();
  const readRequestCounter = useRequestCounter();
  const onFileSelectRef = useLatestRef(onFileSelect);

  useEffect(() => {
    return () => {
      readRequestCounter.invalidate();
    };
  }, [readRequestCounter]);

  const matchesFilter = useCallback(
    (filename: string) => {
      const lower = filename.toLowerCase();
      return accept.some((ext) => lower.endsWith(ext.toLowerCase()));
    },
    [accept],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const readAndEmitFile = useCallback(
    async (file: File) => {
      const requestId = readRequestCounter.next();
      try {
        const buffer = await file.arrayBuffer();
        if (!isMountedRef.current || !readRequestCounter.isCurrent(requestId)) return;
        onFileSelectRef.current(new Uint8Array(buffer), file.name);
        setAnnouncement(`Loaded ${file.name}`);
      } catch (err: unknown) {
        if (!isMountedRef.current || !readRequestCounter.isCurrent(requestId)) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setAnnouncement(`Failed to read file: ${message}`);
      }
    },
    [isMountedRef, onFileSelectRef, readRequestCounter],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || !matchesFilter(file.name)) {
        setAnnouncement(`Only ${accept.join(', ')} files are supported.`);
        return;
      }

      await readAndEmitFile(file);
    },
    [readAndEmitFile, matchesFilter, accept],
  );

  // Keyboard handler for accessibility -- Enter/Space triggers the hidden file input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  // Hidden file input change handler
  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !matchesFilter(file.name)) {
        setAnnouncement(`Only ${accept.join(', ')} files are supported.`);
        return;
      }
      await readAndEmitFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [readAndEmitFile, matchesFilter, accept],
  );

  const defaultOverlay = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '2px dashed rgb(59, 130, 246)',
      }}
    >
      <div
        style={{
          padding: '1.5rem',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ fontWeight: 'bold', color: 'rgb(37, 99, 235)' }}>Drop PDF here</p>
      </div>
    </div>
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: div acts as a composite drop zone with button semantics — a <button> cannot contain block children
    <div
      className={className}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, ...style }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Drop zone for PDF files. Press Enter or Space to select a file."
    >
      {/* Hidden file input for keyboard users */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />
      {children}
      {isDragging && (renderDragOverlay ?? defaultOverlay)()}
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN_STYLE}>
        {announcement}
      </div>
    </div>
  );
}

export { DragDropZone };
export type { DragDropZoneProps };
