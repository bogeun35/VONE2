"""Resolve an IL2CPP string-literal slot in GameAssembly.dll to its actual text.

Read-only static analysis. Never loads or executes original code.

WHY THIS EXISTS
Several Quantum constants are built with FP.FromString_UNSAFE 0x18163fcb0 from a
metadata string literal, e.g.

    mov rcx, qword ptr [rip + 0x1959109]   ; -> a global slot
    call 0x18163fcb0                       ; FP.FromString_UNSAFE
    mov qword ptr [rdx], rax               ; -> the static

Up to now those constants were recorded as unreadable, because the slot is filled
at runtime (source-lift-devices.js `unresolved.oneFrameRaw` says exactly that and
declines to guess). They are readable: the slot's INITIAL contents in the file are
an encoded token, not a pointer.

HOW THE TOKEN IS DECODED - il2cpp_codegen_initialize_runtime_metadata 0x1802c5dc0
    0x1802c5dcf  lock xadd [rcx], r8      ; r8 = *slot, an atomic read of the token
    0x1802c5dd4  movzx edx, r8b / not dl / test dl, 1
                 ; bit0 clear means the slot is already a resolved pointer
    0x1802c5dee  shr ecx, 1 / and ecx, 0x0fffffff   ; the INDEX
    0x1802c5df6  shr eax, 0x1d                      ; the KIND (top 3 bits)
    0x1802c5dfe  cmp eax, 6 / ja -> fail, then a jump table at 0x1802c5f00
The string-literal arm is 0x1802c5e56: it indexes the literal cache by that index
and, on a miss, reads the length and data index out of the metadata literal table
(0x1802c5e7c reads +8 and +0x10 of the header-derived pair) and builds the string.
Kind 5 is the string-literal arm for this build.

VALIDATION (run with --verify)
QFP..cctor 0x181780cc0 is the calibration set: it fills 81 FP statics, the Quantum
metadata names each one by value, and 58 of them are written as INLINE immediates
while 22 go through FP.FromString_UNSAFE. Decoding the 21 literal slots whose value
the field name pins down reproduces all 21 strings, including the two whose field
names are abbreviations rather than the literal text (_0_33 is really
"0.3333333333333333" and _0_66 is "0.6666666666666667").

The inline immediates also settle the rounding question without assuming it:
QFP._0_10 is 6553, and 0.1f * 65536 is 6553.6, so FP.FromString TRUNCATES. Had it
rounded, the stored value would be 6554.

Usage:
  python -I resolve-string-literals.local.py --verify
  python -I resolve-string-literals.local.py 0x1831d9b28 0x1831d9e80 0x18318f040
  python -I resolve-string-literals.local.py --cctor 0x1818709c0
"""
import pathlib, struct, json, sys, re

HERE = pathlib.Path(__file__).parent
STRUCTURE = json.loads((HERE / 'native-loader-structure.json').read_text())
DLL = pathlib.Path(STRUCTURE['file']).read_bytes()
IMAGE_BASE = int(STRUCTURE['imageBase'], 16)
SECTIONS = STRUCTURE['sections']
METADATA = pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/'
                        'pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
FROM_STRING = 0x18163fcb0
STRING_LITERAL_KIND = 5
FP_ONE = 65536


def file_offset(va):
    for s in SECTIONS:
        start = IMAGE_BASE + s['rva']
        if start <= va < start + s['rawSize']:
            return s['rawOffset'] + va - start
    return None


_header = struct.unpack_from('<64I', METADATA)
_LIT_TABLE, _LIT_TABLE_SIZE, _LIT_DATA, _LIT_DATA_SIZE = _header[2:6]
LITERAL_COUNT = _LIT_TABLE_SIZE // 8


def literal(index):
    if not 0 <= index < LITERAL_COUNT:
        raise IndexError('string literal index %d outside 0..%d' % (index, LITERAL_COUNT - 1))
    length, data_index = struct.unpack_from('<2i', METADATA, _LIT_TABLE + index * 8)
    return METADATA[_LIT_DATA + data_index:_LIT_DATA + data_index + length].decode('utf-8', 'replace')


def decode_slot(slot_va):
    """(kind, index) from a slot's initial token, or raise with the reason."""
    offset = file_offset(slot_va)
    if offset is None:
        raise ValueError('0x%x is not inside any section' % slot_va)
    token, = struct.unpack_from('<Q', DLL, offset)
    if not token & 1:
        raise ValueError('0x%x already holds a resolved pointer 0x%x, not a token' % (slot_va, token))
    low = token & 0xffffffff
    return (low >> 29) & 7, (low >> 1) & 0x0fffffff


def string_at(slot_va):
    kind, index = decode_slot(slot_va)
    if kind != STRING_LITERAL_KIND:
        raise ValueError('0x%x is metadata kind %d, not a string literal' % (slot_va, kind))
    return literal(index)


def fp_raw(text):
    """FP.FromString_UNSAFE 0x18163fcb0: Double.Parse, cvtsd2ss to float32, then
    FP.FromFloat_UNSAFE 0x18163fc40 multiplies by 65536.0f and truncates with
    cvttss2si. struct.unpack of a packed float reproduces the narrowing."""
    narrowed = struct.unpack('<f', struct.pack('<f', float(text)))[0]
    product = struct.unpack('<f', struct.pack('<f', narrowed * float(FP_ONE)))[0]
    return int(product)  # int() truncates toward zero, like cvttss2si


