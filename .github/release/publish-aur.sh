#!/usr/bin/env bash
# publish-aur.sh <build-npm dir>: updates opencode-beta on the AUR over SSH (AUR_KEY, pinned host key) and
# registers the aur update artifact.
. "$(dirname "$0")/lib.sh"

if [ -z "${AUR_KEY:-}" ]; then
  echo "::warning::Missing AUR_KEY; skipping Arch User Repository update"
  exit 0
fi
push_git ssh://aur@aur.archlinux.org/opencode-beta.git "chore: update opencode-beta to ${OPENCODE_VERSION//-/.}" \
  bash "$release_dir/render-aur.sh" "$1"
publish_update cli aur '{"package": "opencode-beta"}'
