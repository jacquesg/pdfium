import {
  type CSSProperties,
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DefaultToolbar,
  PDFViewer,
  type PageOverlayInfo,
  useAnnotations,
  usePDFium,
  usePDFiumDocument,
  usePDFViewer,
} from '@scaryterry/pdfium/react';
import {
  AnnotationPropertyPanel,
  EditorOverlay,
  EditorProvider,
  getUnknownErrorMessage,
  isEditorRedactionAnnotation,
  useAnnotationCrud,
  useEditor,
  useEditorSave,
  useEditorInteractionBridge,
  useAnnotationMutationPending,
  useAnnotationMutationStore,
  useRedaction,
  useResolvedEditorAnnotations,
} from '@scaryterry/pdfium/react/editor';
import type { OptimisticAnnotationPatch } from '@scaryterry/pdfium/react/editor';
import type { EditorTool, TextMarkupActionTool } from '@scaryterry/pdfium/react/editor';
import {
  Circle,
  Highlighter,
  type LucideIcon,
  Minus,
  Pen,
  Redo2,
  Save,
  ShieldAlert,
  ShieldOff,
  Square,
  Stamp,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from 'lucide-react';

// ── Tool definitions ─────────────────────────────────────────

interface ToolDef {
  readonly tool: EditorTool | TextMarkupActionTool;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly action?: boolean;
}

const TOOL_GROUPS: readonly { title: string; tools: readonly ToolDef[] }[] = [
  {
    title: 'Text markup',
    tools: [
      { tool: 'highlight', label: 'Highlight', icon: Highlighter, action: true },
      { tool: 'underline', label: 'Underline', icon: Underline, action: true },
      { tool: 'strikeout', label: 'Strikeout', icon: Strikethrough, action: true },
    ],
  },
  {
    title: 'Drawing',
    tools: [
      { tool: 'freetext', label: 'Text', icon: Type },
      { tool: 'ink', label: 'Draw', icon: Pen },
      { tool: 'rectangle', label: 'Rectangle', icon: Square },
      { tool: 'circle', label: 'Circle', icon: Circle },
      { tool: 'line', label: 'Line', icon: Minus },
    ],
  },
  {
    title: 'Advanced',
    tools: [
      { tool: 'stamp', label: 'Stamp', icon: Stamp },
      { tool: 'redact', label: 'Redact', icon: ShieldOff },
    ],
  },
];

const MARKUP_ACTION_TOOLS = new Set<TextMarkupActionTool>(['highlight', 'underline', 'strikeout']);
const VIEWER_SELECT_TEXT_BUTTON_SELECTOR = 'button[aria-label="Select text (V)"], button[aria-label="Pointer tool"]';

interface RedactionPageCount {
  readonly pageIndex: number;
  readonly count: number;
}

interface RedactionSummaryState {
  readonly pageCounts: readonly RedactionPageCount[];
  readonly totalCount: number;
  readonly loading: boolean;
}

const EMPTY_REDACTION_SUMMARY: RedactionSummaryState = {
  pageCounts: [],
  totalCount: 0,
  loading: false,
};
const REDACTION_SUMMARY_DEBOUNCE_MS = 120;

function useRedactionSummary(document: ReturnType<typeof usePDFium>['document']): RedactionSummaryState {
  const { documentRevision, pageRevisionVersion } = usePDFiumDocument();
  const [summary, setSummary] = useState<RedactionSummaryState>(EMPTY_REDACTION_SUMMARY);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!document) {
      setSummary(EMPTY_REDACTION_SUMMARY);
      return () => {
        cancelled = true;
      };
    }

    setSummary((previous) => ({ ...previous, loading: true }));
    timer = globalThis.setTimeout(() => {
      void (async () => {
        const pageCounts: RedactionPageCount[] = [];
        let totalCount = 0;
        for (let pageIndex = 0; pageIndex < document.pageCount; pageIndex++) {
          const page = await document.getPage(pageIndex);
          try {
            const annotations = await page.getAnnotations();
            const count = annotations.filter(isEditorRedactionAnnotation).length;
            if (count > 0) {
              pageCounts.push({ pageIndex, count });
              totalCount += count;
            }
          } finally {
            await page[Symbol.asyncDispose]();
          }
        }

        if (cancelled) return;
        setSummary({ pageCounts, totalCount, loading: false });
      })().catch((error: unknown) => {
        if (cancelled) return;
        console.error('[PDFium Editor] Failed to compute redaction summary:', error);
        setSummary({ pageCounts: [], totalCount: 0, loading: false });
      });
    }, REDACTION_SUMMARY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [document, documentRevision, pageRevisionVersion]);

  return summary;
}

