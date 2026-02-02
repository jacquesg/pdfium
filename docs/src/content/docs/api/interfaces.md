---
title: Interfaces
description: TypeScript interfaces for @scaryterry/pdfium
---

This page documents all TypeScript interfaces exported by the library.

## Configuration Interfaces

### PDFiumInitOptions

Options for initialising the PDFium library.

```typescript
interface PDFiumInitOptions {
  wasmUrl?: string | URL;      // URL to load WASM from
  wasmBinary?: ArrayBuffer;    // Pre-loaded WASM binary
  limits?: PDFiumLimits;       // Resource limits
}
```

### PDFiumLimits

Resource limits for PDFium operations.

```typescript
interface PDFiumLimits {
  maxDocumentSize?: number;    // Max document size (default: 512MB)
  maxRenderDimension?: number; // Max render dimension (default: 32767)
  maxTextCharCount?: number;   // Max text chars to extract (default: 10M)
}
```

### OpenDocumentOptions

Options for opening a PDF document.

```typescript
interface OpenDocumentOptions {
  password?: string;  // Password for encrypted PDFs
}
```

### SaveOptions

Options for saving a PDF document.

```typescript
interface SaveOptions {
  flags?: SaveFlags;  // Save behaviour flags
  version?: number;   // PDF version (e.g., 17 for 1.7)
}
```

### RenderOptions

Options for rendering a page.

```typescript
interface RenderOptions {
  scale?: number;              // Scale factor (default: 1)
  width?: number;              // Target width (overrides scale)
  height?: number;             // Target height (overrides scale)
  renderFormFields?: boolean;  // Render form fields (default: false)
  backgroundColour?: number;   // ARGB colour (default: 0xFFFFFFFF)
  rotation?: PageRotation;     // Additional rotation
}
```

### PageCreationOptions

Options for creating a new page.

```typescript
interface PageCreationOptions {
  width?: number;   // Width in points (default: 612 - US Letter)
  height?: number;  // Height in points (default: 792 - US Letter)
}
```

### ShapeStyle

Styling options for shapes.

```typescript
interface ShapeStyle {
  fill?: Colour;        // Fill colour
  stroke?: Colour;      // Stroke colour
  strokeWidth?: number; // Stroke width in points
}
```

### WorkerProxyOptions

Options for WorkerProxy.

```typescript
interface WorkerProxyOptions {
  timeout?: number;  // Operation timeout in ms (default: 30000)
}
```

---

## Result Interfaces

### RenderResult

Result from page rendering.

```typescript
interface RenderResult {
  data: Uint8Array;       // RGBA pixel data
  width: number;          // Rendered width in pixels
  height: number;         // Rendered height in pixels
  originalWidth: number;  // Original page width in points
  originalHeight: number; // Original page height in points
}
```

### PageSize

Page dimensions.

```typescript
interface PageSize {
  width: number;   // Width in points
  height: number;  // Height in points
}
```

### TextSearchResult

Result from text search.

```typescript
interface TextSearchResult {
  charIndex: number;   // Starting character index
  charCount: number;   // Number of matched characters
  rects: TextRect[];   // Bounding rectangles
}
```

### TextRect

Rectangle bounds for text.

```typescript
interface TextRect {
  left: number;    // Left edge in points
  top: number;     // Top edge in points
  right: number;   // Right edge in points
  bottom: number;  // Bottom edge in points
}
```

### CharBox

Character bounding box.

```typescript
interface CharBox {
  left: number;    // Left edge in points
  right: number;   // Right edge in points
  bottom: number;  // Bottom edge in points
  top: number;     // Top edge in points
}
```

---

## Document Structure Interfaces

### Bookmark

Document bookmark/outline entry.

```typescript
interface Bookmark {
  title: string;                // Display text
  pageIndex?: number;          // Target page (if any)
  children: Bookmark[];        // Nested bookmarks
}
```

### PDFAttachment

Embedded file attachment.

```typescript
interface PDFAttachment {
  index: number;     // Zero-based index
  name: string;      // Original filename
  data: Uint8Array;  // File contents
}
```

### Annotation

Page annotation.

```typescript
interface Annotation {
  index: number;              // Zero-based index on page
  type: AnnotationType;       // Annotation subtype
  bounds: AnnotationBounds;   // Bounding rectangle
  colour?: Colour;            // Annotation colour (if set)
}
```

### AnnotationBounds

Annotation bounding rectangle.

