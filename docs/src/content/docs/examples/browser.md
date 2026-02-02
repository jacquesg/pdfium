---
title: Browser Examples
description: Browser and React examples for @scaryterry/pdfium
---

This page provides complete browser examples including vanilla JavaScript and React.

## Vanilla JavaScript

### Basic PDF Viewer

```html
<!DOCTYPE html>
<html>
<head>
  <title>PDF Viewer</title>
  <style>
    #container { max-width: 800px; margin: 0 auto; padding: 20px; }
    #canvas { border: 1px solid #ccc; max-width: 100%; }
    #controls { margin: 10px 0; }
    button { padding: 8px 16px; margin-right: 8px; }
    #page-info { display: inline-block; margin: 0 16px; }
  </style>
</head>
<body>
  <div id="container">
    <input type="file" id="file-input" accept=".pdf" />
    <div id="controls" style="display: none;">
      <button id="prev-btn">Previous</button>
      <span id="page-info">Page 1 of 1</span>
      <button id="next-btn">Next</button>
    </div>
    <canvas id="canvas"></canvas>
  </div>

  <script type="module">
    import { PDFium } from 'https://esm.sh/@scaryterry/pdfium';

    let pdfium;
    let document;
    let currentPage = 0;
    const canvas = window.canvas;
    const ctx = canvas.getContext('2d');

    // Initialise PDFium
    async function init() {
      const wasmResponse = await fetch('/pdfium.wasm');
      const wasmBinary = await wasmResponse.arrayBuffer();
      pdfium = await PDFium.init({ wasmBinary });
    }

    // Load PDF file
    async function loadPDF(file) {
      const data = await file.arrayBuffer();

      if (document) {
        document.dispose();
      }

      document = await pdfium.openDocument(data);
      currentPage = 0;
      renderPage();

      controls.style.display = 'block';
    }

    // Render current page
    function renderPage() {
      const page = document.getPage(currentPage);

      try {
        const scale = Math.min(
          (container.clientWidth - 40) / page.width,
          2
        );

        const { data, width, height } = page.render({ scale });

        canvas.width = width;
        canvas.height = height;

        const imageData = new ImageData(
          new Uint8ClampedArray(data),
          width,
          height
        );
        ctx.putImageData(imageData, 0, 0);

        pageInfo.textContent = `Page ${currentPage + 1} of ${document.pageCount}`;
      } finally {
        page.dispose();
      }
    }

    // Navigation
    prevBtn.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        renderPage();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentPage < document.pageCount - 1) {
        currentPage++;
        renderPage();
      }
    });

    // File input
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        loadPDF(file);
      }
    });

    // Initialise
    init().catch(console.error);
  </script>
</body>
</html>
```

## React Examples

### PDF Viewer Component

```tsx
import { useEffect, useRef, useState } from 'react';
import { PDFium, PDFiumDocument } from '@scaryterry/pdfium';

interface PDFViewerProps {
  pdfData: ArrayBuffer;
  scale?: number;
}

export function PDFViewer({ pdfData, scale = 2 }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfium, setPdfium] = useState<PDFium | null>(null);
  const [document, setDocument] = useState<PDFiumDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialise PDFium
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const response = await fetch('/pdfium.wasm');
        const wasmBinary = await response.arrayBuffer();
        const instance = await PDFium.init({ wasmBinary });

        if (mounted) {
          setPdfium(instance);
        } else {
          instance.dispose();
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to initialise PDF library');
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Load document when pdfData changes
  useEffect(() => {
    if (!pdfium || !pdfData) return;

    let doc: PDFiumDocument | null = null;

    async function loadDocument() {
      try {
        setLoading(true);
        doc = await pdfium.openDocument(pdfData);
        setDocument(doc);
        setCurrentPage(0);
        setError(null);
      } catch (err) {
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    }

    loadDocument();

    return () => {
      doc?.dispose();
    };
  }, [pdfium, pdfData]);

  // Render page
  useEffect(() => {
    if (!document || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const page = document.getPage(currentPage);

    try {
      const { data, width, height } = page.render({ scale });

      canvas.width = width;
      canvas.height = height;

      const imageData = new ImageData(
        new Uint8ClampedArray(data),
        width,
        height
      );
      ctx.putImageData(imageData, 0, 0);
    } finally {
      page.dispose();
    }
  }, [document, currentPage, scale]);

  // Cleanup
  useEffect(() => {
    return () => {
      document?.dispose();
      pdfium?.dispose();
    };
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="pdf-viewer">
      <div className="controls">
        <button
          onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          Previous
        </button>
        <span>
          Page {currentPage + 1} of {document?.pageCount ?? 0}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min((document?.pageCount ?? 1) - 1, p + 1))}
          disabled={currentPage >= (document?.pageCount ?? 1) - 1}
        >
          Next
        </button>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}
```

