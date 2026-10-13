"""Read static instructions/constants only; never load or execute the game.

python -I source-migration/extract-collision-bootstrap.py > <evidence.json>
"""
import json
from pathlib import Path
import struct
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import disasm as d

alias = {'edx': 'd', 'dl': 'd', 'r8d': '8', 'r8b': '8', 'r9d': '9', 'r9b': '9'}
registers = {}
pairs = []
va, end = 0x1817f5bf0, 0x1817f5f63
offset = d.file_offset(va)
for instruction in d.CS.disasm(d.DLL[offset:offset + end - va], va):
    op, operands = instruction.mnemonic, instruction.op_str.split(', ')
    if op in ('mov', 'movzx', 'xor') and len(operands) == 2:
        dst, src = operands
        if dst in alias:
            key = alias[dst]
            if op == 'xor' and dst == src:
                registers[key] = 0
            elif src in alias:
                registers[key] = registers[alias[src]]
            else:
                registers[key] = int(src, 0)
    if op == 'call':
        if instruction.op_str == '0x1817f6080':
            assert set(registers) == {'d', '8', '9'}
            pairs.append({'callsite': hex(instruction.address), 'a': registers['d'],
                          'b': registers['8'], 'enabled': bool(registers['9'])})
        # All argument registers are volatile; no accidental propagation.
        registers = {}
assert len(pairs) == 37 and all(p['enabled'] for p in pairs)
rows = [0] * 16
for p in pairs:
    rows[p['a']] |= 1 << p['b']
    rows[p['b']] |= 1 << p['a']
pivot_va = 0x1816bdf74 + 8 + 0x17ca704
scale_va = 0x181690b00 + 8 + 0x17f6fe8
result = {
    'scope': 'Static call arguments and constants, not an original-game execution',
    'layerTable': {'initialize': hex(va), 'setEnableCheck': '0x1817f6080',
                   'symmetricStores': ['0x1817f614f', '0x1817f6194'],
                   'pairs': pairs, 'rowMasks': rows, 'enabledEntries': sum(x.bit_count() for x in rows)},
    'playerPivot': {'load': '0x1816bdf74', 'literal': hex(pivot_va),
                    'raw': list(struct.unpack_from('<2q', d.DLL, d.file_offset(pivot_va)))},
    'initialCollisionScale': {'load': '0x181690b00', 'literal': hex(scale_va),
                              'raw': list(struct.unpack_from('<2q', d.DLL, d.file_offset(scale_va)))},
    'collisionZeroInit': {'address': '0x1817f64fa..6508', 'sizeBytes': 200,
                          'fact': 'edx=0, r8d=0xc8, call fill before issueId assignment'},
    'remaining': ['Actor setupCollision callback registration, entity/holder index and runtime creation order require host binding',
                  'Player scale additionally uses native size/ear-length; initial unit scale is not a permanent gameplay scale']
}
print(json.dumps(result, indent=2))
