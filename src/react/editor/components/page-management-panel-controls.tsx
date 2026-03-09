import type { ReactNode } from 'react';
import { PageManagementPanelControlButton } from './page-management-panel-control-button.js';
import { buildPageManagementPanelControlGroups } from './page-management-panel-control-groups.js';
import type { PageManagementPanelControlsProps } from './page-management-panel-controls.types.js';

export function PageManagementPanelControls({
  canDelete,
  canMoveDown,
  canMoveUp,
  onDelete,
  onInsertAfter,
  onInsertBefore,
  onMoveDown,
  onMoveUp,
}: PageManagementPanelControlsProps): ReactNode {
  const groups = buildPageManagementPanelControlGroups({
    canDelete,
    canMoveDown,
    canMoveUp,
    onDelete,
    onInsertAfter,
    onInsertBefore,
    onMoveDown,
    onMoveUp,
  });

  return (
    <>
      {groups.map((group) => (
        <div key={group.buttons.map((button) => button.testId).join(':')} style={group.style}>
          {group.buttons.map((button) => (
            <PageManagementPanelControlButton key={button.testId} {...button} />
          ))}
        </div>
      ))}
    </>
  );
}
