/**
 * Check for new PDFium releases and create update PR.
 *
 * Compares latest bblanchon/pdfium-binaries release with the
 * version pinned in LAST_RELEASE.txt. If newer, updates the
 * file and creates a pull request.
 *
 * Usage: pnpm check:pdfium-updates
 * (Run by CI workflow on schedule)
 *
 * @module scripts/check-pdfium-updates
 */

import { execSync } from 'node:child_process';
import {
  UPSTREAM_OWNER,
  UPSTREAM_REPO,
  createOctokit,
  getRelease,
  readPinnedVersion,
  writePinnedVersion,
} from './lib/pdfium-download.js';

const REPO_OWNER = 'jacquesg';
const REPO_NAME = 'pdfium';

interface OctokitError {
  status: number;
  message: string;
}

function isOctokitError(error: unknown): error is OctokitError {
  return typeof error === 'object' && error !== null && 'status' in error && typeof (error as OctokitError).status === 'number';
}

async function main(): Promise<void> {
  const octokit = createOctokit();

  // Get latest release from bblanchon/pdfium-binaries
  const latestRelease = await getRelease(octokit, 'latest');
  const latestTag = latestRelease.tag_name;
  console.log(`Latest upstream release: ${latestTag}`);

  // Read current pinned version
  const pinnedVersion = await readPinnedVersion();
  console.log(`Current pinned version: ${pinnedVersion}`);

  // Compare versions
  if (latestTag === pinnedVersion) {
    console.log('Already up to date, no action needed.');
    return;
  }

  console.log(`New release available: ${latestTag} (currently on ${pinnedVersion})`);

  // Create branch name from release tag (replace / with -)
  const branchName = `update-pdfium-${latestTag.replace(/\//g, '-')}`;
  console.log(`Branch name: ${branchName}`);

  // Check if branch already exists
  try {
    await octokit.repos.getBranch({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: branchName,
    });
    console.log(`Branch ${branchName} already exists, skipping.`);
    return;
  } catch (error: unknown) {
    if (!isOctokitError(error) || error.status !== 404) {
      throw error;
    }
    // Branch doesn't exist, continue
  }

  // Check if there's already an open PR for this update
  const { data: openPRs } = await octokit.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'open',
    head: `${REPO_OWNER}:${branchName}`,
  });

  if (openPRs.length > 0) {
    console.log(`PR already exists for ${branchName}, skipping.`);
    return;
  }

  // Configure git user for automated commits
  execSync("git config --global user.name 'github-actions[bot]'");
  execSync("git config --global user.email 'github-actions[bot]@users.noreply.github.com'");

  // Create and checkout new branch
  execSync(`git switch -c ${branchName}`);

  // Update LAST_RELEASE.txt
  await writePinnedVersion(latestTag);
  console.log(`Updated LAST_RELEASE.txt to ${latestTag}`);

  // Commit and push
  execSync(`git add src/vendor/LAST_RELEASE.txt`);
  execSync(`git commit -m "chore: update PDFium to ${latestTag}"`);
  execSync(`git push origin ${branchName}`);
  console.log(`Pushed branch ${branchName}`);

  // Create pull request
  const { data: pr } = await octokit.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title: `chore: update PDFium to ${latestTag}`,
    head: branchName,
    base: 'main',
    body: `Update PDFium to ${latestTag} (from ${pinnedVersion})

## Source
- Repository: [${UPSTREAM_OWNER}/${UPSTREAM_REPO}](https://github.com/${UPSTREAM_OWNER}/${UPSTREAM_REPO})
- Release: [${latestTag}](https://github.com/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/releases/tag/${latestTag})

## Changes
This PR updates the pinned PDFium version in \`LAST_RELEASE.txt\`.

The actual binaries (WASM and native libraries) will be downloaded during:
- CI builds (via \`pnpm download:pdfium\`)
- Release workflow (for each platform)

---
*This PR was automatically created by the update-pdfium workflow.*`,
  });

  console.log(`Created pull request: ${pr.html_url}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
