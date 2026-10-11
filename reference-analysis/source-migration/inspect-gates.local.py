"""Read-only, focused native disassembly; never loads or executes original code."""
import pathlib, json, struct, sys
H=pathlib.Path(__file__).parent
structure=json.loads((H/'native-loader-structure.json').read_text())
b=pathlib.Path(structure['file']).read_bytes(); base=int(structure['imageBase'],16)
sections=structure['sections']
def off(a):
 for s in sections:
  if base+s['rva']<=a<base+s['rva']+s['rawSize']:return s['rawOffset']+a-base-s['rva']
rows=json.loads((H/'quantum-method-index.json').read_text())+json.loads((H/'assembly-csharp-method-index.json').read_text())
symbols={int(r['va'],16):r['type']+'.'+r['method'] for r in rows if r['fileOffset']}
sys.path.insert(0,str(H/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64);cs.skipdata=True;lines=[]
for r in rows:
 if r['type'] not in ['GateComponent','SwitchObserverComponent']:continue
 a=int(r['va'],16);end=min((x for x in symbols if x>a),default=a+16384)
 lines.append('\n'+r['type']+'.'+r['method']+' '+r['va'])
 for i in cs.disasm(b[r['fileOffset']:r['fileOffset']+min(end-a,16384)],a):
  ann=''
  if i.mnemonic in ['call','jmp'] and i.op_str.startswith('0x'):ann=' ; '+symbols.get(int(i.op_str,16),'unmapped')
  lines.append(hex(i.address)+' '+i.mnemonic+' '+i.op_str+ann)
(H/'gate-static-disassembly.local.txt').write_text('\n'.join(lines),encoding='utf-8')
print(len(lines))


