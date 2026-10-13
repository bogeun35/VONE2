#!/usr/bin/env bash
# Hand one task to the Codex CLI in its own git worktree.
#
#   codex-dispatch.sh <task-name> <brief-file>
#
# Creates ../codex-wt/<task-name> on a new branch codex/<task-name> from main,
# copies in the gitignored analysis inputs Codex needs (the decoded stage data,
# the cached disassembly and the vendored capstone), and runs `codex exec` there
# non-interactively. The final message lands in <worktree>/CODEX-RESULT.md and
# the full event log in <worktree>/codex-events.jsonl.
#
# approval_policy "never" is what makes a headless run work at all: with nobody
# to answer, any command that would ask is otherwise rejected "by policy". The
# workspace-write sandbox still confines writes to the worktree.
#
# --ignore-user-config keeps the desktop config's computer-use / browser plugins
# and its turn-ended notify hook out of a background run, so Codex can never take
# the screen while the user is at the PC. Auth still comes from ~/.codex.
set -euo pipefail
task="$1"; brief="$2"
repo="$(cd "$(dirname "$0")/../.." && pwd)"
# The desktop app's real install. ~/.codex/.sandbox-bin/codex.exe is only the
# sandbox shim: it runs, but its shell tool fails because codex-code-mode-host.exe
# is not beside it. The bin/<hash> folder changes when the app updates, so take
# whichever one currently holds both executables.
codex="${CODEX_BIN:-}"
if [ -z "$codex" ]; then
  for d in /c/Users/user/AppData/Local/OpenAI/Codex/bin/*/; do
    [ -x "$d/codex.exe" ] && [ -e "$d/codex-code-mode-host.exe" ] && codex="$d/codex.exe"
  done
fi
[ -n "$codex" ] || { echo "Codex CLI not found" >&2; exit 1; }
wt="$(cd "$repo/.." && pwd)/codex-wt/$task"
src="$repo/reference-analysis/source-migration"

if [ ! -d "$wt" ]; then
  git -C "$repo" worktree add -q -b "codex/$task" "$wt" main
fi
dst="$wt/reference-analysis/source-migration"
# Gitignored inputs: *.local.json, *.local.txt, and the vendored capstone.
for f in "$src"/*.local.json "$src"/*.local.txt; do cp -n "$f" "$dst/" 2>/dev/null || true; done
[ -d "$dst/tools" ] || cp -r "$src/tools" "$dst/tools"
cp -n "$repo/reference-analysis/tools/disasm.py" "$wt/reference-analysis/tools/" 2>/dev/null || true

"$codex" exec \
  --ignore-user-config \
  -c service_tier='"priority"' \
  -c approval_policy='"never"' \
  -c windows.sandbox='"elevated"' \
  -s workspace-write \
  -C "$wt" \
  --json \
  -o "$wt/CODEX-RESULT.md" \
  - < "$brief" > "$wt/codex-events.jsonl" 2> "$wt/codex-stderr.log"
echo "done: $wt"
