import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const REACT_DOCS_DIR = join(REPO_ROOT, 'docs/src/content/docs/react');
const INSTALLATION_DOC_PATH = join(REPO_ROOT, 'docs/src/content/docs/installation.md');

function readReactDoc(file: string): string {
  return readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
}

describe('React docs setup consistency', () => {
  test('React index defines canonical worker+WASM setup', () => {
    const content = readReactDoc('index.md');

    expect(content).toContain('## Setup: WASM + Worker Assets');
    expect(content).toContain("import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';");
    expect(content).toContain("import '@scaryterry/pdfium/worker';");
    expect(content).toContain("const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();");
    expect(content).toContain('node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm');
  });

  test('React example pages link back to canonical setup section', () => {
    const expectedLink = './index.md#setup-wasm--worker-assets';

    expect(readReactDoc('examples.md')).toContain(expectedLink);
    expect(readReactDoc('pdf-viewer.md')).toContain(expectedLink);
  });

  test('React docs avoid hard-coded worker/wasm provider prop literals', () => {
    const files = ['examples.md', 'pdf-viewer.md', 'index.md'];
    const literalPropPattern = /<PDFiumProvider[\s\S]*?\b(?:wasmUrl|workerUrl)="/u;

    const offenders = files.filter((file) => literalPropPattern.test(readReactDoc(file)));
    expect(offenders).toEqual([]);
  });

  test('React examples/viewer pages do not duplicate canonical setup snippets', () => {
    const duplicateSnippetPatterns = [
      "import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';",
      "const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();",
    ];
    const files = ['examples.md', 'pdf-viewer.md'];

    const offenders = files.filter((file) => {
      const content = readReactDoc(file);
      return duplicateSnippetPatterns.some((pattern) => content.includes(pattern));
    });

    expect(offenders).toEqual([]);
  });

  test('installation doc matches canonical worker+WASM asset paths', () => {
    const content = readFileSync(INSTALLATION_DOC_PATH, 'utf8');

    expect(content).toContain('// src/pdfium.worker.ts');
    expect(content).toContain("const workerUrl = new URL('./pdfium.worker.ts', import.meta.url).toString();");
    expect(content).toContain('node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm');
    expect(content).not.toContain('node_modules/@scaryterry/pdfium/pdfium.wasm');
  });
});
