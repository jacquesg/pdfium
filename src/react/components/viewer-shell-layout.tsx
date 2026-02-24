import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useId } from 'react';
import type { UseResizeHandleProps } from '../hooks/use-resize.js';
import { ActivityBar } from './activity-bar.js';
import type { PanelEntry } from './panels/types.js';
import { ResizeHandle } from './resize-handle.js';
import { ViewerPanelSidebar } from './viewer-panel-sidebar.js';

interface ViewerPanelLayoutProps {
  fullscreenRef: RefObject<HTMLDivElement | null> | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  isResizing: boolean;
  toolbar: ReactNode;
  search: ReactNode;
  panels: readonly PanelEntry[];
  activePanel: string | null;
  onTogglePanel: (id: string) => void;
  lastFocusedButtonRef: RefObject<HTMLButtonElement | null>;
  panelContainerRef: RefObject<HTMLDivElement | null>;
  activityBarClassName?: string | undefined;
  panelClassName?: string | undefined;
  sidebarWidth: number;
  resizeHandleProps: UseResizeHandleProps;
  pages: ReactNode;
  renderThumbnails: (onClose: () => void) => ReactNode;
  renderBookmarks: (onClose: () => void) => ReactNode;
}

interface ViewerDefaultLayoutProps {
  fullscreenRef: RefObject<HTMLDivElement | null> | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  toolbar: ReactNode;
  search: ReactNode;
  contentClassName?: string | undefined;
  pages: ReactNode;
}

function ViewerPanelLayout({
  fullscreenRef,
  className,
  style,
  isResizing,
  toolbar,
  search,
  panels,
  activePanel,
  onTogglePanel,
  lastFocusedButtonRef,
  panelContainerRef,
  activityBarClassName,
  panelClassName,
  sidebarWidth,
  resizeHandleProps,
  pages,
  renderThumbnails,
  renderBookmarks,
}: ViewerPanelLayoutProps) {
  const panelContainerId = useId();

  return (
    <div
      ref={fullscreenRef}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--pdfium-container-bg, #e8eaed)',
        ...(isResizing ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined),
        ...style,
      }}
    >
      {toolbar}
      {search}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ActivityBar
          panels={panels}
          activePanel={activePanel}
          onTogglePanel={onTogglePanel}
          panelContainerId={panelContainerId}
          lastFocusedButtonRef={lastFocusedButtonRef}
          className={activityBarClassName}
        />
        <div
          style={{
            width: activePanel !== null ? sidebarWidth : 0,
            overflow: 'hidden',
            transition: isResizing ? 'none' : 'width 200ms ease',
            flexShrink: 0,
            background: 'var(--pdfium-sidebar-bg, #ffffff)',
          }}
        >
          {activePanel !== null && (
            <ViewerPanelSidebar
              panels={panels}
              activePanel={activePanel}
              onClose={() => onTogglePanel(activePanel)}
              panelContainerId={panelContainerId}
              panelContainerRef={panelContainerRef}
              className={panelClassName}
              renderThumbnails={renderThumbnails}
              renderBookmarks={renderBookmarks}
            />
          )}
        </div>
        {activePanel !== null && <ResizeHandle handleProps={resizeHandleProps} isResizing={isResizing} />}
        {pages}
      </div>
    </div>
  );
}

function ViewerDefaultLayout({
  fullscreenRef,
  className,
  style,
  toolbar,
  search,
  contentClassName,
  pages,
}: ViewerDefaultLayoutProps) {
  return (
    <div
      ref={fullscreenRef}
      className={className}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', ...style }}
    >
      {toolbar}
      {search}
      <div className={contentClassName} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {pages}
      </div>
    </div>
  );
}

export { ViewerDefaultLayout, ViewerPanelLayout };
export type { ViewerDefaultLayoutProps, ViewerPanelLayoutProps };
