---
title: Save Documents
description: Saving PDF documents with various options
---

This guide explains how to save PDF documents and the available save options.

## Basic Save

```typescript
// Save existing document
using document = await pdfium.openDocument(data);
const bytes = document.save();
await fs.writeFile('output.pdf', bytes);

// Save new document
using builder = pdfium.createDocument();
// ... add content ...
const bytes = builder.save();
await fs.writeFile('output.pdf', bytes);
```

## Save Options

Both `PDFiumDocument.save()` and `PDFiumDocumentBuilder.save()` accept options:

```typescript
interface SaveOptions {
  flags?: SaveFlags;
  version?: number;
}
```

### SaveFlags

```typescript
import { SaveFlags } from '@scaryterry/pdfium';
```

| Flag | Value | Description |
|------|-------|-------------|
| `None` | 0 | Default full save |
| `Incremental` | 1 | Append changes (preserves signatures) |
| `NoIncremental` | 2 | Force full rewrite |
| `RemoveSecurity` | 3 | Remove encryption |

### PDF Version

Specify the PDF version as a number:

| Version | Value | Released |
|---------|-------|----------|
| PDF 1.4 | 14 | 2001 |
| PDF 1.5 | 15 | 2003 |
| PDF 1.6 | 16 | 2004 |
| PDF 1.7 | 17 | 2006 |
| PDF 2.0 | 20 | 2017 |

## Save Modes Explained

### Default Save (None)

Rewrites the entire PDF:

```typescript
const bytes = document.save();
// or
const bytes = document.save({ flags: SaveFlags.None });
```

**Characteristics:**
- Creates optimised file
- May invalidate digital signatures
- Removes document history
- Usually smaller file size

### Incremental Save

Appends changes to the end of the file:

```typescript
const bytes = document.save({ flags: SaveFlags.Incremental });
```

**Characteristics:**
- Preserves digital signatures
- Maintains document history
- Faster for large documents with small changes
- File size grows with each save

**Use when:**
- Document has digital signatures
- Audit trail is required
- Making small modifications

### Force Non-Incremental

Forces full rewrite even if incremental would be possible:

```typescript
const bytes = document.save({ flags: SaveFlags.NoIncremental });
```

### Remove Security

Removes encryption (requires correct password to open first):

```typescript
// Open with password
using document = await pdfium.openDocument(data, { password: 'secret' });

// Save without encryption
const bytes = document.save({ flags: SaveFlags.RemoveSecurity });
```

:::caution
Only use RemoveSecurity when you have legitimate rights to the document and appropriate authorisation.
:::

## Specifying PDF Version

```typescript
// Save as PDF 1.7
const bytes = document.save({ version: 17 });

// Save as PDF 2.0
const bytes = document.save({ version: 20 });
```

### Version Compatibility

| Feature | Minimum Version |
|---------|-----------------|
| Basic PDF | 1.4 |
| Compressed objects | 1.5 |
| AES encryption | 1.6 |
| PDF/A-2 | 1.7 |
| New annotation types | 2.0 |

## Error Handling

```typescript
import { DocumentError, PDFiumErrorCode } from '@scaryterry/pdfium';

try {
  const bytes = document.save();
  await fs.writeFile('output.pdf', bytes);
} catch (error) {
  if (error instanceof DocumentError) {
    if (error.code === PDFiumErrorCode.DOC_SAVE_FAILED) {
      console.error('Failed to save document:', error.message);
    }
  }
  throw error;
}
```

## Save to Different Formats

### Save to Buffer

```typescript
const bytes = document.save();
// bytes is Uint8Array
```

### Save to File

```typescript
import { promises as fs } from 'fs';

const bytes = document.save();
await fs.writeFile('output.pdf', bytes);
```

### Save to Stream

```typescript
import { createWriteStream } from 'fs';

const bytes = document.save();
const stream = createWriteStream('output.pdf');
stream.write(bytes);
stream.end();
```

### Send as HTTP Response (Node.js)

```typescript
// Express.js example
app.get('/download', async (req, res) => {
  const data = await fs.readFile('document.pdf');

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  // Modify document...

  const bytes = document.save();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="output.pdf"');
  res.send(Buffer.from(bytes));
});
```

### Browser Download

```typescript
function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

// Usage
const bytes = document.save();
downloadPDF(bytes, 'output.pdf');
```

## Complete Examples

### Copy with Version Update

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function upgradePDFVersion(inputPath: string, outputPath: string) {
  const data = await fs.readFile(inputPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  // Save as PDF 1.7
  const bytes = document.save({ version: 17 });
  await fs.writeFile(outputPath, bytes);

  console.log(`Upgraded ${inputPath} to PDF 1.7`);
}
```

### Remove Password Protection

```typescript
async function removePassword(
  inputPath: string,
  outputPath: string,
  password: string
) {
  const data = await fs.readFile(inputPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data, { password });

  const bytes = document.save({ flags: SaveFlags.RemoveSecurity });
  await fs.writeFile(outputPath, bytes);

  console.log('Password protection removed');
}
```

### Incremental Save Workflow

```typescript
async function signaturePreservingSave(
  inputPath: string,
  outputPath: string
) {
  const data = await fs.readFile(inputPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  // Make modifications here...

  // Save incrementally to preserve signatures
  const bytes = document.save({ flags: SaveFlags.Incremental });
  await fs.writeFile(outputPath, bytes);

  console.log('Saved with signatures preserved');
}
```

### Batch Processing

```typescript
import { promises as fs } from 'fs';
import path from 'path';

async function convertPDFVersions(
  inputDir: string,
  outputDir: string,
  targetVersion: number
) {
  using pdfium = await PDFium.init();

  const files = await fs.readdir(inputDir);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  await fs.mkdir(outputDir, { recursive: true });

  for (const file of pdfFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    try {
      const data = await fs.readFile(inputPath);
      using document = await pdfium.openDocument(data);

      const bytes = document.save({ version: targetVersion });
      await fs.writeFile(outputPath, bytes);

      console.log(`Converted: ${file}`);
    } catch (error) {
      console.error(`Failed: ${file}`, error);
    }
  }
}

// Convert all PDFs to version 1.7
convertPDFVersions('./input', './output', 17);
```

## See Also

- [PDFiumDocument](/pdfium/api/classes/pdfiumdocument/) — Document API reference
- [PDFiumDocumentBuilder](/pdfium/api/classes/pdfiumdocumentbuilder/) — Creating documents
- [SaveFlags Enum](/pdfium/api/enumerations/saveflags/) — Save flags reference
- [Open Document Guide](/pdfium/guides/open-document/) — Loading documents
