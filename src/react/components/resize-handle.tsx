import type { UseResizeHandleProps } from '../hooks/use-resize.js';

interface ResizeHandleProps {
  handleProps: UseResizeHandleProps;
  isResizing: boolean;
}

function ResizeHandle({ handleProps, isResizing }: ResizeHandleProps) {
  const activeColour = 'var(--pdfium-activity-bar-active-colour, #3b82f6)';
  const borderColour = 'var(--pdfium-sidebar-border, #e5e7eb)';

  return (
    <div
      {...handleProps}
      style={{
        ...handleProps.style,
        width: 8,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        position: 'relative',
      }}
    >
      {/* Visible border line — always shown, truly centred */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-0.5px)',
          top: 0,
          width: 1,
          height: '100%',
          background: isResizing ? activeColour : borderColour,
          transition: 'background 150ms ease',
        }}
      />
      {/* Grip dots — visual affordance for resizability */}
      <div
        data-pdfium-resize-grip=""
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '2px 0',
          opacity: isResizing ? 1 : 0.5,
          transition: 'opacity 150ms ease',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: isResizing ? activeColour : 'var(--pdfium-panel-muted-colour, #9ca3af)',
              transition: 'background 150ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export { ResizeHandle };
export type { ResizeHandleProps };
