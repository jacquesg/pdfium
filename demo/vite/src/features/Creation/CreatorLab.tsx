import { useState } from 'react';
import { Button } from '../../components/Button';
import { PDFCanvas } from '../../components/PDFCanvas';
import { usePDFium } from '../../hooks/usePDFium';
import { useRenderPage } from '../../hooks/useRender';
import { type PDFiumDocument } from '@scaryterry/pdfium/browser';

interface TextObj {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

interface RectObj {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string; // Hex
}

type PageObj = TextObj | RectObj;

export function CreatorLab() {
  const { pdfium } = usePDFium();
  const [objects, setObjects] = useState<PageObj[]>([]);
  const [previewDoc, setPreviewDoc] = useState<PDFiumDocument | null>(null);
  
  // Inputs
  const [addType, setAddType] = useState<'text' | 'rect'>('text');
  const [inputText, setInputText] = useState('Hello PDF');
  const [inputX, setInputX] = useState(100);
  const [inputY, setInputY] = useState(700);
  const [inputSize, setInputSize] = useState(24);
  const [inputW, setInputW] = useState(200);
  const [inputH, setInputH] = useState(100);
  const [inputColor, setInputColor] = useState('#0000FF');

  const { data: renderResult } = useRenderPage(previewDoc, {
    pageNumber: 0,
    scale: 1,
  });

  const addObject = () => {
    const id = Math.random().toString(36).substr(2, 9);
    if (addType === 'text') {
      setObjects([...objects, { id, type: 'text', text: inputText, x: inputX, y: inputY, fontSize: inputSize }]);
    } else {
      setObjects([...objects, { id, type: 'rect', x: inputX, y: inputY, w: inputW, h: inputH, color: inputColor }]);
    }
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, a: 255 };
  };

  const generatePDF = async () => {
    if (!pdfium) return;

    try {
      // Create builder
      const builder = pdfium.createDocument();
      const font = builder.loadStandardFont('Helvetica');
      
      // Add page (A4)
      const page = builder.addPage({ width: 595, height: 842 });

      for (const obj of objects) {
        if (obj.type === 'text') {
          page.addText(obj.text, obj.x, obj.y, font, obj.fontSize);
        } else {
          page.addRectangle(obj.x, obj.y, obj.w, obj.h, {
            fill: hexToRgb(obj.color)
          });
        }
      }

      const bytes = builder.save();
      builder.dispose();

      // Open for preview
      if (previewDoc) previewDoc.dispose();
      const doc = await pdfium.openDocument(bytes);
      setPreviewDoc(doc);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    }
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Controls */}
      <div className="w-80 bg-gray-50 p-4 border rounded overflow-y-auto">
        <h3 className="font-bold mb-4">PDF Creator</h3>
        
        <div className="bg-white p-3 rounded border mb-4">
          <h4 className="text-sm font-semibold mb-2">Add Object</h4>
          <div className="flex gap-2 mb-2">
            <Button 
              variant={addType === 'text' ? 'primary' : 'secondary'} 
              onClick={() => setAddType('text')} 
              className="flex-1 text-xs"
            >
              Text
            </Button>
            <Button 
              variant={addType === 'rect' ? 'primary' : 'secondary'} 
              onClick={() => setAddType('rect')} 
              className="flex-1 text-xs"
            >
              Rectangle
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs">X</label>
                <input type="number" value={inputX} onChange={e => setInputX(+e.target.value)} className="border w-full p-1" />
              </div>
              <div className="flex-1">
                <label className="block text-xs">Y</label>
                <input type="number" value={inputY} onChange={e => setInputY(+e.target.value)} className="border w-full p-1" />
              </div>
            </div>

            {addType === 'text' ? (
              <>
                <div>
                  <label className="block text-xs">Content</label>
                  <input value={inputText} onChange={e => setInputText(e.target.value)} className="border w-full p-1" />
                </div>
                <div>
                  <label className="block text-xs">Size</label>
                  <input type="number" value={inputSize} onChange={e => setInputSize(+e.target.value)} className="border w-full p-1" />
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs">Width</label>
                    <input type="number" value={inputW} onChange={e => setInputW(+e.target.value)} className="border w-full p-1" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs">Height</label>
                    <input type="number" value={inputH} onChange={e => setInputH(+e.target.value)} className="border w-full p-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs">Color</label>
                  <input type="color" value={inputColor} onChange={e => setInputColor(e.target.value)} className="w-full h-8 cursor-pointer" />
                </div>
              </>
            )}
            
            <Button onClick={addObject} className="w-full mt-2">Add to List</Button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-semibold">Object List</h4>
          {objects.length === 0 && <p className="text-xs text-gray-500">No objects added.</p>}
          {objects.map(obj => (
            <div key={obj.id} className="text-xs p-2 bg-white border flex justify-between items-center">
              <span>{obj.type === 'text' ? `Text: "${obj.text}"` : 'Rectangle'}</span>
              <button 
                onClick={() => setObjects(objects.filter(o => o.id !== obj.id))}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <Button onClick={generatePDF} variant="primary" className="w-full py-2 bg-green-600 hover:bg-green-700">
          Generate & Preview
        </Button>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-gray-200 flex items-center justify-center overflow-auto p-4">
        {renderResult ? (
          <PDFCanvas 
            width={renderResult.width} 
            height={renderResult.height} 
            data={renderResult.data} 
            className="shadow-xl"
          />
        ) : (
          <div className="text-gray-500">Preview will appear here</div>
        )}
      </div>
    </div>
  );
}
