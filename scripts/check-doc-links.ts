/**
 * Validate internal docs links against built static routes.
 *
 * Checks links in docs markdown files that target `/pdfium/...` and fails when
 * the target route does not exist in `docs/dist`.
 */

import { promises as fs } from 'node:fs';
import { extname, join, relative } from 'node:path';

const DOCS_SOURCE_ROOT = 'docs/src/content/docs';
const DOCS_DIST_ROOT = 'docs/dist';
const DOCS_BASE_PATH = '/pdfium';
const MARKDOWN_LINK_REGEX = /\[[^\]]*\]\(([^)]+)\)/gu;

interface LinkError {
  file: string;
  line: number;
  target: string;
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

function canonicalizePath(path: string): string {
  const [withoutFragment] = path.split('#', 1);
  const [withoutQuery] = withoutFragment.split('?', 1);
  const trimmed = withoutQuery.trim();
  if (trimmed.length === 0) {
    return '/';
  }

  let normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  normalized = normalized.replace(/\/{2,}/gu, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function extractMarkdownTarget(raw: string): string {
  let value = raw.trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1).trim();
  }
  const [firstToken] = value.split(/\s+/u);
  return firstToken ?? '';
}

function isExternalOrIgnoredTarget(target: string): boolean {
  return (
    target.length === 0 ||
    target.startsWith('#') ||
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:') ||
    target.startsWith('javascript:')
  );
}

async function collectFiles(dir: string, extension: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, extension, out);
      continue;
    }
    if (entry.isFile() && extname(entry.name) === extension) {
      out.push(fullPath);
    }
  }
  return out;
}

async function collectValidRoutes(): Promise<Set<string>> {
  const htmlFiles = await collectFiles(DOCS_DIST_ROOT, '.html');
  const routes = new Set<string>();

  for (const htmlFile of htmlFiles) {
    const relPath = toPosix(relative(DOCS_DIST_ROOT, htmlFile));
    if (relPath === 'index.html') {
      routes.add(canonicalizePath(DOCS_BASE_PATH));
      continue;
    }

    if (relPath.endsWith('/index.html')) {
      const routePart = relPath.slice(0, -'/index.html'.length);
      routes.add(canonicalizePath(`${DOCS_BASE_PATH}/${routePart}`));
      continue;
    }

    routes.add(canonicalizePath(`${DOCS_BASE_PATH}/${relPath}`));
  }

  return routes;
}

async function validateLinks(validRoutes: Set<string>): Promise<LinkError[]> {
  const markdownFiles = await collectFiles(DOCS_SOURCE_ROOT, '.md');
  const errors: LinkError[] = [];

  for (const file of markdownFiles) {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const match of line.matchAll(MARKDOWN_LINK_REGEX)) {
        const rawTarget = extractMarkdownTarget(match[1] ?? '');
        if (isExternalOrIgnoredTarget(rawTarget)) {
          continue;
        }
        if (!rawTarget.startsWith(DOCS_BASE_PATH)) {
          continue;
        }

        const canonicalTarget = canonicalizePath(rawTarget);
        if (!validRoutes.has(canonicalTarget)) {
          errors.push({
            file: toPosix(file),
            line: i + 1,
            target: rawTarget,
          });
        }
      }
    }
  }

  return errors;
}

async function main(): Promise<void> {
  const validRoutes = await collectValidRoutes();
  const errors = await validateLinks(validRoutes);

  if (errors.length > 0) {
    console.error(`Found ${String(errors.length)} broken internal docs link(s):`);
    for (const error of errors) {
      console.error(`- ${error.file}:${String(error.line)} -> ${error.target}`);
    }
    process.exit(1);
  }

  console.log(`Docs internal link check passed (${String(validRoutes.size)} routes validated).`);
}

main().catch((error) => {
  console.error('Docs internal link check failed:', error);
  process.exit(1);
});
