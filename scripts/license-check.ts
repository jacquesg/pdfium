/**
 * Runtime license compatibility check.
 *
 * Enforces license policy for published package manifests and installed
 * production dependencies only (not full dev/workspace dependency trees).
 *
 * Unknown licenses are warnings by default and can be made fatal with:
 *   PDFIUM_LICENSE_STRICT=true
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ALLOWED_LICENSE_TOKENS = new Set<string>([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
]);

const BANNED_LICENSE_PATTERN = /\b(?:AGPL|GPL|LGPL)(?:[-\d.]|(?:\b))/iu;
const IGNORED_TOKENS = new Set(['AND', 'OR', 'WITH', '(', ')']);

interface PackageLicense {
  name: string;
  version: string;
  license: string;
  source: string;
}

interface PnpmListNode {
  name?: string;
  version?: string;
  path?: string;
  license?: string;
  dependencies?: Record<string, PnpmListNode>;
  optionalDependencies?: Record<string, PnpmListNode>;
}

function normalizeLicense(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const values = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item !== null && typeof item === 'object' && 'type' in item && typeof item.type === 'string') {
          return item.type.trim();
        }
        return '';
      })
      .filter(Boolean);
    return values.join(' OR ');
  }

  if (value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string') {
    return value.type.trim();
  }

  return '';
}

function tokenizeLicenseExpression(expression: string): string[] {
  return expression
    .replace(/[()]/gu, ' ')
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !IGNORED_TOKENS.has(token.toUpperCase()));
}

function classifyLicense(expression: string): 'allowed' | 'banned' | 'unknown' {
  if (expression.length === 0) {
    return 'unknown';
  }

  if (BANNED_LICENSE_PATTERN.test(expression)) {
    return 'banned';
  }

  const tokens = tokenizeLicenseExpression(expression);
  if (tokens.length === 0) {
    return 'unknown';
  }

  const allAllowed = tokens.every((token) => ALLOWED_LICENSE_TOKENS.has(token));
  return allAllowed ? 'allowed' : 'unknown';
}

async function readManifest(path: string): Promise<{ name: string; version: string; license: string } | null> {
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf8');
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }

  const manifest = parsed as Record<string, unknown>;
  const name = typeof manifest.name === 'string' ? manifest.name : undefined;
  const version = typeof manifest.version === 'string' ? manifest.version : undefined;
  if (!name || !version) {
    return null;
  }

  return {
    name,
    version,
    license: normalizeLicense(manifest.license ?? manifest.licenses),
  };
}

async function collectPublishedManifests(): Promise<PackageLicense[]> {
  const manifestPaths = ['package.json'];

  try {
    const entries = await fs.readdir('npm', { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        manifestPaths.push(`npm/${entry.name}/package.json`);
      }
    }
  } catch {
    // npm/ may not exist in all environments.
  }

  const packages: PackageLicense[] = [];
  for (const manifestPath of manifestPaths) {
    const manifest = await readManifest(manifestPath);
    if (manifest === null) {
      continue;
    }
    packages.push({
      name: manifest.name,
      version: manifest.version,
      license: manifest.license,
      source: manifestPath,
    });
  }

  return packages;
}

function collectRuntimeDepsFromTree(node: PnpmListNode, out: PackageLicense[], visited: Set<string>): void {
  const name = typeof node.name === 'string' ? node.name : undefined;
  const version = typeof node.version === 'string' ? node.version : undefined;
  const sourcePath = typeof node.path === 'string' ? node.path : undefined;

  if (name && version) {
    const key = `${name}@${version}`;
    if (!visited.has(key)) {
      visited.add(key);
      out.push({
        name,
        version,
        license: normalizeLicense(node.license),
        source: sourcePath ?? 'pnpm:list',
      });
    }
  }

  const children = [node.dependencies, node.optionalDependencies];
  for (const childMap of children) {
    if (!childMap) continue;
    for (const child of Object.values(childMap)) {
      collectRuntimeDepsFromTree(child, out, visited);
    }
  }
}

async function collectInstalledRuntimeDependencies(): Promise<PackageLicense[]> {
  const { stdout } = await execFileAsync('pnpm', ['-s', 'list', '--prod', '--depth', 'Infinity', '--long', '--json'], {
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  const rootNode = parsed[0] as PnpmListNode;
  const dependencies: PackageLicense[] = [];
  const visited = new Set<string>();

  for (const map of [rootNode.dependencies, rootNode.optionalDependencies]) {
    if (!map) continue;
    for (const child of Object.values(map)) {
      collectRuntimeDepsFromTree(child, dependencies, visited);
    }
  }

  return dependencies;
}

function formatPackage(pkg: PackageLicense): string {
  return `${pkg.name}@${pkg.version} (${pkg.license || 'UNKNOWN'}) [${pkg.source}]`;
}

async function main(): Promise<void> {
  const strictUnknown = process.env.PDFIUM_LICENSE_STRICT === 'true';

  const [publishedManifests, runtimeDependencies] = await Promise.all([
    collectPublishedManifests(),
    collectInstalledRuntimeDependencies(),
  ]);

  const candidates = [...publishedManifests, ...runtimeDependencies];
  const deduped = new Map<string, PackageLicense>();
  for (const candidate of candidates) {
    deduped.set(`${candidate.name}@${candidate.version}|${candidate.source}`, candidate);
  }
  const packages = [...deduped.values()].sort((a, b) =>
    `${a.name}@${a.version}|${a.source}`.localeCompare(`${b.name}@${b.version}|${b.source}`),
  );

  if (packages.length === 0) {
    console.error('No publish/runtime packages found to scan.');
    process.exit(1);
  }

  const banned = packages.filter((pkg) => classifyLicense(pkg.license) === 'banned');
  const unknown = packages.filter((pkg) => classifyLicense(pkg.license) === 'unknown');

  console.log(`Scanned ${String(packages.length)} publish/runtime package entries.`);

  if (banned.length > 0) {
    console.error(`Found ${String(banned.length)} package(s) with banned licenses:`);
    for (const pkg of banned) {
      console.error(`- ${formatPackage(pkg)}`);
    }
    process.exit(1);
  }

  if (unknown.length > 0) {
    const logger: (message?: unknown, ...optionalParams: unknown[]) => void = strictUnknown ? console.error : console.warn;
    logger(`${strictUnknown ? 'Found' : 'Found'} ${String(unknown.length)} package(s) with unknown/non-allowlisted licenses.`);
    for (const pkg of unknown) {
      logger(`- ${formatPackage(pkg)}`);
    }
    if (strictUnknown) {
      process.exit(1);
    }
  }

  console.log('License check passed.');
}

main().catch((error) => {
  console.error('License check failed:', error);
  process.exit(1);
});
