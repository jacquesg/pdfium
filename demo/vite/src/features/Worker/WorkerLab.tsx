import { PDFium, type RenderResult, type WorkerPDFium, type WorkerPDFiumDocument } from '@scaryterry/pdfium/browser';
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';
import { useEffect, useRef, useState, memo } from 'react';
import { PDFCanvas } from '../../components/PDFCanvas';
import { TextOverlay } from '../../components/TextOverlay';
import { useOnScreen } from '../../hooks/useOnScreen';

// --- Worker Page Component ---
const WorkerPage = memo(({ 
  index, 
  document, 
  width, 
  height,
  scale
}: { 
  index: number; 
  document: WorkerPDFiumDocument; 
  width: number; 
  height: number;
  scale: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, '500px'); // Pre-load 500px ahead
  const [result, setResult] = useState<RenderResult | null>(null);
  const [textData, setTextData] = useState<{ text: string; rects: Float32Array } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(null);
    setTextData(null);
  }, [scale]);

  useEffect(() => {
    if (!isVisible || result || error || loading) return;

    let active = true;

    const render = async () => {
      try {
        setLoading(true);
        // Load Page (High-level API)
        await using page = await document.getPage(index);
        
        if (!active) return;

        // Render & Get Text in parallel
        const renderPromise = page.render({ scale });
        const textPromise = page.getTextLayout();

        const [renderRes, layout] = await Promise.all([renderPromise, textPromise]);
        
        if (active) {
          setResult(renderRes);
          setTextData(layout);
        }
      } catch (e) {
        if (active) {
          console.error(`Page ${index} error:`, e);
          setError('Failed');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    render();

    return () => {
      active = false;
    };
  }, [isVisible, document, index, scale]);

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return (
    <div 
      ref={ref}
      className="bg-white shadow-lg transition-all duration-300 relative group"
      style={{ 
        width: scaledWidth, 
        height: scaledHeight,
        minWidth: scaledWidth,
        minHeight: scaledHeight
      }}
    >
      {result ? (
        <>
          <PDFCanvas 
            width={result.width} 
            height={result.height} 
            data={result.data} 
            style={{ width: '100%', height: '100%' }}
          />
          {textData && (
            <TextOverlay 
              text={textData.text}
              rects={textData.rects}
              scale={scale}
              width={scaledWidth}
              height={scaledHeight}
              originalHeight={height}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              {error ? <span className="text-red-500">Error</span> : `Page ${index + 1}`}
            </span>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </div>
    </div>
  );
});

// --- Main Lab Component ---
export function WorkerLab() {
  const [pdfium, setPdfium] = useState<WorkerPDFium | null>(null);
  const [document, setDocument] = useState<WorkerPDFiumDocument | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [scale, setScale] = useState(1.5);

  const pdfiumRef = useRef<WorkerPDFium | null>(null);

  useEffect(() => {
    let active = true;

    async function setup() {
      try {
        setStatus('Booting Worker...');
        const wasmRes = await fetch(wasmUrl);
        const wasmBinary = await wasmRes.arrayBuffer();
        if (!active) return;

        // Initialize High-Level Worker API
        const workerPdfium = await PDFium.init({
          useWorker: true,
          workerUrl: '/worker.js',
          wasmBinary,
        });
        
        pdfiumRef.current = workerPdfium;
        setPdfium(workerPdfium);

        setStatus('Downloading Reference PDF...');
        const docRes = await fetch('/reference.pdf');
        if (!docRes.ok) throw new Error(`Failed to load reference.pdf: ${docRes.status} ${docRes.statusText}`);
        const docData = await docRes.arrayBuffer();
        
        setStatus('Parsing Document...');
        const doc = await workerPdfium.openDocument(docData);
        
        if (active) {
          setDocument(doc);
          setPageCount(doc.pageCount);
          
          // Get page size from first page
          try {
            await using page0 = await doc.getPage(0);
            if (page0.width > 0 && page0.height > 0) {
              setPageSize({ width: page0.width, height: page0.height });
            } else {
              console.warn('[WorkerLab] Invalid page size, using default A4');
            }
          } catch (e) {
            console.warn('[WorkerLab] Failed to load page 0 dimensions', e);
          }

          setStatus('Ready');
        } else {
          doc.dispose();
        }

      } catch (err) {
        console.error(err);
        if (active) setStatus('Error: ' + String(err));
      }
    }

    setup();

    return () => {
      active = false;
      if (pdfiumRef.current) {
        pdfiumRef.current.dispose().catch(console.error);
        pdfiumRef.current = null;
      }
    };
  }, []);

  if (status !== 'Ready') {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-gray-600 font-medium animate-pulse">{status}</div>
        {status.startsWith('Error') && <div className="text-red-500 text-xs px-4 text-center">{status}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-200">
      <div className="bg-white border-b shadow-sm p-2 flex items-center justify-between z-20 px-4">
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-700">Trace Monkey</span>
          <span className="text-sm text-gray-400 border-l pl-4">
            {pageCount} Pages • Worker Renderer (High-Level)
          </span>
        </div>
        
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded shadow-sm text-gray-600 font-bold"
          >
            -
          </button>
          <span className="w-16 text-center text-sm font-mono text-gray-600">
            {(scale * 100).toFixed(0)}%
          </span>
          <button 
            onClick={() => setScale(s => Math.min(3.0, s + 0.1))}
            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded shadow-sm text-gray-600 font-bold"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="flex flex-col items-center gap-8 py-8 min-h-full">
          {pdfium && document && Array.from({ length: pageCount }).map((_, i) => (
            <WorkerPage 
              key={i}
              index={i}
              document={document}
              width={pageSize.width}
              height={pageSize.height}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}