// ── Page overlay (proper component — hooks are legal here) ───
// `renderPageOverlay` is called as a function, so the callback
// itself must be hook-free. It returns a JSX element whose
// component identity is stable, so React mounts it normally.

function EditorPageOverlayBridge(info: PageOverlayInfo) {
  const { document } = usePDFium();
  const { viewer } = usePDFViewer();
  const annotations = useAnnotations(document, info.pageIndex);
  // z-index must exceed all built-in page layers (TextOverlay: 10,
  // LinkOverlay: 15, SearchHighlight: 20, AnnotationOverlay: 30)
  // so the editor overlay receives pointer events above the text layer.
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
      <EditorOverlay
        pageIndex={info.pageIndex}
        scale={info.scale}
        originalHeight={info.originalHeight}
        width={info.width}
        height={info.height}
        annotations={annotations.data ?? []}
        annotationsPending={annotations.isLoading || annotations.isPlaceholderData}
        document={document}
        selectionEnabled={viewer.interaction.mode === 'pointer'}
      />
    </div>
  );
}

/** Hook-free render callback — returns JSX that React mounts as a component. */
function renderEditorOverlay(info: PageOverlayInfo): ReactNode {
  return <EditorPageOverlayBridge {...info} />;
}

// ── Toolbar styling (matches DefaultToolbar CSS custom properties) ──

const ICON_SIZE = 18;

const SEPARATOR_STYLE: CSSProperties = {
  display: 'inline-block',
  width: 1,
  height: 20,
  margin: '0 4px',
  background: 'var(--pdfium-toolbar-separator, #e5e7eb)',
  flexShrink: 0,
};

const BUTTON_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  padding: '8px 10px',
  border: 'none',
  borderRadius: 'var(--pdfium-toolbar-radius, 4px)',
  cursor: 'pointer',
  color: 'var(--pdfium-toolbar-btn-colour, #374151)',
  transition: 'background-color 150ms ease, opacity 150ms ease',
  flexShrink: 0,
};

function editorBtnStyle(active: boolean, disabled = false): CSSProperties {
  return {
    ...BUTTON_BASE,
    background: active
      ? 'var(--pdfium-toolbar-btn-active-bg, #e5e7eb)'
      : 'var(--pdfium-toolbar-btn-bg, transparent)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
  };
}

// ── Editor toolbar (children of DefaultToolbar for unified look) ──

