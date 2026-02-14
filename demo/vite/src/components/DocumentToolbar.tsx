import { Moon, Sun } from 'lucide-react';
import { useCallback, useState } from 'react';
import { applyPDFiumTheme } from '@scaryterry/pdfium/react';
import type { SamplePdf } from '../data/samplePdfs';
import { usePDFium } from '../hooks/usePDFium';
import { FilePicker } from './FilePicker';
import { SamplePicker } from './SamplePicker';
import type { NavItem } from './Sidebar';

interface DocumentToolbarProps {
  activeNav: NavItem;
}

export function DocumentToolbar({ activeNav }: DocumentToolbarProps) {
  const { document: pdfDoc, documentName, loadDocument, loadDocumentFromUrl } = usePDFium();
  const [isDark, setIsDark] = useState(false);

  const handleSampleSelect = useCallback(
    async (sample: SamplePdf) => {
      await loadDocumentFromUrl(`/samples/${sample.filename}`, sample.filename);
    },
    [loadDocumentFromUrl],
  );

  const toggleDarkMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      applyPDFiumTheme(next ? 'dark' : 'light');
      globalThis.document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  return (
    <header className="h-14 border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3 pl-10 lg:pl-0 min-w-0">
        {pdfDoc ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
            <span className="font-mono text-gray-900 dark:text-gray-100">{documentName}</span>
            <span className="mx-1.5 text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{pdfDoc.pageCount}</span>{' '}
            {pdfDoc.pageCount === 1 ? 'page' : 'pages'}
          </span>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">No document loaded</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </button>
        <SamplePicker onSelect={handleSampleSelect} currentFilename={documentName} activeNav={activeNav} />
        <FilePicker onFileSelect={loadDocument} label="Upload PDF" />
      </div>
    </header>
  );
}
