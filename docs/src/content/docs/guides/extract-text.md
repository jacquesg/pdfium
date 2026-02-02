---
title: Extract Text from PDF Page
---

You can extract text from pages using the `getText()` method.

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function main() {
  const buff = await fs.readFile('document.pdf');

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(buff);

  // Extract text from all pages
  for (const page of document.pages()) {
    using p = page;
    console.log(`Page ${p.index}:`);
    console.log(p.getText());
    console.log('-------------------');
  }

  // Save text from a specific page to a file
  {
    using page = document.getPage(0);
    await fs.writeFile('page0.txt', page.getText());
  }
}

main();
```

## Text search

Search for text with position information using `findText()`:

```typescript
import { TextSearchFlags } from '@scaryterry/pdfium';

using page = document.getPage(0);

for (const result of page.findText('hello', TextSearchFlags.MatchCase)) {
  console.log(`Found at char ${result.charIndex}, length ${result.charCount}`);
  console.log(`Bounding rects:`, result.rects);
}
```

## Character positioning

Get bounding boxes and character-at-position:

```typescript
using page = document.getPage(0);

// Get the bounding box of the first character
const box = page.getCharBox(0);
if (box) {
  console.log(`Char 0 bounds: ${box.left}, ${box.top}, ${box.right}, ${box.bottom}`);
}

// Find which character is at a given position
const charIndex = page.getCharIndexAtPos(100, 200);
console.log(`Character at (100, 200): index ${charIndex}`);

// Extract text within a rectangular region
const regionText = page.getTextInRect(0, 0, 300, 400);
console.log(`Text in region: ${regionText}`);
```
