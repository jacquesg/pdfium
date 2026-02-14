import { useCallback, useEffect, useRef, useState } from 'react';

interface CodeSnippetProps {
  code: string;
  language?: string;
}

export function CodeSnippet({ code, language }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean up timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
    }
  }, [code]);

  return (
    <div className="relative">
      <pre
        className="bg-gray-900 text-green-400 text-xs font-mono p-3 rounded overflow-auto max-h-96"
        data-language={language}
      >
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600 transition-colors"
        aria-label={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
