"""Owned read-only IL2CPP metadata/module lookup; never loads native code."""
import json,pathlib,struct,sys,re
HERE=pathlib.Path(__file__).parent
S=json.loads((HERE/'native-loader-structure.json').read_text());DLL=pathlib.Path(S['file']).read_bytes();META=(pathlib.Path(S['file']).parent/'pico_park_2_Data/il2cpp_data/Metadata/global-metadata.dat').read_bytes();H=struct.unpack_from('<64I',META);HEAP=META[H[6]:H[6]+H[7]];BASE=int(S['imageBase'],16)
def ms(i):return HEAP[i:HEAP.find(b'\0',i)].decode('utf8',errors='replace')
def off(va):
 r=va-BASE
 for x in S['sections']:
  if x['rva']<=r<x['rva']+x['rawSize']:return x['rawOffset']+r-x['rva']
def va(o):
 for x in S['sections']:
  if x['rawOffset']<=o<x['rawOffset']+x['rawSize']:return BASE+x['rva']+o-x['rawOffset']
def u64(o):return struct.unpack_from('<Q',DLL,o)[0]
IMAGES=[struct.unpack_from('<10i',META,p) for p in range(H[42],H[42]+H[43],40)]
TYPES=[struct.unpack_from('<16i8H2I',META,p) for p in range(H[40],H[40]+H[41],88)]
def module(image):
 name=ms(image[0]);at=DLL.find(name.encode()+b'\0');needle=struct.pack('<Q',va(at));pos=0;found=[]
 while True:
  pos=DLL.find(needle,pos)
  if pos<0:break
  count=u64(pos+8);p=u64(pos+16);fo=off(p)
  if 0<count<200000 and fo is not None:found.append((pos,count,fo))
  pos+=1
 if len(found)!=1:raise ValueError((name,found))
 return found[0]
def methods(ti):
 t=TYPES[ti];image=next(x for x in IMAGES if x[2]<=ti<x[2]+x[3]);mod=module(image);rows=[]
 for mi in range(t[9],t[9]+t[16]):
  m=struct.unpack_from('<6i4H',META,H[12]+mi*32);ptr=u64(mod[2]+((m[5]&0xffffff)-1)*8);rows.append({'typeIndex':ti,'type':ms(t[0]),'namespace':ms(t[1]),'method':ms(m[0]),'token':hex(m[5]),'va':hex(ptr),'assembly':ms(image[0]),'moduleVA':hex(va(mod[0])),'pointerEntryVA':hex(va(mod[2]+((m[5]&0xffffff)-1)*8)),'parameters':[(ms(struct.unpack_from('<3i',META,H[22]+pi*12)[0]),struct.unpack_from('<3i',META,H[22]+pi*12)[2]) for pi in range(m[3],m[3]+m[9])]})
 return rows

def fields(ti):
 ndef=len(TYPES);needle=struct.pack('<Q',ndef);pos=0;tables=[]
 while True:
  pos=DLL.find(needle,pos)
  if pos<0:break
  pointer=u64(pos+8)
  if off(pointer) is not None and u64(pos+16)==ndef and off(u64(pos+24)) is not None:tables.append(pointer)
  pos+=1
 assert len(tables)==1
 fp=u64(off(tables[0])+ti*8);t=TYPES[ti];rows=[]
 for j in range(t[18]):
  f=struct.unpack_from('<3i',META,H[24]+(t[8]+j)*12);rows.append({'name':ms(f[0]),'offset':struct.unpack_from('<i',DLL,off(fp)+j*4)[0],'typeIndex':f[1]})
 return rows

TYPE_POINTERS=u64(off(0x182ca8eb0+0x38))
def runtime_type(index):return runtime_type_pointer(u64(off(TYPE_POINTERS)+index*8))
def runtime_type_pointer(p):
 data,attrs=struct.unpack_from('<QQ',DLL,off(p));kind=(attrs>>16)&255
 if kind in [0x11,0x12]:return {'name':ms(TYPES[data][0]),'typeIndex':data,'kind':kind}
 if kind==0x15:
  definition=u64(off(data));inst=u64(off(data+8));count=struct.unpack_from('<I',DLL,off(inst))[0];argv=u64(off(inst+8));base=runtime_type_pointer(definition) if definition>=BASE else {'name':ms(TYPES[definition][0]),'typeIndex':definition};return {**base,'kind':kind,'arguments':[runtime_type_pointer(u64(off(argv)+k*8)) for k in range(count)]}
 return {'kind':kind,'data':hex(data)}
