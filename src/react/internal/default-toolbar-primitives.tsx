'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean | undefined;
  children: ReactNode;
}

const TOOLBAR_BUTTON_BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  padding: '8px 10px',
  color: 'var(--pdfium-toolbar-btn-colour, #374151)',
  border: 'none',
  borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
  transition: 'background-color 150ms ease, opacity 150ms ease',
};

const TOOLBAR_SEPARATOR_STYLE: CSSProperties = {
  display: 'inline-block',
  width: 1,
  height: 20,
  margin: '0 4px',
  background: 'var(--pdfium-toolbar-separator, #e5e7eb)',
  flexShrink: 0,
};

function ToolbarButton({ label, active, style: styleProp, children, ...props }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active !== undefined ? active : undefined}
      aria-disabled={props.disabled || undefined}
      style={{
        ...TOOLBAR_BUTTON_BASE_STYLE,
        background: active
          ? 'var(--pdfium-toolbar-btn-active-bg, #e5e7eb)'
          : 'var(--pdfium-toolbar-btn-bg, transparent)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        ...styleProp,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span aria-hidden="true" style={TOOLBAR_SEPARATOR_STYLE} />;
}

export { Separator, TOOLBAR_BUTTON_BASE_STYLE, TOOLBAR_SEPARATOR_STYLE, ToolbarButton };
export type { ToolbarButtonProps };
