'use client';

export type {
  DocumentInfoResponse,
  ExtendedDocumentInfoResponse,
  SerialisedAnnotation,
  SerialisedAttachment,
  SerialisedFormWidget,
  SerialisedLink,
  SerialisedPageObject,
  SerialisedSignature,
} from '../context/protocol.js';
export type { WorkerPDFiumDocument } from '../context/worker-client.js';
export type {
  Bookmark,
  CharacterInfo,
  CharBox,
  Colour,
  DocumentMetadata,
  DocumentPermissions,
  JavaScriptAction,
  NamedDestination,
  PDFSignature,
  Rect,
  RenderOptions,
  StructureElement,
  TextSearchResult,
  ViewerPreferences,
  WebLink,
} from '../core/types.js';
// Value re-exports — these are enums (runtime values)
export { DocMDPPermission, FlattenFlags, FlattenResult, FormFieldType, PageRotation } from '../core/types.js';
export type { ActivityBarProps } from './components/activity-bar.js';
export { ActivityBar } from './components/activity-bar.js';
export type { AnnotationOverlayProps } from './components/annotation-overlay.js';
export { AnnotationOverlay } from './components/annotation-overlay.js';
export type { BookmarkPanelClassNames, BookmarkPanelProps } from './components/bookmark-panel.js';
export { BookmarkPanel } from './components/bookmark-panel.js';
export type { CharacterInspectorOverlayProps } from './components/character-inspector-overlay.js';
export { CharacterInspectorOverlay } from './components/character-inspector-overlay.js';
export type { DefaultToolbarProps, ToolbarButtonProps } from './components/default-toolbar.js';
export { DefaultToolbar, Separator, ToolbarButton } from './components/default-toolbar.js';
export type { DragDropZoneProps } from './components/drag-drop-zone.js';
export { DragDropZone } from './components/drag-drop-zone.js';
export type { PDFiumErrorBoundaryProps } from './components/error-boundary.js';
export { PDFiumErrorBoundary } from './components/error-boundary.js';
export type { LinkOverlayProps } from './components/link-overlay.js';
export { LinkOverlay } from './components/link-overlay.js';
export type { MarqueeOverlayProps } from './components/marquee-overlay.js';
export { MarqueeOverlay } from './components/marquee-overlay.js';
export type { PageNavigatorMinimapProps } from './components/page-navigator-minimap.js';
export { PageNavigatorMinimap } from './components/page-navigator-minimap.js';
export { AnnotationsPanel } from './components/panels/annotations-panel.js';
export { AttachmentsPanel } from './components/panels/attachments-panel.js';
export { FormsPanel } from './components/panels/forms-panel.js';
export { InfoPanel } from './components/panels/info-panel.js';
export { LinksPanel } from './components/panels/links-panel.js';
export { ObjectsPanel } from './components/panels/objects-panel.js';
export { StructurePanel } from './components/panels/structure-panel.js';
export { TextPanel } from './components/panels/text-panel.js';
export type { PanelConfig, PanelEntry, PanelId, ViewportEffects } from './components/panels/types.js';
export { getPanelId, getPanelLabel, getViewportEffects } from './components/panels/types.js';
export type { PDFCanvasProps } from './components/pdf-canvas.js';
// Components
export { PDFCanvas } from './components/pdf-canvas.js';
export type {
  PDFDocumentViewClassNames,
  PDFDocumentViewHandle,
  PDFDocumentViewProps,
  SearchState,
} from './components/pdf-document-view.js';
export { PDFDocumentView } from './components/pdf-document-view.js';
export type { PageOverlayInfo, PDFPageViewProps } from './components/pdf-page-view.js';
export { PDFPageView } from './components/pdf-page-view.js';
export type {
  ButtonOverrides,
  ButtonProps,
  FirstLastPageRenderProps,
  FitRenderProps,
  FullscreenRenderProps,
  InputOverrides,
  InputProps,
  InteractionModeRenderProps,
  NavigationRenderProps,
  PDFToolbarProps,
  PrintRenderProps,
  RotationRenderProps,
  ScrollModeRenderProps,
  SearchInputProps,
  SearchRenderProps,
  SelectOverrides,
  SelectProps,
  SpreadRenderProps,
  ToolbarContextValue,
  ToolbarSearchState,
  ZoomRenderProps,
} from './components/pdf-toolbar.js';
export { PDFToolbar, useToolbarContext } from './components/pdf-toolbar.js';
export type { PDFPanelState, PDFViewerClassNames, PDFViewerProps, PDFViewerState } from './components/pdf-viewer.js';
export {
  PDFViewer,
  usePDFPanel,
  usePDFPanelOptional,
  usePDFViewer,
  usePDFViewerOptional,
} from './components/pdf-viewer.js';
export type { SearchHighlightOverlayProps } from './components/search-highlight-overlay.js';
export { SearchHighlightOverlay } from './components/search-highlight-overlay.js';
export type { SearchPanelProps } from './components/search-panel.js';
export { SearchPanel } from './components/search-panel.js';
export type { SidebarPanelProps } from './components/sidebar-panel.js';
export { SidebarPanel } from './components/sidebar-panel.js';
export type { TextLayerProps } from './components/text-layer.js';
// TextLayer convenience component
export { TextLayer } from './components/text-layer.js';
export type { TextOverlayProps } from './components/text-overlay.js';
export { TextOverlay } from './components/text-overlay.js';
export type { ThumbnailStripClassNames, ThumbnailStripProps } from './components/thumbnail-strip.js';
export { ThumbnailStrip } from './components/thumbnail-strip.js';
export type { PDFiumContextValue, PDFiumProviderProps } from './context.js';
// Provider + Core
export { PDFiumProvider, usePDFium, usePDFiumDocument, usePDFiumInstance } from './context.js';
// Coordinate Utilities
export { pdfRectToScreen, pdfToScreen, screenToPdf } from './coordinates.js';
export { useAnnotations } from './hooks/use-annotations.js';
export { useAttachments } from './hooks/use-attachments.js';
export { useBookmarks } from './hooks/use-bookmarks.js';
export { useCharacterInspector } from './hooks/use-character-inspector.js';
export { useDevicePixelRatio } from './hooks/use-device-pixel-ratio.js';
export type { UseDocumentBytesResult } from './hooks/use-document-bytes.js';
export { useDocumentBytes } from './hooks/use-document-bytes.js';
// Form Action Hooks (split by API level)
export { useDocumentFormActions } from './hooks/use-document-form-actions.js';
export { useDocumentInfo } from './hooks/use-document-info.js';
export type {
  DocumentSearchMatch,
  UseDocumentSearchOptions,
  UseDocumentSearchResult,
} from './hooks/use-document-search.js';
export { useDocumentSearch } from './hooks/use-document-search.js';
export { useExtendedDocumentInfo } from './hooks/use-extended-document-info.js';
export type { FitMode } from './hooks/use-fit-zoom.js';
export { useFitZoom } from './hooks/use-fit-zoom.js';
export { useFormWidgets } from './hooks/use-form-widgets.js';
export type { FullscreenState } from './hooks/use-fullscreen.js';
export { useFullscreen } from './hooks/use-fullscreen.js';
export type { InteractionMode, InteractionModeState, MarqueeRect } from './hooks/use-interaction-mode.js';
export { useInteractionMode } from './hooks/use-interaction-mode.js';
export { useJavaScriptActions } from './hooks/use-javascript-actions.js';
export type { KeyboardActions, UseKeyboardShortcutsOptions } from './hooks/use-keyboard-shortcuts.js';
export { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts.js';
export { useLinks } from './hooks/use-links.js';
export { useMetadata } from './hooks/use-metadata.js';
export { useNamedDestinations } from './hooks/use-named-destinations.js';
export type { PageDimension } from './hooks/use-page-dimensions.js';
export { usePageDimensions } from './hooks/use-page-dimensions.js';
export { usePageFormActions } from './hooks/use-page-form-actions.js';
// Data Hooks
export { usePageInfo } from './hooks/use-page-info.js';
export { usePageLabel } from './hooks/use-page-label.js';
// Interaction Hooks
export { usePageNavigation } from './hooks/use-page-navigation.js';
export { usePageObjects } from './hooks/use-page-objects.js';
export type { PDFiumActionState } from './hooks/use-pdfium-action.js';
export { usePDFiumAction } from './hooks/use-pdfium-action.js';
export { usePermissions } from './hooks/use-permissions.js';
export type { PrintState } from './hooks/use-print.js';
export { usePrint } from './hooks/use-print.js';
export { usePrintPageRanges } from './hooks/use-print-page-ranges.js';
export type { RotationState } from './hooks/use-rotation.js';
export { useRotation } from './hooks/use-rotation.js';
export { useSignatures } from './hooks/use-signatures.js';
export { useStructureTree } from './hooks/use-structure-tree.js';
export type { UseSyncPDFiumResult } from './hooks/use-sync-pdfium.js';
export { useSyncPDFium } from './hooks/use-sync-pdfium.js';
export { useTextContent } from './hooks/use-text-content.js';
export { useTextSearch } from './hooks/use-text-search.js';
export { useViewerPreferences } from './hooks/use-viewer-preferences.js';
export type {
  ContainerState,
  FitState,
  NavigationState,
  ScrollModeState,
  SpreadModeState,
  UseViewerSetupOptions,
  UseViewerSetupResult,
  ZoomState,
} from './hooks/use-viewer-setup.js';
export { useViewerSetup } from './hooks/use-viewer-setup.js';
export type {
  ScrollMode,
  SpreadMode,
  UseVisiblePagesOptions,
  UseVisiblePagesResult,
  VisiblePage,
  ZoomAnchor,
} from './hooks/use-visible-pages.js';
export { useVisiblePages } from './hooks/use-visible-pages.js';
export { useWebLinks } from './hooks/use-web-links.js';
export type { UseWheelZoomOptions } from './hooks/use-wheel-zoom.js';
export { useWheelZoom } from './hooks/use-wheel-zoom.js';
export { useZoom } from './hooks/use-zoom.js';
// Cache Warming
export type { PrefetchTarget } from './prefetch.js';
export { prefetchPageData } from './prefetch.js';
// Theme
export type { PDFiumThemeMode } from './theme.js';
export { applyPDFiumTheme, getPDFiumThemeCSS, PDFIUM_THEME_VARIABLES } from './theme.js';
export { useDownload } from './use-download.js';
export { useRenderPage } from './use-render.js';
