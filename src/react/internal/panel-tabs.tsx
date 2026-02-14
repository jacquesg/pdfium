'use client';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useCallback, useId, useRef } from 'react';

/** Definition for a single tab. */
interface TabDef {
  id: string;
  label: string;
}

interface PanelTabsProps {
  tabs: TabDef[];
  activeTab: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/** ARIA-compliant tablist with roving tabindex and keyboard navigation. */
function PanelTabs({ tabs, activeTab, onChange, children, className, style }: PanelTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  const getTabId = useCallback((tabId: string) => `${idPrefix}-tab-${tabId}`, [idPrefix]);
  const getPanelId = useCallback((tabId: string) => `${idPrefix}-tabpanel-${tabId}`, [idPrefix]);

  const focusTab = useCallback((index: number) => {
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      if (currentIndex === -1) return;

      let nextIndex: number | undefined;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const tab = tabs[nextIndex];
      if (tab !== undefined) {
        onChange(tab.id);
        focusTab(nextIndex);
      }
    },
    [tabs, activeTab, onChange, focusTab],
  );

  return (
    <div className={className} style={style}>
      <div
        ref={tablistRef}
        role="tablist"
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
          gap: 0,
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={getTabId(tab.id)}
              aria-selected={isActive}
              aria-controls={getPanelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--pdfium-panel-item-active-border, #93c5fd)'
                  : '2px solid transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive
                  ? 'var(--pdfium-panel-item-active-colour, #1d4ed8)'
                  : 'var(--pdfium-panel-secondary-colour, #6b7280)',
                cursor: 'pointer',
                transition: 'border-color 150ms ease, color 150ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) =>
        tab.id === activeTab ? (
          // biome-ignore lint/a11y/noNoninteractiveTabindex: ARIA tabpanel must be focusable per WAI-ARIA APG spec
          <div key={tab.id} role="tabpanel" id={getPanelId(tab.id)} aria-labelledby={getTabId(tab.id)} tabIndex={0}>
            {children}
          </div>
        ) : null,
      )}
    </div>
  );
}

export { PanelTabs };
export type { TabDef };
