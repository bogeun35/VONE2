"""Find direct callers (call/jmp rel32) of native functions.

  python -I reference-analysis/tools/xref_call.py 0x1816a08c0 [more...]

Static byte scan only (E8/E9 rel32 into the target); never executes the game.
Each hit is printed with the enclosing named method from the saved Ghidra
project's names.tsv. Indirect calls (vtables, delegates) are not found.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from xref_static import DLL, IMAGE_BASE, STRUCTURE, owner


def main(argv):
    targets = {int(a, 16) for a in argv}
    for s in STRUCTURE['sections']:
        name = s.get('name', '')
        if 'text' not in name and name not in ('.text', 'il2cpp'):
            continue
        base = s['rawOffset']
        data = DLL[base:base + s['rawSize']]
        va0 = IMAGE_BASE + s['rva']
        for op in (b'\xe8', b'\xe9'):
            i = data.find(op)
            while i >= 0:
                if i + 5 <= len(data):
                    rel = int.from_bytes(data[i + 1:i + 5], 'little', signed=True)
                    va = va0 + i
                    tgt = va + 5 + rel
                    if tgt in targets:
                        print(hex(tgt), hex(va), 'call' if op == b'\xe8' else 'jmp ', owner(va))
                i = data.find(op, i + 1)


if __name__ == '__main__':
    main(sys.argv[1:])
