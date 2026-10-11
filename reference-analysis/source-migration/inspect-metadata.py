"""Static IL2CPP metadata strings and header only, no native code execution."""
import pathlib,struct,re,json
p=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat')
b=p.read_bytes(); vals=struct.unpack_from('<64I',b)
# Initial metadata header fields are magic/version, string literals, literal data,
# then metadata string heap. Retain raw header to keep interpretation reviewable.
so,sl=vals[6:8]
heap=b[so:so+sl]
terms=re.compile(r'stage|crypt|cipher|rijndael|aes|serialize|decompress|compress|binary|bundle',re.I)
strings=[]; off=0
for raw in heap.split(b'\0'):
    s=raw.decode('utf-8',errors='replace')
    if terms.search(s): strings.append({'heapOffset':off,'text':s})
    off+=len(raw)+1
out={'file':str(p),'bytes':len(b),'magic':hex(vals[0]),'version':vals[1],'first64HeaderWords':list(vals),'metadataStringHeap':{'offset':so,'length':sl},'matchingStrings':strings}
pathlib.Path(__file__).with_name('metadata-structure.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'magic':out['magic'],'version':out['version'],'stringHeapOffset':so,'stringHeapLength':sl,'matches':len(strings)}))
for s in strings:
    if re.search(r'StageDataLoader|StageFile|Encrypt|Decrypt|Rijndael|Aes|AES|AssetBundle|LoadStage|StagePath',s['text']): print(s)

def string(index):
    return heap[index:heap.find(b'\0',index)].decode('utf-8',errors='replace')
types=[]
to,tl=vals[40:42]; mo,ml=vals[12:14]; fo,fl=vals[24:26]
assert tl%88==0 and ml%32==0 and fl%12==0
for index,pos in enumerate(range(to,to+tl,88)):
    t=struct.unpack_from('<16i8H2I',b,pos)
    name=string(t[0])
    if re.search(r'StageDataLoader|StageFile|GameAssetBundleUtility|AesEncryptor|StageData|StageInfo|StageInitParam|ActorCreateParam|Serializer',name):
        methods=[];fields=[]
        for mi in range(t[9],t[9]+t[16]):
            m=struct.unpack_from('<6i4H',b,mo+mi*32)
            assert m[1]==index
            parameters=[]
            for pi in range(m[3],m[3]+m[9]):
                pd=struct.unpack_from('<3i',b,vals[22]+pi*12)
                parameters.append({'name':string(pd[0]),'typeIndex':pd[2]})
            methods.append({'index':mi,'name':string(m[0]),'returnTypeIndex':m[2],'parameterStart':m[3],'parameterCount':m[9],'parameters':parameters,'token':hex(m[5])})
        for fi in range(t[8],t[8]+t[18]):
            f=struct.unpack_from('<3i',b,fo+fi*12)
            fields.append({'index':fi,'name':string(f[0]),'typeIndex':f[1],'token':hex(f[2])})
        types.append({'index':index,'name':name,'namespace':string(t[1]),'fields':fields,'methods':methods})
literalrows=[]
for li,pos in enumerate(range(vals[2],vals[2]+vals[3],8)):
    n,offset=struct.unpack_from('<2I',b,pos)
    s=b[vals[4]+offset:vals[4]+offset+n].decode('utf-8',errors='replace')
    if re.search(r'Stage/|\.stage|\.bytes|PP2/|StageFile|stageData',s,re.I): literalrows.append({'index':li,'text':s})
result={'formatReference':'https://github.com/Perfare/Il2CppDumper/blob/master/Il2CppDumper/Il2Cpp/MetadataClass.cs','metadataVersion':29,'typeDefinitionStride':88,'methodDefinitionStride':32,'fieldDefinitionStride':12,'matchingTypes':types,'stageLiterals':literalrows,'caution':'Names and static metadata signatures do not establish native control flow or decoded stage layout.'}
pathlib.Path(__file__).with_name('loader-structure.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print('LOADER TYPES',len(types),'STAGE LITERALS',len(literalrows))
