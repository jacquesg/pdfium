'use client';

import { useState } from 'react';
import type { SerialisedAnnotation } from '../../context/protocol.js';
import { formatAnnotationListBounds } from './annotations-panel-helpers.js';
import {
  GROUP_CHEVRON_STYLE,
  GROUP_CONTAINER_STYLE,
  GROUP_COUNT_BADGE_STYLE,
  GROUP_HEADER_BUTTON_STYLE,
  GROUP_HEADER_META_STYLE,
  GROUP_ITEM_BASE_STYLE,
  GROUP_ITEM_BOUNDS_STYLE,
  GROUP_ITEM_CONTENTS_STYLE,
  GROUP_ITEM_INDEX_STYLE,
  GROUP_ITEM_ROW_STYLE,
  GROUP_ITEMS_CONTAINER_STYLE,
} from './annotations-panel-view-styles.js';

interface AnnotationGroupProps {
  type: string;
  annotations: SerialisedAnnotation[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function AnnotationGroup({ type, annotations, selectedIndex, onSelect }: AnnotationGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => {
    setCollapsed((value) => !value);
  };

  return (
    <div style={GROUP_CONTAINER_STYLE}>
      <button
        type="button"
        onClick={toggleCollapsed}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleCollapsed();
          }
        }}
        aria-expanded={!collapsed}
        style={GROUP_HEADER_BUTTON_STYLE}
      >
        <span>{type}</span>
        <span style={GROUP_HEADER_META_STYLE}>
          <span style={GROUP_COUNT_BADGE_STYLE}>{annotations.length}</span>
          <span style={{ ...GROUP_CHEVRON_STYLE, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
            <svg
              aria-hidden="true"
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </span>
      </button>
      {!collapsed ? (
        <div style={GROUP_ITEMS_CONTAINER_STYLE}>
          {annotations.map((annotation) => {
            const selected = selectedIndex === annotation.index;
            const itemStyle = {
              ...GROUP_ITEM_BASE_STYLE,
              border: selected
                ? '1px solid var(--pdfium-panel-accent-colour, #3b82f6)'
                : '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
              backgroundColor: selected
                ? 'var(--pdfium-panel-accent-bg, rgba(59, 130, 246, 0.08))'
                : 'var(--pdfium-panel-item-bg, #ffffff)',
              color: selected ? 'var(--pdfium-panel-accent-colour, #3b82f6)' : 'var(--pdfium-panel-colour, #374151)',
            };

            return (
              <button
                type="button"
                key={annotation.index}
                data-panel-item=""
                onClick={() => onSelect(annotation.index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(annotation.index);
                  }
                }}
                style={itemStyle}
              >
                <div style={GROUP_ITEM_ROW_STYLE}>
                  <span style={GROUP_ITEM_INDEX_STYLE}>#{annotation.index}</span>
                  <span style={GROUP_ITEM_BOUNDS_STYLE}>{formatAnnotationListBounds(annotation.bounds)}</span>
                </div>
                {annotation.contents ? <div style={GROUP_ITEM_CONTENTS_STYLE}>{annotation.contents}</div> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export { AnnotationGroup };
export type { AnnotationGroupProps };
