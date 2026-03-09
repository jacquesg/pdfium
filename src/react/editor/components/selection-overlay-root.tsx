import type { CSSProperties, PointerEventHandler, ReactNode } from 'react';

interface SelectionOverlayRootProps {
  readonly children: ReactNode;
  readonly onLostPointerCapture: PointerEventHandler<HTMLDivElement>;
  readonly onPointerCancel: PointerEventHandler<HTMLDivElement>;
  readonly onPointerMove: PointerEventHandler<HTMLDivElement>;
  readonly onPointerUp: PointerEventHandler<HTMLDivElement>;
  readonly rootStyle: CSSProperties;
}

export function SelectionOverlayRoot({
  children,
  onLostPointerCapture,
  onPointerCancel,
  onPointerMove,
  onPointerUp,
  rootStyle,
}: SelectionOverlayRootProps): ReactNode {
  return (
    <div
      data-testid="selection-overlay"
      style={rootStyle}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
    >
      {children}
    </div>
  );
}
