import pathlib,struct,json,sys,re
root=pathlib.Path(__file__).parent
b=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/GameAssembly.dll').read_bytes()
meta=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
pe=struct.unpack_from('<I',b,0x3c)[0];opt=pe+24;base=struct.unpack_from('<Q',b,opt+24)[0];st=opt+struct.unpack_from('<H',b,pe+20)[0]
secs=[struct.unpack_from('<8s8I',b,st+i*40) for i in range(struct.unpack_from('<H',b,pe+6)[0])]
def off(a):
 for s in secs:
  if s[2]<=a-base<s[2]+s[3]:return s[4]+a-base-s[2]
def va(o):
 for s in secs:
  if s[4]<=o<s[4]+s[3]:return base+s[2]+o-s[4]
u64=lambda o:struct.unpack_from('<Q',b,o)[0]
h=struct.unpack_from('<64I',meta);heap=meta[h[6]:h[6]+h[7]]
def ms(i):return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
rows=[];types=[]
for ip in range(h[42],h[42]+h[43],40):
 im=struct.unpack_from('<10i',meta,ip);name=ms(im[0])
 if not re.search('Quantum|Assembly-CSharp',name):continue
 at=b.find(name.encode()+b'\0');needle=struct.pack('<Q',va(at));pos=0;modules=[]
 while True:
  pos=b.find(needle,pos)
  if pos<0:break
  n=u64(pos+8);m=off(u64(pos+16))
  if 100<n<100000 and m is not None:modules.append((n,m))
  pos+=1
 if len(modules)!=1:continue
 n,mp=modules[0]
 for ti in range(im[2],im[2]+im[3]):
  t=struct.unpack_from('<16i8H2I',meta,h[40]+ti*88);tn=ms(t[0]);fs=[]
  for fi in range(t[8],t[8]+t[18]):
   f=struct.unpack_from('<3i',meta,h[24]+fi*12);fs.append(ms(f[0]))
  types.append({'index':ti,'type':tn,'assembly':name,'fields':fs})
  for mi in range(t[9],t[9]+t[16]):
   m=struct.unpack_from('<6i4H',meta,h[12]+mi*32);idx=(m[5]&0xffffff)-1
   if idx>=n:continue
   a=u64(mp+idx*8)
   rows.append({'type':tn,'method':ms(m[0]),'va':hex(a),'fileOffset':off(a) if a else None,'assembly':name})
(root/'population-method-index.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
(root/'population-type-index.json').write_text(json.dumps(types,indent=2),encoding='utf-8')
sys.path.insert(0,str(root/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64);symbols={int(r['va'],16):r['type']+'.'+r['method'] for r in rows if r['fileOffset']}
selected=[r for r in rows if r['fileOffset'] and re.search(sys.argv[1] if len(sys.argv)>1 else 'Stage|CreateActor',r['type']+'.'+r['method'])]
lines=[]
for r in selected:
 a=int(r['va'],16);end=min((x for x in symbols if x>a),default=a+16384)
 lines.append('\n'+r['assembly']+' '+r['type']+'.'+r['method']+' '+hex(a))
 for ins in cs.disasm(b[r['fileOffset']:r['fileOffset']+min(end-a,16384)],a):
  ann=''
  if ins.mnemonic in ['call','jmp'] and ins.op_str.startswith('0x'):ann=' ; '+symbols.get(int(ins.op_str,16),'unmapped')
  lines.append(hex(ins.address)+' '+ins.mnemonic+' '+ins.op_str+ann)
(root/'population-static-disassembly.txt').write_text('\n'.join(lines),encoding='utf-8')
print(len(rows),'methods;',len(selected),'disassembled')
