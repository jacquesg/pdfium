'use client';

import { X } from 'lucide-react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

interface SidebarPanelProps {
  title: string;
  onClose?: (() => void) | undefined;
  /** Optional icon component rendered before the title. Accepts any component with a `size` prop (e.g. lucide-react icons). */
  icon?: ComponentType<{ size?: number }> | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

function SidebarPanel({ title, onClose, icon: Icon, className, style, children }: SidebarPanelProps) {
  const titleId = useId();

  return (
    <aside
      data-pdfium-sidebar
      aria-labelledby={titleId}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: 'var(--pdfium-sidebar-bg, #ffffff)',
        borderRight: '1px solid var(--pdfium-sidebar-border, #e5e7eb)',
        display: 'flex',
        flexDirection: 'column' as const,
        ...style,
      }}
    >
      <header
        style={{
          background: 'var(--pdfium-sidebar-header-bg, #f9fafb)',
          borderBottom: '1px solid var(--pdfium-sidebar-header-border, #e5e7eb)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--pdfium-sidebar-header-colour, #374151)',
        }}
      >
        {Icon && <Icon size={16} />}
        <h2 id={titleId} style={{ fontWeight: 600, fontSize: 13, flex: 1, margin: 0 }}>
          {title}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </header>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</div>
    </aside>
  );
}

export { SidebarPanel };
export type { SidebarPanelProps };