function EditorToolbarChildren() {
  const { document } = usePDFium();
  const { viewer } = usePDFViewer();
  const { activeTool, setActiveTool, canUndo, canRedo, undo, redo, isDirty } = useEditor();
  const interactionBridge = useEditorInteractionBridge(viewer.interaction, {
    selectTextButtonSelector: VIEWER_SELECT_TEXT_BUTTON_SELECTOR,
  });
  const { save, isSaving } = useEditorSave(document);
  const [editorError, setEditorError] = useState<string | null>(null);
  const currentPageIndex = viewer.navigation.pageIndex;
  const currentPageCrud = useAnnotationCrud(document, currentPageIndex);
  const redaction = useRedaction(currentPageCrud, document);
  const currentPageAnnotations = useAnnotations(document, currentPageIndex);
  const redactionSummary = useRedactionSummary(document);
  const annotationList = currentPageAnnotations.data ?? [];
  const markedRedactionCount = annotationList.filter(isEditorRedactionAnnotation).length;
  const summaryCurrentPageCount =
    redactionSummary.pageCounts.find((entry) => entry.pageIndex === currentPageIndex)?.count ?? 0;
  const totalMarkedRedactionCount = redactionSummary.loading
    ? markedRedactionCount
    : Math.max(0, redactionSummary.totalCount - summaryCurrentPageCount + markedRedactionCount);
  const perPageRedactionSummary = useMemo(() => {
    const merged = new Map<number, number>(redactionSummary.pageCounts.map((entry) => [entry.pageIndex, entry.count]));
    if (markedRedactionCount > 0 || merged.has(currentPageIndex)) {
      merged.set(currentPageIndex, markedRedactionCount);
    }
    return Array.from(merged.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([pageIndex, count]) => `P${String(pageIndex + 1)}: ${String(count)}`)
      .join(', ');
  }, [redactionSummary.pageCounts, currentPageIndex, markedRedactionCount]);
  useEffect(() => {
    const handleEditorError = (event: Event) => {
      const custom = event as CustomEvent<{ message?: unknown }>;
      const detailMessage = custom.detail?.message;
      if (typeof detailMessage === 'string' && detailMessage.trim().length > 0) {
        setEditorError(detailMessage);
      }
    };
    globalThis.addEventListener('pdfium-editor-error', handleEditorError as EventListener);
    return () => {
      globalThis.removeEventListener('pdfium-editor-error', handleEditorError as EventListener);
    };
  }, []);

  // Prevent mousedown from clearing the browser's text selection.
  // This enables the "select text first, then click markup tool" flow.
  const preventSelectionClear = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
  }, []);

  const handleUndo = useCallback(() => void undo(), [undo]);
  const handleRedo = useCallback(() => void redo(), [redo]);

  const handleToolSelect = useCallback(
    (tool: EditorTool | TextMarkupActionTool) => {
      interactionBridge.activate(tool);
    },
    [interactionBridge],
  );

  const handleSave = useCallback(async () => {
    const bytes = await save();
    if (bytes) {
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      const blob = new Blob([copy], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = 'edited.pdf';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [save]);

  const handleApplyRedactions = useCallback(async () => {
    if (markedRedactionCount === 0 || redaction.isApplying) return;
    const otherPagesMarkedCount = Math.max(0, totalMarkedRedactionCount - markedRedactionCount);
    const noun = markedRedactionCount === 1 ? 'region' : 'regions';
    const confirmed = globalThis.confirm(
      [
        `Apply ${String(markedRedactionCount)} marked redaction ${noun} on page ${String(currentPageIndex + 1)}?`,
        otherPagesMarkedCount > 0
          ? `${String(otherPagesMarkedCount)} marked redaction${otherPagesMarkedCount === 1 ? '' : 's'} on other pages will remain marked (not applied).`
          : 'No other pages currently have marked redactions.',
        'This permanently removes overlapping page content in those regions.',
        'Undo/redo is available in this session until you save, reload, or close the document.',
        'This action cannot be undone after saving.',
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    );
    if (!confirmed) return;
    try {
      await redaction.applyRedactions(currentPageIndex);
      setActiveTool('idle');
      setEditorError(null);
    } catch (error) {
      setEditorError(getUnknownErrorMessage(error));
    }
  }, [markedRedactionCount, redaction, totalMarkedRedactionCount, currentPageIndex, setActiveTool]);

  const flattenDisabled = markedRedactionCount === 0 || redaction.isApplying;
  const flattenTitle =
    markedRedactionCount === 0
      ? totalMarkedRedactionCount === 0
        ? 'No redactions marked'
        : `No marked redactions on page ${String(currentPageIndex + 1)} (${String(totalMarkedRedactionCount)} on other pages)`
      : `Apply ${String(markedRedactionCount)} marked redaction${markedRedactionCount === 1 ? '' : 's'} on page ${String(currentPageIndex + 1)} (${String(totalMarkedRedactionCount)} total marked) • Destructive operation`;
  const redactionStatusText = redactionSummary.loading
    ? `Marked redactions: Page ${String(currentPageIndex + 1)}: ${String(markedRedactionCount)} (updating totals...)`
    : `Marked redactions: Page ${String(currentPageIndex + 1)}: ${String(markedRedactionCount)} | Total: ${String(totalMarkedRedactionCount)}`;

  return (
    <>
      {editorError && (
        <>
          <span
            role="alert"
            style={{
              maxWidth: 440,
              fontSize: 12,
              color: '#991b1b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={editorError}
          >
            {editorError}
          </span>
          <button
            type="button"
            title="Dismiss editor error"
            aria-label="Dismiss editor error"
            onMouseDown={preventSelectionClear}
            onClick={() => setEditorError(null)}
            style={editorBtnStyle(false)}
          >
            x
          </button>
          <span aria-hidden="true" style={SEPARATOR_STYLE} />
        </>
      )}

      <span aria-hidden="true" style={SEPARATOR_STYLE} />

      {TOOL_GROUPS.map((group, gi) => (
        <Fragment key={group.title}>
          {gi > 0 && <span aria-hidden="true" style={SEPARATOR_STYLE} />}
          {group.tools.map(({ tool, label, icon: Icon }) => {
            const isActive = !MARKUP_ACTION_TOOLS.has(tool as TextMarkupActionTool) && activeTool === tool;
            const title = label;
            return (
              <button
                key={tool}
                type="button"
                title={title}
                aria-label={label}
                aria-pressed={isActive}
                onMouseDown={(event) => {
                  preventSelectionClear(event);
                  if (event.button !== 0) return;
                  handleToolSelect(tool);
                }}
                onClick={(event) => {
                  // Keyboard activation still dispatches click (detail === 0).
                  // Pointer activation is already handled on mousedown.
                  if (event.detail !== 0) return;
                  handleToolSelect(tool);
                }}
                style={editorBtnStyle(isActive)}
              >
                <Icon size={ICON_SIZE} strokeWidth={2} />
              </button>
            );
          })}
        </Fragment>
      ))}

      <span aria-hidden="true" style={SEPARATOR_STYLE} />

      {/* Redaction apply */}
      <span
        data-testid="redaction-status"
        style={{ maxWidth: 420, fontSize: 11, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={[
          redactionStatusText,
          perPageRedactionSummary.length > 0 ? `Pages: ${perPageRedactionSummary}` : 'Pages: none',
        ].join(' • ')}
      >
        {redactionStatusText}
      </span>
      <button
        type="button"
        title={flattenTitle}
        aria-label="Apply redactions on current page"
        disabled={flattenDisabled}
        onMouseDown={preventSelectionClear}
        onClick={handleApplyRedactions}
        style={editorBtnStyle(false, flattenDisabled)}
      >
        <ShieldAlert size={ICON_SIZE} strokeWidth={2} />
      </button>

      <span aria-hidden="true" style={SEPARATOR_STYLE} />

      {/* Undo / Redo */}
      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onMouseDown={preventSelectionClear}
        onClick={handleUndo}
        style={editorBtnStyle(false, !canUndo)}
      >
        <Undo2 size={ICON_SIZE} strokeWidth={2} />
      </button>
      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onMouseDown={preventSelectionClear}
        onClick={handleRedo}
        style={editorBtnStyle(false, !canRedo)}
      >
        <Redo2 size={ICON_SIZE} strokeWidth={2} />
      </button>

      <span aria-hidden="true" style={SEPARATOR_STYLE} />

      {/* Save */}
      {isDirty && (
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#f59e0b',
            flexShrink: 0,
          }}
          title="Unsaved changes"
        />
      )}
      <button
        type="button"
        title={isDirty ? 'Save document' : 'No unsaved changes'}
        aria-label="Save"
        aria-busy={isSaving}
        disabled={isSaving || !isDirty}
        onMouseDown={preventSelectionClear}
        onClick={handleSave}
        style={editorBtnStyle(false, isSaving || !isDirty)}
      >
        <Save size={ICON_SIZE} strokeWidth={2} />
      </button>
    </>
  );
}

// ── Property panel (shows when an annotation is selected) ────

function PropertyPanelContent({ pageIndex, annotationIndex }: { pageIndex: number; annotationIndex: number }) {
  const { document } = usePDFium();
  const { updateToolConfig } = useEditor();
  const annotations = useAnnotations(document, pageIndex);
  const crud = useAnnotationCrud(document, pageIndex);
  const mutationStore = useAnnotationMutationStore();
  const resolvedAnnotations = useResolvedEditorAnnotations(pageIndex, annotations.data ?? []);
  const mutationPending = useAnnotationMutationPending(pageIndex, annotationIndex);
  const handlePreviewPatch = useCallback(
    (previewAnnotationIndex: number, patch: OptimisticAnnotationPatch) => {
      mutationStore.preview(pageIndex, previewAnnotationIndex, patch);
    },
    [mutationStore, pageIndex],
  );
  const handleClearPreviewPatch = useCallback(
    (previewAnnotationIndex: number) => {
      mutationStore.clearPreview(pageIndex, previewAnnotationIndex);
    },
    [mutationStore, pageIndex],
  );

  const annotation = resolvedAnnotations.find((item) => item.index === annotationIndex);
  if (!annotation) return null;

  return (
    <AnnotationPropertyPanel
      annotation={annotation}
      crud={crud}
      mutationPending={mutationPending}
      onToolConfigChange={updateToolConfig}
      onPreviewPatch={handlePreviewPatch}
      onClearPreviewPatch={handleClearPreviewPatch}
    />
  );
}

function PropertySidebar() {
  const { selection } = useEditor();

  if (!selection) return null;

  return (
    <aside
      data-testid="editor-property-sidebar"
      className="w-64 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto shrink-0"
    >
      <PropertyPanelContent pageIndex={selection.pageIndex} annotationIndex={selection.annotationIndex} />
    </aside>
  );
}

// ── Inner content ────────────────────────────────────────────

function EditorContent() {
  return (
    <div
      className="flex h-full"
      style={
        {
          '--pdfium-page-placeholder-opacity': 1,
        } as CSSProperties
      }
    >
      <div className="flex-1 flex flex-col min-w-0">
        <PDFViewer
          panels={['thumbnails', 'annotations']}
          initialPanel="annotations"
          showAnnotations={false}
          renderPageOverlay={renderEditorOverlay}
        >
          <DefaultToolbar>
            <EditorToolbarChildren />
          </DefaultToolbar>
        </PDFViewer>
      </div>

      <PropertySidebar />
    </div>
  );
}

// ── Exported lab ─────────────────────────────────────────────

export function EditorLab() {
  return (
    <EditorProvider>
      <EditorContent />
    </EditorProvider>
  );
}
