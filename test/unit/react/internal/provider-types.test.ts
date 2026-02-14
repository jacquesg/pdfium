import { describe, expect, it } from 'vitest';
import type {
  ProviderPasswordValue,
  ProviderStableDocCallbacks,
} from '../../../../src/react/internal/provider-types.js';

describe('provider-types contracts', () => {
  it('accepts valid ProviderPasswordValue and ProviderStableDocCallbacks shapes', async () => {
    const passwordValue: ProviderPasswordValue = {
      required: true,
      attempted: false,
      error: null,
      submit: async (_password: string) => undefined,
      cancel: () => undefined,
    };

    const callbacks: ProviderStableDocCallbacks = {
      bumpDocumentRevision: () => undefined,
      invalidateCache: () => undefined,
      loadDocument: async (_data: ArrayBuffer | Uint8Array, _name: string) => undefined,
      loadDocumentFromUrl: async (_url: string, _name: string) => undefined,
    };

    await expect(passwordValue.submit('secret')).resolves.toBeUndefined();
    await expect(callbacks.loadDocument(new Uint8Array([1]), 'a.pdf')).resolves.toBeUndefined();
    await expect(callbacks.loadDocumentFromUrl('https://example.com/a.pdf', 'a.pdf')).resolves.toBeUndefined();
  });

  it('enforces async password submit contract at compile time', () => {
    const invalid: ProviderPasswordValue = {
      required: false,
      attempted: false,
      error: null,
      // @ts-expect-error `submit` must return Promise<void>
      submit: (_password: string) => undefined,
      cancel: () => undefined,
    };
    expect(invalid).toBeDefined();
  });

  it('enforces async document loaders in callback contract at compile time', () => {
    const invalid: ProviderStableDocCallbacks = {
      bumpDocumentRevision: () => undefined,
      invalidateCache: () => undefined,
      // @ts-expect-error `loadDocument` must return Promise<void>
      loadDocument: (_data: ArrayBuffer | Uint8Array, _name: string) => undefined,
      loadDocumentFromUrl: async (_url: string, _name: string) => undefined,
    };
    expect(invalid).toBeDefined();
  });
});
