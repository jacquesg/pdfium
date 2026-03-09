import type {
  PageManagementPanelControlGroup,
  PageManagementPanelControlsProps,
} from './page-management-panel-controls.types.js';

export function buildPageManagementPanelControlGroups({
  canDelete,
  canMoveDown,
  canMoveUp,
  onDelete,
  onInsertAfter,
  onInsertBefore,
  onMoveDown,
  onMoveUp,
}: PageManagementPanelControlsProps): readonly PageManagementPanelControlGroup[] {
  return [
    {
      buttons: [
        { disabled: !canDelete, label: 'Delete', onClick: onDelete, testId: 'delete-page-button' },
        { label: 'Insert Before', onClick: onInsertBefore, testId: 'insert-before-button' },
        { label: 'Insert After', onClick: onInsertAfter, testId: 'insert-after-button' },
      ],
      style: { display: 'flex', flexWrap: 'wrap', gap: 4 },
    },
    {
      buttons: [
        { disabled: !canMoveUp, label: 'Move Up', onClick: onMoveUp, testId: 'move-up-button' },
        { disabled: !canMoveDown, label: 'Move Down', onClick: onMoveDown, testId: 'move-down-button' },
      ],
      style: { display: 'flex', gap: 4 },
    },
  ];
}
