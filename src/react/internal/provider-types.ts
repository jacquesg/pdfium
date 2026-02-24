interface ProviderPasswordValue {
  required: boolean;
  attempted: boolean;
  error: string | null;
  submit: (password: string) => Promise<void>;
  cancel: () => void;
}

interface ProviderStableDocCallbacks {
  bumpDocumentRevision: () => void;
  invalidateCache: () => void;
  loadDocument: (data: ArrayBuffer | Uint8Array, name: string) => Promise<void>;
  loadDocumentFromUrl: (url: string, name: string) => Promise<void>;
}

export type { ProviderPasswordValue, ProviderStableDocCallbacks };
