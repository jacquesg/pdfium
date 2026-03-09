import type { CSSProperties } from 'react';

export interface PageManagementPanelControlsProps {
  readonly canDelete: boolean;
  readonly canMoveDown: boolean;
  readonly canMoveUp: boolean;
  readonly onDelete: () => void;
  readonly onInsertAfter: () => void;
  readonly onInsertBefore: () => void;
  readonly onMoveDown: () => void;
  readonly onMoveUp: () => void;
}

export interface PageManagementPanelControlButtonConfig {
  readonly disabled?: boolean | undefined;
  readonly label: string;
  readonly onClick: () => void;
  readonly testId: string;
}

export interface PageManagementPanelControlGroup {
  readonly buttons: readonly PageManagementPanelControlButtonConfig[];
  readonly style: CSSProperties;
}
