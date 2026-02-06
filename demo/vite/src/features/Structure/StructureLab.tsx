import { type Bookmark, type PDFAttachment, type PDFLink } from '@scaryterry/pdfium/browser';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { usePDFium } from '../../hooks/usePDFium';

export function StructureLab() {
  const { document } = usePDFium();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'attachments' | 'links'>('bookmarks');

  if (!document) return <div>No document</div>;

  // Lazy load data based on tab
  const bookmarks: Bookmark[] = activeTab === 'bookmarks' ? document.getBookmarks() : [];
  const attachments: PDFAttachment[] = activeTab === 'attachments' ? document.getAttachments() : [];
  
  // For links, we usually get them per page. Let's aggregate for the first 5 pages or just page 0
  const links: { page: number, link: PDFLink }[] = [];
  if (activeTab === 'links') {
    // Only verify page 0 for performance in demo
    const page = document.getPage(0);
    const pageLinks = page.getLinks();
    pageLinks.forEach(l => links.push({ page: 0, link: l }));
  }

  const renderBookmark = (bm: Bookmark, depth = 0) => (
    <div key={bm.title + depth} style={{ paddingLeft: depth * 12 }} className="mb-1">
      <div className="flex items-center gap-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer">
        <span className="text-gray-400">📄</span>
        <span>{bm.title}</span>
        {bm.pageIndex !== undefined && (
          <span className="text-xs text-blue-500 ml-auto">p.{bm.pageIndex + 1}</span>
        )}
      </div>
      {bm.children?.map(child => renderBookmark(child, depth + 1))}
    </div>
  );

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex gap-2 mb-4 border-b pb-2">
        <Button 
          variant={activeTab === 'bookmarks' ? 'primary' : 'secondary'} 
          onClick={() => setActiveTab('bookmarks')}
        >
          Bookmarks
        </Button>
        <Button 
          variant={activeTab === 'attachments' ? 'primary' : 'secondary'} 
          onClick={() => setActiveTab('attachments')}
        >
          Attachments ({document.attachmentCount})
        </Button>
        <Button 
          variant={activeTab === 'links' ? 'primary' : 'secondary'} 
          onClick={() => setActiveTab('links')}
        >
          Links (Page 1)
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-white border rounded p-4 shadow-sm">
        {activeTab === 'bookmarks' && (
          bookmarks.length > 0 ? (
            <div className="space-y-1">
              {bookmarks.map(bm => renderBookmark(bm))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No bookmarks found.</div>
          )
        )}

        {activeTab === 'attachments' && (
          attachments.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((att, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-2">{att.name}</td>
                    <td className="p-2 font-mono text-xs">{att.data.length} bytes</td>
                    <td className="p-2">
                      <Button className="text-xs py-1 px-2" onClick={() => {
                        const blob = new Blob([att.data.slice(0)]);
                        const url = URL.createObjectURL(blob);
                        const a = window.document.createElement('a');
                        a.href = url;
                        a.download = att.name;
                        a.click();
                      }}>Download</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 italic">No attachments found.</div>
          )
        )}

        {activeTab === 'links' && (
          links.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {links.map((item, i) => (
                <div key={i} className="border p-2 rounded text-sm hover:shadow-md transition-shadow">
                  <div className="font-semibold text-blue-600 truncate">
                    {item.link.action?.uri || `GoTo Page ${item.link.destination?.pageIndex ?? '?'}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Bounds: [{item.link.bounds.left.toFixed(0)}, {item.link.bounds.top.toFixed(0)}, ...]
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No links found on page 1.</div>
          )
        )}
      </div>
    </div>
  );
}