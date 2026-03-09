import { DocPanel } from '../../components/DocPanel';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import { usePDFium } from '../../hooks/usePDFium';
import { ErrorCatalogue } from './ErrorCatalogue';
import { PasswordDemo } from './PasswordDemo';

export function SecurityLab() {
  const { error, instance, isInitialising, retryInitialisation } = usePDFium();

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>PDFium failed to initialise</AlertTitle>
          <AlertDescription className="space-y-3">
            <span className="block">{error.message}</span>
            <Button type="button" variant="danger" onClick={retryInitialisation}>
              Retry Initialisation
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isInitialising || !instance) {
    return (
      <div role="status" aria-label="Loading" className="flex items-center justify-center h-full gap-2 text-gray-500">
        <Skeleton className="h-4 w-4 rounded-full" />
        Initialising PDFium...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-hidden">
      <DocPanel
        title="Error Handling & Security"
        apis={['PDFiumError', 'DocumentError', 'PDFiumErrorCode', 'openDocument({ password })']}
        snippet={'try {\n  await using doc = await pdfium.openDocument(data);\n} catch (e) {\n  if (e instanceof DocumentError &&\n      e.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {\n    await using doc = await pdfium.openDocument(data, { password });\n  }\n}'}
        description="Demonstrates password-protected document handling, the error class hierarchy, and interactive error triggers for all major error categories."
      />
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto pr-2">
          <PasswordDemo pdfium={instance} />
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1 overflow-y-auto pl-2">
          <ErrorCatalogue pdfium={instance} />
        </div>
      </div>
    </div>
  );
}
