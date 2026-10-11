"""Static IL2CPP metadata only. No native code is loaded or executed."""
import pathlib,struct,re,json,sys
p=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat')
b=p.read_bytes(); vals=struct.unpack_from('<64I',b)
so,sl=vals[6:8]; heap=b[so:so+sl]
to,tl=vals[40:42]; mo,ml=vals[12:14]; fo,fl=vals[24:26]
# field default values table (for enum literals) : header words 26/27 per Il2CppDumper v29
fdvo,fdvl=vals[26:28]
fdo,fdl=vals[28:30]   # fieldAndParameterDefaultValueData
def string(i):
    return heap[i:heap.find(b'\0',i)].decode('utf-8',errors='replace')
want=re.compile(r'^(TextComponent|TextComponent_Prototype|BlinkBlockComponent|ThornCeilingComponent|QActorType|QEventType|ActorFactoryComponent|GateComponent)$')
out={}
nameByIndex={}
for index,pos in enumerate(range(to,to+tl,88)):
    t=struct.unpack_from('<16i8H2I',b,pos)
    nameByIndex[index]=string(t[0])
for index,pos in enumerate(range(to,to+tl,88)):
    t=struct.unpack_from('<16i8H2I',b,pos)
    name=string(t[0])
    if not want.match(name):continue
    methods=[];fields=[]
    for mi in range(t[9],t[9]+t[16]):
        m=struct.unpack_from('<6i4H',b,mo+mi*32)
        methods.append(string(m[0]))
    for fi in range(t[8],t[8]+t[18]):
        f=struct.unpack_from('<3i',b,fo+fi*12)
        fields.append({'index':fi,'name':string(f[0]),'typeIndex':f[1]})
    out[name]={'typeIndex':index,'namespace':string(t[1]),'parent':t[4],'methodCount':t[16],'fieldCount':t[18],'methods':methods,'fields':fields}
# enum literal values live in fieldDefaultValues: (fieldIndex, typeIndex, dataIndex)
defaults={}
for pos in range(fdvo,fdvo+fdvl,12):
    fi,ti,di=struct.unpack_from('<3i',b,pos)
    defaults[fi]=di
res={}
for name in ('QActorType','QEventType'):
    if name not in out:continue
    members=[]
    for f in out[name]['fields']:
        if f['name']=='value__':continue
        di=defaults.get(f['index'])
        v=None
        if di is not None and di>=0:
            v=struct.unpack_from('<i',b,fdo+di)[0]
        members.append({'name':f['name'],'value':v})
    res[name]=members
report={'metadataFile':str(p),'types':out,'enums':res}
pathlib.Path(__file__).with_name('text-metadata.local.json').write_text(json.dumps(report,indent=1,ensure_ascii=False),encoding='utf-8')
print('TextComponent methods:',out.get('TextComponent',{}).get('methods'))
print()
print('TextComponent fields:',[f['name'] for f in out.get('TextComponent',{}).get('fields',[])])
print()
print('BlinkBlockComponent methods:',out.get('BlinkBlockComponent',{}).get('methods'))
print()
print('GateComponent methods:',out.get('GateComponent',{}).get('methods'))
print()
for name in ('QActorType','QEventType'):
    for m in res.get(name,[]):
        if name=='QActorType' and m['name'] in ('Text','DummyRect','ThornCeiling','BlinkBlock'):print(name,m)
        if name=='QEventType' and m['value'] in (60,61,62,63):print(name,m)
