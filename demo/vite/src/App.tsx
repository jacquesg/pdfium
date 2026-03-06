import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { DocumentToolbar } from './components/DocumentToolbar';
import { DragDropZone } from './components/DragDropZone';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FilePicker } from './components/FilePicker';
import { PasswordDialog } from './components/PasswordDialog';
import { type NavItem, Sidebar } from './components/Sidebar';
import { Skeleton } from './components/ui/skeleton';
import { type SamplePdf, getRepresentativeSamples } from './data/samplePdfs';
import { PDFiumProvider, usePDFium } from './hooks/usePDFium';

const ViewerLab = lazy(() => import('./features/Viewer/ViewerLab').then((m) => ({ default: m.ViewerLab })));
const CreatorLab = lazy(() => import('./features/Creation/CreatorLab').then((m) => ({ default: m.CreatorLab })));
const MixerLab = lazy(() => import('./features/Layouts/MixerLab').then((m) => ({ default: m.MixerLab })));
const RenderLab = lazy(() => import('./features/Rendering/RenderLab').then((m) => ({ default: m.RenderLab })));
const EditorLab = lazy(() => import('./features/Editor/EditorLab').then((m) => ({ default: m.EditorLab })));
const SecurityLab = lazy(() => import('./features/Security/SecurityLab').then((m) => ({ default: m.SecurityLab })));

const ITEMS_WITHOUT_DOCUMENT = new Set<NavItem>(['creator', 'security']);

const ALL_NAV_ITEMS = new Set<string>(['viewer', 'editor', 'creator', 'mixer', 'render', 'security']);

function getInitialNav(): NavItem {
  const hash = window.location.hash.slice(1);
  if (ALL_NAV_ITEMS.has(hash)) return hash as NavItem;
  return 'viewer';
}

function LabFallback() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

const CATEGORY_COLOURS: Record<string, string> = {
  general: 'bg-blue-50 text-blue-700 border-blue-200',
  annotations: 'bg-amber-50 text-amber-700 border-amber-200',
  forms: 'bg-green-50 text-green-700 border-green-200',
  structure: 'bg-purple-50 text-purple-700 border-purple-200',
  graphics: 'bg-rose-50 text-rose-700 border-rose-200',
  security: 'bg-red-50 text-red-700 border-red-200',
  advanced: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const representativeSamples = getRepresentativeSamples();

function EmptyStateGallery({
  onSelect,
  onUpload,
  activeNav,
}: {
  onSelect: (sample: SamplePdf) => void;
  onUpload: (data: Uint8Array, name: string) => void;
  activeNav: NavItem;
}) {
  // Prioritise samples whose suggestedLabs include the active lab
  const sorted = [...representativeSamples].sort((a, b) => {
    const aRec = a.suggestedLabs.includes(activeNav) ? 0 : 1;
    const bRec = b.suggestedLabs.includes(activeNav) ? 0 : 1;
    return aRec - bRec;
  });

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="min-h-full flex items-center justify-center py-8">
      <div className="text-center max-w-2xl px-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">Choose a sample PDF to get started</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {sorted.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelect(sample)}
              className={`flex flex-col items-center p-4 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${CATEGORY_COLOURS[sample.category] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider mb-1">
                {sample.category}
              </span>
              <span className="text-sm font-mono truncate max-w-full">{sample.filename}</span>
              <span className="text-[11px] mt-1 opacity-70 line-clamp-1">{sample.description}</span>
            </button>
          ))}

          {/* Upload card */}
          <div className="flex flex-col items-center p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <span className="text-xs font-semibold uppercase tracking-wider mb-1">Upload</span>
            <span className="text-sm font-mono">your own</span>
            <div className="mt-1">
              <FilePicker onFileSelect={onUpload} label="Browse" />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">or drag &amp; drop a PDF anywhere</p>
      </div>
      </div>
    </div>
  );
}

function AppContent() {
  const {
    document,
    loadDocument,
    loadDocumentFromUrl,
    isInitialising,
    error,
    password,
  } = usePDFium();
  const [activeNav, setActiveNav] = useState<NavItem>(getInitialNav);

  // Hash-based deep linking
  useEffect(() => {
    window.location.hash = activeNav;
  }, [activeNav]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (ALL_NAV_ITEMS.has(hash)) {
        setActiveNav(hash as NavItem);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSampleSelect = useCallback(
    async (sample: SamplePdf) => {
      await loadDocumentFromUrl(`/samples/${sample.filename}`, sample.filename);
    },
    [loadDocumentFromUrl],
  );

  if (isInitialising) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-3">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">Initialising PDFium...</div>
          <p className="text-gray-500 dark:text-gray-400">Loading WASM module</p>
          <div className="flex justify-center gap-1">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 shadow-sm p-6 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Failed to initialise PDFium</h2>
          <p className="text-sm text-red-600 dark:text-red-400 font-mono break-all">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderLab = () => {
    const lab = (() => {
      switch (activeNav) {
        case 'viewer': return <ViewerLab />;
        case 'editor': return <EditorLab />;
        case 'creator': return <CreatorLab />;
        case 'mixer': return <MixerLab />;
        case 'render': return <RenderLab />;
        case 'security': return <SecurityLab />;
        default: return <ViewerLab />;
      }
    })();

    return (
      <ErrorBoundary key={activeNav}>
        <Suspense fallback={<LabFallback />}>
          <div className="h-full w-full animate-fade-in">{lab}</div>
        </Suspense>
      </ErrorBoundary>
    );
  };

  const needsDocument = !ITEMS_WITHOUT_DOCUMENT.has(activeNav);

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav} />

      <div className="flex-1 flex flex-col min-w-0">
        <DocumentToolbar activeNav={activeNav} />

        {/* Content */}
        <DragDropZone onFileSelect={loadDocument}>
          <main className="flex-1 overflow-hidden relative">
            {needsDocument && !document ? (
              <EmptyStateGallery onSelect={handleSampleSelect} onUpload={loadDocument} activeNav={activeNav} />
            ) : (
              <div className="h-full w-full">{renderLab()}</div>
            )}
          </main>
        </DragDropZone>
      </div>

      <PasswordDialog
        isOpen={password.required}
        onSubmit={password.submit}
        onCancel={password.cancel}
        error={password.error ?? undefined}
      />
    </div>
  );
}

export default function App() {
  return (
    <PDFiumProvider>
      <AppContent />
    </PDFiumProvider>
  );
}
