import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function listMarkdownFilesIn(relativeDir: string): string[] {
  const dir = join(REPO_ROOT, relativeDir);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => join(relativeDir, name));
}

describe('docs foundation positioning', () => {
  test('README defines both public surfaces (core API + React toolkit)', () => {
    const readme = readRepoFile('README.md');
    const packageJson = readRepoFile('package.json');

    expect(readme).toContain('Core API');
    expect(readme).toContain('@scaryterry/pdfium/react');
    expect(readme).toContain('Choose Your Entry Point');
    expect(packageJson).toContain('React viewer toolkit');
  });

  test('docs introduction explains both paths and runtime model', () => {
    const intro = readRepoFile('docs/src/content/docs/index.md');

    expect(intro).toContain('Path A: Core API');
    expect(intro).toContain('Path B: React Viewer Toolkit');
    expect(intro).toContain('Browser core API');
    expect(intro).toContain('React viewer');
  });

  test('installation and quick-start retain explicit worker/wasm guidance', () => {
    const installation = readRepoFile('docs/src/content/docs/installation.md');
    const quickStart = readRepoFile('docs/src/content/docs/quick-start.md');

    expect(installation).toContain('React viewer (`PDFiumProvider`)');
    expect(installation).toContain('workerUrl');
    expect(installation).toContain('wasmUrl');

    expect(quickStart).toContain('Browser core API');
    expect(quickStart).toContain('React viewer');
    expect(quickStart).toContain('/pdfium/react/');
  });

  test('browser examples clearly point React users to React docs', () => {
    const browserExamples = readRepoFile('docs/src/content/docs/examples/browser.md');

    expect(browserExamples).toContain('React Overview');
    expect(browserExamples).toContain('React Examples');
    expect(browserExamples).toContain('## React Integration (Core API)');
  });

  test('environment comparison reflects Node worker-thread support', () => {
    const environments = readRepoFile('docs/src/content/docs/concepts/environments.md');

    expect(environments).toContain('Node worker threads supported');
    expect(environments).not.toContain('| Web Workers | N/A | N/A |');
  });

  test('backend docs avoid browser setup ambiguity', () => {
    const backends = readRepoFile('docs/src/content/docs/concepts/backends.md');
    const architecture = readRepoFile('docs/src/content/docs/concepts/architecture.md');

    expect(backends).toContain('Browser: provide `wasmUrl`/`wasmBinary`');
    expect(backends).not.toContain('| **Setup** | Zero configuration |');
    expect(architecture).toContain('Browser: provide `wasmUrl`/`wasmBinary`');
  });

  test('security docs reference exported WASM hash API', () => {
    const security = readRepoFile('docs/src/content/docs/guides/security.md');

    expect(security).toContain('import { WASM_HASH } from');
    expect(security).not.toContain('__WASM_HASH__');
  });

  test('guides/concepts/examples pages declare core API scope', () => {
    const targets = [
      ...listMarkdownFilesIn('docs/src/content/docs/guides'),
      ...listMarkdownFilesIn('docs/src/content/docs/concepts'),
      ...listMarkdownFilesIn('docs/src/content/docs/examples'),
    ];

    const missing = targets.filter((file) => !readRepoFile(file).includes('core API'));
    expect(missing).toEqual([]);
  });
});
