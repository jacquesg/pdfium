import type { CSSProperties } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { useTextContent } from '../hooks/use-text-content.js';
import { TextOverlay } from './text-overlay.js';

interface TextLayerProps {
  document: WorkerPDFiumDocument | null;
  pageIndex: number;
  scale: number;
  width: number;
  height: number;
  originalHeight: number;
  selectionColour?: string;
  nonce?: string;
  className?: string;
  style?: CSSProperties;
}

function TextLayer({
  document,
  pageIndex,
  scale,
  width,
  height,
  originalHeight,
  selectionColour,
  nonce,
  className,
  style,
}: TextLayerProps) {
  const { data } = useTextContent(document, pageIndex);

  const optionalProps = {
    ...(selectionColour !== undefined && { selectionColour }),
    ...(nonce !== undefined && { nonce }),
    ...(className !== undefined && { className }),
    ...(style !== undefined && { style }),
  };

  return (
    <TextOverlay
      text={data?.text ?? null}
      rects={data?.rects ?? null}
      scale={scale}
      width={width}
      height={height}
      originalHeight={originalHeight}
      {...optionalProps}
    />
  );
}

export { TextLayer };
export type { TextLayerProps };
