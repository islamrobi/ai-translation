#!/usr/bin/env bash
# Build a clean Chrome Web Store upload package containing only the files the
# extension needs at runtime (no dev/docs/git files).
#
# Usage: ./package.sh
# Output: dist/h2r-translate-v<version>.zip

set -euo pipefail

cd "$(dirname "$0")"

# Regenerate icons so the package always has fresh, matching art.
if command -v python3 >/dev/null 2>&1; then
  python3 gen_icons.py >/dev/null
fi

VERSION="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
OUT_DIR="dist"
OUT_ZIP="${OUT_DIR}/ai-translate-english-to-bangla-v${VERSION}.zip"

# Runtime files that must ship in the extension package.
FILES=(
  manifest.json
  background.js
  content.js
  content.css
  options.html
  options.css
  options.js
  popup.html
  popup.js
  icons/icon16.png
  icons/icon32.png
  icons/icon48.png
  icons/icon128.png
)

# Verify everything exists before zipping.
missing=0
for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: missing required file: $f" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"
zip -q -X "$OUT_ZIP" "${FILES[@]}"

echo "Built $OUT_ZIP"
echo "Contents:"
unzip -l "$OUT_ZIP"
