import { ProgressiveRenderStatus } from '@scaryterry/pdfium/browser';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { PDFCanvas } from '../../components/PDFCanvas';
import { usePDFium } from '../../hooks/usePDFium';
import { useRenderPage } from '../../hooks/useRender';

export function RenderLab() {
  const { document } = usePDFium();
  const [viewport, setViewport] = useState({ left: 0, top: 0, right: 300, bottom: 300 });
  const [progress, setProgress] = useState(0);
  const [renderMode, setRenderMode] = useState<'standard' | 'progressive'>('standard');
  const [progressiveResult, setProgressiveResult] = useState<{ width: number, height: number, data: Uint8Array } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // -- Standard Render with ClipRect --
  const { data: clipResult } = useRenderPage(document, {
    pageNumber: 0,
    width: 600,
    height: 600,
    clipRect: renderMode === 'standard' ? viewport : undefined, // Only apply in standard mode for this demo
  });

  // -- Minimap Render (Full Page) --
  const { data: minimap } = useRenderPage(document, {
    pageNumber: 0,
    width: 200, // Small thumbnail
  });

  // -- Progressive Render Logic --
  const startProgressive = async () => {
    if (!document) return;
    setRenderMode('progressive');
    setProgress(0);
    setProgressiveResult(null);
    setRenderError(null);

    const page = document.getPage(0);
    
    try {
      // NOTE: startProgressiveRender returns a CONTEXT, not a promise.
      // It starts synchronously but returns a status.
      // The context must be disposed!
      using render = page.startProgressiveRender({ scale });

      // If it fails immediately (e.g. OOM or invalid handle)
      if (render.status === ProgressiveRenderStatus.Failed) {
        setRenderError(`Render failed immediately (Status: ${render.status})`);
        return;
      }

      while (render.status === ProgressiveRenderStatus.ToBeContinued) {
        render.continue();
        
        // Update progress bar artificially (PDFium doesn't give % in this API)
        setProgress(prev => Math.min(prev + 0.05, 0.95)); 
        
        // Yield to event loop to allow UI updates and prevent blocking
        await new Promise(r => setTimeout(r, 50)); 
      }

      if (render.status === ProgressiveRenderStatus.Done) {
        setProgress(1);
        setProgressiveResult(render.getResult());
      } else {
        setRenderError(`Render failed during continue (Status: ${render.status})`);
      }
    } catch (e) {
      console.error(e);
      setRenderError(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!minimap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!document) return;
    const page = document.getPage(0);
    const scaleX = page.width / minimap.width;
    const scaleY = page.height / minimap.height;
    
    const pdfX = x * scaleX;
    
    const w = 300;
    const h = 300;
    
    setViewport({
      left: Math.max(0, pdfX - w/2),
      top: Math.max(0, (y * scaleY) - h/2),
      right: Math.max(0, pdfX - w/2) + w,
      bottom: Math.max(0, (y * scaleY) - h/2) + h,
    });
    
    setRenderMode('standard');
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Column: Controls & Minimap */}
      <div className="w-64 space-y-4">
        <div className="border p-2 rounded shadow-sm bg-white">
          <h3 className="font-bold mb-2">Navigator</h3>
          <p className="text-xs text-gray-500 mb-2">Click to move view</p>
          <div className="relative cursor-crosshair inline-block">
             {minimap && (
               <PDFCanvas 
                 width={minimap.width} 
                 height={minimap.height} 
                 data={minimap.data}
                 onMouseDown={handleMinimapClick}
               />
             )}
          </div>
          <div className="mt-2 text-xs font-mono">
            x: {Math.round(viewport.left)}, y: {Math.round(viewport.top)}
          </div>
        </div>

        <div className="border p-2 rounded shadow-sm bg-white">
          <h3 className="font-bold mb-2">Progressive Test</h3>
          <div className="mb-2">
            <label className="text-xs block">Scale: {scale}x</label>
            <input 
              type="range" min="1" max="5" step="1" 
              value={scale} 
              onChange={e => setScale(Number(e.target.value))} 
              className="w-full"
            />
          </div>
          <Button onClick={startProgressive} className="w-full text-sm">
            Start Render
          </Button>
          <div className="mt-2 h-4 bg-gray-200 rounded overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="text-right text-xs mt-1">{(progress * 100).toFixed(0)}%</div>
          {renderError && (
            <div className="mt-2 text-xs text-red-600 font-bold border p-1 bg-red-50 rounded">
              {renderError}
            </div>
          )}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 bg-gray-900 flex items-center justify-center overflow-auto p-4 rounded">
        {renderMode === 'standard' ? (
          clipResult ? (
            <div className="relative">
              <PDFCanvas 
                width={clipResult.width} 
                height={clipResult.height} 
                data={clipResult.data} 
                className="shadow-2xl border-4 border-white"
              />
              <div className="absolute top-0 left-0 bg-black/50 text-white p-1 text-xs">
                Clip View (600x600 px)
              </div>
            </div>
          ) : <div className="text-white">Rendering Region...</div>
        ) : (
          progressiveResult ? (
            <div className="overflow-auto max-w-full max-h-full">
               <PDFCanvas 
                  width={progressiveResult.width} 
                  height={progressiveResult.height} 
                  data={progressiveResult.data} 
               />
            </div>
          ) : renderError ? (
             <div className="text-red-400">Failed.</div>
          ) : (
             <div className="text-white animate-pulse">Processing...</div>
          )
        )}
      </div>
    </div>
  );
}