```typescript
interface AnnotationBounds {
  left: number;    // Left edge in points
  top: number;     // Top edge in points
  right: number;   // Right edge in points
  bottom: number;  // Bottom edge in points
}
```

### StructureElement

Tagged PDF structure element.

```typescript
interface StructureElement {
  type: string;                   // Structure type (e.g., "P", "H1")
  title?: string;                 // Element title
  altText?: string;               // Alternative text
  lang?: string;                  // Language code
  children: StructureElement[];   // Child elements
}
```

---

## Page Object Interfaces

### PageObject (Union)

Union type for all page objects:

```typescript
type PageObject =
  | TextObject
  | ImageObject
  | PathObject
  | ShadingObject
  | FormObject
  | UnknownObject;
```

### ObjectBounds

Object bounding box.

```typescript
interface ObjectBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
```

### TextObject

Text content object.

```typescript
interface TextObject {
  type: PageObjectType.Text;
  bounds: ObjectBounds;
  text: string;      // Text content
  fontSize: number;  // Font size in points
}
```

### ImageObject

Embedded image object.

```typescript
interface ImageObject {
  type: PageObjectType.Image;
  bounds: ObjectBounds;
  width: number;   // Pixel width
  height: number;  // Pixel height
}
```

### PathObject

Vector path object.

```typescript
interface PathObject {
  type: PageObjectType.Path;
  bounds: ObjectBounds;
}
```

### ShadingObject

Shading/gradient object.

```typescript
interface ShadingObject {
  type: PageObjectType.Shading;
  bounds: ObjectBounds;
}
```

### FormObject

Form XObject.

```typescript
interface FormObject {
  type: PageObjectType.Form;
  bounds: ObjectBounds;
}
```

### UnknownObject

Unknown object type.

```typescript
interface UnknownObject {
  type: PageObjectType.Unknown;
  bounds: ObjectBounds;
}
```

---

## Colour Interface

### Colour

RGBA colour value.

```typescript
interface Colour {
  r: number;  // Red (0-255)
  g: number;  // Green (0-255)
  b: number;  // Blue (0-255)
  a: number;  // Alpha (0-255, 255 = opaque)
}
```

#### Usage

```typescript
// Solid red
const red: Colour = { r: 255, g: 0, b: 0, a: 255 };

// Semi-transparent blue
const blue: Colour = { r: 0, g: 0, b: 255, a: 128 };

// Transparent
const transparent: Colour = { r: 0, g: 0, b: 0, a: 0 };
```

---

## Error Interface

### SerialisedError

Serialised error for worker communication.

```typescript
interface SerialisedError {
  name: string;
  message: string;
  code: number;
  context?: Record<string, unknown>;
}
```

---

## Worker Protocol Interfaces

### LoadPageResponse

Response from loading a page in worker.

```typescript
interface LoadPageResponse {
  pageIndex: number;
  width: number;
  height: number;
}
```

### OpenDocumentResponse

Response from opening a document in worker.

```typescript
interface OpenDocumentResponse {
  documentId: string;
  pageCount: number;
}
```

### RenderPageResponse

Response from rendering a page in worker.

```typescript
interface RenderPageResponse {
  data: Uint8Array;
  width: number;
  height: number;
}
```

### PageSizeResponse

Response from getting page size in worker.

```typescript
interface PageSizeResponse {
  width: number;
  height: number;
}
```

---

## WASM Interfaces

### WASMLoadOptions

Options for loading the WASM module.

```typescript
interface WASMLoadOptions {
  wasmBinary?: ArrayBuffer;
  wasmUrl?: string | URL;
  locateFile?: (path: string) => string;
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (instance: WebAssembly.Instance) => void
  ) => WebAssembly.Exports;
}
```

### WASMAllocation

WASM memory allocation.

```typescript
interface WASMAllocation {
  pointer: WASMPointer;  // Pointer to allocated memory
  size: number;          // Size in bytes
}
```

### WASMMemoryManager

Memory manager interface.

```typescript
interface WASMMemoryManager {
  malloc(size: number): WASMPointer;
  free(pointer: WASMPointer): void;
  copyToWASM(data: Uint8Array): WASMAllocation;
  copyFromWASM(pointer: WASMPointer, size: number): Uint8Array;
}
```

## See Also

- [Types](/pdfium/api/types/) — Branded types
- [Enums](/pdfium/api/enums/page-rotation/) — Enum definitions
- [Classes](/pdfium/api/classes/pdfium/) — Class API reference
