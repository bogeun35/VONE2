"""Export exact installed world tile grids for local migration analysis only."""
import pathlib,json,struct,base64,re,collections,hashlib
H=pathlib.Path(__file__).parent;src=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2')
m=(src/'pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes();h=struct.unpack_from('<64I',m);heap=m[h[6]:h[6]+h[7]]
def ms(i):return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
b=(src/'GameAssembly.dll').read_bytes();sections=json.loads((H/'native-loader-structure.json').read_text())['sections']
def off(a):
 for s in sections:
  if 0x180000000+s['rva']<=a<0x180000000+s['rva']+s['rawSize']:return s['rawOffset']+a-0x180000000-s['rva']
# QTileMapChipAttrData .cctor lea field reference at native VA 0x1817818e1.
addr=0x1817818e1+7+0x19e36e8;raw=struct.unpack_from('<Q',b,off(addr))[0];assert raw>>29==4
ref=(raw&0x1fffffff)>>1;ti,fi=struct.unpack_from('<2i',m,h[46]+ref*8)
types=[struct.unpack_from('<16i8H2I',m,p) for p in range(h[40],h[40]+h[41],88)];t=next(t for t in types if t[2]==ti)
idx=t[8]+fi;f=struct.unpack_from('<3i',m,h[24]+idx*12)
d=next(struct.unpack_from('<3i',m,p) for p in range(h[16],h[16]+h[17],12) if struct.unpack_from('<i',m,p)[0]==idx)
attr=m[h[18]+d[2]:h[18]+d[2]+80]
assert hashlib.sha256(attr).hexdigest().upper()==ms(f[0])
decoded=json.loads((H/'installed-stage-decoded.local.json').read_text())['stages']
flagNames={1:'Collision',2:'Ice',4:'Break',8:'BreakColor',16:'Fall'}
out={'source':'Installed PP2 lossless tile data','coordinateEvidence':{'serializedOrder':'column-major with padding','sourceIndex':'(x+padding)*(height+2*padding)+(y+padding)','nativeGridOrder':'row-major y*width+x','nativeInitialize':'0x18187d4f0','nativeSetMapChip':'0x18187d910','worldY':'downward; tile y increases downward, direct native y*width+x indexing, no height-Y reflection','chipSize':'48 native pixels: GetWidth0x18187d250 computes tileWidth*3<<4; mapInitParam chipSize also retained','origin':'world(0,0), tile(x,y) bounds [48*x,48*(x+1)] by [48*y,48*(y+1)]; native Move0x18187e2ed..0x18187e3b5 directly divides world coordinates by48 without offset','mapRectOverlay':'datas[0..4] = gridX,gridY,width,height,mode; fills(x+i,y-j)'},'tileAttributes':[{'id':i,'flags':v,'flagNames':[name for bit,name in flagNames.items() if v&bit],'solid':bool(v&1),'specialFlags':v&~1} for i,v in enumerate(attr)],'stages':[]}
for s in sorted(decoded,key=lambda s:s['stageId']):
 if not re.fullmatch(r'st_w_\d\d_\d\d',s['stageId']):continue
 variants=[]
 for v in s['json']['stageInitParamList']:
  mp=v['mapInitParam'];w=mp['width'];ht=mp['height'];p=mp['paddingCount'];data=base64.b64decode(mp['mapData']);assert len(data)==(w+2*p)*(ht+2*p)
  grid=[[data[(x+p)*(ht+2*p)+y+p] for x in range(w)] for y in range(ht)]
  ids=collections.Counter(i for row in grid for i in row)
  variants.append({'createIndex':v['createIndex'],'needPlayerCount':v['needPlayerCount'],'isOnlineOnly':v['isOnlineOnly'],'width':w,'height':ht,'padding':p,'chipSize':mp['chipSize'],'tileOriginX':0,'tileOriginY':0,'worldTileSize':48,'startTileX':mp['startTileX'],'startTileY':mp['startTileY'],'grid':grid,'tileCounts':dict(ids)})
 out['stages'].append({'stageId':s['stageId'],'variants':variants})
assert len(out['stages'])==60
(H/'source-geometry.local.json').write_text(json.dumps(out,separators=(',',':')),encoding='utf-8')
print(json.dumps({'stages':len(out['stages']),'variants':sum(len(s['variants']) for s in out['stages']),'tileAttributeIds':len(out['tileAttributes'])}))
