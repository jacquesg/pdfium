---
title: Advanced Features
description: Explore advanced PDF capabilities including Digital Signatures and JavaScript automation.
---

## Digital Signatures

@scaryterry/pdfium allows you to inspect digital signatures within a PDF document. While full signature verification (cryptographic validation) is outside the scope of PDFium itself, you can access signature metadata to display status information or pass data to a verification library.

### Inspecting Signatures

```typescript
if (document.hasSignatures()) {
  console.log(`Found ${document.signatureCount} signatures`);

  for (const sig of document.signatures()) {
    console.log(`Signature #${sig.index}`);
    console.log(`Reason: ${sig.reason}`);
    console.log(`Time: ${sig.time}`);
    console.log(`SubFilter: ${sig.subFilter}`); // e.g., 'adbe.pkcs7.detached'

    // Access raw signature content (DER encoded)
    if (sig.contents) {
      console.log(`Signature data length: ${sig.contents.length} bytes`);
    }

    // Access byte range covered by the signature
    if (sig.byteRange) {
      console.log(`Byte Range: ${sig.byteRange.join(', ')}`);
    }
  }
}
```

## JavaScript Support

PDF documents can contain JavaScript actions that execute in response to events (e.g., opening the document, clicking a button). PDFium provides hooks to execute these actions or extract the scripts.

### Executing Document Scripts

To ensure a PDF behaves as intended (e.g., calculating form values automatically), you should trigger standard document events.

```typescript
// Execute "Will Save" actions before saving
import { DocumentActionType } from '@scaryterry/pdfium';

document.executeDocumentAction(DocumentActionType.WillSave);

// Execute document-level JavaScript (e.g., Open Action)
document.executeDocumentOpenAction();
```

### Inspecting JavaScript Actions

You can extract all JavaScript embedded in the document for analysis or sanitization.

```typescript
const jsActions = document.getJavaScriptActions();

for (const action of jsActions) {
  console.log(`Action Name: ${action.name}`);
  console.log(`Script Code:`);
  console.log(action.script);
}
```

This is particularly useful for security scanning to detect malicious scripts embedded in PDFs.
