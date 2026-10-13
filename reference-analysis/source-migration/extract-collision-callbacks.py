"""Extract CollisionCallbacks registrations from static PE/metadata bytes only."""
import json, re, struct, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import disasm as d
meta = Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
h = struct.unpack_from('<64I', meta)
def read(va, fmt): return struct.unpack_from(fmt, d.DLL, d.file_offset(va))
def string(i):
    start=h[6]+i
    return meta[start:meta.index(b'\0',start)].decode()
def typename(i): return string(struct.unpack_from('<i',meta,h[40]+i*88)[0])
registration=0x182ca8eb0
instances=read(registration+0x18,'<Q')[0]
specs=read(registration+0x48,'<Q')[0]
def resolve(slot):
    token=read(slot,'<Q')[0]
    assert token>>29==6
    index=(token&0x1fffffff)>>1
    method, cls, inst=read(specs+12*index,'<iii')
    name, owner=struct.unpack_from('<ii',meta,h[12]+32*method)
    ptr=read(instances+inst*8,'<Q')[0]
    argc=read(ptr,'<I')[0]; argv=read(ptr+8,'<Q')[0]
    components=[]
    for n in range(argc):
        t=read(argv+n*8,'<Q')[0]
        components.append(typename(read(t,'<Q')[0]))
    return {'token':hex(token),'methodSpec':index,'method':typename(owner)+'.'+string(name),'components':components}
rows=[]; ordinal=None; slot=None
start,end=0x18177c24e,0x18177c9f5
for ins in d.CS.disasm(d.DLL[d.file_offset(start):d.file_offset(end)],start):
    if ins.mnemonic=='mov' and ins.op_str.startswith('rdx, qword ptr [rip + '):
        displacement=int(re.search(r'rip \+ (0x[0-9a-f]+)',ins.op_str)[1],16)
        slot=ins.address+ins.size+displacement
    elif ins.mnemonic=='mov' and ins.op_str.startswith('ecx, '): ordinal=int(ins.op_str.split(', ')[1],0)
    elif ins.mnemonic in ('call','jmp'):
        assert slot is not None and ordinal is not None
        row={'ordinal':ordinal,'callsite':hex(ins.address),'addHelper':ins.op_str,'methodSlot':hex(slot),**resolve(slot)}
        assert row['method'].startswith('CollisionCallbacks.add_')
        callback=row['method'].split('add_')[1]
        matches=[r for r in d.ROWS if r['type']==row['components'][0] and r['method']==callback]
        assert len(matches)==1,(row,matches)
        row['callbackVA']=matches[0]['va']
        rows.append(row);ordinal=None;slot=None
assert len({(r['ordinal'],r['method']) for r in rows})==len(rows)
print(json.dumps({'scope':'Static extraction only; native code never executed','initialize':hex(0x18177baa0),'metadataRegistration':hex(registration),'registrations':rows},indent=2))
