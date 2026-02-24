import type { SerialisedPageObject } from '../../context/protocol.js';
import { createPageDataHook } from '../internal/create-data-hook.js';

export const usePageObjects = createPageDataHook<SerialisedPageObject[]>('pageObjects', (page) =>
  page.getPageObjects(),
);
