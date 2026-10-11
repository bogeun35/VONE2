"""Read installed metadata and encrypted stage payloads statically; never executes native code."""
import pathlib,struct,json,re,sys,hashlib,collections
HERE=pathlib.Path(__file__).parent
SRC=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2')
meta=(SRC/'pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes()
h=struct.unpack_from('<64I',meta)
heap=meta[h[6]:h[6]+h[7]]
def name(i): return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
def fieldinfo(ref):
    ti,fi=struct.unpack_from('<2i',meta,h[46]+ref*8)
    candidates=[struct.unpack_from('<16i8H2I',meta,p) for p in range(h[40],h[40]+h[41],88)]
    t=next(t for t in candidates if t[2]==ti)
    idx=t[8]+fi
    f=struct.unpack_from('<3i',meta,h[24]+idx*12)
    default=None
    for pos in range(h[16],h[16]+h[17],12):
        row=struct.unpack_from('<3i',meta,pos)
        if row[0]==idx: default=row
    return {'ref':ref,'typeIndex':ti,'type':name(t[0]),'fieldIndex':idx,'field':name(f[0]),'default':default}
text=(HERE/'loader-static-disassembly.txt').read_text()
parts={k:v for k,v in re.findall(r'AEAG\.(GetBytes[ABK]) (.*?)(?=\n\n|\Z)',text,re.S)}
rows=[]
for method,body in parts.items():
    refs=re.findall(r'raw=(0x8[0-9a-f]+)',body)
    indices=[int(x,16)&0x1fffffff for x in refs]
    row={'method':method,'fieldRefs':[fieldinfo(i>>1) for i in indices]}
    row['sourceOffsets']=[int(x,16)-0x20 for x in re.findall(r'movzx ecx, byte ptr \[rax \+ (0x[0-9a-f]+)\]',body)]
    f=row['fieldRefs'][0]
    data=meta[h[18]+f['default'][2]:h[18]+f['default'][2]+128]
    row['initializerHashMatches']=hashlib.sha256(data).hexdigest().upper()==f['field']
    assert row['initializerHashMatches'], 'Initializer SHA256 mismatch'
    row['_bytes']=bytes(data[i] for i in row['sourceOffsets'])
    rows.append(row)
key=next(r['_bytes'] for r in rows if r['method']=='GetBytesK')
iv=next(r['_bytes'] for r in rows if r['method']=='GetBytesB')
from cryptography.hazmat.primitives.ciphers import Cipher,algorithms,modes
from cryptography.hazmat.primitives.padding import PKCS7
decoded=[]
for path in sorted((SRC/'pico_park_2_Data/StreamingAssets/Stage/PP2').glob('*')):
    if not path.is_file(): continue
    raw=path.read_bytes()
    d=Cipher(algorithms.AES(key),modes.CBC(iv)).decryptor()
    plain=d.update(raw)+d.finalize()
    p=PKCS7(128).unpadder()
    plain=p.update(plain)+p.finalize()
    stageid,payload=plain.decode('utf-8-sig').split('\n',1)
    obj=json.loads(payload)
    decoded.append({'file':path.name,'stageId':stageid,'bytes':len(plain),'keys':list(obj) if isinstance(obj,dict) else None,'json':obj})
for row in rows: del row['_bytes']
(HERE/'aes-static-structure.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
(HERE/'installed-stage-decoded.local.json').write_text(json.dumps({'readOnlySource':True,'nativeCodeExecuted':False,'stages':decoded},indent=2),encoding='utf-8')
world=[s for s in decoded if re.fullmatch(r'st_w_\d\d_\d\d',s['stageId'])]
assert len(world)==60
assert {s['stageId'] for s in world}=={f'st_w_{w:02}_{r:02}' for w in range(1,16) for r in range(1,5)}
report={'source':'Installed PICO PARK 2 static metadata and stage payloads','nativeCodeExecuted':False,'bruteForceUsed':False,'verifiedWorldIds':60,'actorParametersInterpreted':False,'webPlayableStages':0,'stageSchema':{'root':'stageInitParamList','variant':'createIndex / needPlayerCount / isOnlineOnly','actors':'actorCreateParamList','position':'posX / posY','parameters':'datas[32]: t type marker, f float, s string; exact per-actor parameter meaning pending static initializer inspection'},'stages':[]}
for s in sorted(world,key=lambda s:s['stageId']):
    variants=[]
    for v in s['json']['stageInitParamList']:
        actors=v['actorCreateParamList'];counter=collections.Counter(a['typeName'] for a in actors)
        variants.append({'createIndex':v['createIndex'],'needPlayerCount':v['needPlayerCount'],'isOnlineOnly':v['isOnlineOnly'],'actorCount':len(actors),'actorTypes':dict(counter),'boundsOfActorCenters':{'minX':min(a['posX'] for a in actors),'maxX':max(a['posX'] for a in actors),'minY':min(a['posY'] for a in actors),'maxY':max(a['posY'] for a in actors)}})
    report['stages'].append({'stageId':s['stageId'],'file':s['file'],'sourceSha256':hashlib.sha256((SRC/'pico_park_2_Data/StreamingAssets/Stage/PP2'/s['file']).read_bytes()).hexdigest(),'variants':variants})
(HERE/'installed-world-decode-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'methods':len(rows),'decodedStages':len(decoded),'sample':[{k:v for k,v in x.items() if k!='json'} for x in decoded[:3]]},indent=2))
