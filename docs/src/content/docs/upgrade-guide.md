---
title: Upgrade Guide
description: Migration guides for @scaryterry/pdfium versions
---

This guide helps you upgrade between versions of the library.

## Version Compatibility

| Library Version | Node.js | TypeScript | Browser |
|-----------------|---------|------------|---------|
| 1.x | 22+ | 5.0+ | Modern browsers |

## Upgrading to 1.x

If you're upgrading from a pre-release version:

### Breaking Changes

#### 1. Resource Disposal

All resources now use `Symbol.dispose` (ES2024):

```typescript
// Old (pre-release)
const pdfium = await PDFium.init();
// ... use pdfium
pdfium.destroy(); // Old method

// New (1.x)
using pdfium = await PDFium.init();
// ... use pdfium
// Automatically disposed

// Or manually:
const pdfium = await PDFium.init();
try {
  // ... use pdfium
} finally {
  pdfium.dispose(); // New method name
}
```

#### 2. Error Classes

Error classes have been renamed for consistency:

```typescript
// Old
import { PDFError } from '@scaryterry/pdfium';

// New
import { PDFiumError } from '@scaryterry/pdfium';
```

#### 3. Method Signatures

Some methods have updated signatures:

```typescript
// Old
page.render(scale);

// New
page.render({ scale });
// Or with more options:
page.render({ scale: 2, renderFormFields: true });
```

#### 4. Type Exports

Types are now exported from the main package:

```typescript
// Old
import { PDFium } from '@scaryterry/pdfium';
import type { RenderOptions } from '@scaryterry/pdfium/types';

// New
import { PDFium, type RenderOptions } from '@scaryterry/pdfium';
```

### Migration Steps

1. **Update package**

```sh
pnpm update @scaryterry/pdfium
```

2. **Update imports**

```typescript
// Replace all imports
import {
  PDFium,
  PDFiumError,
  PDFiumErrorCode,
  // ... other imports
} from '@scaryterry/pdfium';
```

3. **Update resource management**

Replace `destroy()` with `dispose()` or use `using`:

```typescript
// Before
const pdfium = await PDFium.init();
// ...
pdfium.destroy();

// After
using pdfium = await PDFium.init();
// ...
// Automatically disposed
```

4. **Update render calls**

```typescript
// Before
const result = page.render(2);

// After
const result = page.render({ scale: 2 });
```

5. **Update error handling**

```typescript
// Before
import { PDFError, ErrorCode } from '@scaryterry/pdfium';

try {
  // ...
} catch (error) {
  if (error instanceof PDFError) {
    if (error.code === ErrorCode.PASSWORD_REQUIRED) {
      // ...
    }
  }
}

// After
import { DocumentError, PDFiumErrorCode } from '@scaryterry/pdfium';

try {
  // ...
} catch (error) {
  if (error instanceof DocumentError) {
    if (error.code === PDFiumErrorCode.DOC_PASSWORD_REQUIRED) {
      // ...
    }
  }
}
```

6. **Run tests**

```sh
pnpm test
```

## TypeScript Changes

### Minimum Version

TypeScript 5.0+ is required for full type support.

### Strict Mode

The library now exports strict types. Enable strict mode:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### Using Keyword

To use the `using` keyword, ensure your TypeScript configuration supports it:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"]
  }
}
```

## Deprecation Warnings

The following features are deprecated and will be removed in 2.x:

| Deprecated | Replacement |
|------------|-------------|
| `pdfium.destroy()` | `pdfium.dispose()` |
| `page.render(scale)` | `page.render({ scale })` |

## Getting Help

If you encounter issues during upgrade:

1. Check the [Error Reference](/pdfium/errors/) for new error codes
2. Review the [API Reference](/pdfium/api/classes/pdfium/) for updated signatures
3. Open an issue at [GitHub](https://github.com/jacquesg/pdfium/issues)

## See Also

- [Installation](/pdfium/installation/) — Fresh installation guide
- [API Reference](/pdfium/api/classes/pdfium/) — Current API documentation
- [Error Reference](/pdfium/errors/) — Error codes and handling
