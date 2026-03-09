import { expect, type Page } from '@playwright/test';
import type { HarnessRuntimeKind, HarnessSnapshot } from './harness-runtime.types.js';

function buildHarnessUrl(runtimeKind: HarnessRuntimeKind): string {
  return runtimeKind === 'main-thread' ? '/?runtime=main-thread' : '/';
}

export async function readHarnessSnapshot(page: Page): Promise<HarnessSnapshot> {
  return page.evaluate(() => ({
    runtimeKind: window.testHarness.runtimeKind,
    isReady: window.testHarness.isReady,
    isSettled: window.testHarness.isSettled,
    error: window.testHarness.error,
    errorStack: window.testHarness.errorStack,
    statusMessage: window.testHarness.statusMessage,
    statusText: globalThis.document.getElementById('status')?.textContent ?? '',
  }));
}

function formatHarnessFailure(snapshot: HarnessSnapshot): string {
  const details = [
    `runtime=${snapshot.runtimeKind}`,
    `status=${snapshot.statusMessage || snapshot.statusText || 'unknown'}`,
    `error=${snapshot.error ?? 'none'}`,
  ];
  if (snapshot.errorStack) {
    details.push(`stack=${snapshot.errorStack}`);
  }
  return details.join('\n');
}

export async function expectHarnessReady(
  page: Page,
  options: {
    readonly runtimeKind?: HarnessRuntimeKind;
    readonly timeout?: number;
  } = {},
): Promise<HarnessSnapshot> {
  const runtimeKind = options.runtimeKind ?? 'worker';
  const timeout = options.timeout ?? 35_000;

  await page.goto(buildHarnessUrl(runtimeKind));
  await page.waitForFunction(() => window.testHarness?.isSettled === true, { timeout });

  const snapshot = await readHarnessSnapshot(page);
  expect(snapshot.runtimeKind).toBe(runtimeKind);
  expect(snapshot.isReady, formatHarnessFailure(snapshot)).toBe(true);
  expect(snapshot.error, formatHarnessFailure(snapshot)).toBeNull();
  expect(snapshot.statusMessage, formatHarnessFailure(snapshot)).toContain('initialised successfully');

  return snapshot;
}