def interfaces(ti):
 t=TYPES[ti];return [runtime_type(struct.unpack_from('<i',META,H[34]+(t[13]+j)*4)[0]) for j in range(t[22])]

def asset_evidence():
 import hashlib
 sys.path.insert(0,str(pathlib.Path('../.tools/unity-analysis').resolve()))
 import UnityPy
 from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
 from UnityPy.helpers.TypeTreeNode import TypeTreeNode
 D=pathlib.Path(S['file']).parent/'pico_park_2_Data';env=UnityPy.load(str(D/'resources.assets'),str(D/'globalgamemanagers.assets'));obs={o.path_id:o for o in env.objects if pathlib.Path(o.assets_file.name).name=='resources.assets'};g=TypeTreeGenerator('2022.3.5f1');g.load_local_game(str(D.parent));nodes={}
 def tree(o,cls):
  if cls not in nodes:
   ns=g.get_nodes('PhotonQuantum',cls)
   for z in ns:
    if z.m_Name=='m_Enabled':z.m_MetaFlag|=16384
   nodes[cls]=TypeTreeNode.from_list([TypeTreeNode(z.m_Level,z.m_Type,z.m_Name,0,0,m_MetaFlag=z.m_MetaFlag) for z in ns])
  return o.read_typetree(nodes=nodes[cls])
 def fingerprint(o):return {'pathId':o.path_id,'byteStart':o.byte_start,'byteSize':o.byte_size,'sha256':hashlib.sha256(o.get_raw_data()).hexdigest()}
 classes={}
 for pid,o in obs.items():
  if o.type.name=='MonoBehaviour':
   try:classes[pid]=o.read(check_read=False).m_Script.read().m_ClassName
   except:pass
 regid=next(pid for pid,n in classes.items() if n=='AssetResourceContainer');regraw=obs[regid].get_raw_data();cur=28
 def st():
  nonlocal cur
  n=struct.unpack_from('<I',regraw,cur)[0];cur+=4;v=regraw[cur:cur+n].decode();cur=(cur+n+3)&~3;return v
 regname=st();bundles=struct.unpack_from('<I',regraw,cur)[0];cur+=4;assert bundles==0;nr=struct.unpack_from('<I',regraw,cur)[0];cur+=4;registry=[]
 for _ in range(nr):
  path=st();guid=struct.unpack_from('<Q',regraw,cur)[0];cur+=8;resource=st();registry.append({'path':path,'guid':str(guid),'resourcePath':resource})
 assert cur==len(regraw),(cur,len(regraw))
 views={}
 for pid,n in classes.items():
  if n=='EntityViewAsset':
   v=tree(obs[pid],n);views[v['Settings']['Identifier']['Path']]={'data':v,'object':fingerprint(obs[pid])}
 old=json.loads((HERE/'native-creation-order-report.json').read_text(encoding='utf8'));rows=[]
 for original in old['installedPrototypeEvidence']['prefabs']:
  pid=original['entityPrototypePathId'];proto=tree(obs[pid],'EntityPrototype');assetpid=original['entityPrototypeAsset']['pathId'];asset=tree(obs[assetpid],'EntityPrototypeAsset');path=asset['Settings']['Identifier']['Path'];viewpath=path.removesuffix('EntityPrototype')+'EntityView';view=views[viewpath];vr=next(r for r in registry if r['path']==viewpath);pr=next(r for r in registry if r['path']==path);actualViewId=view['data']['Parent']['m_PathID'];assert actualViewId in [z['pathId'] for z in original['components']]
  rows.append({'name':original['name'],'gameObjectPathId':original['gameObjectPathId'],'prototypeObject':fingerprint(obs[pid]),'prototypeAssetObject':fingerprint(obs[assetpid]),'authoring':proto,'prototypeAsset':asset,'prototypeRegistry':pr,'viewAssetObject':view['object'],'viewAsset':view['data'],'viewRegistry':vr,'rootEntityViewPathId':actualViewId,'conditionalPreparedComponents':[{'type':'View','prototype':'View_Prototype','currentGuid':vr['guid']}],'conditionalHasAnyListeners':False,'conditions':['ResourceContainer records loaded into UnityDB in installedorder','EntityPrototypeAsset.PrepareAsset executesunmodified withParent','no interveninghostmutationofSettings.Container orregistry']})
 return {'resourcesSha256':hashlib.sha256((D/'resources.assets').read_bytes()).hexdigest(),'registryObject':fingerprint(obs[regid]),'registryName':regname,'assetBundleCount':bundles,'resourceCount':nr,'registryRecords':registry,'prefabs':rows}
