"""Find code that loads a RIP-relative global (e.g. an IL2CPP TypeInfo slot).

  python -I reference-analysis/tools/xref_static.py 0x1831c39a0 [more...]

Static byte scan only (mov/lea reg, [rip+disp32]); never executes the game.
Each hit is printed with the enclosing named method from the saved Ghidra
project's names.tsv, so a class's .cctor (the writer of its statics) is easy
to spot among the readers.
"""
import bisect
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
MIGRATION = HERE.parent / 'source-migration'
STRUCTURE = json.loads((MIGRATION / 'native-loader-structure.json').read_text())
DLL = pathlib.Path(STRUCTURE['file']).read_bytes()
IMAGE_BASE = int(STRUCTURE['imageBase'], 16)
NAMES_TSV = pathlib.Path.home() / 'tools' / 'ghidra-projects' / 'names.tsv'

names = []
for line in NAMES_TSV.read_text(encoding='utf-8', errors='replace').splitlines():
    parts = line.split('\t')
    if len(parts) >= 2:
        try:
            names.append((int(parts[0], 16), parts[1]))
        except ValueError:
            pass
names.sort()
starts = [a for a, _ in names]


def owner(va):
    i = bisect.bisect_right(starts, va) - 1
    return names[i][1] + '+0x%x' % (va - names[i][0]) if i >= 0 else '?'


def main(argv):
    targets = {int(a, 16) for a in argv}
    pattern = re.compile(rb'[\x48\x4c][\x8b\x8d][\x05\x0d\x15\x1d\x25\x2d\x35\x3d]', re.S)
    for s in STRUCTURE['sections']:
        name = s.get('name', '')
        if 'text' not in name and name not in ('.text', 'il2cpp'):
            continue
        base = s['rawOffset']
        data = DLL[base:base + s['rawSize']]
        va0 = IMAGE_BASE + s['rva']
        for m in pattern.finditer(data):
            i = m.start()
            disp = int.from_bytes(data[i + 3:i + 7], 'little', signed=True)
            va = va0 + i
            tgt = va + 7 + disp
            if tgt in targets:
                print(hex(tgt), hex(va), owner(va))


if __name__ == '__main__':
    main(sys.argv[1:])
