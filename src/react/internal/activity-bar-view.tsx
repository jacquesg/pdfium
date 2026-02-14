'use client';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Fragment } from 'react';
import type { ActivityBarItemModel } from './activity-bar-model.js';

interface ActivityBarViewProps {
  items: readonly ActivityBarItemModel[];
  panelContainerId?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  onButtonRef: (index: number, element: HTMLButtonElement | null) => void;
  onButtonClick: (index: number, id: string) => void;
  onButtonKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  renderIcon: (item: ActivityBarItemModel) => ReactNode;
}

function ActivityBarView({
  items,
  panelContainerId,
  className,
  style,
  onButtonRef,
  onButtonClick,
  onButtonKeyDown,
  renderIcon,
}: ActivityBarViewProps) {
  return (
    <div
      data-pdfium-activity-bar
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Panel navigation"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 0',
        width: 'var(--pdfium-activity-bar-width, 40px)',
        background: 'var(--pdfium-activity-bar-bg, #f9fafb)',
        borderRight: '1px solid var(--pdfium-activity-bar-border, #d1d5db)',
        flexShrink: 0,
        ...style,
      }}
    >
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {item.showSeparatorBefore ? (
            <hr
              key={`sep-${item.id}`}
              style={{
                margin: '4px 8px',
                border: 'none',
                borderTop: '1px solid var(--pdfium-activity-bar-border, #e5e7eb)',
              }}
            />
          ) : null}
          <button
            ref={(element) => onButtonRef(index, element)}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={item.isActive}
            aria-controls={panelContainerId}
            tabIndex={item.tabIndex}
            onClick={() => onButtonClick(index, item.id)}
            onKeyDown={(event) => onButtonKeyDown(event, index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1',
              padding: 0,
              border: 'none',
              borderLeft: item.isActive
                ? '2px solid var(--pdfium-activity-bar-active-border, #3b82f6)'
                : '2px solid transparent',
              background: item.isActive
                ? 'var(--pdfium-activity-bar-active-bg, #e5e7eb)'
                : 'var(--pdfium-activity-bar-bg, #f9fafb)',
              color: item.isActive
                ? 'var(--pdfium-activity-bar-active-colour, #3b82f6)'
                : 'var(--pdfium-activity-bar-colour, #6b7280)',
              cursor: 'pointer',
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
          >
            {renderIcon(item)}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

export { ActivityBarView };
export type { ActivityBarViewProps };
