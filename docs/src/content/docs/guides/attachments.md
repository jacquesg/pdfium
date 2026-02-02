---
title: Attachments
description: Working with embedded file attachments in PDFs
---

PDFs can contain embedded files (attachments). This guide explains how to extract and work with attachments.

## Overview

Attachments are files embedded within a PDF:
- Spreadsheets with supporting data
- Source files for images
- Additional documentation
- Any binary file

## Checking for Attachments

```typescript
if (document.attachmentCount > 0) {
  console.log(`Found ${document.attachmentCount} attachments`);
} else {
  console.log('No attachments in this document');
}
```

## Getting Attachments

### Single Attachment by Index

```typescript
const attachment = document.getAttachment(0);
console.log(`Name: ${attachment.name}`);
console.log(`Size: ${attachment.data.byteLength} bytes`);
```

### All Attachments

```typescript
const attachments = document.getAttachments();

for (const attachment of attachments) {
  console.log(`${attachment.name}: ${attachment.data.byteLength} bytes`);
}
```

## Attachment Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | Zero-based index |
| `name` | `string` | Original filename |
| `data` | `Uint8Array` | File contents |

```typescript
interface PDFAttachment {
  index: number;
  name: string;
  data: Uint8Array;
}
```

## Extracting Attachments

### Save to File

```typescript
import { promises as fs } from 'fs';
import path from 'path';

async function extractAttachments(document: PDFiumDocument, outputDir: string) {
  await fs.mkdir(outputDir, { recursive: true });

  const attachments = document.getAttachments();

  for (const attachment of attachments) {
    const outputPath = path.join(outputDir, attachment.name);
    await fs.writeFile(outputPath, attachment.data);
    console.log(`Extracted: ${outputPath}`);
  }
}

// Usage
await extractAttachments(document, './attachments');
```

### Safe Filename Handling

Attachment names may contain problematic characters:

```typescript
import path from 'path';

function sanitiseFilename(name: string): string {
  // Remove path traversal
  name = path.basename(name);

  // Replace problematic characters
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // Ensure not empty
  if (!name || name === '.' || name === '..') {
    name = 'attachment';
  }

  return name;
}

async function extractAttachmentsSafely(
  document: PDFiumDocument,
  outputDir: string
) {
  const usedNames = new Set<string>();

  for (const attachment of document.getAttachments()) {
    let safeName = sanitiseFilename(attachment.name);

    // Handle duplicates
    let counter = 1;
    let finalName = safeName;
    while (usedNames.has(finalName.toLowerCase())) {
      const ext = path.extname(safeName);
      const base = path.basename(safeName, ext);
      finalName = `${base}_${counter}${ext}`;
      counter++;
    }
    usedNames.add(finalName.toLowerCase());

    const outputPath = path.join(outputDir, finalName);
    await fs.writeFile(outputPath, attachment.data);
    console.log(`Extracted: ${outputPath}`);
  }
}
```

## Listing Attachments

### Basic List

```typescript
function listAttachments(document: PDFiumDocument) {
  const attachments = document.getAttachments();

  if (attachments.length === 0) {
    console.log('No attachments');
    return;
  }

  console.log('Attachments:');
  for (const att of attachments) {
    const size = formatBytes(att.data.byteLength);
    console.log(`  ${att.index + 1}. ${att.name} (${size})`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### Summary Statistics

```typescript
function getAttachmentStats(document: PDFiumDocument) {
  const attachments = document.getAttachments();

  const stats = {
    count: attachments.length,
    totalSize: 0,
    byExtension: new Map<string, number>(),
  };

  for (const att of attachments) {
    stats.totalSize += att.data.byteLength;

    const ext = path.extname(att.name).toLowerCase() || '(no extension)';
    stats.byExtension.set(ext, (stats.byExtension.get(ext) || 0) + 1);
  }

  return stats;
}

