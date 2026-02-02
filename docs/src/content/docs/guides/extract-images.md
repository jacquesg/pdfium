---
title: Extract Images from PDF Page
---

You can extract images from page objects using `getObjects()` and filtering for image types.

```typescript
import { PageObjectType } from '@scaryterry/pdfium';

using document = await pdfium.openDocument(buff);

let index = 0;

for (const page of document.pages()) {
  using p = page;

  for (const object of p.getObjects()) {
    if (object.type === PageObjectType.Image) {
      console.log(`Image ${index}: ${object.width}x${object.height} pixels`);
      console.log(`  Bounds: ${JSON.stringify(object.bounds)}`);
      index++;
    }
  }
}
```

## Inspecting all page objects

The `getObjects()` method returns all objects on a page, including text, images, paths, shading, and form objects:

```typescript
for (const object of page.getObjects()) {
  switch (object.type) {
    case PageObjectType.Text:
      console.log(`Text: "${object.text}" (${object.fontSize}pt)`);
      break;
    case PageObjectType.Image:
      console.log(`Image: ${object.width}x${object.height}`);
      break;
    case PageObjectType.Path:
      console.log('Path object');
      break;
  }
}
```
