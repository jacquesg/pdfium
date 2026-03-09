import { expect, type Page } from '@playwright/test';
import { editorBtn } from './editor-test-toolbar-buttons.js';

const EDITOR_ACTION_TOOL_BUTTON_LABELS = new Set(['Highlight', 'Underline', 'Strikeout']);

async function clickViewerToolbarButton(page: Page, label: string): Promise<void> {
  const button = page.locator(`button[aria-label="${label}"]`).first();
  await expect(button).toBeVisible();
  await button.click();
}

export async function switchToTool(page: Page, label: string): Promise<void> {
  const button = editorBtn(page, label);
  await expect(button).toBeVisible();
  await button.click();
  if (!EDITOR_ACTION_TOOL_BUTTON_LABELS.has(label)) {
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
}

export async function zoomInViewer(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await clickViewerToolbarButton(page, 'Zoom in');
  }
}

export async function rotateViewerClockwise(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await clickViewerToolbarButton(page, 'Rotate clockwise');
  }
}
