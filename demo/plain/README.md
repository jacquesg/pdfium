# PDFium Plain HTML Demo

A minimal browser example demonstrating how to use `@scaryterry/pdfium` without any build tools. Just HTML, JavaScript, and ES modules.

## What You'll Learn

- Loading PDFium in a browser using import maps
- Providing the WASM binary manually (required in browsers)
- Rendering a PDF page to an HTML canvas
- No build tools, bundlers, or frameworks required

## Prerequisites

- A modern browser (Chrome 89+, Firefox 108+, Safari 16.4+)
- Any HTTP server (e.g., `python3 -m http.server`)
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

3. Start a local HTTP server from the repository root:
   ```bash
   python3 -m http.server 8080
   ```

4. Open in your browser:
   ```
   http://localhost:8080/demo/plain/index.html
   ```

### Standalone Mode (from npm)

1. Generate a standalone demo:
   ```bash
   pnpm tsx demo/scripts/make-standalone.ts plain /path/to/output
   ```

2. Copy the required files from node_modules:
   ```bash
   cd /path/to/output
   npm install @scaryterry/pdfium
   cp node_modules/@scaryterry/pdfium/dist/browser.js .
   cp node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm .
   cp node_modules/@scaryterry/pdfium/src/vendor/pdfium.cjs .
   ```

3. Serve and open:
   ```bash
   python3 -m http.server 8080
   ```

## Code Walkthrough

### Import Map

```html
<script type="importmap">
  {
    "imports": {
      "@scaryterry/pdfium/browser": "../../dist/browser.js"
    }
  }
</script>
```

Import maps let you use package-style imports without a bundler. The browser resolves `@scaryterry/pdfium/browser` to the actual file path.

### Initialisation

```javascript
import { PDFium } from '@scaryterry/pdfium/browser';

using pdfium = await PDFium.init({
  wasmBinary: await fetch('../../dist/vendor/pdfium.wasm')
    .then((r) => r.arrayBuffer()),
});
```

In browsers, you must provide the WASM binary explicitly. The library fetches `pdfium.cjs` from the server root by default.

### Rendering to Canvas

```javascript
const result = page.render({ scale: 2 });
const canvas = document.getElementById('canvas');
canvas.width = result.width;
canvas.height = result.height;

const ctx = canvas.getContext('2d');
const imageData = new ImageData(
  new Uint8ClampedArray(result.data),
  result.width,
  result.height,
);
ctx.putImageData(imageData, 0, 0);
```

The `render()` method returns raw RGBA pixel data. You can use `ImageData` to draw it to a canvas.

## Why is `pdfium.cjs` needed?

The PDFium WASM module consists of two parts:

1. **`pdfium.wasm`** - The compiled C++ code (binary)
2. **`pdfium.cjs`** - JavaScript glue code that sets up the WASM environment

In browsers, the library fetches `pdfium.cjs` at runtime from `/pdfium.cjs` by default. This file must be served from your web root.

## Expected Output

When you open the demo, you should see:

- Status: "Done"
- Info: "Pages: 1 — Page 1 size: 612 × 792 pt"
- A rendered PDF page in the canvas

## Troubleshooting

### Error: Failed to fetch pdfium.cjs

**Cause**: The `pdfium.cjs` file is not served from the web root.

**Solution**: Run the setup script (`pnpm tsx demo/scripts/setup.ts`) which copies the file to the repository root.

### Error: Failed to fetch WASM binary

**Cause**: The WASM binary path is incorrect or the file doesn't exist.

**Solution**: Ensure the package is built (`pnpm build`) and check the fetch path.

### Error: using declarations are not enabled

**Cause**: Your browser doesn't support explicit resource management yet.

**Solution**: Use Chrome 134+ or a polyfill. Alternatively, replace `using` with `const` and call `.dispose()` manually.

### CORS errors

**Cause**: Opening the HTML file directly with `file://` protocol.

**Solution**: Always serve through an HTTP server. The `file://` protocol doesn't support CORS.

## Related Resources

- [Main README](../../README.md) - Full API documentation
- [Node Demo](../node/) - Node.js server-side example
- [Vite Demo](../vite/) - React example with Vite
