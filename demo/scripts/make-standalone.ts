#!/usr/bin/env tsx

/**
 * Standalone mode generator for PDFium demos.
 *
 * This script creates a self-contained demo that works with the published
 * npm package (not the local development version).
 *
 * Usage:
 *   pnpm tsx demo/scripts/make-standalone.ts <demo> <output-dir>
 *
 * Examples:
 *   pnpm tsx demo/scripts/make-standalone.ts node /tmp/pdfium-node-demo
 *   pnpm tsx demo/scripts/make-standalone.ts plain /tmp/pdfium-plain-demo
 *   pnpm tsx demo/scripts/make-standalone.ts vite /tmp/pdfium-vite-demo
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(DEMO_ROOT, '..');

type DemoType = 'node' | 'plain' | 'vite';

interface PackageJson {
  name: string;
  version: string;
  type: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
}

function log(message: string): void {
  console.log(`[standalone] ${message}`);
}

function error(message: string): void {
  console.error(`[standalone] ERROR: ${message}`);
}

function usage(): void {
  console.log('Usage: pnpm tsx demo/scripts/make-standalone.ts <demo> <output-dir>');
  console.log('');
  console.log('Available demos: node, plain, vite');
  console.log('');
  console.log('Examples:');
  console.log('  pnpm tsx demo/scripts/make-standalone.ts node /tmp/pdfium-node-demo');
  console.log('  pnpm tsx demo/scripts/make-standalone.ts vite /tmp/pdfium-vite-demo');
  process.exit(1);
}

function getPackageVersion(): string {
  const pkgPath = join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

function generateNodeDemo(outputDir: string): void {
  const version = getPackageVersion();

  mkdirSync(outputDir, { recursive: true });

  // Copy index.ts
  copyFileSync(join(DEMO_ROOT, 'node', 'index.ts'), join(outputDir, 'index.ts'));
  log('Copied index.ts');

  // Copy sample.pdf
  copyFileSync(join(DEMO_ROOT, 'shared', 'sample.pdf'), join(outputDir, 'sample.pdf'));
  log('Copied sample.pdf');

  // Generate package.json
  const packageJson: PackageJson = {
    name: 'pdfium-node-demo',
    version: '1.0.0',
    type: 'module',
    scripts: {
      start: 'tsx index.ts',
    },
    dependencies: {
      '@scaryterry/pdfium': `^${version}`,
    },
    devDependencies: {
      tsx: '^4.19.0',
    },
    engines: {
      node: '>=22',
    },
  };

  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  log('Generated package.json');

  // Generate README
  const readme = `# PDFium Node.js Demo (Standalone)

This is a standalone demo that uses the published \`@scaryterry/pdfium\` package.

## Quick Start

\`\`\`bash
npm install
npm start
\`\`\`

## Expected Output

\`\`\`
=> library initialised
=> document loaded
===> number of pages: 1
=> page loaded
===> page size: 612 x 792
===> text length: ... characters
=> done
\`\`\`

## What This Demo Shows

- Initialising PDFium in Node.js (auto-loads WASM from node_modules)
- Opening a PDF document from a file
- Reading page count and dimensions
- Extracting text content
- Proper resource cleanup with \`using\` keyword

## Learn More

See the main repository: https://github.com/nickadam/pdfium
`;

  writeFileSync(join(outputDir, 'README.md'), readme);
  log('Generated README.md');
}

function generatePlainDemo(outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });

  // Copy sample.pdf
  copyFileSync(join(DEMO_ROOT, 'shared', 'sample.pdf'), join(outputDir, 'sample.pdf'));
  log('Copied sample.pdf');

  // Check for standalone.html template
  const standaloneHtml = join(DEMO_ROOT, 'plain', 'standalone.html');
  if (existsSync(standaloneHtml)) {
    copyFileSync(standaloneHtml, join(outputDir, 'index.html'));
    log('Copied standalone.html as index.html');
  } else {
    // Generate from development version
    const devHtml = readFileSync(join(DEMO_ROOT, 'plain', 'index.html'), 'utf-8');
    // Note: standalone.html should be manually created for proper CDN usage
    writeFileSync(join(outputDir, 'index.html'), devHtml);
    log('Copied index.html (development paths - update for production)');
  }

  // Generate README
  const readme = `# PDFium Plain HTML Demo (Standalone)

This is a standalone demo that uses \`@scaryterry/pdfium\` without any build tools.

## Quick Start

1. Install the package to get the WASM binary:
   \`\`\`bash
   npm install @scaryterry/pdfium
   \`\`\`

2. Copy the required files to this directory:
   \`\`\`bash
   cp node_modules/@scaryterry/pdfium/dist/browser.js .
   cp node_modules/@scaryterry/pdfium/dist/vendor/pdfium.wasm .
   cp node_modules/@scaryterry/pdfium/src/vendor/pdfium.cjs .
   \`\`\`

3. Serve the directory with any HTTP server:
   \`\`\`bash
   python3 -m http.server 8080
   \`\`\`

4. Open http://localhost:8080/

## What This Demo Shows

- Loading PDFium in a browser with import maps
- Rendering a PDF page to a canvas
- No build tools required

## Learn More

See the main repository: https://github.com/nickadam/pdfium
`;

  writeFileSync(join(outputDir, 'README.md'), readme);
  log('Generated README.md');
}

function generateViteDemo(outputDir: string): void {
  const version = getPackageVersion();
  const viteDir = join(DEMO_ROOT, 'vite');

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, 'src'), { recursive: true });
  mkdirSync(join(outputDir, 'public'), { recursive: true });

  // Copy source files
  const filesToCopy = ['index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts'];

  for (const file of filesToCopy) {
    const srcPath = join(viteDir, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, join(outputDir, file));
      log(`Copied ${file}`);
    }
  }

  // Copy src directory contents
  const srcFiles = ['client.ts', 'demo.tsx', 'main.tsx', 'vite-env.d.ts'];
  for (const file of srcFiles) {
    const srcPath = join(viteDir, 'src', file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, join(outputDir, 'src', file));
      log(`Copied src/${file}`);
    }
  }

  // Copy public files (excluding pdfium.cjs which will be set up differently)
  const publicFiles = ['vite.svg'];
  for (const file of publicFiles) {
    const srcPath = join(viteDir, 'public', file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, join(outputDir, 'public', file));
      log(`Copied public/${file}`);
    }
  }

  // Copy sample.pdf
  copyFileSync(join(DEMO_ROOT, 'shared', 'sample.pdf'), join(outputDir, 'public', 'sample.pdf'));
  log('Copied sample.pdf to public/');

  // Check for standalone package.json template
  const standalonePackageJson = join(viteDir, 'package.standalone.json');
  if (existsSync(standalonePackageJson)) {
    const pkg = JSON.parse(readFileSync(standalonePackageJson, 'utf-8')) as PackageJson;
    pkg.dependencies['@scaryterry/pdfium'] = `^${version}`;
    writeFileSync(join(outputDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    log('Generated package.json from template');
  } else {
    // Generate from development version
    const devPkg = JSON.parse(readFileSync(join(viteDir, 'package.json'), 'utf-8')) as PackageJson;
    devPkg.dependencies['@scaryterry/pdfium'] = `^${version}`;
    devPkg.scripts['postinstall'] = 'node setup.mjs';
    writeFileSync(join(outputDir, 'package.json'), JSON.stringify(devPkg, null, 2) + '\n');
    log('Generated package.json');
  }

  // Generate setup script for post-install
  const setupScript = `#!/usr/bin/env node

/**
 * Post-install setup for standalone Vite demo.
 * Copies pdfium.cjs from node_modules to public directory.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfiumCjs = join(__dirname, 'node_modules', '@scaryterry', 'pdfium', 'src', 'vendor', 'pdfium.cjs');
const publicDir = join(__dirname, 'public');
const targetCjs = join(publicDir, 'pdfium.cjs');

if (existsSync(pdfiumCjs) && !existsSync(targetCjs)) {
  copyFileSync(pdfiumCjs, targetCjs);
  console.log('[setup] Copied pdfium.cjs to public/');
} else if (existsSync(targetCjs)) {
  console.log('[setup] pdfium.cjs already exists in public/');
} else {
  console.error('[setup] pdfium.cjs not found in node_modules');
}
`;

  writeFileSync(join(outputDir, 'setup.mjs'), setupScript);
  log('Generated setup.mjs');

  // Generate README
  const readme = `# PDFium Vite Demo (Standalone)

This is a standalone demo that uses \`@scaryterry/pdfium\` with Vite and React.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

The post-install script automatically copies the required \`pdfium.cjs\` file.

## What This Demo Shows

- Using PDFium with Vite and React
- Rendering PDF pages to a canvas
- React Query integration for async loading
- Proper Vite configuration (excluding package from optimisation)

## Vite Configuration

The key configuration in \`vite.config.ts\`:

\`\`\`typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
});
\`\`\`

## Learn More

See the main repository: https://github.com/nickadam/pdfium
`;

  writeFileSync(join(outputDir, 'README.md'), readme);
  log('Generated README.md');
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    usage();
  }

  const [demo, outputDir] = args as [string, string];
  const validDemos: DemoType[] = ['node', 'plain', 'vite'];

  if (!validDemos.includes(demo as DemoType)) {
    error(`Invalid demo type: ${demo}`);
    console.log(`Valid options: ${validDemos.join(', ')}`);
    process.exit(1);
  }

  const absoluteOutputDir = resolve(outputDir);

  if (existsSync(absoluteOutputDir)) {
    error(`Output directory already exists: ${absoluteOutputDir}`);
    console.log('Please remove it or choose a different location.');
    process.exit(1);
  }

  log(`Generating standalone ${demo} demo...`);
  log(`Output: ${absoluteOutputDir}`);
  log('');

  switch (demo as DemoType) {
    case 'node':
      generateNodeDemo(absoluteOutputDir);
      break;
    case 'plain':
      generatePlainDemo(absoluteOutputDir);
      break;
    case 'vite':
      generateViteDemo(absoluteOutputDir);
      break;
  }

  log('');
  log('Standalone demo generated successfully!');
  log('');
  log('Next steps:');
  log(`  cd ${absoluteOutputDir}`);
  log('  npm install');

  if (demo === 'node') {
    log('  npm start');
  } else if (demo === 'plain') {
    log('  python3 -m http.server 8080');
  } else {
    log('  npm run dev');
  }
}

main();
