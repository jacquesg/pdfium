import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { CodeSnippet } from './CodeSnippet';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface DocPanelProps {
  title: string;
  apis?: string[];
  snippet?: string;
  description?: string;
  docUrl?: string;
}

const STORAGE_PREFIX = 'docpanel-collapsed-';

export function DocPanel({ title, apis, snippet, description, docUrl }: DocPanelProps) {
  const storageKey = `${STORAGE_PREFIX}${title.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== 'true';
    } catch {
      return true; // Default to open if storage unavailable
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(!open));
    } catch {
      // Storage unavailable — ignore
    }
  }, [open, storageKey]);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className={cn(
            'w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg',
            !open && 'rounded-b-lg',
          )}
        >
          <span className="text-sm font-bold text-gray-700">API Docs</span>
          <span className="text-gray-400 text-xs">{open ? 'Hide' : 'Show'}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="border-t space-y-3 pt-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>

            {apis && apis.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">APIs demonstrated</div>
                <div className="flex flex-wrap gap-1">
                  {apis.map((api) => (
                    <Badge key={api} variant="blue" className="font-mono text-[11px]">
                      {api}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {snippet && <CodeSnippet code={snippet} language="typescript" />}

            {description && <p className="text-xs text-gray-600 leading-relaxed">{description}</p>}

            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                View documentation &rarr;
              </a>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
