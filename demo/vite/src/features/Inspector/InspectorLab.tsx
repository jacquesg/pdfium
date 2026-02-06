import { DocumentActionType } from '@scaryterry/pdfium/browser';
import { Button } from '../../components/Button';
import { usePDFium } from '../../hooks/usePDFium';

export function InspectorLab() {
  const { document } = usePDFium();

  if (!document) return <div>No document loaded</div>;

  const metadata = document.getMetadata();
  const signatures = document.getSignatures();
  const jsActions = document.getJavaScriptActions();

  const handleOpenAction = () => {
    document.executeDocumentOpenAction();
    alert('Executed Document Open Action (check console for side effects if any)');
  };

  const handleSaveAction = () => {
    document.executeDocumentAction(DocumentActionType.WillSave);
    alert('Executed WillSave Action');
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Metadata Card */}
        <div className="bg-white p-4 rounded shadow border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Metadata</h3>
          <dl className="grid grid-cols-[100px_1fr] gap-2 text-sm">
            <dt className="text-gray-500">Title</dt> <dd>{metadata.title || '-'}</dd>
            <dt className="text-gray-500">Author</dt> <dd>{metadata.author || '-'}</dd>
            <dt className="text-gray-500">Subject</dt> <dd>{metadata.subject || '-'}</dd>
            <dt className="text-gray-500">Creator</dt> <dd>{metadata.creator || '-'}</dd>
            <dt className="text-gray-500">Producer</dt> <dd>{metadata.producer || '-'}</dd>
            <dt className="text-gray-500">Created</dt> <dd>{metadata.creationDate || '-'}</dd>
            <dt className="text-gray-500">Modified</dt> <dd>{metadata.modificationDate || '-'}</dd>
            <dt className="text-gray-500">PDF Ver</dt> <dd>{document.fileVersion || '-'}</dd>
          </dl>
        </div>

        {/* Actions Card */}
        <div className="bg-white p-4 rounded shadow border">
           <h3 className="font-bold text-lg mb-4 border-b pb-2">Document Actions</h3>
           <div className="space-y-2">
             <Button onClick={handleOpenAction} className="w-full">Trigger Open Action</Button>
             <Button onClick={handleSaveAction} className="w-full" variant="secondary">Trigger WillSave Action</Button>
           </div>
        </div>

        {/* Signatures Card */}
        <div className="bg-white p-4 rounded shadow border md:col-span-2">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">
            Digital Signatures 
            <span className="ml-2 text-sm font-normal text-gray-500">({document.signatureCount})</span>
          </h3>
          {signatures.length === 0 ? (
            <p className="text-gray-500 italic">No signatures found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="p-2">Index</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2">Time</th>
                    <th className="p-2">SubFilter</th>
                    <th className="p-2">Byte Range</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((sig) => (
                    <tr key={sig.index} className="border-t">
                      <td className="p-2">{sig.index}</td>
                      <td className="p-2 font-medium">{sig.reason || '-'}</td>
                      <td className="p-2">{sig.time || '-'}</td>
                      <td className="p-2 font-mono text-xs">{sig.subFilter || '-'}</td>
                      <td className="p-2 font-mono text-xs">{sig.byteRange?.join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* JavaScript Card */}
        <div className="bg-white p-4 rounded shadow border md:col-span-2">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">
            Embedded JavaScript
            <span className="ml-2 text-sm font-normal text-gray-500">({jsActions.length})</span>
          </h3>
           {jsActions.length === 0 ? (
            <p className="text-gray-500 italic">No JavaScript actions found.</p>
          ) : (
            <div className="space-y-4">
              {jsActions.map((action, i) => (
                <div key={i} className="border rounded">
                  <div className="bg-gray-50 p-2 border-b font-semibold text-xs flex justify-between">
                    <span>{action.name || `Action #${i}`}</span>
                  </div>
                  <pre className="p-2 bg-gray-900 text-green-400 text-xs overflow-x-auto font-mono">
                    {action.script}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
