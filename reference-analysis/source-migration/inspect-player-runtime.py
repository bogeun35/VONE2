"""Read-only, focused native disassembly; never loads or executes original code."""
import pathlib, json, struct, sys
H=pathlib.Path(__file__).parent
structure=json.loads((H/'native-loader-structure.json').read_text())
b=pathlib.Path(structure['file']).read_bytes(); base=int(structure['imageBase'],16)
sections=structure['sections']
def off(a):
 for s in sections:
  if base+s['rva']<=a<base+s['rva']+s['rawSize']:return s['rawOffset']+a-base-s['rva']
meta=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
h=struct.unpack_from('<64I',meta);heap=meta[h[6]:h[6]+h[7]]
def ms(i):return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
ndef=h[41]//88;needle=struct.pack('<Q',ndef);p=0;registrations=[]
while True:
 p=b.find(needle,p)
 if p<0:break
 ptr=struct.unpack_from('<Q',b,p+8)[0]
 if off(ptr)!=None and struct.unpack_from('<Q',b,p+16)[0]==ndef and off(struct.unpack_from('<Q',b,p+24)[0])!=None:registrations.append(ptr)
 p+=1
assert len(registrations)==1
for ti in range(ndef):
 t=struct.unpack_from('<16i8H2I',meta,h[40]+ti*88)
 if ms(t[0]) not in ['FP','Raw','FPConstants']:continue
 fp=struct.unpack_from('<Q',b,off(registrations[0])+ti*8)[0]
 if not fp or off(fp)==None:continue
 fields=[]
 for j in range(t[18]):
  f=struct.unpack_from('<3i',meta,h[24]+(t[8]+j)*12);fo=struct.unpack_from('<i',b,off(fp)+j*4)[0]
  if fo in [0xf0,0x128,0x1f0,0xc0]:fields.append({'name':ms(f[0]),'offset':fo})
 print('FP constant evidence:',json.dumps(fields))
rows=json.loads((H/'quantum-method-index.json').read_text())+json.loads((H/'assembly-csharp-method-index.json').read_text())
symbols={int(r['va'],16):r['type']+'.'+r['method'] for r in rows if r['fileOffset']}
for r in json.loads((H/'population-method-index.json').read_text()):
 if r['fileOffset']:symbols.setdefault(int(r['va'],16),r['type']+'.'+r['method'])
selection={'ActorFactoryComponent':['createPlayer','createPlayerSub','CreateActor'], 'PlayerComponent':['.cctor','initCollision','InitWalkSpeed','GetJumpVelo','CalcGravity','calcGravity','parseParameter','jump','OnInitialize_Clear','OnPost_Clear','IsCleared','OnUpdate_Default','Initialize','updatePlayerState','InFrontOfGoal','IsCleared'], 'GoalComponent':['.cctor','InitCollision','OnCollided','OnRecvEvent','Open'], 'KeyComponent':['.cctor','InitCollision','OnCollide'], 'RectFP':['.ctor'], 'QPlayerDefine':['.cctor'], 'ActorComponent':['Initialize','jumpProc','RequestJump','SetVisible','setVisible','SetCollisionActive','OnRecvEvent'], 'QFP':['.cctor'], 'CollisionSceneComponent':['createActiveCollisionInfoList','<createActiveCollisionInfoList>g__listup|49_0'], 'QStageFileConverter':['convertActorCreateParam'], 'ActorSceneComponent':['InitPlayerIndexList']}
sys.path.insert(0,str(H/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64); cs.skipdata=True; lines=[]
for r in rows:
 if r['method'] not in selection.get(r['type'],[]) or not r['fileOffset']:continue
 a=int(r['va'],16);end=min((x for x in symbols if x>a),default=a+16384)
 lines.append('\n'+r['type']+'.'+r['method']+' '+r['va'])
 for i in cs.disasm(b[r['fileOffset']:r['fileOffset']+min(end-a,16384)],a):
  ann=''
  if i.mnemonic in ['call','jmp'] and i.op_str.startswith('0x'):ann=' ; '+symbols.get(int(i.op_str,16),'unmapped')
  if i.mnemonic=='mov' and 'rip +' in i.op_str:
   try:
    rel=int(i.op_str.split('rip + ')[1].split(']')[0],16);p=off(i.address+i.size+rel)
    if p is not None:ann+=' ; data64='+hex(struct.unpack_from('<Q',b,p)[0])
   except (ValueError,struct.error):pass
  lines.append(hex(i.address)+' '+i.mnemonic+' '+i.op_str+ann)
(H/'player-runtime-disassembly.txt').write_text('\n'.join(lines),encoding='utf-8')
print('Static native evidence saved:',len(lines),'lines')









