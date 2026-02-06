import { useState } from 'react';
import { Button } from '../../components/Button';
import { PDFCanvas } from '../../components/PDFCanvas';
import { usePDFium } from '../../hooks/usePDFium';
import { useRenderPage } from '../../hooks/useRender';

export function ViewerLab() {
  const { document, documentName } = usePDFium();
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1.5);

  const { data: renderResult } = useRenderPage(document, {
    pageNumber: pageIndex,
    scale: scale,
  });

  if (!document) return <div>No document loaded</div>;

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1">
             <Button 
               onClick={() => setPageIndex(p => Math.max(0, p - 1))} 
               disabled={pageIndex === 0}
               variant="secondary"
             >
               Prev
             </Button>
             <span className="text-sm font-mono w-24 text-center">
               Page {pageIndex + 1} / {document.pageCount}
             </span>
             <Button 
               onClick={() => setPageIndex(p => Math.min(document.pageCount - 1, p + 1))} 
               disabled={pageIndex === document.pageCount - 1}
               variant="secondary"
             >
               Next
             </Button>
           </div>

           <div className="flex items-center gap-1 border-l pl-4">
             <Button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} variant="secondary">-</Button>
             <span className="text-sm w-12 text-center">{(scale * 100).toFixed(0)}%</span>
             <Button onClick={() => setScale(s => Math.min(4, s + 0.25))} variant="secondary">+</Button>
           </div>
        </div>
        
        <div className="text-sm text-gray-500 truncate max-w-xs">
          {documentName}
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-auto flex justify-center p-8">
        <div className="relative shadow-lg bg-white">
          {renderResult ? (
            <PDFCanvas
              width={renderResult.width}
              height={renderResult.height}
              data={renderResult.data}
            />
          ) : (
             <div 
               className="flex items-center justify-center bg-white text-gray-400"
               style={{ width: 600, height: 800 }} // Placeholder size
             >
               Loading...
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
