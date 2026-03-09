import { PDFiumError } from '@scaryterry/pdfium/browser';
import { useState } from 'react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { DemoPDFium } from '../../hooks/pdfium-provider.types';

interface ErrorCatalogueProps {
  pdfium: DemoPDFium;
}

interface TriggeredError {
  name: string;
  code: number;
  message: string;
  context?: Record<string, unknown>;
  json: string;
}

// --- Error hierarchy data ---

interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
}

const ERROR_HIERARCHY: HierarchyNode = {
  name: 'PDFiumError',
  children: [
    {
      name: 'InitialisationError',
      children: [{ name: 'NetworkError' }],
    },
    {
      name: 'DocumentError',
      children: [{ name: 'PermissionsError' }],
    },
    { name: 'PageError' },
    { name: 'RenderError' },
    { name: 'MemoryError' },
    { name: 'TextError' },
    { name: 'ObjectError' },
    { name: 'WorkerError' },
  ],
};

// --- Error code reference data ---

interface CodeRange {
  range: string;
  category: string;
  codes: string;
}

const CODE_RANGES: CodeRange[] = [
  { range: '1xx', category: 'Initialisation', codes: '100\u2013103' },
  { range: '2xx', category: 'Document', codes: '200\u2013209' },
  { range: '3xx', category: 'Page', codes: '300\u2013303' },
  { range: '4xx', category: 'Render', codes: '400\u2013402' },
  { range: '5xx', category: 'Memory', codes: '500\u2013502' },
  { range: '6xx', category: 'Text', codes: '600\u2013602' },
  { range: '7xx', category: 'Object / Annotation', codes: '700\u2013751' },
  { range: '8xx', category: 'Worker', codes: '800\u2013803' },
  { range: '9xx', category: 'Resource', codes: '900' },
];

// --- Tree renderer ---

