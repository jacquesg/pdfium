#!/usr/bin/env bash
set -euo pipefail

# Publish all native packages to npm with proper registry synchronisation.
# Waits for each package to be available before publishing the next one
# to avoid 409 Conflict errors.

wait_for_package() {
  local pkg="$1"
  local ver="$2"
  local max_attempts=30
  local attempt=0

  echo "Waiting for $pkg@$ver to be available on registry..."

  while ! npm view "$pkg@$ver" version &>/dev/null; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      echo "ERROR: Timed out waiting for $pkg@$ver after $max_attempts attempts"
      exit 1
    fi
    sleep 2
  done

  echo "$pkg@$ver is now available"
}

publish_package() {
  local dir="$1"
  local pkg ver

  pkg=$(jq -r '.name' "$dir/package.json")
  ver=$(jq -r '.version' "$dir/package.json")

  echo "Publishing $pkg@$ver from $dir"
  pnpm publish "$dir" --provenance --access public --no-git-checks

  wait_for_package "$pkg" "$ver"
}

main() {
  for dir in npm/*/; do
    publish_package "$dir"
  done

  echo "All native packages published successfully"
}

main "$@"
