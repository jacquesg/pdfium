import type { PageRotation, PDFiumDocument } from '@scaryterry/pdfium/browser';
import { useQuery } from '@tanstack/react-query';

interface RenderOptions {
  pageNumber: number;
  scale?: number;
  width?: number;
  height?: number;
  rotation?: PageRotation;
  renderFormFields?: boolean;
  backgroundColour?: number;
  clipRect?: { left: number; top: number; right: number; bottom: number };
}

export function useRenderPage(document: PDFiumDocument | null, options: RenderOptions) {
  return useQuery({
    queryKey: ['renderPage', document?.pageCount, options],
    queryFn: async () => {
      if (!document) return null;
      
      const page = document.getPage(options.pageNumber);
      
      // Simulate delay for progressive render testing if needed (not here though)
      // For real progressive rendering we'd need a different hook or manual effect
      
      const result = page.render({
        scale: options.scale ?? 1,
        width: options.width,
        height: options.height,
        rotation: options.rotation,
        renderFormFields: options.renderFormFields,
        backgroundColour: options.backgroundColour,
        clipRect: options.clipRect,
      });
      
      return result;
    },
    enabled: !!document,
    staleTime: Infinity, // Don't refetch unless options change
  });
}
