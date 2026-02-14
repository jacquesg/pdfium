'use client';

import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getSearchBadgeText, SEARCH_PANEL_COPY } from './search-panel-copy.js';

interface SearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  totalMatches: number;
  currentIndex: number;
  isSearching: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose?: (() => void) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function SearchPanelView({
  query,
  onQueryChange,
  totalMatches,
  currentIndex,
  isSearching,
  onNext,
  onPrev,
  onClose,
  className,
  style,
}: SearchPanelProps) {
  const badgeText = getSearchBadgeText({ isSearching, totalMatches, currentIndex, query });

  return (
    // biome-ignore lint/a11y/useSemanticElements: happy-dom does not support <search>; use explicit role for compatibility
    <div
      role="search"
      aria-label={SEARCH_PANEL_COPY.searchRegionAriaLabel}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: 'var(--pdfium-search-bg, #ffffff)',
        borderBottom: '1px solid var(--pdfium-search-border, #e5e7eb)',
        ...style,
      }}
    >
      <Search
        size={16}
        strokeWidth={2}
        style={{ flexShrink: 0, opacity: 0.5, color: 'var(--pdfium-toolbar-btn-colour, #374151)' }}
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.shiftKey ? onPrev() : onNext();
          }
          if (event.key === 'Escape') onClose?.();
        }}
        placeholder={SEARCH_PANEL_COPY.queryPlaceholder}
        aria-label={SEARCH_PANEL_COPY.queryAriaLabel}
        // biome-ignore lint/a11y/noAutofocus: search panel is user-initiated — focus must land on the input when it opens
        autoFocus
        style={{
          boxSizing: 'border-box',
          flex: 1,
          minWidth: 0,
          padding: '4px 8px',
          border: '1px solid var(--pdfium-search-input-border, #d1d5db)',
          borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
          background: 'var(--pdfium-search-input-bg, #ffffff)',
          color: 'inherit',
          fontSize: '13px',
        }}
      />
      {badgeText && (
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            flexShrink: 0,
            fontSize: '0.75em',
            padding: '2px 6px',
            borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
            background: 'var(--pdfium-search-badge-bg, #f3f4f6)',
            color: 'var(--pdfium-search-badge-colour, #6b7280)',
            whiteSpace: 'nowrap',
          }}
        >
          {badgeText}
        </span>
      )}
      <button
        type="button"
        onClick={onPrev}
        disabled={totalMatches === 0}
        aria-label={SEARCH_PANEL_COPY.previousMatchLabel}
        title={SEARCH_PANEL_COPY.previousMatchLabel}
        style={iconButtonStyle(totalMatches === 0)}
      >
        <ChevronUp size={16} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={totalMatches === 0}
        aria-label={SEARCH_PANEL_COPY.nextMatchLabel}
        title={SEARCH_PANEL_COPY.nextMatchLabel}
        style={iconButtonStyle(totalMatches === 0)}
      >
        <ChevronDown size={16} strokeWidth={2} />
      </button>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={SEARCH_PANEL_COPY.closeSearchLabel}
          title={SEARCH_PANEL_COPY.closeSearchLabel}
          style={iconButtonStyle(false)}
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function iconButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: 'var(--pdfium-toolbar-btn-colour, #374151)',
    transition: 'background-color 150ms ease, opacity 150ms ease',
  };
}

export { SearchPanelView };
export type { SearchPanelProps };
