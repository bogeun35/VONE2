"""Read-only: pair each ActorCreator.add_Creator site with the MethodInfo usage
slot the delegate is built from, and try to map those slot tokens onto the
*Component.Creator methods. No native code is executed."""
import pathlib,json,struct,sys,re
H=pathlib.Path(__file__).parent
structure=json.loads((H/'native-loader-structure.json').read_text())
b=pathlib.Path(structure['file']).read_bytes(); base=int(structure['imageBase'],16)
sec=structure['sections']
def off(va):
 for x in sec:
  if base+x['rva']<=va<base+x['rva']+x['rawSize']:return x['rawOffset']+va-base-x['rva']
 return None
rows=json.loads((H/'quantum-method-index.json').read_text())+json.loads((H/'assembly-csharp-method-index.json').read_text())
byva={int(r['va'],16):r['type']+'.'+r['method'] for r in rows}
row=[r for r in rows if r['type']=='ActorCreator' and r['method']=='initCreator'][0]
start=int(row['va'],16); fo=row['fileOffset']; end=min(x for x in byva if x>start)
ADD=0x1817781f0; DELCTOR=0x180a09280
sys.path.insert(0,str(H/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64)
insns=list(cs.disasm(b[fo:fo+(end-start)],start))
def canon(n):
 m={'eax':'rax','ebx':'rbx','ecx':'rcx','edx':'rdx','esi':'rsi','edi':'rdi','ebp':'rbp'}
 if n in m:return m[n]
 if re.fullmatch(r'r(8|9|1[0-5])d',n):return n[:-1]
 if n in('rax','rbx','rcx','rdx','rsi','rdi','rbp')or re.fullmatch(r'r(8|9|1[0-5])',n):return n
 return None
regs={};lastSlot=None;sites=[]
for i in insns:
 ops=[o.strip() for o in i.op_str.split(',')]
 if i.mnemonic=='mov' and len(ops)==2 and ops[0]=='r8' and 'rip' in ops[1]:
  m=re.search(r'rip \+ (0x[0-9a-f]+)',ops[1])
  if m:
   va=i.address+i.size+int(m.group(1),16);o=off(va)
   lastSlot={'slotVa':hex(va),'raw':hex(struct.unpack_from('<Q',b,o)[0]) if o else None}
 if i.mnemonic=='call':
  t=int(i.op_str,16) if i.op_str.startswith('0x') else None
  if t==ADD:
   sites.append({'at':hex(i.address),'ordinal':regs.get('rcx'),'delegateMethodInfo':lastSlot})
  regs={}
  continue
 if i.mnemonic=='xor' and len(ops)==2 and ops[0]==ops[1]:
  r=canon(ops[0]);  regs[r]=0 if r else None
  if r is None:regs.pop(None,None)
  continue
 if i.mnemonic=='mov' and len(ops)==2:
  r=canon(ops[0])
  if r:
   if re.fullmatch(r'0x[0-9a-f]+|\d+',ops[1]):regs[r]=int(ops[1],0)
   else:
    s=canon(ops[1])
    if s and s in regs:regs[r]=regs[s]
    else:regs.pop(r,None)
  continue
 if i.mnemonic=='lea' and len(ops)==2:
  r=canon(ops[0])
  if r:
   m=re.fullmatch(r'\[(\w+) \+ (0x[0-9a-f]+|\d+)\]',ops[1])
   if m and canon(m.group(1)) in regs:regs[r]=regs[canon(m.group(1))]+int(m.group(2),0)
   else:regs.pop(r,None)
  continue
 if ops:
  r=canon(ops[0])
  if r:regs.pop(r,None)
meta=json.loads((H/'text-metadata.local.json').read_text())
names=[m['name'] for m in meta['enums']['QActorType']]
for s in sites:
 o=s['ordinal']; s['actorType']=names[o] if o is not None and o<len(names) else None
creators=[r for r in rows if r['method']=='Creator']
# empirical check: are slot tokens a permutation that correlates with metadata order?
tok=lambda s:int(s['delegateMethodInfo']['raw'],16) if s['delegateMethodInfo'] and s['delegateMethodInfo']['raw'] else None
out={'sites':sites,'creatorMethodCount':len(creators),
 'distinctSlotTokens':len({tok(s) for s in sites}),
 'tokenRange':[hex(min(filter(None,(tok(s) for s in sites)))),hex(max(filter(None,(tok(s) for s in sites))))]}
(H/'creator-delegates.local.json').write_text(json.dumps(out,indent=1),encoding='utf-8')
for s in sites:
 if s['actorType'] in ('Text','DummyRect','ThornCeiling','BlinkBlock','Gate','Wind','MapRect','SwitchRect','IceRect'):
  print('%-14s ord %3s site %s  methodInfoSlot %s = %s'%(s['actorType'],s['ordinal'],s['at'],s['delegateMethodInfo']['slotVa'],s['delegateMethodInfo']['raw']))
print('sites',len(sites),'distinct slots',out['distinctSlotTokens'],'token range',out['tokenRange'])