### File Upload Component

```tsx
import { useState } from 'react';
import { PDFViewer } from './PDFViewer';

export function PDFUploader() {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const data = await file.arrayBuffer();
      setPdfData(data);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
      />

      {pdfData && <PDFViewer pdfData={pdfData} />}
    </div>
  );
}
```

### PDF Text Extractor

```tsx
import { useState } from 'react';
import { PDFium } from '@scaryterry/pdfium';

interface ExtractedPage {
  index: number;
  text: string;
}

export function PDFTextExtractor() {
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setPages([]);

    try {
      const response = await fetch('/pdfium.wasm');
      const wasmBinary = await response.arrayBuffer();

      using pdfium = await PDFium.init({ wasmBinary });

      const data = await file.arrayBuffer();
      using document = await pdfium.openDocument(data);

      const extracted: ExtractedPage[] = [];

      for (const page of document.pages()) {
        using p = page;
        extracted.push({
          index: p.index,
          text: p.getText(),
        });
      }

      setPages(extracted);
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={loading}
      />

      {loading && <p>Extracting text...</p>}

      {pages.map((page) => (
        <div key={page.index} className="page-text">
          <h3>Page {page.index + 1}</h3>
          <pre>{page.text}</pre>
        </div>
      ))}
    </div>
  );
}
```

### Custom Hook

```tsx
import { useEffect, useState, useCallback } from 'react';
import { PDFium, PDFiumDocument } from '@scaryterry/pdfium';

interface UsePDFOptions {
  wasmUrl?: string;
}

interface UsePDFResult {
  document: PDFiumDocument | null;
  pageCount: number;
  loading: boolean;
  error: Error | null;
  loadPDF: (data: ArrayBuffer, password?: string) => Promise<void>;
}

export function usePDF(options: UsePDFOptions = {}): UsePDFResult {
  const [pdfium, setPdfium] = useState<PDFium | null>(null);
  const [document, setDocument] = useState<PDFiumDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialise PDFium
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const url = options.wasmUrl ?? '/pdfium.wasm';
        const response = await fetch(url);
        const wasmBinary = await response.arrayBuffer();
        const instance = await PDFium.init({ wasmBinary });

        if (mounted) {
          setPdfium(instance);
          setLoading(false);
        } else {
          instance.dispose();
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      pdfium?.dispose();
    };
  }, [options.wasmUrl]);

  // Load PDF
  const loadPDF = useCallback(async (data: ArrayBuffer, password?: string) => {
    if (!pdfium) {
      throw new Error('PDFium not initialised');
    }

    // Close existing document
    document?.dispose();

    try {
      const doc = await pdfium.openDocument(data, { password });
      setDocument(doc);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setDocument(null);
      throw err;
    }
  }, [pdfium, document]);

  return {
    document,
    pageCount: document?.pageCount ?? 0,
    loading,
    error,
    loadPDF,
  };
}
```

## Download Generated PDF

```typescript
function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Usage
const bytes = document.save();
downloadPDF(bytes, 'output.pdf');
```

## See Also

- [Node.js Examples](/pdfium/examples/nodejs/) — Server-side examples
- [Patterns](/pdfium/examples/patterns/) — Common patterns
- [Worker Mode](/pdfium/guides/worker-mode/) — Off-main-thread processing