def audit():
 import hashlib
 selected=[10165,10241,8311,8638,8743,4921,10164]
 methods_selected=[]
 wanted={'PrepareAsset','PreSerialize','SerializeImplicitComponents','EnsureIsSorted','System.Collections.Generic.IComparer<Quantum.ComponentPrototype>.Compare','Materialize','AddToEntity','MaterializePrototypeInternal','InvokeEntityPrototypeMaterializedListeners','<.ctor>b__89_0'}
 for ti in selected:methods_selected.extend(m for m in methods(ti) if m['method'] in wanted)
 listener=[];signals=[];componentSignals=[]
 for ti,t in enumerate(TYPES):
  for it in interfaces(ti):
   row={'typeIndex':ti,'type':ms(t[0]),'interface':it}
   if it.get('typeIndex')==8273:listener.append(row)
   if it.get('typeIndex')==4970:signals.append(row)
   if it.get('typeIndex')==4967:componentSignals.append(row)
 return {'status':'analysis-in-progress','nativeCodeExecuted':False,'metadataSha256':hashlib.sha256(META).hexdigest(),'dllSha256':hashlib.sha256(DLL).hexdigest(),'typeDefinitionCount':len(TYPES),'metadataRegistration':'0x182ca8eb0','methodPointers':methods_selected,'listenerImplementors':listener,'signalImplementors':signals,'componentAddedSignalImplementors':componentSignals,'assets':asset_evidence()}

def usage(slot):
 token=u64(off(slot));tag=token>>29;idx=(token&0x1fffffff)>>1;out={'slotVA':hex(slot),'encodedToken':hex(token),'tag':tag,'index':idx}
 if tag==1:out['type']=runtime_type(idx)
 elif tag in [3,6]:
  inst=-1
  if tag==6:
   specs=u64(off(0x182ca8eb0+0x48));mi,cls,inst=struct.unpack_from('<iii',DLL,off(specs)+idx*12)
  else:mi=idx
  m=struct.unpack_from('<6i4H',META,H[12]+mi*32);out.update(method=ms(TYPES[m[1]][0])+'.'+ms(m[0]),methodIndex=mi,owner=m[1],token=hex(m[5]))
  if tag==3:out['methodVA']=next(v['va'] for v in methods(m[1]) if v['token']==hex(m[5]))
  for field,gi in [('arguments',inst),('classArguments',cls if tag==6 else -1)]:
   if gi>=0:
    instances=u64(off(0x182ca8eb0+0x18));ptr=u64(off(instances)+gi*8);n=struct.unpack_from('<I',DLL,off(ptr))[0];argv=u64(off(ptr+8));out[field]=[runtime_type_pointer(u64(off(argv)+k*8)) for k in range(n)]
 return out
