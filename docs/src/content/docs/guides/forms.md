---
title: Working with Forms
description: Learn how to handle interactive PDF forms, including detecting forms, reading/writing form data, and managing form focus.
---

@scaryterry/pdfium provides robust support for interactive PDF forms, including AcroForms and XFA forms (limited support). This guide covers how to detect forms, interact with form fields, and manage form state.

## Detecting Forms

Before attempting to interact with form fields, you should check if the document actually contains a form.

```typescript
import { PDFium, FormType } from '@scaryterry/pdfium';

// ... initialise and load document ...

if (document.hasForm()) {
  console.log('Document contains a form');

  const type = document.formType;
  if (type === FormType.AcroForm) {
    console.log('Standard AcroForm detected');
  } else if (type === FormType.XFAFull || type === FormType.XFAForeground) {
    console.log('XFA Form detected');
  }
}
```

You can also use helper methods:

```typescript
if (document.hasAcroForm()) {
  // Handle standard PDF form
}

if (document.hasXFAForm()) {
  // Handle XFA form (limited support)
}
```

## Reading Form Fields (Widgets)

Form fields in PDFium are represented as "Widget" annotations on a page. Retrieve them by filtering the page's annotations:

```typescript
using page = document.getPage(0);

// Get all widget annotations on the page
const widgets = page.getAnnotations().filter((a) => a.isWidget());

for (const widget of widgets) {
  console.log(`Field Name: ${widget.getFormFieldName()}`);
  console.log(`Field Type: ${widget.getFormFieldType()}`);
  console.log(`Value: ${widget.getFormFieldValue()}`);
  console.log(`Bounds: ${JSON.stringify(widget.bounds)}`);

  // For combo boxes or list boxes, check options
  const options = widget.getFormFieldOptions();
  if (options) {
    for (const option of options) {
      console.log(`Option: ${option.label}, Selected: ${option.selected}`);
    }
  }
}
```

:::note
Form fields are accessed through `PDFiumAnnotation` methods, not a separate widget class. Use `getAnnotations()` and filter with `isWidget()` to find form field annotations.
:::

### Annotation Form Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isWidget()` | `boolean` | Whether this annotation is a form field widget |
| `getFormFieldType()` | `FormFieldType` | The field type (Text, Button, CheckBox, RadioButton, ComboBox, ListBox, Signature) |
| `getFormFieldName()` | `string \| undefined` | The field's fully qualified name |
| `getFormFieldValue()` | `string \| undefined` | The current field value |
| `getFormFieldAlternateName()` | `string \| undefined` | The field's alternate (tooltip) name |
| `getFormFieldExportValue()` | `string \| undefined` | The export value (for checkboxes/radio buttons) |
| `getFormFieldOptions()` | `WidgetOption[] \| undefined` | Options for combo/list boxes |
| `getFormFieldFlags()` | `FormFieldFlags` | Bitfield of field flags (read-only, required, etc.) |

## Form Interaction

### Highlighting Form Fields

You can control how form fields are highlighted when rendered. This is useful for making fields more visible to users.

```typescript
import { FormFieldType } from '@scaryterry/pdfium';

// Set highlight colour for all field types to yellow
document.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 255, g: 255, b: 0, a: 255 });

// Set transparency (0-255)
document.setFormFieldHighlightAlpha(100);
```

### Text Selection in Form Fields

When a user interacts with a form field (e.g., via a UI you build on top of the rendered canvas), you might need to manage text selection within that field.

```typescript
// Get selected text in the currently focused form field
const selectedText = page.getFormSelectedText();
if (selectedText) {
  console.log(`Selected: ${selectedText}`);
}

// Replace the selected text
page.replaceFormSelection('New Text');
```

### Managing Focus

To ensure proper form behaviour, you may need to programmatically release focus from form fields, for example, when the user clicks away from a form element.

```typescript
// Force release of focus from any form field
const released = document.killFormFocus();
```

## Undo/Redo

PDFium supports undo and redo operations for form field editing.

```typescript
if (page.canFormUndo()) {
  page.formUndo();
}

if (page.canFormRedo()) {
  page.formRedo();
}
```

## Rendering Forms

When rendering a page that contains form fields, ensure you enable the `renderFormFields` option.

```typescript
const { data } = page.render({
  scale: 2,
  renderFormFields: true // Disabled by default, so you must enable it
});
```

## See Also

- [Annotations Guide](/pdfium/guides/annotations/) — Working with all annotation types
- [PDFiumAnnotation](/pdfium/api/classes/pdfiumannotation/) — Annotation API reference
- [PDFiumPage](/pdfium/api/classes/pdfiumpage/) — Page API reference
- [Render PDF](/pdfium/guides/render-pdf/) — Rendering pages to images