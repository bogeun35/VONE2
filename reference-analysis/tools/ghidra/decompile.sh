#!/bin/sh
# Decompile from the saved PicoPark2 Ghidra project (the engine REA drives),
# without re-analysing the 56MB DLL each time.
#   tools/ghidra/decompile.sh OUT.local.txt 0x18181d3c0 'Dossun$$updatePhase' 'PlayerMagnet$$'
# Build the project once with ApplyIl2CppNames.java (see CODEX-HANDOFF.md).
OUT="$1"; shift
G=C:/Users/user/tools/ghidra_12.1.4_PUBLIC
export GHIDRA_HEADLESS_MAXMEM=6G JAVA_HOME="C:/Program Files/Microsoft/jdk-21.0.12.101-hotspot"
HERE="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"
OUTW="$(cd "$(dirname "$OUT")" && pwd -W 2>/dev/null || pwd)/$(basename "$OUT")"
cmd //c "$G/support/analyzeHeadless.bat" "C:\Users\user\tools\ghidra-projects" PicoPark2 -process GameAssembly.dll -noanalysis -readOnly \
  -scriptPath "$HERE" -postScript DecompileNamed.java "$OUTW" "$@" 2>&1 | grep -E "DecompileNamed.java>|ERROR" | head -5
