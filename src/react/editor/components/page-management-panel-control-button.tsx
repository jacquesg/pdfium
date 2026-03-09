import type { CSSProperties, ReactNode } from 'react';
import type { PageManagementPanelControlButtonConfig } from './page-management-panel-controls.types.js';

const BUTTON_STYLE: CSSProperties = {
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 12,
  padding: '4px 8px',
};

export function PageManagementPanelControlButton({
  disabled = false,
  label,
  onClick,
  testId,
}: PageManagementPanelControlButtonConfig): ReactNode {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{ ...BUTTON_STYLE, opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </button>
  );
}
