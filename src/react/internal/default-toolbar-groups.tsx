import {
  ArrowDownToLine,
  Bookmark,
  Expand,
  Hand,
  Maximize,
  MousePointer2,
  PanelLeft,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Search,
} from 'lucide-react';
import { useToolbarContext } from '../components/pdf-toolbar.js';
import { usePDFPanelOptional, usePDFViewerOptional } from '../components/pdf-viewer-context.js';
import {
  ContinuousScrollIcon,
  DEFAULT_TOOLBAR_ICON_SIZE,
  EvenSpreadIcon,
  HorizontalScrollIcon,
  NoSpreadIcon,
  OddSpreadIcon,
  SinglePageIcon,
} from './default-toolbar-icons.js';
import { Separator, ToolbarButton } from './default-toolbar-primitives.js';
import { ToolbarGroup } from './toolbar-group.js';

const ICON_SIZE = DEFAULT_TOOLBAR_ICON_SIZE;

function PrintProgress({ progress }: { progress: number }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform="rotate(-90 10 10)"
        style={{ transition: 'stroke-dashoffset 200ms ease' }}
      />
    </svg>
  );
}

function FitGroup() {
  const { scrollMode, fit } = useToolbarContext();
  const isHorizontal = scrollMode.scrollMode === 'horizontal';

  return (
    <ToolbarGroup groupId="fit" label="Fit modes">
      {isHorizontal ? (
        <ToolbarButton {...fit.getFitHeightProps()} label="Fit to height" active={fit.activeFitMode === 'page-height'}>
          <ArrowDownToLine size={ICON_SIZE} strokeWidth={2} />
        </ToolbarButton>
      ) : (
        <ToolbarButton {...fit.getFitWidthProps()} label="Fit to width" active={fit.activeFitMode === 'page-width'}>
          <ArrowDownToLine size={ICON_SIZE} strokeWidth={2} style={{ transform: 'rotate(90deg)' }} />
        </ToolbarButton>
      )}
      <ToolbarButton {...fit.getFitPageProps()} label="Fit to page" active={fit.activeFitMode === 'page-fit'}>
        <Maximize size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
    </ToolbarGroup>
  );
}

function ScrollAndSpreadGroup() {
  const { scrollMode, spread } = useToolbarContext();
  const isHorizontal = scrollMode.scrollMode === 'horizontal';

  return (
    <>
      <ToolbarGroup groupId="scroll-mode" label="Scroll mode">
        <ToolbarButton
          label="Continuous scroll"
          active={scrollMode.scrollMode === 'continuous'}
          onClick={() => scrollMode.setScrollMode('continuous')}
        >
          <ContinuousScrollIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Single page"
          active={scrollMode.scrollMode === 'single'}
          onClick={() => scrollMode.setScrollMode('single')}
        >
          <SinglePageIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal scroll"
          active={isHorizontal}
          onClick={() => scrollMode.setScrollMode('horizontal')}
        >
          <HorizontalScrollIcon />
        </ToolbarButton>
      </ToolbarGroup>

      <Separator />
      <ToolbarGroup groupId="spread-mode" label="Page spread" style={{ opacity: isHorizontal ? 0.4 : 1 }}>
        <ToolbarButton
          label={isHorizontal ? 'No spreads (unavailable in horizontal mode)' : 'No spreads'}
          active={!isHorizontal && spread.spreadMode === 'none'}
          disabled={isHorizontal}
          onClick={() => spread.setSpreadMode('none')}
        >
          <NoSpreadIcon />
        </ToolbarButton>
        <ToolbarButton
          label={isHorizontal ? 'Odd page spreads (unavailable in horizontal mode)' : 'Odd page spreads'}
          active={!isHorizontal && spread.spreadMode === 'odd'}
          disabled={isHorizontal}
          onClick={() => spread.setSpreadMode('odd')}
        >
          <OddSpreadIcon />
        </ToolbarButton>
        <ToolbarButton
          label={isHorizontal ? 'Even page spreads (unavailable in horizontal mode)' : 'Even page spreads'}
          active={!isHorizontal && spread.spreadMode === 'even'}
          disabled={isHorizontal}
          onClick={() => spread.setSpreadMode('even')}
        >
          <EvenSpreadIcon />
        </ToolbarButton>
      </ToolbarGroup>
    </>
  );
}

function PanelToggles() {
  const panelCtx = usePDFPanelOptional();
  const ctx = usePDFViewerOptional();
  if (!ctx || !panelCtx) return null;
  if (panelCtx.hasPanelBar) return null;

  const isThumbnailsActive = panelCtx.activePanel === 'thumbnails';
  const isBookmarksActive = panelCtx.activePanel === 'bookmarks';

  return (
    <>
      <ToolbarButton
        label={isThumbnailsActive ? 'Hide thumbnails' : 'Show thumbnails'}
        active={isThumbnailsActive}
        onClick={() => panelCtx.togglePanel('thumbnails')}
      >
        <PanelLeft size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        label={isBookmarksActive ? 'Hide bookmarks' : 'Show bookmarks'}
        active={isBookmarksActive}
        onClick={() => panelCtx.togglePanel('bookmarks')}
      >
        <Bookmark size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
      <Separator />
    </>
  );
}

function InteractionModeGroup({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    <>
      <ToolbarGroup groupId="interaction" label="Interaction tools">
        <InteractionModeButtons />
      </ToolbarGroup>
      <Separator />
    </>
  );
}

function InteractionModeButtons() {
  const { interaction } = useToolbarContext();
  return (
    <>
      <ToolbarButton {...interaction.getPointerProps()} label="Select text (V)" active={interaction.mode === 'pointer'}>
        <MousePointer2 size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton {...interaction.getPanProps()} label="Hand tool (H)" active={interaction.mode === 'pan'}>
        <Hand size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        {...interaction.getMarqueeProps()}
        label="Marquee zoom (Z)"
        active={interaction.mode === 'marquee-zoom'}
      >
        <ScanSearch size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
    </>
  );
}

function RotationGroup({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    <>
      <RotationButtons />
      <Separator />
    </>
  );
}

function RotationButtons() {
  const { rotation } = useToolbarContext();
  return (
    <ToolbarGroup groupId="rotation" label="Rotation">
      <ToolbarButton {...rotation.getRotateCwProps()} label="Rotate clockwise (Ctrl+])">
        <RotateCw size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton {...rotation.getRotateCcwProps()} label="Rotate anticlockwise (Ctrl+[)">
        <RotateCcw size={ICON_SIZE} strokeWidth={2} />
      </ToolbarButton>
    </ToolbarGroup>
  );
}

function SearchButton() {
  const { search } = useToolbarContext();
  if (!search) return null;
  return (
    <ToolbarButton
      {...search.getToggleProps()}
      label={search.isOpen ? 'Close search (Ctrl+F)' : 'Search (Ctrl+F)'}
      active={search.isOpen}
    >
      <Search size={ICON_SIZE} strokeWidth={2} />
    </ToolbarButton>
  );
}

function FullscreenButton() {
  const { fullscreen } = useToolbarContext();
  return (
    <ToolbarButton
      {...fullscreen.getToggleProps()}
      label={fullscreen.isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
    >
      <Expand size={ICON_SIZE} strokeWidth={2} />
    </ToolbarButton>
  );
}

export {
  FitGroup,
  FullscreenButton,
  InteractionModeGroup,
  PanelToggles,
  PrintProgress,
  RotationGroup,
  ScrollAndSpreadGroup,
  SearchButton,
};
