#!/usr/bin/env bash
# nucleus — one-line installer for macOS / Linux / Git Bash.
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/CaptchaQ/nucleus/main/scripts/install.sh)
#
# Or locally:
#   bash scripts/install.sh
#
# What it does:
#   1. Requires Node.js >= 18.
#   2. Clones (shallow) this repo into ${NUCLEUS_HOME:-$HOME/.nucleus}.
#   3. npm ci + npm run build → dist/cli/index.js.
#   4. Puts a `nucleus` shim on PATH (into a writable, already-on-PATH bin dir,
#      else prints the export line for your shell).
#   5. Registers the nucleus-agent skill into known agent harnesses
#      (~/.claude/skills, ~/.config/opencode/skill, ~/.codex/skills).
set -euo pipefail

REPO="https://github.com/CaptchaQ/nucleus.git"
NUCLEUS_HOME="${NUCLEUS_HOME:-$HOME/.nucleus}"
BRANCH="${NUCLEUS_BRANCH:-main}"

command -v node >/dev/null 2>&1 || {
  echo "error: Node.js >= 18 is required (not found). https://nodejs.org" >&2
  exit 1
}

echo "nucleus → installing to $NUCLEUS_HOME"

if [ ! -f "$NUCLEUS_HOME/package.json" ]; then
  mkdir -p "$(dirname "$NUCLEUS_HOME")"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$NUCLEUS_HOME"
else
  echo "==> repo present, reusing $NUCLEUS_HOME"
fi

(
  cd "$NUCLEUS_HOME"
  npm ci --no-audit --no-fund >/dev/null
  npm run build >/dev/null
)

# Shims so `nucleus` works without node_modules on PATH.
SHIM_DIR="$NUCLEUS_HOME/bin"
mkdir -p "$SHIM_DIR"
SHIM="$SHIM_DIR/nucleus"
cat > "$SHIM" <<EOF
#!/usr/bin/env bash
exec node "$NUCLEUS_HOME/dist/cli/index.js" "\$@"
EOF
chmod +x "$SHIM"

# Place the shim somewhere that's already on PATH.
LINKED=""
for d in "$HOME/.local/bin" "$HOME/bin" "$HOME/.cargo/bin"; do
  if [ -d "$d" ] && [ -w "$d" ]; then
    ln -sf "$SHIM" "$d/nucleus" 2>/dev/null && LINKED="$d/nucleus" && break
  fi
done

if [ -n "$LINKED" ]; then
  echo "==> 'nucleus' linked at $LINKED (already on PATH)"
else
  echo "==> add to PATH:"
  echo "      export PATH=\"$SHIM_DIR:\$PATH\""
fi

# Register the nuclei agent skill into known harnesses.
for h in "$HOME/.claude/skills" "$HOME/.config/opencode/skill" "$HOME/.codex/skills"; do
  mkdir -p "$h"
  cp -R "$NUCLEUS_HOME/skills/nucleus-agent" "$h/"
  echo "==> registered nucleus-agent skill → $h"
done

echo ""
echo "Done. Open a new terminal, run 'nucleus doctor', then tell your agent:"
echo "  «создай проект через nucleus»"