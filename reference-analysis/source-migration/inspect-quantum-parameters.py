"""Index PhotonQuantumCode.dll native methods and statically disassemble actor creation."""
import pathlib,struct,json,re,sys
H=pathlib.Path(__file__).parent
src=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2')
b=(src/'GameAssembly.dll').read_bytes();meta=(src/'pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
h=struct.unpack_from('<64I',meta);heap=meta[h[6]:h[6]+h[7]]
def ms(i):return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
pe=struct.unpack_from('<I',b,0x3c)[0];opt=pe+24;base=struct.unpack_from('<Q',b,opt+24)[0]
sections=json.loads((H/'native-loader-structure.json').read_text())['sections']
def va(o):
 for s in sections:
  if s['rawOffset']<=o<s['rawOffset']+s['rawSize']:return base+s['rva']+o-s['rawOffset']
def off(a):
 for s in sections:
  if base+s['rva']<=a<base+s['rva']+s['rawSize']:return s['rawOffset']+a-base-s['rva']
u64=lambda o:struct.unpack_from('<Q',b,o)[0]
name=b'PhotonQuantumCode.dll\0';p=b.find(name);assert p>=0
refs=[];needle=struct.pack('<Q',va(p));i=0
while True:
 i=b.find(needle,i)
 if i<0:break
 count=u64(i+8);ptr=u64(i+16)
 if 0<count<100000 and off(ptr)!=None: refs.append((count,off(ptr)))
 i+=1
assert len(refs)==1;count,ptr=refs[0]
image=next(struct.unpack_from('<10i',meta,o) for o in range(h[42],h[42]+h[43],40) if ms(struct.unpack_from('<i',meta,o)[0])=='PhotonQuantumCode.dll')
rows=[];symbols={}
for ti in range(image[2],image[2]+image[3]):
 t=struct.unpack_from('<16i8H2I',meta,h[40]+ti*88)
 for mi in range(t[9],t[9]+t[16]):
  m=struct.unpack_from('<6i4H',meta,h[12]+mi*32);idx=(m[5]&0xffffff)-1;a=u64(ptr+idx*8)
  row={'type':ms(t[0]),'namespace':ms(t[1]),'method':ms(m[0]),'va':hex(a),'fileOffset':off(a) if a else None,'token':hex(m[5])};rows.append(row)
  if a:symbols[a]=row['type']+'.'+row['method']
(H/'quantum-method-index.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
# IL2CPP metadata registration contains adjacent field-offset and type-size counts.
ndef=h[41]//88;needle=struct.pack('<Q',ndef);p=0;candidates=[]
while True:
 p=b.find(needle,p)
 if p<0:break
 pointer=u64(p+8)
 if off(pointer)!=None and struct.unpack_from('<Q',b,p+16)[0]==ndef and off(u64(p+24))!=None:candidates.append(pointer)
 p+=1
assert len(candidates)==1
fieldoffsets=[]
for ti in range(image[2],image[2]+image[3]):
 t=struct.unpack_from('<16i8H2I',meta,h[40]+ti*88);fp=u64(off(candidates[0])+ti*8)
 if not fp or off(fp)==None:continue
 fields=[]
 for j in range(t[18]):
  fi=t[8]+j;f=struct.unpack_from('<3i',meta,h[24]+fi*12)
  fields.append({'name':ms(f[0]),'offset':struct.unpack_from('<i',b,off(fp)+j*4)[0],'typeIndex':f[1]})
 fieldoffsets.append({'typeIndex':ti,'type':ms(t[0]),'fields':fields})
(H/'quantum-field-offsets.json').write_text(json.dumps(fieldoffsets,indent=2),encoding='utf-8')
for r in json.loads((H/'assembly-csharp-method-index.json').read_text()):
 if int(r['va'],16):symbols[int(r['va'],16)]=r['type']+'.'+r['method']
sys.path.insert(0,str(H/'tools'));from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64);lines=[]
selected=[r for r in rows if r['fileOffset'] and (r['method']=='ParseParameter' or r['type'] in ['QTileMapChipAttrData','MapComponent','MapRectComponent','RectComponent','RectFP','RectS32'] or (re.search(r'Create|Init',r['method']) and re.search(r'MapRect|Rect|Thorn|Player|Goal|Key|JumpStand|Switch|Actor|Stage',r['type'])))]
for r in selected:
 lines.append('\n'+r['type']+'.'+r['method']+' '+r['va']);a=int(r['va'],16);end=min((v for v in symbols if v>a),default=a+10000)
 for ins in cs.disasm(b[r['fileOffset']:r['fileOffset']+min(10000,end-a)],a):
  annotation=''
  if ins.mnemonic in ['call','jmp'] and ins.op_str.startswith('0x'):annotation=' ; '+symbols.get(int(ins.op_str,16),'unmapped')
  lines.append(hex(ins.address)+' '+ins.mnemonic+' '+ins.op_str+annotation)
(H/'quantum-parameter-disassembly.txt').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'moduleMethodCount':count,'indexed':len(rows),'selected':len(selected),'targetTypes':sorted(set(r['type'] for r in selected))}))
