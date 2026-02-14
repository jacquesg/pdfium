/**
 * Re-export of the library's DragDropZone component with the demo's
 * Tailwind-styled drag overlay as the default.
 */

import { DragDropZone as LibDragDropZone } from '@scaryterry/pdfium/react';
import type { ReactNode } from 'react';

interface DragDropZoneProps {
  children: ReactNode;
  onFileSelect: (data: Uint8Array, name: string) => void;
}

function renderDemoDragOverlay(): ReactNode {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500 backdrop-blur">
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-lg font-bold text-blue-600">Drop PDF here</p>
        <p className="text-sm text-gray-500 mt-1">Release to load document</p>
      </div>
    </div>
  );
}

export function DragDropZone({ children, onFileSelect }: DragDropZoneProps) {
  return (
    <LibDragDropZone
      onFileSelect={onFileSelect}
      renderDragOverlay={renderDemoDragOverlay}
      className="relative flex-1 flex flex-col min-h-0"
    >
      {children}
    </LibDragDropZone>
  );
}
