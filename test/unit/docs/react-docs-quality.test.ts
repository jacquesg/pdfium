import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const REACT_DOCS_DIR = join(REPO_ROOT, 'docs/src/content/docs/react');
const ASTRO_CONFIG_PATH = join(REPO_ROOT, 'docs/astro.config.ts');

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/u;
const CODE_FENCE_PATTERN = /```(ts|tsx|typescript|javascript|jsx)\n([\s\S]*?)```/gu;
const REACT_SIDEBAR_SLUG_PATTERN = /slug:\s*'(react(?:\/[^']*)?)'/gu;
const FORBIDDEN_REACT_DOC_PATTERNS: ReadonlyArray<RegExp> = [
  /\bshowThumbnails\b/u,
  /\bshowBookmarks\b/u,
  /\bisThumbnailsOpen\b/u,
  /\bisBookmarksOpen\b/u,
  /\btoggleThumbnails\b/u,
  /\btoggleBookmarks\b/u,
  /classNames\.sidebar\b/u,
  /classNames\.bookmarks\b/u,
  /\bPDFiumProvider\s+src=/u,
  /\bpdfium-worker\.ts\b/u,
  /\bpdfium-worker\.js\b/u,
  /\bpdf-worker\.js\b/u,
];
const REACT_DOCS_WITHOUT_SEE_ALSO = new Set(['index.md']);
const SEE_ALSO_HEADING = '\n## See also\n';

function listReactDocFiles(): string[] {
  return readdirSync(REACT_DOCS_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort();
}

function toReactSlug(file: string): string {
  return file === 'index.md' ? 'react' : `react/${basename(file, '.md')}`;
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

describe('React docs quality', () => {
  test('all React docs declare React viewer toolkit scope', () => {
    const errors: string[] = [];

    for (const file of listReactDocFiles()) {
      const content = readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
      if (!content.includes('React viewer toolkit') || !content.includes('@scaryterry/pdfium/react')) {
        errors.push(`${file}: missing explicit React viewer toolkit scope line`);
      }
    }

    expect(errors).toEqual([]);
  });

  test('React scope line does not use placeholder package tokens', () => {
    const offenders: string[] = [];

    for (const file of listReactDocFiles()) {
      const content = readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
      if (content.includes('React viewer toolkit (`/pdfium/react`)')) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  test('all React docs contain title and description frontmatter', () => {
    const errors: string[] = [];

    for (const file of listReactDocFiles()) {
      const content = readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
      const frontmatterMatch = content.match(FRONTMATTER_PATTERN);
      if (!frontmatterMatch) {
        errors.push(`${file}: missing frontmatter block`);
        continue;
      }

      const frontmatter = frontmatterMatch[1] ?? '';
      if (!/(^|\n)title:\s*\S+/u.test(frontmatter)) {
        errors.push(`${file}: missing title in frontmatter`);
      }
      if (!/(^|\n)description:\s*\S+/u.test(frontmatter)) {
        errors.push(`${file}: missing description in frontmatter`);
      }
    }

    expect(errors).toEqual([]);
  });

  test('React sidebar slugs match React doc files exactly', () => {
    const configContent = readFileSync(ASTRO_CONFIG_PATH, 'utf8');
    const sidebarSlugs = new Set<string>();

    for (const match of configContent.matchAll(REACT_SIDEBAR_SLUG_PATTERN)) {
      sidebarSlugs.add(match[1] ?? '');
    }

    const expectedSlugs = new Set(listReactDocFiles().map(toReactSlug));

    expect(Array.from(sidebarSlugs).sort()).toEqual(Array.from(expectedSlugs).sort());
  });

  test('TypeScript/TSX snippets in React docs parse cleanly', () => {
    const errors: string[] = [];

    for (const file of listReactDocFiles()) {
      const content = readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
      let snippetIndex = 0;

      for (const match of content.matchAll(CODE_FENCE_PATTERN)) {
        snippetIndex++;
        const language = match[1] ?? '';
        const snippetCode = match[2] ?? '';
        const extension = detectSnippetExtension(language);
        const parseErrors = parseSnippetErrors(file, snippetCode, extension);

        for (const error of parseErrors) {
          errors.push(`${file}#${String(snippetIndex)} (${language}): ${error}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test('React docs do not reference removed panel APIs', () => {
    const errors: string[] = [];

    for (const file of listReactDocFiles()) {
      const content = readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
      for (const pattern of FORBIDDEN_REACT_DOC_PATTERNS) {
        if (pattern.test(content)) {
          errors.push(`${file}: contains removed API token matching ${pattern.source}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test('React docs use a consistent final "See also" section', () => {
    const errors: string[] = [];

    for (const file of listReactDocFiles()) {
      if (REACT_DOCS_WITHOUT_SEE_ALSO.has(file)) {
        continue;
      }

      const content = readFileSync(join(REACT_DOCS_DIR, file), 'utf8');
      const firstHeadingIndex = content.indexOf(SEE_ALSO_HEADING);
      const lastHeadingIndex = content.lastIndexOf(SEE_ALSO_HEADING);

      if (lastHeadingIndex < 0) {
        errors.push(`${file}: missing "## See also" section`);
        continue;
      }

      if (firstHeadingIndex !== lastHeadingIndex) {
        errors.push(`${file}: multiple "## See also" sections found`);
      }

      const tail = content.slice(lastHeadingIndex + SEE_ALSO_HEADING.length);
      if (/\n##\s+/u.test(tail)) {
        errors.push(`${file}: "## See also" must be the final H2 section`);
      }

      const linkCount = tail.split('\n').filter((line) => line.trimStart().startsWith('- [')).length;
      if (linkCount < 2) {
        errors.push(`${file}: "## See also" must contain at least 2 links`);
      }
    }

    expect(errors).toEqual([]);
  });
});
