import { describe, expect, it } from 'vitest';
import type {
  InitialDocument,
  PDFiumProviderCoreOptions,
  PDFiumProviderProps,
  UsePDFiumProviderControllerOptions,
} from '../../../../src/react/internal/provider-config-types.js';
import type { PDFiumStores } from '../../../../src/react/internal/stores-context.js';

function createStoresStub(): PDFiumStores {
  return {
    queryStore: { clear: () => undefined } as unknown as PDFiumStores['queryStore'],
    renderStore: { clear: () => undefined, maxEntries: 16 } as unknown as PDFiumStores['renderStore'],
  };
}

describe('provider-config-types contracts', () => {
  it('accepts valid provider core options shape', () => {
    const initialDocument: InitialDocument = {
      data: new Uint8Array([1, 2, 3]),
      name: 'doc.pdf',
    };

    const options: PDFiumProviderCoreOptions = {
      workerUrl: '/pdfium.worker.js',
      wasmUrl: '/pdfium.wasm',
      initialDocument,
      maxCachedPages: 24,
      stores: createStoresStub(),
    };

    expect(options.workerUrl).toBe('/pdfium.worker.js');
    expect(options.initialDocument?.name).toBe('doc.pdf');
  });

  it('accepts provider props with children and full controller options shape', () => {
    const binary = new ArrayBuffer(8);
    const stores = createStoresStub();

    const props: PDFiumProviderProps = {
      children: null,
      workerUrl: '/pdfium.worker.js',
      wasmBinary: binary,
      stores,
    };

    const controllerOptions: UsePDFiumProviderControllerOptions = {
      wasmBinary: binary,
      wasmUrl: undefined,
      workerUrl: props.workerUrl,
      initialDocument: undefined,
      maxCachedPages: undefined,
      stores,
    };

    expect(controllerOptions.workerUrl).toBe(props.workerUrl);
    expect(controllerOptions.wasmBinary).toBe(binary);
  });

  it('requires workerUrl in provider core options at compile time', () => {
    // @ts-expect-error `workerUrl` is required in PDFiumProviderCoreOptions
    const invalid: PDFiumProviderCoreOptions = { wasmUrl: '/pdfium.wasm' };
    expect(invalid).toBeDefined();
  });
});
