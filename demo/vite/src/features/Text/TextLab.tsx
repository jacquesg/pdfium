import { useEffect, useState } from 'react';
import type { PDFiumPage, RenderResult } from '@scaryterry/pdfium/browser';
import { usePDFium } from '../../hooks/usePDFium';
import { PDFCanvas } from '../../components/PDFCanvas';
import { TextLayer } from '../../components/TextLayer';

export function TextLab() {
  const { pdfium, document: doc, loadDocument, documentName, error: contextError } = usePDFium();
  const [pageIndex] = useState(0);
  const [scale] = useState(1.5);
  
  const [page, setPage] = useState<PDFiumPage | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Force load Reference PDF (TraceMonkey) for this lab
  useEffect(() => {
    if (!pdfium) return;

    // If we haven't loaded reference.pdf yet, load it.
    // This overrides the default sample.pdf loaded by the provider.
    if (documentName !== 'reference.pdf') {
      const loadRef = async () => {
        try {
          const res = await fetch('/reference.pdf');
          if (!res.ok) throw new Error('Failed to fetch reference.pdf');
          const data = await res.arrayBuffer();
          await loadDocument(data, 'reference.pdf');
        } catch (e) {
          console.error('TextLab: Failed to load reference PDF', e);
        }
      };
      loadRef();
    }
  }, [pdfium, documentName, loadDocument]);

  useEffect(() => {
    if (!doc || documentName !== 'reference.pdf') return;

    // Reset
    setPage(null);
    setResult(null);
    setRenderLoading(true);

    let active = true;

    try {
      const p = doc.getPage(pageIndex);
      if (!active) return;
      
      setPage(p);

      // Render
      const res = p.render({ scale });
      if (active) {
        setResult(res);
        setRenderLoading(false);
      }
    } catch (e) {
      console.error(e);
      if (active) {
        setRenderError('Render failed');
        setRenderLoading(false);
      }
    }
    
    return () => { active = false; };
  }, [doc, documentName, pageIndex, scale]);

  return (
    <div className="flex flex-col h-full bg-gray-100 p-8 items-center overflow-auto">
      <div className="bg-white p-4 rounded shadow mb-4 max-w-2xl w-full text-center">
        <h2 className="text-xl font-bold mb-2">Text Selection Layer</h2>
        <p className="text-gray-600 text-sm">
          Select the text below exactly like a standard web page. 
          An invisible DOM layer is synchronized with the canvas bitmap.
        </p>
        <div className="mt-2 text-xs text-blue-600 font-mono">
          Document: {documentName || 'Loading...'}
        </div>
      </div>

      <div className="relative shadow-lg border border-gray-200 bg-white min-w-[200px] min-h-[200px] flex items-center justify-center cursor-text">
        {!pdfium && (
          <div className="text-gray-500">Loading Engine...</div>
        )}
        
        {pdfium && (!doc || documentName !== 'reference.pdf') && !contextError && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-gray-500">Switching to TraceMonkey...</div>
          </div>
        )}

        {contextError && (
          <div className="text-red-500 p-4 text-center">
            <div className="font-bold">Context Error</div>
            {contextError.message}
          </div>
        )}

        {renderLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div className="animate-spin text-2xl">⚙️</div>
          </div>
        )}
        
        {renderError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-white z-20">
            {renderError}
          </div>
        )}

        {/* 1. Canvas Layer (Visuals) */}
        {result && (
          <PDFCanvas 
            width={result.width} 
            height={result.height} 
            data={result.data} 
          />
        )}

        {/* 2. Text Layer (Selection) */}
        {page && result && (
          <TextLayer 
            page={page}
            scale={scale}
            width={result.width}
            height={result.height}
            originalHeight={page.height}
          />
        )}
      </div>
    </div>
  );
}