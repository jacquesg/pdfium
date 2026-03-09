import { expect, type Page } from '@playwright/test';

export async function expectNoPageErrors(page: Page, run: () => Promise<void>): Promise<void> {
  const errors: string[] = [];
  const onPageError = (error: Error) => {
    errors.push(error.message);
  };

  page.on('pageerror', onPageError);
  try {
    await run();
  } finally {
    page.off('pageerror', onPageError);
  }

  expect(errors, errors.length > 0 ? `Unexpected pageerror events:\n${errors.join('\n')}` : undefined).toHaveLength(0);
}
