/**
 * Re-export of the library's PDFCanvas component with the demo's default
 * Tailwind styling applied. The library's version has no default className.
 */

import { PDFCanvas as LibPDFCanvas } from '@scaryterry/pdfium/react';
import type { PDFCanvasProps } from '@scaryterry/pdfium/react';
import { cn } from '../lib/utils';

function PDFCanvas({ className, ...props }: PDFCanvasProps) {
  return (
    <LibPDFCanvas
      className={cn('border border-gray-200 shadow-md max-w-full h-auto select-none', className)}
      {...props}
    />
  );
}

export { PDFCanvas };
export type { PDFCanvasProps };
