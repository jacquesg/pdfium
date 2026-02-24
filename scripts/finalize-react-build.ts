import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function finalizeReactBuild(distDir = 'dist') {
  const reactEntryPath = join(distDir, 'react.js');

  if (existsSync(reactEntryPath)) {
    writeFileSync(reactEntryPath, "'use client';\nexport * from './react/index.js';\n", 'utf8');
  }
}

const isDirectRun = process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  finalizeReactBuild();
}

export { finalizeReactBuild };
