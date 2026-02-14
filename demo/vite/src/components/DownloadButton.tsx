import type { WorkerPDFiumDocument } from '@scaryterry/pdfium/browser';
import { ToolbarButton } from '@scaryterry/pdfium/react';
import { ArrowDownToLine } from 'lucide-react';
import { useDownload } from '../hooks/useDownload';

interface DownloadButtonProps {
  document: WorkerPDFiumDocument | null;
  filename?: string;
}

export function DownloadButton({ document, filename }: DownloadButtonProps) {
  const { download, isDownloading, error } = useDownload();

  const handleClick = () => {
    if (document) {
      void download(document, filename);
    }
  };

  return (
    <>
      <ToolbarButton
        onClick={handleClick}
        disabled={!document || isDownloading}
        aria-busy={isDownloading}
        label={error ? `Download failed: ${error.message}` : 'Download'}
      >
        <ArrowDownToLine size={18} strokeWidth={2} />
      </ToolbarButton>
      {error && <span role="alert" className="sr-only">Download failed: {error.message}</span>}
    </>
  );
}
