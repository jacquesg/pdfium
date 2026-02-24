import type { ReactNode } from 'react';

interface EmptyPanelStateProps {
  icon?: ReactNode | undefined;
  message: string;
  className?: string | undefined;
}

/** Centred empty-state placeholder with optional icon. */
function EmptyPanelState({ icon, message, className }: EmptyPanelStateProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '32px 16px',
        textAlign: 'center',
        color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
        fontSize: '13px',
      }}
    >
      {icon !== undefined ? (
        <div aria-hidden="true">{icon}</div>
      ) : (
        <div aria-hidden="true" style={{ opacity: 0.35 }}>
          <svg
            aria-hidden="true"
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      )}
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}

export { EmptyPanelState };
