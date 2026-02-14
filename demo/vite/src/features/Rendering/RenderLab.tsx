import type { PageInfoResponse } from '@scaryterry/pdfium/browser';
import { useCallback, useState } from 'react';
import {
  type Rect,
  DefaultToolbar,
  PDFDocumentView,
  PageNavigatorMinimap,
  useRenderPage,
  useViewerSetup,
} from '@scaryterry/pdfium/react';
import { Button } from '../../components/Button';
import { DocPanel } from '../../components/DocPanel';

import { PDFCanvas } from '../../components/PDFCanvas';
import { ResponsiveSidebar } from '../../components/ResponsiveSidebar';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';


const DEFAULT_CLIP_SIZE = 300; // PDF points

export function RenderLab() {
  const viewer = useViewerSetup({ initialScale: 1.5 });
  const { document } = viewer;
  const { pageIndex, setPageIndex } = viewer.navigation;
  const { scale } = viewer.zoom;
  const { scrollMode } = viewer.scroll;
  const { ref: containerRef } = viewer.container;
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderScale, setRenderScale] = useState(2);
  const [pageInfo, setPageInfo] = useState<PageInfoResponse | null>(null);
  const [showSpecialRender, setShowSpecialRender] = useState(false);

  // Clip-rect viewport (in PDF page coordinates)
  const [viewport, setViewport] = useState<Rect>({
    left: 0,
    bottom: 0,
    right: DEFAULT_CLIP_SIZE,
    top: DEFAULT_CLIP_SIZE,
  });

  // Clip-rect render
  const {
    renderKey: clipKey,
    width: clipWidth,
    height: clipHeight,
  } = useRenderPage(showSpecialRender ? document : null, pageIndex, {
    clipRect: viewport,
    scale: 2, // Render clip at 2x for crisp display
  });

  // Scaled render demo
  const {
    renderKey: scaledKey,
    width: scaledWidth,
    height: scaledHeight,
  } = useRenderPage(showSpecialRender ? document : null, pageIndex, {
    scale: renderScale,
  });

  const handleViewportChange = useCallback((newViewport: Rect) => {
    setViewport(newViewport);
  }, []);

  const fetchPageInfo = async () => {
    if (!document) return;
    setRenderError(null);
    try {
      await using page = await document.getPage(pageIndex);
      const info = await page.getPageInfo();
      setPageInfo(info);
    } catch (err) {
      setRenderError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar: Render Controls + Minimap */}
      <ResponsiveSidebar side="left" breakpoint="md" label="Render Controls" className="w-64 bg-white p-3 border-r space-y-4 overflow-y-auto max-h-full">
        {/* Minimap Navigator */}
        {document && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Page Minimap</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <PageNavigatorMinimap
                document={document}
                pageIndex={pageIndex}
                thumbnailWidth={200}
                viewport={viewport}
                onViewportChange={handleViewportChange}
                style={{ border: '1px solid #e5e7eb', borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Render Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <label className="text-xs block">Render Scale: {renderScale}x</label>
              <input
                type="range" min="1" max="5" step="1"
                value={renderScale}
                onChange={(e) => setRenderScale(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <Button
              onClick={() => setShowSpecialRender((s) => !s)}
              variant="secondary"
              className="w-full text-xs"
            >
              {showSpecialRender ? 'Hide Demos' : 'Show Clip & Scale Demos'}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Toggle to see clip-rect viewport and scaled render of page {pageIndex + 1}.
            </p>
            {showSpecialRender && (
              <div className="mt-2 text-xs text-gray-500 font-mono">
                Viewport: [{viewport.left.toFixed(0)}, {viewport.bottom.toFixed(0)}, {viewport.right.toFixed(0)}, {viewport.top.toFixed(0)}]
              </div>
            )}
            {renderError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription className="text-xs font-bold">{renderError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Page Boxes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-2">
              Inspect the five standard PDF page boxes for page {pageIndex + 1}.
            </p>
            <Button onClick={fetchPageInfo} className="w-full text-sm">Fetch Page Info</Button>
            {pageInfo && (
              <div className="mt-2 space-y-1">
                <div className="text-xs font-mono text-gray-600">
                  Rotation: {pageInfo.rotation}, Chars: {pageInfo.charCount}
                </div>
                {(Object.entries(pageInfo.pageBoxes) as Array<[string, { left: number; top: number; right: number; bottom: number } | undefined]>).map(([name, box]) => (
                  <div key={name} className={`text-xs font-mono px-1.5 py-0.5 rounded ${box ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {name}: {box ? `[${box.left.toFixed(1)}, ${box.top.toFixed(1)}, ${box.right.toFixed(1)}, ${box.bottom.toFixed(1)}]` : 'not set'}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ResponsiveSidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DefaultToolbar viewer={viewer}>
          <Button variant="secondary" onClick={viewer.zoom.reset} className="text-xs">Reset Zoom</Button>
        </DefaultToolbar>

        {/* Document View + optional clip/scale demos side-by-side */}
        <div className="flex-1 flex overflow-hidden">
          <PDFDocumentView
            containerRef={containerRef}
            scrollMode={scrollMode}
            scale={scale}
            currentPageIndex={pageIndex}
            onCurrentPageChange={setPageIndex}
            className="flex-1"
            style={{ minHeight: 0 }}
          />

          {showSpecialRender && (
            <div className="w-[40%] border-l bg-gray-900 overflow-auto flex flex-col items-center p-4 gap-6">
              {/* Clip-rect viewport render */}
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2">Clip Viewport (2x)</div>
                {clipKey ? (
                  <PDFCanvas width={clipWidth ?? 0} height={clipHeight ?? 0} renderKey={clipKey} />
                ) : (
                  <Skeleton className="w-48 h-48 rounded bg-gray-700" />
                )}
              </div>

              {/* Scaled render */}
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2">{renderScale}x Scale ({scaledWidth}x{scaledHeight})</div>
                {scaledKey ? (
                  <PDFCanvas width={scaledWidth ?? 0} height={scaledHeight ?? 0} renderKey={scaledKey} />
                ) : (
                  <Skeleton className="w-48 h-64 rounded bg-gray-700" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Documentation */}
      <ResponsiveSidebar side="right" breakpoint="lg" label="Documentation" className="w-72 bg-white border-l overflow-y-auto p-3">
        <DocPanel
          title="Rendering Lab"
          apis={['renderPage()', 'getPageInfo()', 'render()', 'clipRect']}
          snippet={'// Render a page at 2x scale\nconst result = await document.renderPage(0, { scale: 2 });\n\n// Render a clip-rect sub-region\nconst clip = await document.renderPage(0, {\n  clipRect: { left: 0, bottom: 0, right: 300, top: 300 },\n  scale: 2,\n});\n\n// Get page info including page boxes\nawait using page = await document.getPage(0);\nconst info = await page.getPageInfo();'}
          description="Async rendering via the worker thread, page box inspection, clip-rect viewport, and scale controls. Use the minimap to navigate, and toggle demos to see clip and scale renders."
        />
      </ResponsiveSidebar>
    </div>
  );
}
