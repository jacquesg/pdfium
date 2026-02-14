'use client';

import type { CSSProperties, ReactNode } from 'react';

interface PanelButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | undefined;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    backgroundColor: 'var(--pdfium-panel-btn-bg, #3b82f6)',
    color: 'var(--pdfium-panel-btn-colour, #ffffff)',
  },
  secondary: {
    backgroundColor: 'var(--pdfium-panel-btn-secondary-bg, #f3f4f6)',
    color: 'var(--pdfium-panel-btn-secondary-colour, #374151)',
  },
  danger: {
    backgroundColor: 'var(--pdfium-panel-danger-bg, #fef2f2)',
    color: 'var(--pdfium-panel-danger-colour, #991b1b)',
  },
};

/** Themed button component using `--pdfium-panel-*` CSS custom properties. */
function PanelButton({ variant = 'primary', onClick, disabled, className, style, children }: PanelButtonProps) {
  const colours = variantStyles[variant] ?? variantStyles.primary;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        ...colours,
        border: 'none',
        borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 150ms ease, opacity 150ms ease',
        lineHeight: '1.4',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export { PanelButton };
