# PDFium Plain HTML Demo

A minimal example using PDFium without any build tools.

## Setup

1. Build the package:
   ```bash
   pnpm build
   ```

2. Copy `pdfium.cjs` to the repository root:
   ```bash
   cp src/vendor/pdfium.cjs .
   ```

3. Serve the repository with any HTTP server:
   ```bash
   python3 -m http.server 8080
   ```

4. Open http://localhost:8080/demo/plain/main.html

## Why is `pdfium.cjs` needed?

The browser loader fetches the PDFium JavaScript glue code at runtime from `/pdfium.cjs`. This file must be served from the web root.
