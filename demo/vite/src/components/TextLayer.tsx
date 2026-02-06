import type { PDFiumPage } from '@scaryterry/pdfium/browser';
import { useEffect, useState } from 'react';
import { TextOverlay } from './TextOverlay';

interface TextLayerProps {
  page: PDFiumPage | null;
  scale: number;
  width: number;
  height: number;
  originalHeight: number;
}

export function TextLayer({ page, scale, width, height, originalHeight }: TextLayerProps) {
  const [data, setData] = useState<{ text: string; rects: Float32Array } | null>(null);

  useEffect(() => {
    if (!page) {
      setData(null);
      return;
    }

    // Use efficient bulk extraction from the page directly
    try {
      const layout = page.getTextLayout();
      setData(layout);
    } catch (e) {
      console.error('TextLayer extraction failed', e);
      setData(null);
    }
  }, [page]);

  return (
    <TextOverlay 
      text={data?.text ?? null}
      rects={data?.rects ?? null}
      scale={scale}
      width={width}
      height={height}
      originalHeight={originalHeight}
    />
  );
}
