import { useState } from 'react';
import { FilePicker } from './components/FilePicker';
import { CreatorLab } from './features/Creation/CreatorLab';
import { FormsLab } from './features/Forms/FormsLab';
import { InspectorLab } from './features/Inspector/InspectorLab';
import { MixerLab } from './features/Layouts/MixerLab';
import { ObjectsLab } from './features/Objects/ObjectsLab';
import { RenderLab } from './features/Rendering/RenderLab';
import { StructureLab } from './features/Structure/StructureLab';
import { TextLab } from './features/Text/TextLab';
import { ViewerLab } from './features/Viewer/ViewerLab';
import { WorkerLab } from './features/Worker/WorkerLab';
import { PDFiumProvider, usePDFium } from './hooks/usePDFium';

type Tab = 'viewer' | 'creator' | 'text' | 'objects' | 'structure' | 'forms' | 'mixer' | 'render' | 'worker' | 'inspector';

function AppContent() {
  const { document, loadDocument, isLoading, error, pdfium } = usePDFium();
  const [activeTab, setActiveTab] = useState<Tab>('viewer');

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-2">Initialising PDFium...</div>
          <p className="text-gray-500">Loading WASM module</p>
        </div>
      </div>
    );
  }

  if (error) {
     return (
       <div className="h-screen flex items-center justify-center text-red-600">
         Error: {error.message}
       </div>
     );
  }

  return (
    <div className="h-screen flex flex-col font-sans text-gray-900 bg-white">
      {/* Top Bar */}
      <header className="bg-gray-900 text-white p-4 shadow-md flex items-center justify-between z-10 overflow-x-auto">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">PDFium Workbench</h1>
          <nav className="flex bg-gray-800 rounded p-1 gap-1">
            {[
              { id: 'viewer', label: 'Viewer' },
              { id: 'creator', label: 'Creator' }, // New
              { id: 'text', label: 'Text' },
              { id: 'objects', label: 'Objects' }, // New
              { id: 'structure', label: 'Structure' },
              { id: 'forms', label: 'Forms' },
              { id: 'mixer', label: 'Mixer' },
              { id: 'render', label: 'Render' },
              { id: 'worker', label: 'Worker' },
              { id: 'inspector', label: 'Inspector' },
            ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as Tab)}
                 className={`px-3 py-1 rounded text-sm transition-colors whitespace-nowrap ${
                   activeTab === tab.id 
                     ? 'bg-blue-600 text-white shadow-sm' 
                     : 'text-gray-400 hover:text-white hover:bg-gray-700'
                 }`}
               >
                 {tab.label}
               </button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4 ml-4">
           {document ? (
             <span className="text-xs text-gray-400 hidden md:inline">
               Current: <span className="text-white font-mono">{document.pageCount} pages</span>
             </span>
           ) : (
             <span className="text-yellow-500 text-xs hidden md:inline">No Document</span>
           )}
           <FilePicker onFileSelect={loadDocument} label="Load PDF" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {/* Creator works without a loaded document (it makes one) */}
        {activeTab === 'creator' ? (
           <CreatorLab />
        ) : !document ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
             <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
               <p className="text-gray-500 mb-4">No document loaded.</p>
               <FilePicker onFileSelect={loadDocument} label="Open a PDF to start" />
               {pdfium && (
                 <p className="mt-4 text-xs text-gray-400">
                   Or go to the <strong>Creator</strong> tab to build one.
                 </p>
               )}
             </div>
          </div>
        ) : (
          <div className="h-full w-full">
            {activeTab === 'viewer' && <ViewerLab />}
            {activeTab === 'text' && <TextLab />}
            {activeTab === 'objects' && <ObjectsLab />}
            {activeTab === 'structure' && <StructureLab />}
            {activeTab === 'forms' && <FormsLab />}
            {activeTab === 'mixer' && <MixerLab />}
            {activeTab === 'render' && <RenderLab />}
            {activeTab === 'worker' && <WorkerLab />}
            {activeTab === 'inspector' && <InspectorLab />}
          </div>
        )}
      </main>
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
