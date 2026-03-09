import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  dragAnnotationHandle,
  drawRectangle,
  expectNoPageErrors,
  parseLineEndpoints,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorLineEndpointSnapTests(): void {
  test('line endpoint shift-resize snaps geometry to a cardinal or 45-degree angle', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const lineInfo = page.locator('[data-testid="line-info"]');
      await expect(lineInfo).toBeVisible();
      const beforeText = await lineInfo.innerText();

      await dragAnnotationHandle(page, 'end', { x: 90, y: -20 }, { shiftKey: true });

      await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);

      const endpoints = parseLineEndpoints(await lineInfo.innerText());
      expect(endpoints).not.toBeNull();
      const dx = Math.abs((endpoints?.end.x ?? 0) - (endpoints?.start.x ?? 0));
      const dy = Math.abs((endpoints?.end.y ?? 0) - (endpoints?.start.y ?? 0));
      const snapped = dx < 1 || dy < 1 || Math.abs(dx - dy) < 1;
      expect(snapped).toBe(true);
    });
  });
}
