# Shared helpers for the release scripts. Sourced, never executed.
#
# These scripts run in sign and publish jobs that hold secrets. They must never execute repository code
# or artifact contents: artifacts are data, and every value that names a destination comes from the
# environment the workflow sets (OPENCODE_VERSION, OPENCODE_CHANNEL, OPENCODE_DRY_RUN, ...).

set -euo pipefail

# shellcheck disable=SC2034 # used by the scripts that source this file
release_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

die() {
  echo "::error::$*" >&2
  exit 1
}

dry_run() {
  [ "${OPENCODE_DRY_RUN:-false}" = true ]
}

sha256() {
  if command -v sha256sum > /dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi
}

# Windows runners pass D:\a\_temp style paths; Git Bash tools want /d/a/_temp.
posix() {
  if command -v cygpath > /dev/null; then cygpath -u "$1"; else printf '%s' "$1"; fi
}

size() {
  wc -c < "$1" | tr -d ' '
}

# Uploads files to files.rovie.africa/bin/<version>/ and prints the update-server file map.
upload_files() {
  local credentials=false
  for file in "$@"; do
    test -s "$file" || die "Missing release file: $file"
    local name type
    name=$(basename "$file")
    case "$name" in
      *.tar.gz) type=application/gzip ;;
      *.zip) type=application/zip ;;
      *) type=application/octet-stream ;;
    esac
    if dry_run; then
      echo "dry-run upload: bin/$OPENCODE_VERSION/$name" >&2
    else
      if [ "$credentials" = false ]; then
        r2_credentials
        credentials=true
      fi
      local bucket="${CLOUDFLARE_R2_BUCKET:-rovie-code-production-files}"
      local endpoint="${CLOUDFLARE_S3_API_ENDPOINT:-https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com}"
      aws s3 cp "$file" "s3://$bucket/bin/$OPENCODE_VERSION/$name" --only-show-errors \
        --endpoint-url "$endpoint" \
        --content-type "$type" --content-disposition "attachment; filename=\"$name\"" \
        --cache-control "public, max-age=31536000, immutable" >&2 || echo "::warning::R2 upload skipped or failed for $name" >&2
    fi
    local base_url="${ROVIE_FILES_URL:-https://rovie.africa/files}"
    jq -n --arg name "$name" --arg url "$base_url/bin/$OPENCODE_VERSION/$name" \
      --arg sha256 "$(sha256 "$file" | cut -c1-64)" --argjson size "$(size "$file")" \
      '{($name): {url: $url, sha256: $sha256, size: $size}}'
  done | jq -s 'add'
}

# R2 accepts the API token ID as the access key and SHA-256(token) as the secret.
r2_credentials() {
  if [ -n "${CLOUDFLARE_ACCESS_KEY_ID:-}" ] && [ -n "${CLOUDFLARE_SECRET_ACCESS_KEY:-}" ]; then
    export AWS_ACCESS_KEY_ID="$CLOUDFLARE_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$CLOUDFLARE_SECRET_ACCESS_KEY"
  else
    local id
    id=$(curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" | jq -er .result.id)
    export AWS_ACCESS_KEY_ID="$id"
    AWS_SECRET_ACCESS_KEY=$(printf '%s' "$CLOUDFLARE_API_TOKEN" | sha256 | cut -c1-64)
    export AWS_SECRET_ACCESS_KEY
  fi
  export AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
}

# Registers one artifact with the update server: publish_update <name> <distribution> <metadata json>.
publish_update() {
  local body status token attempt
  body=$(jq -n --arg channel "$OPENCODE_CHANNEL" --arg version "$OPENCODE_VERSION" --arg name "$1" --arg distribution "$2" \
    --argjson metadata "$3" '{channel: $channel, name: $name, distribution: $distribution, version: $version, metadata: $metadata}')
  echo "$body" | jq .
  if dry_run; then return; fi
  local update_url="${ROVIE_UPDATE_URL:-https://update.rovie.africa}"
  token=$(curl -fsS -H "Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
    "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://update.rovie.africa" 2>/dev/null | jq -er .value || \
    curl -fsS -H "Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
    "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://update.opencode.ai" 2>/dev/null | jq -er .value || true)
  if [ -z "$token" ]; then
    echo "::warning::Could not obtain GitHub OIDC token for update server; skipping update server registration" >&2
    return 0
  fi
  for attempt in 1 2 3; do
    status=$(curl -sS -o "$RUNNER_TEMP/update-response" -w '%{http_code}' -X POST "$update_url/api/publish" \
      -H "Authorization: Bearer $token" -H "Content-Type: application/json" --data "$body" 2>/dev/null || true)
    if [ "$status" -lt 300 ] 2>/dev/null; then return; fi
    cat "$RUNNER_TEMP/update-response" 2>/dev/null || true
    # If update server returned an error or cannot be reached, log warning instead of failing entire release
    if [ "$status" -lt 500 ] 2>/dev/null || [ "$attempt" = 3 ]; then
      echo "::warning::Update server returned $status or was unreachable; continuing release" >&2
      return 0
    fi
    sleep "$attempt"
  done
}

# Clones a repository, lets a render script fill it, then commits and pushes any change:
# push_git <clone url> <commit message> <render script> [args...]. Dry runs render into an empty directory.
push_git() {
  local url=$1 message=$2 dir
  shift 2
  dir=$(mktemp -d)
  if ! dry_run; then git clone -q "$url" "$dir"; fi
  "$@" "$dir"
  if dry_run; then return; fi
  git -C "$dir" add -A
  if git -C "$dir" diff --cached --quiet; then return; fi
  git -C "$dir" -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit -q -m "$message"
  git -C "$dir" push -q origin HEAD:master
}
