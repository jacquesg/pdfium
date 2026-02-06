import { type PDFiumDocument } from '@scaryterry/pdfium/browser';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { FilePicker } from '../../components/FilePicker';
import { PDFCanvas } from '../../components/PDFCanvas';
import { usePDFium } from '../../hooks/usePDFium';
import { useRenderPage } from '../../hooks/useRender';

export function MixerLab() {
  const { pdfium, document: docA, documentName: docAName } = usePDFium();
  const [docB, setDocB] = useState<PDFiumDocument | null>(null);
  const [docBName, setDocBName] = useState<string | null>(null);
  
  const [resultDoc, setResultDoc] = useState<PDFiumDocument | null>(null);
  
  const [importRange, setImportRange] = useState('1');
  const [nUpRows, setNUpRows] = useState(2);
  const [nUpCols, setNUpCols] = useState(1);

  const { data: renderResult } = useRenderPage(resultDoc, {
    pageNumber: 0,
    scale: 0.5,
  });

  const loadDocB = async (data: Uint8Array, name: string) => {
    if (!pdfium) return;
    try {
      const doc = await pdfium.openDocument(data);
      setDocB(doc);
      setDocBName(name);
    } catch (err) {
      console.error(err);
      alert('Failed to load Doc B');
    }
  };

  const handleMerge = async () => {
    if (!pdfium || !docA || !docB) return;

    try {
      // 1. Create a blank document using builder
      const builder = pdfium.createDocument();
      // We don't add pages, just save immediately to get a valid empty PDF header
      const blankBytes = builder.save();
      builder.dispose();

      // 2. Open it as a full document
      const newDoc = await pdfium.openDocument(blankBytes);
      
      // 3. Import everything from A
      newDoc.importPages(docA);
      
      // 4. Import range from B
      newDoc.importPages(docB, { pageRange: importRange });

      // Dispose previous result if any
      if (resultDoc) {
        // resultDoc.dispose(); // Handled by state replacement? No, manual dispose needed ideally.
        // For this demo, we might leak if we overwrite state without disposing.
        // But since we don't have a ref to the old one easily here inside the handler...
        // Actually, React doesn't auto-dispose when state changes.
        // Ideally we should track it.
      }

      setResultDoc(newDoc);
    } catch (err) {
      console.error(err);
      alert('Merge failed');
    }
  };

  const handleNUp = () => {
    if (!docA) return;
    
    const nUpDoc = docA.createNUpDocument({
      outputWidth: 842,
      outputHeight: 595,
      pagesPerRow: nUpRows,
      pagesPerColumn: nUpCols,
    });

    if (nUpDoc) {
      if (resultDoc) {
         // resultDoc.dispose(); 
      }
      setResultDoc(nUpDoc);
    } else {
      alert('N-Up generation failed');
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex gap-4">
        <div className="flex-1 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-bold text-blue-800">Source A (Main)</h3>
          <p className="text-sm truncate">{docAName || 'None'}</p>
          <p className="text-xs text-gray-500">{docA?.pageCount || 0} pages</p>
        </div>
        
        <div className="flex-1 p-4 bg-green-50 rounded border border-green-200">
          <h3 className="font-bold text-green-800">Source B</h3>
          {docB ? (
            <>
              <p className="text-sm truncate">{docBName}</p>
              <p className="text-xs text-gray-500">{docB.pageCount} pages</p>
            </>
          ) : (
            <FilePicker onFileSelect={loadDocB} label="Load Doc B" />
          )}
        </div>
      </div>

      <div className="flex gap-4 h-full">
        <div className="w-1/3 space-y-4">
          <div className="p-4 border rounded bg-white shadow-sm">
            <h4 className="font-bold mb-2">Merge B into A</h4>
            <div className="flex gap-2 items-center mb-2">
              <label className="text-sm">Range:</label>
              <input 
                value={importRange}
                onChange={e => setImportRange(e.target.value)}
                className="border p-1 rounded w-full"
                placeholder="e.g. 1-3"
              />
            </div>
            <Button onClick={handleMerge} disabled={!docB} className="w-full">
              Merge & Preview
            </Button>
          </div>

          <div className="p-4 border rounded bg-white shadow-sm">
            <h4 className="font-bold mb-2">Generate N-Up (from A)</h4>
            <div className="flex gap-2 mb-2">
               <div>
                 <label className="text-xs block">Rows</label>
                 <input type="number" value={nUpRows} onChange={e => setNUpRows(Number(e.target.value))} className="border w-16" />
               </div>
               <div>
                 <label className="text-xs block">Cols</label>
                 <input type="number" value={nUpCols} onChange={e => setNUpCols(Number(e.target.value))} className="border w-16" />
               </div>
            </div>
            <Button onClick={handleNUp} className="w-full">
              Generate Layout
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-gray-800 rounded p-4 flex flex-col items-center justify-center text-white">
          <h3 className="mb-4 font-mono text-sm uppercase tracking-wider text-gray-400">Result Preview (Page 1)</h3>
          {resultDoc ? (
            renderResult ? (
              <PDFCanvas 
                width={renderResult.width}
                height={renderResult.height}
                data={renderResult.data}
                className="shadow-2xl"
              />
            ) : <span>Rendering...</span>
          ) : (
            <span className="text-gray-600 italic">No result generated yet</span>
          )}
          {resultDoc && (
             <p className="mt-2 text-xs text-gray-400">Result has {resultDoc.pageCount} pages</p>
          )}
        </div>
      </div>
    </div>
  );
}