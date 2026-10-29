#!/usr/bin/env bash
# publish-homebrew.sh <sign-macos dir> <build-archives dir>: updates opencode-v2 in anomalyco/homebrew-tap over SSH
# with its write deploy key (HOMEBREW_TAP_DEPLOY_KEY) and registers the homebrew update artifact.
. "$(dirname "$0")/lib.sh"

if [ -z "${HOMEBREW_TAP_DEPLOY_KEY:-}" ]; then
  echo "::warning::Missing HOMEBREW_TAP_DEPLOY_KEY; skipping Homebrew tap update"
  exit 0
fi

push_git "git@github.com:anomalyco/homebrew-tap.git" \
  "chore: update opencode-v2 to $OPENCODE_VERSION" bash "$release_dir/render-homebrew.sh" "$1" "$2"
publish_update cli homebrew '{"package": "anomalyco/tap/opencode-v2"}'
