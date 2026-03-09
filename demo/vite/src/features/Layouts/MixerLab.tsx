import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { DocPanel } from '../../components/DocPanel';
import { DownloadButton } from '../../components/DownloadButton';
import { FilePicker } from '../../components/FilePicker';
import { PDFCanvas } from '../../components/PDFCanvas';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { ResponsiveSidebar } from '../../components/ResponsiveSidebar';
import { usePDFium } from '../../hooks/usePDFium';
import type { DemoPDFiumDocument } from '../../hooks/pdfium-provider.types';
import { useRenderPage } from '@scaryterry/pdfium/react';

export function MixerLab() {
  const { instance: workerPdfium, document: docA, documentName: docAName } = usePDFium();
  const syncPdfium = workerPdfium;
  const [docB, setDocB] = useState<DemoPDFiumDocument | null>(null);
  const docBRef = useRef<DemoPDFiumDocument | null>(null);
  const [docBName, setDocBName] = useState<string | null>(null);

  const [resultDoc, setResultDoc] = useState<DemoPDFiumDocument | null>(null);
  const resultDocRef = useRef<DemoPDFiumDocument | null>(null);
  const [mixerError, setMixerError] = useState<string | null>(null);

  // Dispose docB and resultDoc on unmount
  useEffect(() => {
    return () => {
      void docBRef.current?.dispose();
      docBRef.current = null;
      void resultDocRef.current?.dispose();
      resultDocRef.current = null;
    };
  }, []);

  const replaceResultDoc = (newDoc: DemoPDFiumDocument) => {
    void resultDocRef.current?.dispose();
    resultDocRef.current = newDoc;
    setResultDoc(newDoc);
  };

  const [importRange, setImportRange] = useState('1');
  const [nUpRows, setNUpRows] = useState(2);
  const [nUpCols, setNUpCols] = useState(1);

  const { renderKey, width: renderWidth, height: renderHeight } = useRenderPage(resultDoc, 0, {
    scale: 0.5,
  });

  const loadDocB = async (data: Uint8Array, name: string) => {
    if (!workerPdfium) return;
    try {
      void docBRef.current?.dispose();
      const doc = await workerPdfium.openDocument(data);
      docBRef.current = doc;
      setDocB(doc);
      setDocBName(name);
      setMixerError(null);
    } catch (err) {
      console.error(err);
      setMixerError('Failed to load Doc B');
    }
  };

  const handleMerge = async () => {
    if (!workerPdfium || !syncPdfium || !docA || !docB) return;

    try {
      await using builder = await syncPdfium.createDocumentBuilder();
      const blankBytes = await builder.save();
      const newDoc = await workerPdfium.openDocument(blankBytes);
      await newDoc.importPages(docA);
      await newDoc.importPages(docB, { pageRange: importRange });
      replaceResultDoc(newDoc);
      setMixerError(null);
    } catch (err) {
      console.error(err);
      setMixerError(err instanceof Error ? err.message : 'Merge failed');
    }
  };

  const handleNUp = async () => {
    if (!docA) return;

    try {
      const nUpDoc = await docA.createNUp({
        outputWidth: 842,
        outputHeight: 595,
        pagesPerRow: nUpRows,
        pagesPerColumn: nUpCols,
      });

      if (nUpDoc) {
        replaceResultDoc(nUpDoc);
        setMixerError(null);
      } else {
        setMixerError('N-Up generation returned no result');
      }
    } catch (err) {
      setMixerError(err instanceof Error ? err.message : 'N-Up generation failed');
    }
  };

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar: Sources & Controls ──────────────────────── */}
      <ResponsiveSidebar side="left" breakpoint="md" label="Mixer Controls" className="w-80 bg-gray-50 border-r flex flex-col overflow-hidden">
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {/* Source A */}
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-800 text-sm">Source A (Main)</h3>
            <p className="text-xs truncate">{docAName || 'None'}</p>
            <p className="text-xs text-gray-500">{docA?.pageCount || 0} pages</p>
          </div>

          {/* Source B */}
          <div className="p-3 bg-green-50 rounded border border-green-200">
            <h3 className="font-semibold text-green-800 text-sm">Source B</h3>
            {docB ? (
              <>
                <p className="text-xs truncate">{docBName}</p>
                <p className="text-xs text-gray-500">{docB.pageCount} pages</p>
              </>
            ) : (
              <FilePicker onFileSelect={loadDocB} label="Load Doc B" />
            )}
          </div>

          {mixerError && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{mixerError}</span>
                <button onClick={() => setMixerError(null)} className="text-red-600 hover:text-red-800 font-bold">&times;</button>
              </AlertDescription>
            </Alert>
          )}

          {/* Merge Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Merge B into A</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-center mb-2">
                <label className="text-xs">Range:</label>
                <input
                  value={importRange}
                  onChange={e => setImportRange(e.target.value)}
                  className="border p-1 rounded w-full text-xs"
                  placeholder="e.g. 1-3"
                />
              </div>
              <Button onClick={handleMerge} disabled={!docB || !syncPdfium} className="w-full text-xs">
                Merge & Preview
              </Button>
            </CardContent>
          </Card>

          {/* N-Up Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Generate N-Up (from A)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2">
                <div>
                  <label className="text-xs block">Pages/Row</label>
                  <input type="number" value={nUpRows} onChange={e => setNUpRows(Number(e.target.value))} className="border w-16 text-xs p-1" />
                </div>
                <div>
                  <label className="text-xs block">Pages/Col</label>
                  <input type="number" value={nUpCols} onChange={e => setNUpCols(Number(e.target.value))} className="border w-16 text-xs p-1" />
                </div>
              </div>
              <Button onClick={handleNUp} className="w-full text-xs">
                Generate Layout
              </Button>
            </CardContent>
          </Card>
        </div>
      </ResponsiveSidebar>

      {/* ── Centre: Result Preview ────────────────────────────────── */}
      <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center overflow-auto p-4">
        <h3 className="mb-4 font-mono text-sm uppercase tracking-wider text-gray-400">Result Preview (Page 1)</h3>
        {resultDoc ? (
          renderKey ? (
            <PDFCanvas
              width={renderWidth ?? 0}
              height={renderHeight ?? 0}
              renderKey={renderKey}
              className="shadow-2xl"
            />
          ) : (
            <div role="status" className="flex flex-col items-center gap-2">
              <Skeleton className="w-48 h-64 rounded bg-gray-700" />
              <span className="text-gray-400 text-xs animate-pulse">Rendering...</span>
            </div>
          )
        ) : (
          <span className="text-sm text-gray-500 italic">No result generated yet</span>
        )}
        {resultDoc && (
          <div className="mt-2 flex items-center gap-4">
            <p className="text-xs text-gray-400">Result has {resultDoc.pageCount} pages</p>
            <DownloadButton document={resultDoc} filename="merged.pdf" />
          </div>
        )}
      </div>

      {/* ── Right Sidebar: Documentation ──────────────────────────── */}
      <ResponsiveSidebar side="right" breakpoint="lg" label="Documentation" className="w-72 bg-white border-l overflow-y-auto p-3">
        <DocPanel
          title="Document Mixer"
          apis={['importPages()', 'importPagesByIndex()', 'createNUp()', 'copyViewerPreferences()', 'save()']}
          snippet={'const merged = await pdfium.openDocument(blankBytes);\nawait merged.importPages(source, { pageRange: \'1-3\' });\nconst nup = await source.createNUp({ pagesPerRow: 2, pagesPerColumn: 2 });'}
          description="Merge PDF documents, import specific page ranges, and create N-up layouts (multiple pages per sheet). Download the result."
        />
      </ResponsiveSidebar>
    </div>
  );
}
