import type { ReactNode, RefObject } from 'react';

interface EditorOverlayContainerLayerProps {
  readonly containerRef: RefObject<HTMLDivElement | null>;
}

export function EditorOverlayContainerLayer({ containerRef }: EditorOverlayContainerLayerProps): ReactNode {
  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}
