import type { CSSProperties } from 'react';

export function createHitTargetStyle(isSelected: boolean): CSSProperties {
  return {
    cursor: 'pointer',
    pointerEvents: isSelected ? 'none' : 'auto',
  };
}
