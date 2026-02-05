# PDFium Vite + React Demo

A React application demonstrating how to use `@scaryterry/pdfium` with Vite and React Query. Shows best practices for integrating PDFium in a modern frontend build setup.

## What You'll Learn

- Configuring Vite to work with PDFium WASM
- Loading WASM binaries using Vite's `?url` import suffix
- React Query integration for async document loading
- Rendering PDF pages to a canvas in React
- Proper resource management patterns

## Prerequisites

- Node.js 22 or later
- pnpm (package manager)
- Main package built (`pnpm build` from repository root)

## Quick Start

### Development Mode (from cloned repository)

1. Build the main package:
   ```bash
   # From repository root
   pnpm build
   ```

2. Run the setup script to copy required assets:
   ```bash
   pnpm tsx demo/scripts/setup.ts
   ```

3. Install dependencies and start the dev server:
   ```bash
   pnpm --dir demo/vite install
   pnpm --dir demo/vite dev
   ```

4. Open http://localhost:5173

### Standalone Mode (from npm)

1. Generate a standalone demo:
   ```bash
   pnpm tsx demo/scripts/make-standalone.ts vite /path/to/output
   ```

2. Install and run:
   ```bash
   cd /path/to/output
   npm install
   npm run dev
   ```

The `postinstall` script automatically copies `pdfium.cjs` to the public directory.

## Code Walkthrough

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
  plugins: [react()],
});
```

**Critical**: You must exclude `@scaryterry/pdfium` from Vite's dependency optimisation. The package uses a runtime fetch/eval pattern that Vite's pre-bundling breaks.

### Loading the WASM Binary

```typescript
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';

const pdfium = await PDFium.init({
  wasmBinary: await fetch(wasmUrl).then((r) => r.arrayBuffer()),
});
```

Vite's `?url` suffix gives you a resolved URL to the WASM binary that works in both development and production builds.

### React Query Integration

```typescript
const useDocument = () => {
  return useQuery({
    queryKey: ['document'],
    queryFn: async () => {
      const response = await fetch('/sample.pdf');
      const arrayBuffer = await response.arrayBuffer();
      const pdfium = await PDFium.init({
        wasmBinary: await fetch(wasmUrl).then((r) => r.arrayBuffer()),
      });
      const document = await pdfium.openDocument(new Uint8Array(arrayBuffer));
      return document;
    },
  });
};
```

React Query handles loading states and caching. The document object is kept in the query cache.

### Rendering to Canvas

```typescript
function PDFPageDemo({ document, pageNumber }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: result, status } = useRenderPage(document, {
    pageNumber,
    scale: 3,
  });

  useEffect(() => {
    if (status === 'success' && canvasRef.current && result) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = new ImageData(
          new Uint8ClampedArray(result.data),
          result.width,
          result.height,
        );
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [status, result]);

  return <canvas ref={canvasRef} width={result?.width} height={result?.height} />;
}
```

## Why is `pdfium.cjs` needed?

The PDFium WASM module requires JavaScript glue code (`pdfium.cjs`) to set up the WASM environment. In browsers, this file is fetched at runtime from `/pdfium.cjs`.

For Vite projects, place this file in the `public/` directory so it's served at the root.

## Expected Output

When you run the demo, you should see:

- A heading "PDF viewer"
- A rendered PDF page at 3x scale
- The page is bordered and responsive (max-width: 100%)

## Troubleshooting

### Error: Failed to fetch /pdfium.cjs

**Cause**: The `pdfium.cjs` file is not in the `public/` directory.

**Solution**: Run the setup script (`pnpm tsx demo/scripts/setup.ts`) or manually copy:
```bash
cp ../../src/vendor/pdfium.cjs public/
```

### Error: sample.pdf not found

**Cause**: The sample PDF is not in the `public/` directory.

**Solution**: Run the setup script, or manually copy:
```bash
cp ../shared/sample.pdf public/
```

### Error: Cannot find module '@scaryterry/pdfium'

**Cause**: Dependencies not installed or main package not built.

**Solution**:
1. Build the main package: `pnpm build` (from repository root)
2. Install demo dependencies: `pnpm --dir demo/vite install`

### Vite optimisation breaks the WASM loading

**Cause**: `@scaryterry/pdfium` not excluded from optimizeDeps.

**Solution**: Ensure your `vite.config.ts` has:
```typescript
optimizeDeps: {
  exclude: ['@scaryterry/pdfium'],
}
```

### Page renders but shows nothing

**Cause**: Page number might be out of range (1-indexed in the demo).

**Solution**: Check that the PDF has the requested page. Page numbers start at 0 in the API but the demo uses 1.

## Project Structure

```
demo/vite/
├── public/
│   ├── pdfium.cjs       # WASM glue code (copied by setup)
│   ├── sample.pdf       # Sample PDF (copied by setup)
│   └── vite.svg         # Vite logo
├── src/
│   ├── client.ts        # React Query client
│   ├── demo.tsx         # PDF viewer component
│   └── main.tsx         # App entry point
├── index.html           # HTML template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.ts       # Vite config
```

## Related Resources

- [Main README](../../README.md) - Full API documentation
- [Node Demo](../node/) - Node.js server-side example
- [Plain Demo](../plain/) - Browser example without build tools
