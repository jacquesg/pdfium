/**
 * Normalise generated API docs frontmatter for Astro/Starlight schema compatibility.
 *
 * - Ensures every API markdown file has a `title` field.
 * - Preserves existing frontmatter keys and markdown content.
 */

import { promises as fs } from 'node:fs';
import { extname, basename } from 'node:path';

const API_ROOT = 'docs/src/content/docs/api';

async function collectMarkdownFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      await collectMarkdownFiles(path, files);
      continue;
    }
    if (entry.isFile() && extname(entry.name) === '.md') {
      files.push(path);
    }
  }
  return files;
}

function deriveTitle(path: string): string {
  const file = basename(path, '.md');
  if (file === 'README') {
    return 'API Reference';
  }
  if (file === 'globals') {
    return 'Globals';
  }
  return file;
}

function ensureTitleFrontmatter(content: string, title: string, pathHint: string): string {
  const normalisedPath = pathToPosix(pathHint);
  const isApiReadme = normalisedPath.endsWith('/api/README.md');

  let body = content;
  let frontmatterLines: string[] = [];

  if (content.startsWith('---\n')) {
    const end = content.indexOf('\n---\n', 4);
    if (end !== -1) {
      frontmatterLines = content
        .slice(4, end)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('layout:'));
      body = content.slice(end + 5).replace(/^\n+/u, '');
    }
  } else {
    body = content.replace(/^\n+/u, '');
  }

  const hasTitle = frontmatterLines.some((line) => line.startsWith('title:'));
  if (!hasTitle) {
    frontmatterLines.push(`title: ${title}`);
  }

  if (isApiReadme && !frontmatterLines.some((line) => line.startsWith('slug:'))) {
    frontmatterLines.push('slug: api');
  }

  return `---\n${frontmatterLines.join('\n')}\n---\n\n${body}`;
}

function pathToPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

async function main(): Promise<void> {
  const files = await collectMarkdownFiles(API_ROOT);
  for (const path of files) {
    const content = await fs.readFile(path, 'utf8');
    const withTitle = ensureTitleFrontmatter(content, deriveTitle(path), path);
    if (withTitle !== content) {
      await fs.writeFile(path, withTitle, 'utf8');
    }
  }
  console.log(`Normalised API frontmatter in ${String(files.length)} files.`);
}

main().catch((error) => {
  console.error('Failed to normalise API docs frontmatter:', error);
  process.exit(1);
});
