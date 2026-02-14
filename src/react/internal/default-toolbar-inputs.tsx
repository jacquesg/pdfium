'use client';

import type { CSSProperties, KeyboardEvent } from 'react';
import { useCallback, useState } from 'react';
import { clampPageNumber, clampZoomPercentage } from './toolbar-value-parsers.js';

interface UseEditableNumericInputOptions {
  getInitialDraft: () => string;
  onCommitParsed: (value: number) => void;
}

interface PageInputProps {
  pageNumber: number;
  pageCount: number;
  goToPage: (pageNumber: number) => void;
}

interface ZoomInputProps {
  percentage: number;
  setScale: (scale: number) => void;
}

const TOOLBAR_NUMERIC_INPUT_STYLE: CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  width: 64,
  padding: '2px 6px',
  border: '1px solid var(--pdfium-toolbar-input-border, #d1d5db)',
  borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
  background: 'var(--pdfium-toolbar-input-bg, #ffffff)',
  color: 'inherit',
  fontSize: '13px',
  textAlign: 'center',
};

const INLINE_EDITOR_INPUT_STYLE: CSSProperties = {
  border: 'none',
  background: 'transparent',
  width: '2.5em',
  textAlign: 'right',
  outline: 'none',
  fontSize: 'inherit',
  color: 'inherit',
  padding: 0,
};

function useEditableNumericInput({ getInitialDraft, onCommitParsed }: UseEditableNumericInputOptions) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = useCallback(() => {
    setDraft(getInitialDraft());
    setEditing(true);
  }, [getInitialDraft]);

  const commit = useCallback(() => {
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isNaN(parsed)) {
      onCommitParsed(parsed);
    }
    setEditing(false);
  }, [draft, onCommitParsed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') setEditing(false);
    },
    [commit],
  );

  return { commit, draft, editing, handleKeyDown, setDraft, startEditing };
}

function PageInput({ pageNumber, pageCount, goToPage }: PageInputProps) {
  const { editing, draft, setDraft, startEditing, commit, handleKeyDown } = useEditableNumericInput({
    getInitialDraft: () => String(pageNumber),
    onCommitParsed: (parsed) => {
      const clampedPage = clampPageNumber(parsed, pageCount);
      if (clampedPage !== null) goToPage(clampedPage);
    },
  });

  if (editing) {
    return (
      <span style={{ ...TOOLBAR_NUMERIC_INPUT_STYLE, display: 'inline-flex', alignItems: 'center' }}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label="Page number"
          // biome-ignore lint/a11y/noAutofocus: focus must move to the input when the user clicks the page indicator to edit it
          autoFocus
          style={INLINE_EDITOR_INPUT_STYLE}
        />
        <span style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)', marginLeft: 2 }}>/ {pageCount}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label="Page number"
      style={{
        ...TOOLBAR_NUMERIC_INPUT_STYLE,
        cursor: 'text',
        background: 'var(--pdfium-toolbar-input-bg, #ffffff)',
      }}
    >
      {pageNumber} / {pageCount}
    </button>
  );
}

function ZoomInput({ percentage, setScale }: ZoomInputProps) {
  const { editing, draft, setDraft, startEditing, commit, handleKeyDown } = useEditableNumericInput({
    getInitialDraft: () => String(percentage),
    onCommitParsed: (parsed) => {
      const clampedPercentage = clampZoomPercentage(parsed);
      setScale(clampedPercentage / 100);
    },
  });

  if (editing) {
    return (
      <span style={{ ...TOOLBAR_NUMERIC_INPUT_STYLE, width: 52, display: 'inline-flex', alignItems: 'center' }}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label="Zoom percentage"
          // biome-ignore lint/a11y/noAutofocus: focus must move to the input when the user clicks the zoom indicator to edit it
          autoFocus
          style={INLINE_EDITOR_INPUT_STYLE}
        />
        <span style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>%</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label="Zoom percentage"
      style={{
        ...TOOLBAR_NUMERIC_INPUT_STYLE,
        width: 52,
        cursor: 'text',
        background: 'var(--pdfium-toolbar-input-bg, #ffffff)',
      }}
    >
      {percentage}%
    </button>
  );
}

export { PageInput, TOOLBAR_NUMERIC_INPUT_STYLE, ZoomInput };
