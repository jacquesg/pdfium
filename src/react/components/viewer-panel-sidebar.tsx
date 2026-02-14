'use client';

import type { ReactNode, RefObject } from 'react';
import { AnnotationsPanel } from './panels/annotations-panel.js';
import { AttachmentsPanel } from './panels/attachments-panel.js';
import { FormsPanel } from './panels/forms-panel.js';
import { InfoPanel } from './panels/info-panel.js';
import { LinksPanel } from './panels/links-panel.js';
import { ObjectsPanel } from './panels/objects-panel.js';
import { StructurePanel } from './panels/structure-panel.js';
import { TextPanel } from './panels/text-panel.js';
import type { PanelEntry, PanelId } from './panels/types.js';
import { BUILTIN_LABELS, getPanelId } from './panels/types.js';
import { SidebarPanel } from './sidebar-panel.js';

interface BuiltinPanelSlotProps {
  panelId: PanelId;
  onClose: () => void;
  renderThumbnails: (onClose: () => void) => ReactNode;
  renderBookmarks: (onClose: () => void) => ReactNode;
}

interface ViewerPanelSidebarProps {
  panels: readonly PanelEntry[];
  activePanel: string;
  onClose: () => void;
  panelContainerId?: string | undefined;
  panelContainerRef: RefObject<HTMLDivElement | null>;
  className?: string | undefined;
  renderThumbnails: (onClose: () => void) => ReactNode;
  renderBookmarks: (onClose: () => void) => ReactNode;
}

type StaticBuiltinPanelId = Exclude<PanelId, 'thumbnails' | 'bookmarks'>;

const STATIC_BUILTIN_PANEL_CONTENT: Record<StaticBuiltinPanelId, () => ReactNode> = {
  annotations: () => <AnnotationsPanel />,
  objects: () => <ObjectsPanel />,
  forms: () => <FormsPanel />,
  text: () => <TextPanel />,
  structure: () => <StructurePanel />,
  attachments: () => <AttachmentsPanel />,
  links: () => <LinksPanel />,
  info: () => <InfoPanel />,
};

function isStaticBuiltinPanel(panelId: PanelId): panelId is StaticBuiltinPanelId {
  return panelId !== 'thumbnails' && panelId !== 'bookmarks';
}

function BuiltinPanelSlot({ panelId, onClose, renderThumbnails, renderBookmarks }: BuiltinPanelSlotProps) {
  if (panelId === 'thumbnails') {
    return renderThumbnails(onClose);
  }

  if (panelId === 'bookmarks') {
    return renderBookmarks(onClose);
  }

  if (!isStaticBuiltinPanel(panelId)) {
    return null;
  }

  const renderContent = STATIC_BUILTIN_PANEL_CONTENT[panelId];
  return (
    <SidebarPanel title={BUILTIN_LABELS[panelId]} onClose={onClose}>
      {renderContent()}
    </SidebarPanel>
  );
}

function ViewerPanelSidebar({
  panels,
  activePanel,
  onClose,
  panelContainerId,
  panelContainerRef,
  className,
  renderThumbnails,
  renderBookmarks,
}: ViewerPanelSidebarProps) {
  const entry = panels.find((panelEntry) => getPanelId(panelEntry) === activePanel);
  if (!entry) return null;

  const content =
    typeof entry === 'string' ? (
      <BuiltinPanelSlot
        panelId={entry}
        onClose={onClose}
        renderThumbnails={renderThumbnails}
        renderBookmarks={renderBookmarks}
      />
    ) : (
      <SidebarPanel title={entry.label} onClose={onClose}>
        {entry.render()}
      </SidebarPanel>
    );

  return (
    <div id={panelContainerId} ref={panelContainerRef} className={className} style={{ height: '100%' }}>
      {content}
    </div>
  );
}

export { ViewerPanelSidebar };
export type { ViewerPanelSidebarProps };
