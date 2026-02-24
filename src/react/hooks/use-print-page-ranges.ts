import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const usePrintPageRanges = createDocumentDataHook<number[]>(
  'printPageRanges',
  async (doc) => (await doc.getPrintPageRanges()) ?? [],
);
