"""Read PE tables and IL2CPP module pointers without loading/executing the DLL."""
import pathlib,struct,json,sys,re
p=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/GameAssembly.dll');b=p.read_bytes()
u16=lambda o:struct.unpack_from('<H',b,o)[0]
u32=lambda o:struct.unpack_from('<I',b,o)[0]
u64=lambda o:struct.unpack_from('<Q',b,o)[0]
pe=u32(0x3c);assert b[pe:pe+4]==b'PE\0\0'
count=u16(pe+6);opt=pe+24;assert u16(opt)==0x20b
base=u64(opt+24);st=opt+u16(pe+20);sections=[]
for i in range(count):
    o=st+i*40
    sections.append({'name':b[o:o+8].rstrip(b'\0').decode(),'virtualSize':u32(o+8),'rva':u32(o+12),'rawSize':u32(o+16),'rawOffset':u32(o+20)})
def va(off):
    for s in sections:
        if s['rawOffset']<=off<s['rawOffset']+s['rawSize']: return base+s['rva']+off-s['rawOffset']
def fileoff(address):
    rva=address-base
    for s in sections:
        if s['rva']<=rva<s['rva']+s['rawSize']: return s['rawOffset']+rva-s['rva']
name=b'Assembly-CSharp.dll\0';at=b.find(name);assert at>=0
needle=struct.pack('<Q',va(at));refs=[];pos=0
while True:
    pos=b.find(needle,pos)
    if pos<0:break
    mc=u64(pos+8);mp=u64(pos+16);mpoff=fileoff(mp)
    refs.append({'fileOffset':pos,'va':hex(va(pos)),'methodCountCandidate':mc,'methodPointersCandidate':hex(mp),'methodPointersFileOffset':mpoff})
    pos+=1
modules=[r for r in refs if 1000<r['methodCountCandidate']<100000 and r['methodPointersFileOffset'] is not None]
targets=json.loads(pathlib.Path(__file__).with_name('loader-structure.json').read_text(encoding='utf-8'))
methods=[]
if len(modules)==1:
    mod=modules[0]
    for t in targets['matchingTypes']:
        for m in t['methods']:
            idx=(int(m['token'],16)&0xffffff)-1
            if idx>=mod['methodCountCandidate']:continue
            addr=u64(mod['methodPointersFileOffset']+idx*8)
            methods.append({'type':t['name'],'method':m['name'],'token':m['token'],'va':hex(addr),'fileOffset':fileoff(addr)})
report={'file':str(p),'readOnlyStatic':True,'machine':hex(u16(pe+4)),'imageBase':hex(base),'sections':sections,'assemblyStringOffset':at,'modulePointerCandidates':refs,'selectedModules':modules,'methods':methods,'caution':'Module pointer candidate is structurally inferred; native instructions have not been executed. No original payload exported.'}
pathlib.Path(__file__).with_name('native-loader-structure.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'modules':modules,'methodAddresses':len(methods),'selectedMethods':[m for m in methods if m['type'] in ['StageDataLoader','AesEncryptor','GameAssetBundleUtility']]}))

meta=(p.parent/'pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
h=struct.unpack_from('<64I',meta);heap=meta[h[6]:h[6]+h[7]]
def ms(i):return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
assembly=None
for pos in range(h[42],h[42]+h[43],40):
    img=struct.unpack_from('<10i',meta,pos)
    if ms(img[0])=='Assembly-CSharp.dll':assembly=img
assert assembly
symbols={};symbolrows=[]
for ti in range(assembly[2],assembly[2]+assembly[3]):
    t=struct.unpack_from('<16i8H2I',meta,h[40]+ti*88)
    for mi in range(t[9],t[9]+t[16]):
        m=struct.unpack_from('<6i4H',meta,h[12]+mi*32);idx=(m[5]&0xffffff)-1
        addr=u64(modules[0]['methodPointersFileOffset']+idx*8)
        label=ms(t[0])+'.'+ms(m[0])
        if addr:symbols[addr]=label
        symbolrows.append({'typeIndex':ti,'type':ms(t[0]),'method':ms(m[0]),'token':hex(m[5]),'va':hex(addr),'fileOffset':fileoff(addr) if addr else None})
pathlib.Path(__file__).with_name('assembly-csharp-method-index.json').write_text(json.dumps(symbolrows,indent=2),encoding='utf-8')
sys.path.insert(0,str(pathlib.Path(__file__).parent/'tools'))
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
cs=Cs(CS_ARCH_X86,CS_MODE_64)
selected=[r for r in symbolrows if r['type'] in ['StageDataLoader','AesEncryptor','GameAssetBundleUtility','AEAG'] and r['fileOffset']]
lines=[]
for r in selected:
    lines.append('\n'+r['type']+'.'+r['method']+' '+r['va'])
    start=int(r['va'],16); end=min((a for a in symbols if a>start),default=start+2048)
    size=min(2048,end-start)
    for ins in cs.disasm(b[r['fileOffset']:r['fileOffset']+size],start):
        annotation=''
        if ins.mnemonic in ['call','jmp'] and ins.op_str.startswith('0x'):
            annotation=' ; '+symbols.get(int(ins.op_str,16),'unmapped')
        match=re.search(r'\[rip \+ (0x[0-9a-f]+)\]',ins.op_str)
        if match:
            addr=ins.address+ins.size+int(match.group(1),16);off=fileoff(addr)
            if off is not None:
                enc=u64(off);annotation+=' ; ref='+hex(addr)+' raw='+hex(enc)
                if enc<2**32 and (enc>>29)==5:
                    idx=(enc&0x1fffffff)>>1
                    if idx<h[3]//8:
                        n,so=struct.unpack_from('<2I',meta,h[2]+idx*8)
                        lit=meta[h[4]+so:h[4]+so+n].decode('utf-8',errors='replace')
                        annotation+=' literal='+repr(lit)
        lines.append(hex(ins.address)+' '+ins.mnemonic+' '+ins.op_str+annotation)
pathlib.Path(__file__).with_name('loader-static-disassembly.txt').write_text('\n'.join(lines),encoding='utf-8')
print('Static disassembly methods',len(selected))
