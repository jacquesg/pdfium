'use client';

import type { CSSProperties, ReactNode } from 'react';

interface ToolbarGroupProps {
  groupId: string;
  label: string;
  children: ReactNode;
  style?: CSSProperties | undefined;
}

function ToolbarGroup({ groupId, label, children, style }: ToolbarGroupProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA APG toolbar pattern requires role="group" for logical button groups
    <div
      data-toolbar-group={groupId}
      role="group"
      aria-label={label}
      style={{ display: 'flex', alignItems: 'center', gap: 2, ...style }}
    >
      {children}
    </div>
  );
}

export { ToolbarGroup };
export type { ToolbarGroupProps };
