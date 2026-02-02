---
title: SaveFlags
description: Options for saving PDF documents
---

Flags that control how a PDF document is saved.

## Import

```typescript
import { SaveFlags } from '@scaryterry/pdfium';
```

## Values

| Member | Value | Description |
|--------|-------|-------------|
| `None` | 0 | Default save (full rewrite) |
| `Incremental` | 1 | Append changes only |
| `NoIncremental` | 2 | Force full rewrite |
| `RemoveSecurity` | 3 | Remove encryption |

## Usage

### Default Save

```typescript
// Full rewrite of the PDF
const bytes = document.save();
// or
const bytes = document.save({ flags: SaveFlags.None });
```

### Incremental Save

Preserves digital signatures and document history:

```typescript
const bytes = document.save({ flags: SaveFlags.Incremental });
```

### Force Full Rewrite

```typescript
const bytes = document.save({ flags: SaveFlags.NoIncremental });
```

### Remove Encryption

```typescript
// Open encrypted document
using document = await pdfium.openDocument(data, { password: 'secret' });

// Save without encryption
const bytes = document.save({ flags: SaveFlags.RemoveSecurity });
```

## Comparison

| Flag | File Size | Preserves Signatures | Maintains History | Speed |
|------|-----------|---------------------|-------------------|-------|
| `None` | Optimised | No | No | Medium |
| `Incremental` | Grows | Yes | Yes | Fast |
| `NoIncremental` | Optimised | No | No | Medium |
| `RemoveSecurity` | Varies | No | No | Medium |

## When to Use

### Use `None` (Default)

- Creating final output
- Distributing documents
- When file size matters

### Use `Incremental`

- Document has digital signatures
- Audit trail required
- Making small changes to large files

### Use `NoIncremental`

- Explicitly want full rewrite
- Cleaning up document history

### Use `RemoveSecurity`

- Need unprotected copy
- Have authorisation to remove protection

## See Also

- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — save method
- [Save Document Guide](/pdfium/guides/save-document/) — Save options
