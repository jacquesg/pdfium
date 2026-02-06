---
title: Render PDF to Image
---

## Load PDF document

```typescript
using document = await pdfium.openDocument(buff);

// ... do something with the document

// Automatically disposed when scope exits
```

## Render PDF page

Get a page from the document by index (starting from 0):

```typescript
using page = document.getPage(0);
```

Or iterate over all pages:

```typescript
for (const page of document.pages()) {
  using p = page;
  // ... do something with the page
}
```

Then render the page by calling the `render` method. It accepts an optional `RenderOptions` object:

- `scale` - scale factor for the image (default: 1, which means 72 DPI; 3 is almost always enough for good quality)
- `width` / `height` - target dimensions in pixels (overrides scale, does not preserve aspect ratio)
- `renderFormFields` - whether to render interactive form fields (default: `false`)
- `backgroundColour` - ARGB background colour integer (default: `0xFFFFFFFF` — white)
- `rotation` - rotation to apply during rendering

```typescript
const { data, width, height } = page.render({ scale: 3 });
// data is a Uint8Array of RGBA pixels (4 bytes per pixel)
```

To render with form fields visible:

```typescript
const result = page.render({ scale: 3, renderFormFields: true });
```

### Result

The render result contains:

- `data` - RGBA pixel data as a `Uint8Array`
- `width` - rendered width in pixels
- `height` - rendered height in pixels
- `originalWidth` - original page width in points (before scaling)
- `originalHeight` - original page height in points (before scaling)

:::note
DPI is dots per inch, a measure of image resolution commonly used for printing.

Points are a typographic unit of measure; 1 point is equal to 1/72 of an inch.
:::

### Converting to PNG with sharp

To convert the raw RGBA pixels to a PNG image, use the `sharp` library:

```sh
pnpm add sharp
```

```typescript
import sharp from 'sharp';

const { data, width, height } = page.render({ scale: 3 });

const png = await sharp(data, {
  raw: { width, height, channels: 4 },
}).png().toBuffer();
```

### Using width and height instead of scale

You can use `width` and `height` options instead of `scale` to specify exact pixel dimensions. The aspect ratio will not be preserved — the image will be stretched to the specified size.

```typescript
const result = page.render({ width: 800, height: 600 });
```

## Full example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import sharp from 'sharp';

async function main() {
  const buff = await fs.readFile('document.pdf');

  // Initialise the library
  using pdfium = await PDFium.init();

  // Open the document
  using document = await pdfium.openDocument(buff);

  // Render each page to PNG
  for (const page of document.pages()) {
    using p = page;
    console.log(`Page ${p.index} - rendering...`);

    const { data, width, height } = p.render({ scale: 3 });

    const png = await sharp(data, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();

    await fs.writeFile(`output/${p.index}.png`, png);
  }
}

main();
```

## See Also

- [Advanced Rendering](/pdfium/guides/advanced-rendering/) — Clip rects, progress callbacks, and progressive rendering
- [Performance Guide](/pdfium/concepts/performance/) — Optimising scale, memory, and batch rendering
- [Worker Mode](/pdfium/guides/worker-mode/) — Off-main-thread rendering