function HierarchyTree({ node, depth = 0, isLast = true }: { node: HierarchyNode; depth?: number; isLast?: boolean }) {
  const hasChildren = node.children && node.children.length > 0;
  const isRoot = depth === 0;

  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-1">
        {!isRoot && (
          <span className="text-gray-400 whitespace-pre">
            {isLast ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 '}
          </span>
        )}
        <Badge variant={isRoot ? 'blue' : 'default'} className={isRoot ? 'font-semibold' : ''}>
          {node.name}
        </Badge>
      </div>
      {hasChildren && (
        <div className={isRoot ? 'pl-2' : 'pl-5'}>
          {node.children?.map((child, i) => (
            <HierarchyTree
              key={child.name}
              node={child}
              depth={depth + 1}
              isLast={i === (node.children?.length ?? 0) - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Triggered error display ---

function TriggeredErrorDisplay({ error, onDismiss }: { error: TriggeredError; onDismiss: () => void }) {
  return (
    <Alert variant="destructive">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="red" className="font-mono text-[11px]">{error.name}</Badge>
          <Badge variant="default" className="font-mono text-[11px]">Code {error.code}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss error" className="h-6 w-6">
          &times;
        </Button>
      </div>
      <AlertDescription className="mt-2">
        <p className="text-sm text-red-700">{error.message}</p>
        {error.context && Object.keys(error.context).length > 0 && (
          <div className="mt-2">
            <span className="text-[11px] font-semibold text-gray-500">Context:</span>
            <pre className="text-[11px] font-mono bg-red-100 p-2 rounded overflow-auto mt-1">
              {JSON.stringify(error.context, (key, value) => {
                // Filter out internal WASM details
                if (key === 'pointer' || key === 'handle' || key === 'address') return undefined;
                return value;
              }, 2)}
            </pre>
          </div>
        )}
        <div className="mt-2">
          <span className="text-[11px] font-semibold text-gray-500">toJSON():</span>
          <pre className="text-[11px] font-mono bg-gray-900 text-emerald-300 p-2 rounded overflow-auto mt-1 max-h-[200px]">
            {error.json}
          </pre>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// --- Main component ---

export function ErrorCatalogue({ pdfium }: ErrorCatalogueProps) {
  const [triggeredError, setTriggeredError] = useState<TriggeredError | null>(null);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);

  const captureError = (e: unknown) => {
    if (e instanceof PDFiumError) {
      setTriggeredError({
        name: e.name,
        code: e.code,
        message: e.message,
        context: e.context as Record<string, unknown> | undefined,
        json: JSON.stringify(e.toJSON(), null, 2),
      });
    } else {
      setTriggeredError({
        name: 'UnexpectedError',
        code: -1,
        message: e instanceof Error ? e.message : String(e),
        json: JSON.stringify({ message: e instanceof Error ? e.message : String(e) }, null, 2),
      });
    }
  };

  const triggerPasswordError = async () => {
    setTriggerLoading('password');
    try {
      const res = await fetch('/protected.pdf');
      const data = new Uint8Array(await res.arrayBuffer());
      await using doc = await pdfium.openDocument(data);
      void doc.pageCount;
    } catch (e) {
      captureError(e);
    } finally {
      setTriggerLoading(null);
    }
  };

  const triggerInvalidFormat = async () => {
    setTriggerLoading('format');
    try {
      await using doc = await pdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
      void doc.pageCount;
    } catch (e) {
      captureError(e);
    } finally {
      setTriggerLoading(null);
    }
  };

  const triggerPageOutOfRange = async () => {
    setTriggerLoading('page');
    try {
      const res = await fetch('/sample.pdf');
      const data = new Uint8Array(await res.arrayBuffer());
      await using doc = await pdfium.openDocument(data);
      await using page = await doc.getPage(99999);
      void page.width;
    } catch (e) {
      captureError(e);
    } finally {
      setTriggerLoading(null);
    }
  };

  const triggerDisposedError = async () => {
    setTriggerLoading('disposed');
    try {
      const res = await fetch('/sample.pdf');
      const data = new Uint8Array(await res.arrayBuffer());
      const doc = await pdfium.openDocument(data);
      await doc.dispose();
      void doc.pageCount;
    } catch (e) {
      captureError(e);
    } finally {
      setTriggerLoading(null);
    }
  };

  const triggers: Array<{ id: string; label: string; description: string; handler: () => Promise<void> }> = [
    {
      id: 'password',
      label: 'Password Required',
      description: 'Open a protected PDF without providing a password',
      handler: triggerPasswordError,
    },
    {
      id: 'format',
      label: 'Invalid Format',
      description: 'Try to open random bytes as a PDF document',
      handler: triggerInvalidFormat,
    },
    {
      id: 'page',
      label: 'Page Out of Range',
      description: 'Request page index 99999 from a document',
      handler: triggerPageOutOfRange,
    },
    {
      id: 'disposed',
      label: 'Disposed Resource',
      description: 'Access a document after it has been disposed',
      handler: triggerDisposedError,
    },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">Error Catalogue</h3>

      {/* Error hierarchy */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle>Error Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <HierarchyTree node={ERROR_HIERARCHY} />
        </CardContent>
      </Card>

      {/* Code reference table */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle>Error Code Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-gray-500 font-semibold">Range</th>
                <th className="text-left py-1 px-2 text-gray-500 font-semibold">Category</th>
                <th className="text-left py-1 px-2 text-gray-500 font-semibold">Codes</th>
              </tr>
            </thead>
            <tbody>
              {CODE_RANGES.map((row) => (
                <tr key={row.range} className="border-b border-gray-100">
                  <td className="py-1 px-2 font-mono font-semibold text-gray-600">{row.range}</td>
                  <td className="py-1 px-2 text-gray-700">{row.category}</td>
                  <td className="py-1 px-2 font-mono text-gray-500">{row.codes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Interactive triggers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Interactive Error Triggers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="warning">
            <AlertDescription className="text-xs">
              These intentionally trigger errors for demonstration purposes.
              They create temporary, isolated resources and never affect other open documents.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {triggers.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-center justify-between bg-white border rounded-md px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{trigger.label}</div>
                  <div className="text-[11px] text-gray-500">{trigger.description}</div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={trigger.handler}
                  disabled={triggerLoading !== null}
                >
                  {triggerLoading === trigger.id ? 'Triggering...' : 'Trigger'}
                </Button>
              </div>
            ))}
          </div>

          {triggeredError && (
            <TriggeredErrorDisplay
              error={triggeredError}
              onDismiss={() => setTriggeredError(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
