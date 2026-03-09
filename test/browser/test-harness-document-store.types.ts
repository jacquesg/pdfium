import type { BrowserDocument, BrowserPage } from './test-harness-types.js';

export interface HarnessDocumentStoreState {
  documents: Map<number, BrowserDocument>;
  pages: Map<string, BrowserPage>;
  nextDocId: number;
}
