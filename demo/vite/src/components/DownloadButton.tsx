import { ToolbarButton } from '@scaryterry/pdfium/react';
import { ArrowDownToLine } from 'lucide-react';
import { useState } from 'react';
import type { DemoPDFiumDocument } from '../hooks/pdfium-provider.types';

interface DownloadButtonProps {
  document: DemoPDFiumDocument | null;
  filename?: string;
}

export function DownloadButton({ document, filename }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleClick = async () => {
    if (!document || typeof globalThis.document === 'undefined') return;

    setIsDownloading(true);
    setError(null);
    try {
      const bytes = await document.save();
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      const blob = new Blob([copy], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      try {
        const link = globalThis.document.createElement('a');
        link.href = url;
        link.download = filename ?? 'document.pdf';
        link.click();
      } finally {
        globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <ToolbarButton
        onClick={() => {
          void handleClick();
        }}
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
