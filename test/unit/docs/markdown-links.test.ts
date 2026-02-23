import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/gu;
const EXCLUDED_PREFIXES = ['docs/src/content/docs/api/'];

function listTrackedMarkdownFiles(): string[] {
  const output = execFileSync('git', ['ls-files', '*.md', '*.mdx'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !EXCLUDED_PREFIXES.some((prefix) => line.startsWith(prefix)));
}

function normalizeMarkdownTarget(rawTarget: string): string {
  let target = rawTarget.trim();
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim();
  }
  return target.split(/\s+/u)[0] ?? '';
}

function isIgnoredTarget(target: string): boolean {
  return (
    target.length === 0 || target.startsWith('#') || target.startsWith('/') || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(target)
  );
}

function targetExists(sourceFile: string, target: string): boolean {
  const pathWithoutHash = target.split('#', 1)[0] ?? '';
  const pathWithoutQuery = pathWithoutHash.split('?', 1)[0] ?? '';
  if (!pathWithoutQuery) {
    return true;
  }

  const sourceDir = dirname(join(REPO_ROOT, sourceFile));
  const resolved = normalize(join(sourceDir, pathWithoutQuery));

  return (
    existsSync(resolved) ||
    existsSync(`${resolved}.md`) ||
    existsSync(`${resolved}.mdx`) ||
    existsSync(join(resolved, 'index.md')) ||
    existsSync(join(resolved, 'index.mdx'))
  );
}

describe('tracked markdown relative links', () => {
  test('all relative markdown links resolve to existing files', () => {
    const brokenLinks: string[] = [];
    const files = listTrackedMarkdownFiles();

    for (const file of files) {
      const content = readFileSync(join(REPO_ROOT, file), 'utf8');
      const lines = content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex] ?? '';
        for (const match of line.matchAll(LINK_PATTERN)) {
          const target = normalizeMarkdownTarget(match[1] ?? '');
          if (isIgnoredTarget(target)) {
            continue;
          }

          if (!targetExists(file, target)) {
            brokenLinks.push(`${file}:${String(lineIndex + 1)} -> ${target}`);
          }
        }
      }
    }

    expect(brokenLinks).toEqual([]);
  });
});