def followup():
 import hashlib
 sys.path.insert(0,str(HERE/'tools'))
 from capstone import Cs,CS_ARCH_X86,CS_MODE_64
 cs=Cs(CS_ARCH_X86,CS_MODE_64)
 def block(a,n):
  raw=DLL[off(a):off(a)+n]
  return {'va':hex(a),'bytes':raw.hex(),'sha256':hashlib.sha256(raw).hexdigest(),'instructions':[{'va':hex(i.address),'text':i.mnemonic+' '+i.op_str} for i in cs.disasm(raw,a)]}
 def use(a):
  slot=a+7+struct.unpack_from('<i',DLL,off(a)+3)[0]
  return dict(instructionVA=hex(a),**usage(slot))
 builtin=[0x181936677,0x1819366f1,0x181936774,0x181936836,0x181936907,0x1819369d8,0x181936aa9,0x181936b7a,0x181936c4b,0x181936d1c,0x181936ded,0x181936e70,0x181936ef3,0x181936fc4,0x181937095,0x181937166,0x181937237,0x1819372ba,0x18193733d]
 systems=[0x181787b55,0x181787ba1,0x181787be7,0x181787c32,0x181787d13,0x181787d59]
 ranges=[(0x1819361d5,7),(0x180019e20,25),(0x18193724d,131),(0x1819346b0,256),(0x180730803,165),(0x180730b42,68),(0x180730c2d,38),(0x1819375b9,218),(0x1817443ef,30),(0x18077dcb6,160),(0x1808a9680,64),(0x18173b129,310),(0x1817633a6,16),(0x18176340d,105),(0x181763ae9,17),(0x181763c3d,20),(0x181763ded,26),(0x18176cce0,48),(0x181787b27,10),(0x180319f95,90)]
 reg=u64(off(0x182ca8eb0+0x28));count=u64(off(0x182ca8eb0+0x20));ptrs=u64(off(0x18286d050+0x18));generic=[]
 for j in range(count):
  row=struct.unpack_from('<4i',DLL,off(reg)+j*16)
  if row[0] in [94629,1115]:generic.append({'rowVA':hex(reg+j*16),'row':list(row),'pointerEntryVA':hex(ptrs+row[1]*8),'methodVA':hex(u64(off(ptrs)+row[1]*8))})
 return {'profile':'unmodified installed DLL and metadata; standard QuantumGame.CreateFrameContext/CreateFrame path','viewComponentId':18,'viewSize':8,'viewFlags':0,'viewMask':'0x0000000000040000','builtinRegistrations':[use(a) for a in builtin],'systemSetupTypes':[use(a) for a in systems],'metadataUsages':[use(a) for a in [0x1817443ef,0x18173b129,0x181763b4b,0x181763cfb]],'genericMethods':generic,'nativeBlocks':[block(a,n) for a,n in ranges],'standardCallbacks':{'globalViewOnAdded':None,'frameViewOnAdded':None,'framePrototypeMaterialized':None,'prototypeSignalSystems':[]},'systemComposition':'Six non-null roots from SystemSetup; Where(non-null), then SelectMany(SystemBase.Hierarchy). All installed metadata types have no concrete added/prototype signal implementations. Thus both signal filters are empty even for compiled hierarchy members.','registration':'Reserved null type seeds index0; View is eighteenth builtin addition; Add<View> copies Count to Id, size8, flags0, and serializer-only ComponentCallbacks constructor explicitly zeros OnAdded/OnRemoved. Callback list is copied to ComponentTypeId.Callbacks at +50 after custom registration.','frameRegistration':'BuildSignalsArrayOnComponentAdded<View> filters Frame+e8 with instance predicate and explicitly writes null into Frame+70[18] on zero length. Frame constructor stores filtered prototype systems at +198, and skips +80 write on empty. Fresh Frame allocation clears payload via memset.','entityConclusion':'Under this standard profile and confirmed single View prepared container, materialization adds View on the allocated root and creates zero additional entities. Creator-specific operations after return and prior allocator/pool state remain separate.'}

if __name__=='__main__':
 if '--followup' in sys.argv:
  p=HERE/'native-materialization-report.json';r=json.loads(p.read_text(encoding='utf8'));r['followup']=followup();p.write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8');print('followup native evidence updated');sys.exit(0)
 if '--audit' in sys.argv:
  def exact_json(v):
   if isinstance(v,dict):return {k:exact_json(a) for k,a in v.items()}
   if isinstance(v,list):return [exact_json(a) for a in v]
   return str(v) if isinstance(v,int) and abs(v)>9007199254740991 else v
  (HERE/'native-materialization-report.json').write_text(json.dumps(exact_json(audit()),ensure_ascii=False,indent=2),encoding='utf8');print('owned report evidence regenerated; narrative must be reconciled before freezing');sys.exit(0)
 pattern=sys.argv[1] if len(sys.argv)>1 else 'EntityPrototype|ComponentPrototype|PrototypeContainer|PrototypeConverter|PrototypeBaker'
 for ti,t in enumerate(TYPES):
  if re.search(pattern,ms(t[0])):
   print(json.dumps({'typeIndex':ti,'name':ms(t[0]),'namespace':ms(t[1]),'assembly':ms(next(x for x in IMAGES if x[2]<=ti<x[2]+x[3])[0]),'methods':methods(ti)},ensure_ascii=False))
