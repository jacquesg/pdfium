/**
 * Check build size against limits.
 */

import { statSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = 'dist';
const LIMITS = {
  'index.js': 20 * 1024, // 20KB limit for main entry
  'browser.js': 20 * 1024,
  'worker.js': 20 * 1024,
};

function getFileSize(filePath: string): number {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

function checkSize() {
  console.log('Checking build sizes...');
  let failed = false;

  for (const [file, limit] of Object.entries(LIMITS)) {
    const path = join(DIST_DIR, file);
    const size = getFileSize(path);
    const limitKB = (limit / 1024).toFixed(2);
    const sizeKB = (size / 1024).toFixed(2);

    if (size === 0) {
      console.error(`FAIL ${file}: File not found`);
      failed = true;
      continue;
    }

    if (size > limit) {
      console.error(`FAIL ${file}: ${sizeKB}KB (exceeds limit of ${limitKB}KB)`);
      failed = true;
    } else {
      console.log(`PASS ${file}: ${sizeKB}KB (limit: ${limitKB}KB)`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

checkSize();