# --- disassembly helpers, only used by --verify and --cctor -------------------
def _disassemble(va, length=0x4000):
    sys.path.insert(0, str(HERE / 'tools'))
    from capstone import Cs, CS_ARCH_X86, CS_MODE_64
    cs = Cs(CS_ARCH_X86, CS_MODE_64)
    cs.skipdata = True
    return list(cs.disasm(DLL[file_offset(va):file_offset(va) + length], va))


def cctor_literals(cctor_va):
    """[(staticOffset, slotVa)] for every FP.FromString_UNSAFE result stored to a
    static, plus [(staticOffset, raw)] for every inlined immediate."""
    rows = json.loads((HERE / 'quantum-method-index.json').read_text())
    symbols = {int(r['va'], 16) for r in rows if r['fileOffset']}
    end = min((v for v in symbols if v > cctor_va), default=cctor_va + 0x4000)
    from_string, inline, slot, pending = [], [], None, None
    for insn in _disassemble(cctor_va, min(end - cctor_va, 0x4000)):
        operands = insn.op_str
        load = re.match(r'rcx, qword ptr \[rip \+ (0x[0-9a-f]+)\]$', operands)
        if insn.mnemonic == 'mov' and load:
            slot = insn.address + insn.size + int(load.group(1), 16)
            continue
        if insn.mnemonic == 'call' and operands.startswith('0x') and int(operands, 16) == FROM_STRING:
            pending = slot
            continue
        store = re.match(r'qword ptr \[(?:rdx|rcx)(?: \+ (0x[0-9a-f]+|\d+))?\], rax$', operands)
        if insn.mnemonic == 'mov' and store and pending is not None:
            from_string.append((int(store.group(1), 16) if store.group(1) else 0, pending))
            pending = None
            continue
        immediate = re.match(r'qword ptr \[(?:rdx|rcx)(?: \+ (0x[0-9a-f]+|\d+))?\], (0x[0-9a-f]+|\d+)$', operands)
        if insn.mnemonic == 'mov' and immediate:
            inline.append((int(immediate.group(1), 16) if immediate.group(1) else 0,
                           int(immediate.group(2), 16)))
    return from_string, inline


def _field_names(type_name):
    offsets = json.loads((HERE / 'quantum-field-offsets.json').read_text())
    return {f['offset']: f['name'] for r in offsets if r['type'] == type_name for f in r['fields']}


def verify():
    names = _field_names('QFP')
    from_string, inline = cctor_literals(0x181780cc0)
    print('QFP..cctor 0x181780cc0: %d inline immediates, %d FromString slots'
          % (len(inline), len(from_string)))
    # The inline immediates settle truncation versus rounding.
    for offset, raw in inline:
        if names.get(offset) == '_0_10':
            print('  QFP._0_10 inline raw %d; 0.1f * 65536 is %.4f, so FromString TRUNCATES'
                  % (raw, 0.1 * FP_ONE))
    agree = disagree = 0
    for offset, slot in sorted(from_string):
        name = names.get(offset, '?')
        try:
            text = string_at(slot)
        except ValueError as problem:
            print('  %-10s slot 0x%-12x %s' % (name, slot, problem))
            disagree += 1
            continue
        # The field name is the check, but two of them are not literal decimals:
        # _0_33 / _0_66 abbreviate repeating decimals, and OneFrame is not a
        # number at all. Both are named here rather than silently tolerated.
        expected = name.lstrip('_').replace('_', '.')
        if name == 'OneFrame':
            matches, note = True, 'name is not a value; 1/60 is %.10f' % (1 / 60)
        else:
            try:
                # A two-decimal field name truncates, so 0.6666... is named _0_66.
                matches = abs(float(text) - float(expected)) < 0.01
                note = 'OK' if matches else 'VALUE DISAGREES'
                if matches and float(text) != float(expected):
                    note = 'OK (the name abbreviates %r)' % text
            except ValueError:
                matches, note = False, 'VALUE DISAGREES'
        agree, disagree = (agree + 1, disagree) if matches else (agree, disagree + 1)
        print('  %-10s slot 0x%-12x %-22r raw %-8d %s' % (name, slot, text, fp_raw(text), note))
    print('consistent %d / inconsistent %d' % (agree, disagree))


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    if args[0] == '--verify':
        verify()
        return
    if args[0] == '--cctor':
        from_string, inline = cctor_literals(int(args[1], 16))
        for offset, raw in inline:
            print('  inline     +0x%-4x raw %d = %.10f' % (offset, raw, raw / FP_ONE))
        for offset, slot in from_string:
            try:
                text = string_at(slot)
                print('  FromString +0x%-4x slot 0x%-12x %-24r raw %-10d = %.10f'
                      % (offset, slot, text, fp_raw(text), fp_raw(text) / FP_ONE))
            except ValueError as problem:
                print('  FromString +0x%-4x slot 0x%-12x %s' % (offset, slot, problem))
        return
    for arg in args:
        slot = int(arg, 16)
        try:
            text = string_at(slot)
            print('0x%x  %-24r  raw %-10d = %.10f' % (slot, text, fp_raw(text), fp_raw(text) / FP_ONE))
        except (ValueError, IndexError) as problem:
            print('0x%x  %s' % (slot, problem))


if __name__ == '__main__':
    main()
