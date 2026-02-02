---
title: FontType
description: PDF font types
---

Identifies the type of font used in a PDF.

## Import

```typescript
import { FontType } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `Type1` | 1 | Adobe Type 1 font |
| `TrueType` | 2 | TrueType font |

## Font Type Descriptions

### Type1

Adobe Type 1 fonts:
- PostScript-based outline fonts
- Developed by Adobe in 1984
- Limited to 256 glyphs per font
- Still common in older PDFs

### TrueType

TrueType fonts:
- Developed by Apple and Microsoft
- Supports large character sets
- Scalable and hintable
- Most common font format in modern PDFs

## Usage

```typescript
// Font type information would typically come from
// text object inspection or font metadata
const fontType = FontType.TrueType;

switch (fontType) {
  case FontType.Type1:
    console.log('Adobe Type 1 font');
    break;
  case FontType.TrueType:
    console.log('TrueType font');
    break;
}
```

## See Also

- [PDFiumDocumentBuilder](/pdfium/api/classes/pdfium-document-builder/) — Loading fonts
- [Add Text Guide](/pdfium/guides/add-text/) — Using fonts
