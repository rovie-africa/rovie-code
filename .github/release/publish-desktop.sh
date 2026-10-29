#!/usr/bin/env bash
# publish-desktop.sh <sign-macos dir> <sign-desktop-windows-installer dir> <build-desktop-linux-x64 dir>
# <build-desktop-linux-arm64 dir>: uploads the desktop builds to opencode.ai/files and registers the desktop update
# artifact. The electron-updater feeds (latest*.yml) are computed here from the final signed files.
. "$(dirname "$0")/lib.sh"

macos=$1 windows=$2 linux_x64=$3 linux_arm64=$4

resolve_file() {
  local dir=$1
  shift
  for candidate in "$@"; do
    if [ -s "$dir/$candidate" ]; then
      printf '%s\n' "$dir/$candidate"
      return 0
    fi
  done
  printf '%s\n' "$dir/$1"
}

win_arm64=$(resolve_file "$windows" "rovie-code-desktop-win-arm64.exe" "opencode-desktop-win-arm64.exe")
win_x64=$(resolve_file "$windows" "rovie-code-desktop-win-x64.exe" "opencode-desktop-win-x64.exe")
win=("$win_arm64" "$win_x64")

mac_arm64_zip=$(resolve_file "$macos" "rovie-code-desktop-mac-arm64.zip" "opencode-desktop-mac-arm64.zip")
mac_arm64_dmg=$(resolve_file "$macos" "rovie-code-desktop-mac-arm64.dmg" "opencode-desktop-mac-arm64.dmg")
mac_x64_zip=$(resolve_file "$macos" "rovie-code-desktop-mac-x64.zip" "opencode-desktop-mac-x64.zip")
mac_x64_dmg=$(resolve_file "$macos" "rovie-code-desktop-mac-x64.dmg" "opencode-desktop-mac-x64.dmg")
mac=("$mac_arm64_zip" "$mac_arm64_dmg" "$mac_x64_zip" "$mac_x64_dmg")

linux_x86_app=$(resolve_file "$linux_x64" "rovie-code-desktop-linux-x86_64.AppImage" "opencode-desktop-linux-x86_64.AppImage")
linux_x86_deb=$(resolve_file "$linux_x64" "rovie-code-desktop-linux-amd64.deb" "opencode-desktop-linux-amd64.deb")
linux_x86_rpm=$(resolve_file "$linux_x64" "rovie-code-desktop-linux-x86_64.rpm" "opencode-desktop-linux-x86_64.rpm")
linux=("$linux_x86_app" "$linux_x86_deb" "$linux_x86_rpm")

linux_arm_app=$(resolve_file "$linux_arm64" "rovie-code-desktop-linux-arm64.AppImage" "opencode-desktop-linux-arm64.AppImage")
linux_arm_deb=$(resolve_file "$linux_arm64" "rovie-code-desktop-linux-arm64.deb" "opencode-desktop-linux-arm64.deb")
linux_arm_rpm=$(resolve_file "$linux_arm64" "rovie-code-desktop-linux-aarch64.rpm" "opencode-desktop-linux-aarch64.rpm")
linux_arm=("$linux_arm_app" "$linux_arm_deb" "$linux_arm_rpm")

# Dev and beta skip the .app.tar.gz, which only the retired Tauri updater feed read.
bundles=()
case "$OPENCODE_CHANNEL" in
  dev | beta) ;;
  *)
    mac_arm64_tar=$(resolve_file "$macos" "rovie-code-desktop-mac-arm64.app.tar.gz" "opencode-desktop-mac-arm64.app.tar.gz")
    mac_x64_tar=$(resolve_file "$macos" "rovie-code-desktop-mac-x64.app.tar.gz" "opencode-desktop-mac-x64.app.tar.gz")
    bundles=("$mac_arm64_tar" "$mac_x64_tar")
    ;;
esac

feed() {
  local base_url="${ROVIE_FILES_URL:-https://rovie.africa/files}"
  for file in "$@"; do
    jq -n --arg url "$base_url/bin/$OPENCODE_VERSION/$(basename "$file")" \
      --arg sha512 "$(openssl dgst -sha512 -binary "$file" | base64 | tr -d '\n')" --argjson size "$(size "$file")" \
      '{url: $url, sha512: $sha512, size: $size}'
  done | jq -s --arg date "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" '{files: ., releaseDate: $date}'
}

files=$(upload_files "${win[@]}" "${mac[@]}" "${linux[@]}" "${linux_arm[@]}" "${bundles[@]}")
manifests=$(jq -n --argjson win "$(feed "${win[@]}")" --argjson mac "$(feed "${mac[@]}")" \
  --argjson linux "$(feed "${linux[@]}")" --argjson linux_arm64 "$(feed "${linux_arm[@]}")" \
  '{"desktop.yml": $win, "desktop-mac.yml": $mac, "desktop-linux.yml": $linux, "desktop-linux-arm64.yml": $linux_arm64}')
publish_update desktop rovie "$(jq -n --argjson files "$files" --argjson manifests "$manifests" '{files: $files, manifests: $manifests}')"
publish_update desktop opencode "$(jq -n --argjson files "$files" --argjson manifests "$manifests" '{files: $files, manifests: $manifests}')"
