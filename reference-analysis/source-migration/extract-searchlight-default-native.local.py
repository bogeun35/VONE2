import json,pathlib,struct
root=pathlib.Path(__file__).parent
structure=json.loads((root/'native-loader-structure.json').read_text())
b=pathlib.Path(structure['file']).read_bytes();meta=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
h=struct.unpack_from('<64I',meta);heap=meta[h[6]:h[6]+h[7]]
def string(i):return heap[i:heap.find(b'\0',i)].decode()
def off(va):
 for s in structure['sections']:
  r=va-int(structure['imageBase'],16)-s['rva']
  if 0<=r<s['rawSize']:return s['rawOffset']+r
def va(o):
 for s in structure['sections']:
  if s['rawOffset']<=o<s['rawOffset']+s['rawSize']:return int(structure['imageBase'],16)+s['rva']+o-s['rawOffset']
def module(name):
 pos=b.find(name.encode()+b'\0');needle=struct.pack('<Q',va(pos));at=0
 while True:
  at=b.find(needle,at)
  if at<0:raise ValueError(name)
  count,pointer=struct.unpack_from('<QQ',b,at+8);po=off(pointer)
  if po is not None and 100<count<200000:return count,po
  at+=1
rows=[];wanted={0x1814dc9b0,0x1814dd0e0,0x18031b7c0,0x1802f7d10,0x1819786c0}
for p in range(h[42],h[42]+h[43],40):
 image=struct.unpack_from('<10i',meta,p);name=string(image[0])
 if name not in ['PhotonQuantumCode.dll','quantum.core.dll','mscorlib.dll','PhotonQuantum.dll']:continue
 count,po=module(name)
 for ti in range(image[2],image[2]+image[3]):
  t=struct.unpack_from('<16i8H2I',meta,h[40]+ti*88)
  for mi in range(t[9],t[9]+t[16]):
   m=struct.unpack_from('<6i4H',meta,h[12]+mi*32);idx=(m[5]&0xffffff)-1
   if idx>=count:continue
   addr=struct.unpack_from('<Q',b,po+idx*8)[0]
   if string(t[0])=='SearchLightComponent' or addr in wanted:
    rows.append(dict(assembly=name,type=string(t[1])+'.'+string(t[0]),method=string(m[0]),va=hex(addr),token=hex(m[5])))
print(json.dumps(rows,indent=2))

