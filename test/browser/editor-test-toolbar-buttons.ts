import type { Locator, Page } from '@playwright/test';

const VIEWER_SELECT_TEXT_BUTTON_LABELS = ['Select text (V)', 'Pointer tool'] as const;
const VIEWER_HAND_BUTTON_LABELS = ['Hand tool (H)', 'Hand tool'] as const;

export function editorBtn(page: Page, label: string): Locator {
  return page.locator(`button[aria-label="${label}"]`);
}

export function viewerSelectTextButtons(page: Page): Locator {
  const selectors = VIEWER_SELECT_TEXT_BUTTON_LABELS.map((label) => `button[aria-label="${label}"]`);
  return page.locator(selectors.join(', '));
}

export function viewerSelectTextButtonCandidates(page: Page): Locator[] {
  return VIEWER_SELECT_TEXT_BUTTON_LABELS.map((label) => page.locator(`button[aria-label="${label}"]`).first());
}

export function viewerHandToolButtonCandidates(page: Page): Locator[] {
  return VIEWER_HAND_BUTTON_LABELS.map((label) => page.locator(`button[aria-label="${label}"]`).first());
}
