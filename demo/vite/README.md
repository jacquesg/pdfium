# PDFium + Vite Demo

```bash
pnpm install
pnpm dev
```

## Vite Configuration

When using `@scaryterry/pdfium` with Vite, you must **exclude** the package from dependency optimisation:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
});
```

This is required because the package uses a runtime fetch/eval pattern to load the PDFium WASM glue code. Vite's pre-bundling transforms the code in a way that breaks this pattern.

## Setup

Copy `pdfium.cjs` to the `public/` directory:

```bash
cp ../../src/vendor/pdfium.cjs public/
```

The WASM binary is loaded via Vite's `?url` import from the package.