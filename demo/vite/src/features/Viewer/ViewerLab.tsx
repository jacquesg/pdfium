import { Settings } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DefaultToolbar, type PanelId, PDFViewer, usePDFViewer } from '@scaryterry/pdfium/react';
import { DownloadButton } from '../../components/DownloadButton';
import { usePDFium } from '../../hooks/usePDFium';
import { ThemePanel } from './ThemePanel';

const ALL_PANELS: readonly PanelId[] = [
  'thumbnails',
  'bookmarks',
  'annotations',
  'objects',
  'forms',
  'text',
  'structure',
  'attachments',
  'links',
  'info',
];

function ViewerExtras() {
  const { viewer } = usePDFViewer();
  const { documentName } = usePDFium();

  return <DownloadButton document={viewer.document} filename={documentName ?? 'document.pdf'} />;
}

export function ViewerLab() {
  const [themeOpen, setThemeOpen] = useState(false);
  const toggleTheme = useCallback(() => setThemeOpen((v) => !v), []);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <PDFViewer panels={ALL_PANELS} initialPanel="thumbnails">
          <DefaultToolbar>
            <ViewerExtras />
          </DefaultToolbar>
        </PDFViewer>
      </div>

      {/* Theme panel toggle (desktop only) */}
      <button
        type="button"
        onClick={toggleTheme}
        className="hidden lg:flex items-center justify-center w-8 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0 cursor-pointer"
        title={themeOpen ? 'Close theme panel' : 'Open theme panel'}
        aria-label={themeOpen ? 'Close theme panel' : 'Open theme panel'}
        aria-expanded={themeOpen}
      >
        <Settings size={14} strokeWidth={2} />
      </button>

      <div
        className="hidden lg:block overflow-hidden transition-all duration-200 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        style={{ width: themeOpen ? '16rem' : '0px', borderLeftWidth: themeOpen ? undefined : 0 }}
      >
        <div className="w-64 p-3 overflow-y-auto h-full">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Theme Variables</h3>
          <ThemePanel />
        </div>
      </div>
    </div>
  );
}
