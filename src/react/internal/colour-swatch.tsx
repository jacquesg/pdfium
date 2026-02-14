'use client';

interface ColourSwatchProps {
  /** RGBA colour to display. Renders a dash if undefined or null. */
  colour: { r: number; g: number; b: number; a: number } | undefined | null;
  label?: string | undefined;
  className?: string | undefined;
}

/** Renders a small colour preview square with an optional label. */
function ColourSwatch({ colour, label, className }: ColourSwatchProps) {
  if (colour === undefined || colour === null) {
    return (
      <span className={className} style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}>
        {'\u2014'}
      </span>
    );
  }

  const bg = `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a / 255})`;

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: '16px',
          height: '16px',
          borderRadius: '2px',
          backgroundColor: bg,
          border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
          flexShrink: 0,
        }}
      />
      {label !== undefined && (
        <span style={{ fontSize: '13px', color: 'var(--pdfium-panel-colour, #374151)' }}>{label}</span>
      )}
    </span>
  );
}

export { ColourSwatch };
