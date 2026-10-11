"""Read-only scan for references to TextComponent.Creator. No native code is executed."""
import pathlib,json,struct,sys,re
H=pathlib.Path(__file__).parent
structure=json.loads((H/'native-loader-structure.json').read_text())
b=pathlib.Path(structure['file']).read_bytes(); base=int(structure['imageBase'],16)
sections=structure['sections']
def va_of(fileoff):
 for s in sections:
  if s['rawOffset']<=fileoff<s['rawOffset']+s['rawSize']:return base+s['rva']+fileoff-s['rawOffset']
 return None
def off_of(va):
 for s in sections:
  if base+s['rva']<=va<base+s['rva']+s['rawSize']:return s['rawOffset']+va-base-s['rva']
 return None
TARGETS={0x18171b200:'TextComponent.Creator(frame,createParam)',
         0x18171b300:'TextComponent.Creator(frame,param,pos)',
         0x1817d1240:'BlinkBlockComponent.Creator?'}
rows=json.loads((H/'quantum-method-index.json').read_text())+json.loads((H/'assembly-csharp-method-index.json').read_text())
byva={int(r['va'],16):r['type']+'.'+r['method'] for r in rows}
# 1) absolute 8 byte pointers anywhere in the file
found=[]
for va,label in TARGETS.items():
 pat=struct.pack('<Q',va)
 start=0
 while True:
  i=b.find(pat,start)
  if i<0:break
  found.append({'target':hex(va),'label':label,'fileOffset':i,'va':hex(va_of(i)) if va_of(i) else None,'kind':'absolute64'})
  start=i+1
# 2) rip-relative lea/mov referencing the target inside .text
sys.path.insert(0,str(H/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64)
# Scan functions that plausibly build the creator table: anything whose name hints at it
hint=re.compile(r'Creator|Factory|ActorCreate|Register|cctor|Initialize',re.I)
refs=[]
for r in rows:
 if not r['fileOffset']:continue
 if not hint.search(r['type']+'.'+r['method']):continue
 a=int(r['va'],16)
 end=min((x for x in byva if x>a),default=a+8192)
 n=min(end-a,8192)
 for i in cs.disasm(b[r['fileOffset']:r['fileOffset']+n],a):
  if i.mnemonic in ('lea','mov','push') and 'rip' in i.op_str:
   m=re.search(r'rip \+ (0x[0-9a-f]+)|rip - (0x[0-9a-f]+)',i.op_str)
   if not m:continue
   d=int(m.group(1),16) if m.group(1) else -int(m.group(2),16)
   tgt=i.address+i.size+d
   if tgt in TARGETS:
    refs.append({'in':r['type']+'.'+r['method'],'at':hex(i.address),'insn':i.mnemonic+' '+i.op_str,'target':hex(tgt)})
out={'absolutePointerHits':found,'codeReferences':refs}
(H/'text-registration.local.json').write_text(json.dumps(out,indent=1),encoding='utf-8')
print(json.dumps(out,indent=1))
