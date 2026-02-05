# PDFium Node.js Demo

A minimal Node.js example demonstrating how to use `@scaryterry/pdfium` for server-side PDF processing.

## What You'll Learn

- Initialising PDFium in Node.js (auto-loads WASM from the package)
- Opening a PDF document from a file buffer
- Reading document metadata (page count)
- Accessing individual pages and their dimensions
- Extracting text content from pages
- Proper resource cleanup with the `using` keyword

## Prerequisites

- Node.js 22 or later (for `using` keyword support)
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

3. Run the demo:
   ```bash
   pnpm tsx demo/node/index.ts
   ```

### Standalone Mode (from npm)

1. Generate a standalone demo:
   ```bash
   pnpm tsx demo/scripts/make-standalone.ts node /path/to/output
   ```

2. Install and run:
   ```bash
   cd /path/to/output
   npm install
   npm start
   ```

## Code Walkthrough

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { readFile } from 'node:fs/promises';

async function main(): Promise<void> {
  // Initialise PDFium - in Node.js, the WASM binary is loaded automatically
  using pdfium = await PDFium.init();

  // Load a PDF from a file buffer
  const pdf = await readFile('sample.pdf');
  using document = await pdfium.openDocument(pdf);

  console.log(`Pages: ${document.pageCount}`);

  // Access individual pages
  using page = document.getPage(0);
  const { width, height } = page.size;
  console.log(`Page 1 size: ${width} x ${height} pt`);

  // Extract text content
  const text = page.getText();
  console.log(`Text length: ${text.length} characters`);
}

main();
```

### Key Points

1. **Automatic WASM Loading**: In Node.js, PDFium automatically loads the WASM binary from `node_modules`. No manual configuration needed.

2. **Resource Management**: The `using` keyword ensures resources are properly disposed when they go out of scope. This is critical for avoiding memory leaks with WASM.

3. **Page Dimensions**: Page sizes are in PDF points (1 point = 1/72 inch). A US Letter page is 612 × 792 points.

## Expected Output

```
=> library initialised
=> document loaded
===> number of pages: 1
=> page loaded
===> page size: 612 x 792
===> text length: 756 characters
=> done
```

## Troubleshooting

### Error: Cannot find module '@scaryterry/pdfium'

**Cause**: The main package hasn't been built.

**Solution**: Run `pnpm build` from the repository root first.

### Error: sample.pdf not found

**Cause**: The setup script hasn't been run.

**Solution**: Run `pnpm tsx demo/scripts/setup.ts` to copy the sample PDF.

### Error: using declarations are not enabled

**Cause**: Node.js version is too old.

**Solution**: Upgrade to Node.js 22 or later, which has native support for explicit resource management.

### Error: WASM module could not be loaded

**Cause**: The WASM binary hasn't been downloaded.

**Solution**: Run `pnpm download:pdfium --target wasm` from the repository root.

## Related Resources

- [Main README](../../README.md) - Full API documentation
- [Plain Demo](../plain/) - Browser example without build tools
- [Vite Demo](../vite/) - React example with Vite
