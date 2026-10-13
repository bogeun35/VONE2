"""Read-only static disassembly of PICO PARK 2's GameAssembly.dll.

Never loads or executes original code: capstone over the file bytes only.

  python -I reference-analysis/tools/disasm.py 0x1818713e0 0x181873260
      one or more METHOD addresses from quantum-method-index.json /
      assembly-csharp-method-index.json; each prints until the next known
      method starts, with call targets named.
  python -I reference-analysis/tools/disasm.py --raw 0x181662020 300
      a raw address and a byte count, for code the indexes do not name
      (shared helpers, jump-table targets, RNG routines).

Trap: assembly-csharp-method-index.json covers only the Unity VIEW layer.
Every simulation component lives in quantum-method-index.json. A component
missing from the first index is not "missing" - look in the second.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
MIGRATION = HERE.parent / 'source-migration'
STRUCTURE = json.loads((MIGRATION / 'native-loader-structure.json').read_text())
DLL = pathlib.Path(STRUCTURE['file']).read_bytes()
IMAGE_BASE = int(STRUCTURE['imageBase'], 16)
SECTIONS = STRUCTURE['sections']
ROWS = (json.loads((MIGRATION / 'quantum-method-index.json').read_text())
        + json.loads((MIGRATION / 'assembly-csharp-method-index.json').read_text()))
NAMES = {int(r['va'], 16): r['type'] + '.' + r['method'] for r in ROWS if r['fileOffset']}
BY_VA = {int(r['va'], 16): r for r in ROWS if r['fileOffset']}

sys.path.insert(0, str(MIGRATION / 'tools'))
from capstone import Cs, CS_ARCH_X86, CS_MODE_64  # noqa: E402

CS = Cs(CS_ARCH_X86, CS_MODE_64)
CS.skipdata = True


def file_offset(va):
    for s in SECTIONS:
        start = IMAGE_BASE + s['rva']
        if start <= va < start + s['rawSize']:
            return s['rawOffset'] + va - start
    return None


def emit(va, length):
    offset = file_offset(va)
    if offset is None:
        print('0x%x is not inside any section' % va)
        return
    for insn in CS.disasm(DLL[offset:offset + length], va):
        note = ''
        if insn.mnemonic in ('call', 'jmp') and insn.op_str.startswith('0x'):
            note = ' ; ' + NAMES.get(int(insn.op_str, 16), '')
        print(hex(insn.address), insn.mnemonic, insn.op_str + note)


def main(argv):
    if not argv:
        print(__doc__)
        return
    if argv[0] == '--raw':
        emit(int(argv[1], 16), int(argv[2]) if len(argv) > 2 else 400)
        return
    for arg in argv:
        va = int(arg, 16)
        row = BY_VA.get(va)
        if not row:
            print('\n== no indexed method at %s (try --raw)' % arg)
            continue
        end = min((v for v in NAMES if v > va), default=va + 0x4000)
        print('\n== %s.%s %s' % (row['type'], row['method'], arg))
        emit(va, min(end - va, 0x4000))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        main(sys.argv[1:])
    except (BrokenPipeError, OSError):
        # `| head` closes the pipe early; that is not an error worth a trace.
        pass
