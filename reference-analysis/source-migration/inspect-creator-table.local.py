"""Read-only: linear register tracking over ActorCreator.initCreator to recover
which QActorType ordinals get a creator delegate registered. No native execution."""
import pathlib,json,struct,sys,re
H=pathlib.Path(__file__).parent
structure=json.loads((H/'native-loader-structure.json').read_text())
b=pathlib.Path(structure['file']).read_bytes(); base=int(structure['imageBase'],16)
rows=json.loads((H/'quantum-method-index.json').read_text())+json.loads((H/'assembly-csharp-method-index.json').read_text())
byva={int(r['va'],16):r['type']+'.'+r['method'] for r in rows}
row=[r for r in rows if r['type']=='ActorCreator' and r['method']=='initCreator'][0]
start=int(row['va'],16); off=row['fileOffset']
end=min(x for x in byva if x>start)   # 0x181777ff0 (.cctor)
ADD=0x1817781f0  # ActorCreator.add_Creator(QActorType, Creator)
sys.path.insert(0,str(H/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64); cs.detail=False
regs={}   # 64 bit canonical name -> known integer value
def canon(name):
 m={'eax':'rax','ebx':'rbx','ecx':'rcx','edx':'rdx','esi':'rsi','edi':'rdi','ebp':'rbp','esp':'rsp'}
 if name in m:return m[name]
 if re.fullmatch(r'r(8|9|1[0-5])d',name):return name[:-1]
 if re.fullmatch(r'r(8|9|1[0-5])',name):return name
 if name in ('rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp'):return name
 return None
sites=[];unresolved=[]
for i in cs.disasm(b[off:off+(end-start)],start):
 ops=[o.strip() for o in i.op_str.split(',')]
 if i.mnemonic=='call':
  if i.op_str.startswith('0x') and int(i.op_str,16)==ADD:
   v=regs.get('rcx')
   if v is None:unresolved.append(hex(i.address))
   else:sites.append({'at':hex(i.address),'ordinal':v&0xffffffff})
  regs={}            # volatile registers are clobbered by any call
  continue
 if i.mnemonic=='xor' and len(ops)==2 and ops[0]==ops[1]:
  r=canon(ops[0])
  if r:regs[r]=0
  continue
 if i.mnemonic=='mov' and len(ops)==2:
  r=canon(ops[0])
  if not r:continue
  if re.fullmatch(r'0x[0-9a-f]+|\d+',ops[1]):regs[r]=int(ops[1],0)
  else:
   s=canon(ops[1])
   if s and s in regs:regs[r]=regs[s]
   else:regs.pop(r,None)
  continue
 if i.mnemonic=='lea' and len(ops)==2:
  r=canon(ops[0])
  if not r:continue
  m=re.fullmatch(r'\[(\w+) \+ (0x[0-9a-f]+|\d+)\]',ops[1])
  if m:
   s=canon(m.group(1))
   if s is not None and s in regs:regs[r]=regs[s]+int(m.group(2),0);continue
  m=re.fullmatch(r'\[(\w+)\]',ops[1])
  if m:
   s=canon(m.group(1))
   if s is not None and s in regs:regs[r]=regs[s];continue
  regs.pop(r,None)
  continue
 if i.mnemonic in ('inc','dec') and len(ops)==1:
  r=canon(ops[0])
  if r and r in regs:regs[r]+=1 if i.mnemonic=='inc' else -1
  elif r:regs.pop(r,None)
  continue
 if i.mnemonic in ('add','sub') and len(ops)==2:
  r=canon(ops[0])
  if r:
   if r in regs and re.fullmatch(r'0x[0-9a-f]+|\d+',ops[1]):
    regs[r]+= int(ops[1],0) if i.mnemonic=='add' else -int(ops[1],0)
   else:regs.pop(r,None)
  continue
 # anything else: forget the destination if it is a register we track
 if ops:
  r=canon(ops[0])
  if r:regs.pop(r,None)
meta=json.loads((H/'text-metadata.local.json').read_text())
names=[m['name'] for m in meta['enums']['QActorType']]
got={}
for s in sites:got.setdefault(s['ordinal'],[]).append(s['at'])
report={'function':'ActorCreator.initCreator '+hex(start),'callSites':len(sites)+len(unresolved),
 'resolved':len(sites),'unresolved':unresolved,
 'registered':{str(o):{'name':names[o] if o<len(names) else '?','sites':a} for o,a in sorted(got.items())},
 'unregisteredOrdinals':{str(i):n for i,n in enumerate(names) if i not in got}}
(H/'creator-table.local.json').write_text(json.dumps(report,indent=1),encoding='utf-8')
for n in ('Text','DummyRect','ThornCeiling','BlinkBlock','Gate','Warp','Thorn','SwitchTimer','BlinkThunder','WarpInitPos'):
 o=names.index(n)
 print(('%-14s ord %3d  %s' % (n,o,('REGISTERED at '+','.join(got[o])) if o in got else 'NOT registered')))
print('resolved sites',len(sites),'unresolved',unresolved)
