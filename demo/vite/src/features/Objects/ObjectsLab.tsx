import { PageObjectType, PDFiumImageObject, PDFiumTextObject } from '@scaryterry/pdfium/browser';
import { useEffect, useState } from 'react';
import { PDFCanvas } from '../../components/PDFCanvas';
import { usePDFium } from '../../hooks/usePDFium';
import { useRenderPage } from '../../hooks/useRender';

interface ObjectDetail {
  index: number;
  type: string;
  bounds: { left: number, top: number, right: number, bottom: number };
  extra: Record<string, string | number | boolean>;
}

export function ObjectsLab() {
  const { document } = usePDFium();
  const [pageIndex] = useState(0);
  const [objects, setObjects] = useState<ObjectDetail[]>([]);
  const [selectedObjectIndex, setSelectedIndex] = useState<number | null>(null);

  const { data: renderResult } = useRenderPage(document, {
    pageNumber: pageIndex,
    scale: 1.5,
  });

  useEffect(() => {
    if (!document) return;
    try {
      const page = document.getPage(pageIndex);
      const rawObjects = page.getObjects();
      
      const details: ObjectDetail[] = rawObjects.map((obj, i) => {
        const extra: Record<string, string | number | boolean> = {};
        
        if (obj instanceof PDFiumTextObject) {
          extra.text = obj.text;
          extra.fontSize = obj.fontSize;

          try {
            using font = obj.getFont();
            if (font) {
              extra.fontName = font.fontName;
              extra.familyName = font.familyName;
              extra.weight = font.weight;
              extra.isEmbedded = font.isEmbedded;
            }
          } catch (e) {
            console.warn('Failed to load font for object', i, e);
          }
        } else if (obj instanceof PDFiumImageObject) {
          extra.width = obj.width;
          extra.height = obj.height;
        }

        return {
          index: i,
          type: PageObjectType[obj.type] || 'Unknown',
          bounds: obj.bounds,
          extra
        };
      });
      
      setObjects(details);
      setSelectedIndex(null);
    } catch (e) {
      console.error('Failed to inspect objects', e);
    }
  }, [document, pageIndex]);

  const drawHighlight = (ctx: CanvasRenderingContext2D, width: number, height: number, originalWidth: number, originalHeight: number) => {
    if (selectedObjectIndex === null) return;
    const obj = objects[selectedObjectIndex];
    if (!obj) return;

    const scaleX = width / originalWidth;
    const scaleY = height / originalHeight;

    const { left, top, right, bottom } = obj.bounds;
    
    const x = left * scaleX;
    const y = (originalHeight - top) * scaleY;
    const w = (right - left) * scaleX;
    const h = (top - bottom) * scaleY;

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(x, y, w, h);
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-r flex flex-col overflow-hidden">
        <div className="p-2 border-b bg-white font-bold text-sm">
          Page Objects ({objects.length})
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {objects.map((obj) => (
            <div 
              key={obj.index}
              onClick={() => setSelectedIndex(obj.index)}
              className={`text-xs p-2 rounded cursor-pointer border ${
                selectedObjectIndex === obj.index ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="font-semibold flex justify-between">
                <span>{obj.type}</span>
                <span className="text-gray-400">#{obj.index}</span>
              </div>
              <div className="text-gray-500 mt-1">
                Box: [{obj.bounds.left.toFixed(0)}, {obj.bounds.bottom.toFixed(0)}, {obj.bounds.right.toFixed(0)}, {obj.bounds.top.toFixed(0)}]
              </div>
              {Object.keys(obj.extra).length > 0 && (
                <div className="mt-1 pt-1 border-t border-gray-100 text-gray-600 font-mono overflow-x-hidden">
                  {Object.entries(obj.extra).map(([k, v]) => (
                    <div key={k} className="truncate"><span className="text-gray-400">{k}:</span> {String(v)}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 bg-gray-200 overflow-auto flex justify-center p-4">
        <div className="relative">
          {renderResult ? (
            <>
              <PDFCanvas 
                width={renderResult.width} 
                height={renderResult.height} 
                data={renderResult.data} 
              />
              <canvas
                className="absolute top-0 left-0 pointer-events-none"
                width={renderResult.width}
                height={renderResult.height}
                ref={canvas => {
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      drawHighlight(ctx, renderResult.width, renderResult.height, renderResult.originalWidth, renderResult.originalHeight);
                    }
                  }
                }}
              />
            </>
          ) : <div>Loading...</div>}
        </div>
      </div>
    </div>
  );
}