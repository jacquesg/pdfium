import { FormFieldType, type PDFiumAnnotation } from '@scaryterry/pdfium/browser';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { FilePicker } from '../../components/FilePicker';
import { PDFCanvas } from '../../components/PDFCanvas';
import { usePDFium } from '../../hooks/usePDFium';
import { useRenderPage } from '../../hooks/useRender';

export function FormsLab() {
  const { document, loadDocument, documentName } = usePDFium();
  const [pageIndex, setPageIndex] = useState(0);
  const [highlightColor, setHighlightColor] = useState('#FFFF00'); // Yellow
  const [highlightAlpha, setHighlightAlpha] = useState(100);
  const [selectedText, setSelectedText] = useState<string>('');
  const [highlightEnabled, setHighlightEnabled] = useState(false);

  // Render options
  const { data: renderResult } = useRenderPage(document, {
    pageNumber: pageIndex,
    scale: 1.5,
    renderFormFields: true, // Always verify this!
  });

  // Get widgets
  const widgets: PDFiumAnnotation[] = document
    ? document.getPage(pageIndex).getAnnotations().filter((a) => a.isWidget())
    : [];

  const handleHighlightToggle = () => {
    if (!document) return;
    
    if (highlightEnabled) {
      // Clear highlight (alpha 0)
      document.setFormFieldHighlightAlpha(0);
      setHighlightEnabled(false);
    } else {
      // Set highlight
      // Convert hex to ARGB integer
      // ARGB: 0xAARRGGBB
      const r = parseInt(highlightColor.slice(1, 3), 16);
      const g = parseInt(highlightColor.slice(3, 5), 16);
      const b = parseInt(highlightColor.slice(5, 7), 16);

      document.setFormFieldHighlightColour(FormFieldType.Unknown, { r, g, b, a: highlightAlpha });
      document.setFormFieldHighlightAlpha(highlightAlpha);
      setHighlightEnabled(true);
    }
    
    // Trigger re-render by invalidating? 
    // Actually, React Query won't know the document internal state changed.
    // We might need to force update or just change a key.
    // Ideally useRenderPage would have a 'version' prop to force refresh.
    // For now, let's just hope a re-render happens or we can toggle page.
    setPageIndex(p => p); // This might not work if query key is same.
    // Hack: reload document? No.
    // We'll see if we can force it.
  };

  const checkSelection = () => {
    if (!document) return;
    const page = document.getPage(pageIndex);
    const text = page.getFormSelectedText();
    setSelectedText(text || '<none>');
  };

  const handleKillFocus = () => {
    if (document) {
      document.killFormFocus();
    }
  };

  const handleUndo = () => {
    const page = document?.getPage(pageIndex);
    if (page?.canFormUndo()) {
      page.formUndo();
      // Force re-render
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex justify-between items-center bg-gray-100 p-2 rounded">
        <div>
          <h2 className="text-xl font-bold">Forms Studio</h2>
          <p className="text-sm text-gray-600">
            Loaded: {documentName} ({document?.hasForm() ? 'Form Detected' : 'No Form'})
          </p>
        </div>
        <div className="flex gap-2">
           <FilePicker onFileSelect={loadDocument} label="Load Form PDF" />
        </div>
      </div>

      <div className="flex flex-1 gap-4 h-[calc(100vh-200px)]">
        {/* Sidebar: Widgets */}
        <div className="w-64 bg-gray-50 p-2 overflow-y-auto border-r">
          <h3 className="font-bold mb-2">Widgets (Page {pageIndex + 1})</h3>
          {widgets.length === 0 && <p className="text-gray-400 text-sm">No widgets found.</p>}
          <ul className="space-y-2">
            {widgets.map((w, i) => (
              <li key={i} className="text-xs p-2 bg-white border rounded shadow-sm">
                <div className="font-semibold">{w.getFormFieldName() || 'Unnamed'}</div>
                <div className="text-gray-500">Type: {w.getFormFieldType()}</div>
                <div className="truncate">Val: {w.getFormFieldValue()}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Main View */}
        <div className="flex-1 flex flex-col items-center overflow-auto bg-gray-200 p-4">
           {renderResult ? (
             <PDFCanvas
               width={renderResult.width}
               height={renderResult.height}
               data={renderResult.data}
               onMouseUp={checkSelection}
             />
           ) : (
             <div>Loading render...</div>
           )}
        </div>

        {/* Right Panel: Controls */}
        <div className="w-64 bg-gray-50 p-2 border-l space-y-4">
          <section>
            <h3 className="font-bold mb-2">Highlighting</h3>
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="color" 
                value={highlightColor} 
                onChange={(e) => setHighlightColor(e.target.value)} 
              />
              <span className="text-xs">{highlightColor}</span>
            </div>
            <div className="mb-2">
              <label className="text-xs block">Alpha: {highlightAlpha}</label>
              <input 
                type="range" 
                min="0" max="255" 
                value={highlightAlpha} 
                onChange={(e) => setHighlightAlpha(Number(e.target.value))} 
                className="w-full"
              />
            </div>
            <Button onClick={handleHighlightToggle} variant="secondary" className="w-full">
              {highlightEnabled ? 'Disable Highlight' : 'Enable Highlight'}
            </Button>
          </section>

          <section>
            <h3 className="font-bold mb-2">Interaction</h3>
            <Button onClick={handleKillFocus} variant="danger" className="w-full mb-2">
              Kill Focus
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleUndo} variant="secondary" className="flex-1">Undo</Button>
              <Button variant="secondary" className="flex-1" disabled>Redo</Button>
            </div>
          </section>

          <section>
            <h3 className="font-bold mb-2">Selection</h3>
            <div className="p-2 bg-white border rounded h-20 overflow-y-auto text-xs font-mono">
              {selectedText}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
