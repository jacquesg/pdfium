import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const DOCS_DIR = join(REPO_ROOT, 'docs/src/content/docs');
const MANUAL_DOCS_EXCLUDED_PREFIXES = ['api/'];

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/u;
const CODE_FENCE_PATTERN = /```(ts|tsx|typescript|javascript|jsx)\n([\s\S]*?)```/gu;
const FORBIDDEN_DOC_PATTERNS: ReadonlyArray<RegExp> = [
  /\bPDFiumProvider\s+src=/u,
  /\bpdfium-worker\.ts\b/u,
  /\bpdfium-worker\.js\b/u,
  /\bpdf-worker\.js\b/u,
  /node_modules\/@scaryterry\/pdfium\/pdfium\.wasm/u,
];

function listManualDocFiles(currentDir = DOCS_DIR, prefix = ''): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const relPath = prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listManualDocFiles(fullPath, relPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    if (MANUAL_DOCS_EXCLUDED_PREFIXES.some((excludedPrefix) => relPath.startsWith(excludedPrefix))) {
      continue;
    }

    files.push(relPath);
  }

  return files.sort();
}

function detectSnippetExtension(language: string): 'ts' | 'tsx' {
  return language === 'tsx' || language === 'jsx' ? 'tsx' : 'ts';
}

function parseSnippetErrors(file: string, code: string, extension: 'ts' | 'tsx'): string[] {
  const transpileResult = ts.transpileModule(code, {
    fileName: `${file}.${extension}`,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
    },
  });

  return (transpileResult.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

describe('docs quality (manual pages)', () => {
  test('all manual docs contain title and description frontmatter', () => {
    const errors: string[] = [];

    for (const relFile of listManualDocFiles()) {
      const content = readFileSync(join(DOCS_DIR, relFile), 'utf8');
      const frontmatterMatch = content.match(FRONTMATTER_PATTERN);
      if (!frontmatterMatch) {
        errors.push(`${relFile}: missing frontmatter block`);
        continue;
      }

      const frontmatter = frontmatterMatch[1] ?? '';
      if (!/(^|\n)title:\s*\S+/u.test(frontmatter)) {
        errors.push(`${relFile}: missing title in frontmatter`);
      }
      if (!/(^|\n)description:\s*\S+/u.test(frontmatter)) {
        errors.push(`${relFile}: missing description in frontmatter`);
      }
    }

    expect(errors).toEqual([]);
  });

  test('TypeScript/TSX snippets in manual docs parse cleanly', () => {
    const errors: string[] = [];

    for (const relFile of listManualDocFiles()) {
      const content = readFileSync(join(DOCS_DIR, relFile), 'utf8');
      let snippetIndex = 0;

      for (const match of content.matchAll(CODE_FENCE_PATTERN)) {
        snippetIndex++;
        const language = match[1] ?? '';
        const snippetCode = match[2] ?? '';
        const extension = detectSnippetExtension(language);
        const parseErrors = parseSnippetErrors(relFile, snippetCode, extension);

        for (const error of parseErrors) {
          errors.push(`${relFile}#${String(snippetIndex)} (${language}): ${error}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test('manual docs avoid stale worker/WASM setup patterns', () => {
    const errors: string[] = [];

    for (const relFile of listManualDocFiles()) {
      const content = readFileSync(join(DOCS_DIR, relFile), 'utf8');
      for (const pattern of FORBIDDEN_DOC_PATTERNS) {
        if (pattern.test(content)) {
          errors.push(`${relFile}: contains stale token matching ${pattern.source}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });
});
