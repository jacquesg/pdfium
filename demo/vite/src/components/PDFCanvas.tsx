import { useEffect, useRef } from 'react';

interface PDFCanvasProps {
  width: number;
  height: number;
  data?: Uint8Array; // RGBA data
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function PDFCanvas({ width, height, data, style, ...props }: PDFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create ImageData from the RGBA buffer
    // Note: Uint8ClampedArray is required for ImageData
    const clampedData = new Uint8ClampedArray(data);
    const imageData = new ImageData(clampedData, width, height);
    
    ctx.putImageData(imageData, 0, 0);
  }, [width, height, data]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '100%',
        height: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...style
      }}
      {...props}
    />
  );
}
