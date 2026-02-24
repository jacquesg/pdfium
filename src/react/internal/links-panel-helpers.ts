import type { SerialisedLink } from '../../context/protocol.js';
import { formatLinkDestinationPage } from './links-panel-copy.js';

type LinksPanelTabId = 'links' | 'weblinks';

function formatLinkTarget(link: SerialisedLink): string {
  if (link.action?.uri) return link.action.uri;
  if (link.destination) return formatLinkDestinationPage(link.destination.pageIndex);
  return '\u2014';
}

function clampLinksPageIndex(pageIndex: number, pageCount: number): number {
  const maxPage = Math.max(0, pageCount - 1);
  if (!Number.isFinite(pageIndex)) return 0;
  const integerIndex = Math.trunc(pageIndex);
  return Math.min(Math.max(0, integerIndex), maxPage);
}

function isLinksPanelTabId(value: string): value is LinksPanelTabId {
  return value === 'links' || value === 'weblinks';
}

export { clampLinksPageIndex, formatLinkTarget, isLinksPanelTabId };
export type { LinksPanelTabId };