// Usage
const stats = getAttachmentStats(document);
console.log(`Total attachments: ${stats.count}`);
console.log(`Total size: ${formatBytes(stats.totalSize)}`);
console.log('By type:');
for (const [ext, count] of stats.byExtension) {
  console.log(`  ${ext}: ${count}`);
}
```

## Working with Specific File Types

### Extract JSON Attachments

```typescript
async function extractJSONAttachments(document: PDFiumDocument) {
  const results: Record<string, unknown>[] = [];

  for (const attachment of document.getAttachments()) {
    if (attachment.name.toLowerCase().endsWith('.json')) {
      try {
        const text = new TextDecoder().decode(attachment.data);
        const data = JSON.parse(text);
        results.push({ name: attachment.name, data });
      } catch (error) {
        console.warn(`Failed to parse ${attachment.name}: ${error}`);
      }
    }
  }

  return results;
}
```

### Extract CSV Data

```typescript
function extractCSVAttachments(document: PDFiumDocument) {
  const results: Array<{ name: string; rows: string[][] }> = [];

  for (const attachment of document.getAttachments()) {
    if (attachment.name.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder().decode(attachment.data);
      const rows = text.split('\n').map(line =>
        line.split(',').map(cell => cell.trim())
      );
      results.push({ name: attachment.name, rows });
    }
  }

  return results;
}
```

### Extract Images

```typescript
import sharp from 'sharp';

async function extractImageAttachments(
  document: PDFiumDocument,
  outputDir: string
) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

  for (const attachment of document.getAttachments()) {
    const ext = path.extname(attachment.name).toLowerCase();

    if (imageExtensions.includes(ext)) {
      // Optionally process with sharp
      const metadata = await sharp(attachment.data).metadata();
      console.log(`Image: ${attachment.name}`);
      console.log(`  Format: ${metadata.format}`);
      console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);

      // Save
      const outputPath = path.join(outputDir, attachment.name);
      await fs.writeFile(outputPath, attachment.data);
    }
  }
}
```

## Complete Example

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';
import path from 'path';

async function processAttachments(
  pdfPath: string,
  outputDir: string
) {
  const data = await fs.readFile(pdfPath);

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  const attachmentCount = document.attachmentCount;

  if (attachmentCount === 0) {
    console.log('No attachments found in this PDF.');
    return;
  }

  console.log(`Found ${attachmentCount} attachments:\n`);

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  let totalSize = 0;

  for (const attachment of document.getAttachments()) {
    const size = attachment.data.byteLength;
    totalSize += size;

    console.log(`${attachment.index + 1}. ${attachment.name}`);
    console.log(`   Size: ${formatBytes(size)}`);

    // Detect type by extension
    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`   Type: ${getFileType(ext)}`);

    // Save to disk
    const safeName = sanitiseFilename(attachment.name);
    const outputPath = path.join(outputDir, safeName);
    await fs.writeFile(outputPath, attachment.data);
    console.log(`   Saved: ${outputPath}\n`);
  }

  console.log(`Total extracted: ${formatBytes(totalSize)}`);
}

function getFileType(ext: string): string {
  const types: Record<string, string> = {
    '.pdf': 'PDF Document',
    '.doc': 'Word Document',
    '.docx': 'Word Document',
    '.xls': 'Excel Spreadsheet',
    '.xlsx': 'Excel Spreadsheet',
    '.csv': 'CSV Data',
    '.json': 'JSON Data',
    '.xml': 'XML Data',
    '.txt': 'Plain Text',
    '.png': 'PNG Image',
    '.jpg': 'JPEG Image',
    '.jpeg': 'JPEG Image',
    '.gif': 'GIF Image',
    '.zip': 'ZIP Archive',
  };
  return types[ext] || 'Unknown';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitiseFilename(name: string): string {
  return path.basename(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'attachment';
}

// Run
processAttachments('document-with-attachments.pdf', './extracted');
```

Output:

```
Found 3 attachments:

1. data.xlsx
   Size: 45.2 KB
   Type: Excel Spreadsheet
   Saved: ./extracted/data.xlsx

2. source-image.png
   Size: 1.2 MB
   Type: PNG Image
   Saved: ./extracted/source-image.png

3. readme.txt
   Size: 856 bytes
   Type: Plain Text
   Saved: ./extracted/readme.txt

Total extracted: 1.3 MB
```

## See Also

- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — Document API reference
- [Open Document Guide](/pdfium/guides/open-document/) — Loading documents
- [Bookmarks Guide](/pdfium/guides/bookmarks/) — Working with outlines
