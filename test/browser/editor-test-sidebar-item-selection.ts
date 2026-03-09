import type { Page } from '@playwright/test';
import { clickReachableLocator } from './editor-test-geometry.js';

export async function clickSidebarItemForAnnotation(page: Page, annotationIndex: number): Promise<boolean> {
  const sidebarItem = page
    .locator('[data-panel-item]')
    .filter({
      hasText: new RegExp(`^#${String(annotationIndex)}\\b`),
    })
    .last();

  if ((await sidebarItem.count()) === 0) {
    return false;
  }

  await clickReachableLocator(page, sidebarItem);
  return true;
}
