import {
  PDFiumError,
  PDFiumErrorCode,
} from '@scaryterry/pdfium/browser';
import { useState } from 'react';
import { CodeSnippet } from '../../components/CodeSnippet';
import { PDFCanvas } from '../../components/PDFCanvas';
import { PropertyTable } from '../../components/PropertyTable';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import type { DemoPDFium, DemoPDFiumDocument } from '../../hooks/pdfium-provider.types';

interface PasswordDemoProps {
  pdfium: DemoPDFium;
}

interface ErrorInfo {
  name: string;
  code: number;
  message: string;
  context?: Record<string, unknown>;
}

interface SuccessDoc {
  pageCount: number;
  firstPageRender: {
    width: number;
    height: number;
    data: Uint8Array;
  };
}

type PasswordStatus = 'idle' | 'loading' | 'needs-password' | 'wrong-password' | 'success' | 'error';

const PASSWORD_SNIPPET = `try {
  await using doc = await pdfium.openDocument(data);
} catch (e) {
  if (e instanceof DocumentError &&
      e.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
    // PDFium returns code 202 for both
    // "no password" and "wrong password"
    const password = prompt('Password:');
    await using doc = await pdfium.openDocument(
      data, { password }
    );
  }
}`;

function ErrorDisplay({ error }: { error: ErrorInfo }) {
  return (
    <Alert variant="destructive">
      <div className="flex gap-2 items-center mb-2">
        <Badge variant="red" className="font-mono text-[11px]">{error.name}</Badge>
        <Badge variant="default" className="font-mono text-[11px]">Code {error.code}</Badge>
      </div>
      <AlertDescription>
        <p className="text-sm text-red-700">{error.message}</p>
        {error.context && Object.keys(error.context).length > 0 && (
          <pre className="text-[11px] font-mono bg-red-100 p-2 rounded overflow-auto mt-2">
            {JSON.stringify(error.context, null, 2)}
          </pre>
        )}
      </AlertDescription>
    </Alert>
  );
}

async function extractSuccessData(doc: DemoPDFiumDocument): Promise<SuccessDoc> {
  await using page = await doc.getPage(0);
  const rendered = await page.render({ scale: 1 });
  return {
    pageCount: doc.pageCount,
    firstPageRender: {
      width: rendered.width,
      height: rendered.height,
      data: rendered.data,
    },
  };
}

export function PasswordDemo({ pdfium }: PasswordDemoProps) {
  const [status, setStatus] = useState<PasswordStatus>('idle');
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [password, setPassword] = useState('');
  const [successDoc, setSuccessDoc] = useState<SuccessDoc | null>(null);
  const [protectedData, setProtectedData] = useState<Uint8Array | null>(null);

  const handleLoadProtected = async () => {
    setStatus('loading');
    setErrorInfo(null);
    setSuccessDoc(null);
    setPassword('');

    try {
      const res = await fetch('/protected.pdf');
      if (!res.ok) {
        setStatus('error');
        setErrorInfo({ name: 'FetchError', code: 0, message: `Failed to fetch /protected.pdf: HTTP ${res.status}` });
        return;
      }
      const data = new Uint8Array(await res.arrayBuffer());
      setProtectedData(data);

      await using doc = await pdfium.openDocument(data);
      const result = await extractSuccessData(doc);
      setSuccessDoc(result);
      setStatus('success');
    } catch (e) {
      if (e instanceof PDFiumError) {
        setErrorInfo({
          name: e.name,
          code: e.code,
          message: e.message,
          context: e.context as Record<string, unknown> | undefined,
        });
        setStatus('needs-password');
      } else {
        setStatus('error');
        setErrorInfo({
          name: 'UnknownError',
          code: 0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  };

  const handleSubmitPassword = async () => {
    if (!protectedData) return;

    try {
      await using doc = await pdfium.openDocument(protectedData, { password });
      const result = await extractSuccessData(doc);
      setSuccessDoc(result);
      setErrorInfo(null);
      setPassword('');
      setStatus('success');
    } catch (e) {
      if (e instanceof PDFiumError && e.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
        setErrorInfo({
          name: e.name,
          code: e.code,
          message: 'Incorrect password \u2014 try again',
          context: e.context as Record<string, unknown> | undefined,
        });
        setStatus('wrong-password');
      } else if (e instanceof PDFiumError) {
        setErrorInfo({
          name: e.name,
          code: e.code,
          message: e.message,
          context: e.context as Record<string, unknown> | undefined,
        });
        setStatus('error');
      } else {
        setStatus('error');
        setErrorInfo({
          name: 'UnknownError',
          code: 0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorInfo(null);
    setPassword('');
    setSuccessDoc(null);
    setProtectedData(null);
  };

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">Password-Protected Documents</h3>
      <p className="text-sm text-gray-500 mb-4">
        Demonstrates how PDFium handles password-protected PDFs. The library throws a structured error
        when a password is required, allowing you to prompt the user and retry.
      </p>

      {status === 'idle' && (
        <Button onClick={handleLoadProtected}>Load Protected PDF</Button>
      )}

      {status === 'loading' && (
        <div role="status" aria-label="Loading" className="flex items-center gap-2 text-gray-500 text-sm">
          <Skeleton className="h-4 w-4 rounded-full" />
          Fetching protected PDF...
        </div>
      )}

      {(status === 'needs-password' || status === 'wrong-password') && (
        <div className="space-y-3">
          <Alert variant="warning">
            <AlertDescription>
              {status === 'needs-password'
                ? 'Opening without a password threw a structured error (shown below). Enter the password to proceed.'
                : 'The password was incorrect. PDFium throws the same error code (202) for both missing and wrong passwords.'}
            </AlertDescription>
          </Alert>

          {errorInfo && <ErrorDisplay error={errorInfo} />}

          <div className="flex gap-2 items-center">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitPassword();
              }}
              placeholder="Enter password (hint: 12345678)"
              className="flex-1"
            />
            <Button onClick={handleSubmitPassword} disabled={password.length === 0}>
              Unlock
            </Button>
          </div>
        </div>
      )}

      {status === 'success' && successDoc && (
        <div className="space-y-3">
          <Alert variant="success">
            <AlertDescription>
              Document unlocked successfully! The document was opened with the correct password,
              data was extracted, and the resource was automatically disposed via <code className="font-mono">await using</code>.
            </AlertDescription>
          </Alert>

          <PropertyTable rows={[
            { label: 'Page count', value: successDoc.pageCount },
            { label: 'First page width', value: `${successDoc.firstPageRender.width}px` },
            { label: 'First page height', value: `${successDoc.firstPageRender.height}px` },
          ]} />

          <PDFCanvas
            width={successDoc.firstPageRender.width}
            height={successDoc.firstPageRender.height}
            data={successDoc.firstPageRender.data}
            aria-label="Rendered first page of protected document"
            className="max-h-[300px] object-contain"
          />

          <Button onClick={handleReset} variant="secondary">Reset Demo</Button>
        </div>
      )}

      {status === 'error' && errorInfo && (
        <div className="space-y-3">
          <ErrorDisplay error={errorInfo} />
          <Button onClick={handleReset} variant="secondary">Reset Demo</Button>
        </div>
      )}

      <div className="mt-5">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Pattern</h4>
        <CodeSnippet code={PASSWORD_SNIPPET} language="typescript" />
      </div>
    </div>
  );
}
