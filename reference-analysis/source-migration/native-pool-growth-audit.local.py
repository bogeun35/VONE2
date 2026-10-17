"""Read-only native/config audit. Never executes original game code."""
import runpy,pathlib,json,sys,hashlib,struct
HERE=pathlib.Path(__file__).resolve().parent
X=runpy.run_path(str(HERE/'native-materialization-audit.local.py'))
def asset_configs():
 sys.path.insert(0,str(pathlib.Path('../.tools/unity-analysis').resolve()))
 import UnityPy
 from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
 from UnityPy.helpers.TypeTreeNode import TypeTreeNode
 d=pathlib.Path(X['S']['file']).parent/'pico_park_2_Data'
 env=UnityPy.load(str(d/'resources.assets'),str(d/'globalgamemanagers.assets'));g=TypeTreeGenerator('2022.3.5f1');g.load_local_game(str(d.parent));out=[]
 for o in env.objects:
  if o.type.name!='MonoBehaviour':continue
  try:c=o.read(check_read=False).m_Script.read().m_ClassName
  except:continue
  if c not in ['SimulationConfig','SimulationConfigAsset']:continue
  ns=g.get_nodes('PhotonQuantum',c)
  for z in ns:
   if z.m_Name=='m_Enabled':z.m_MetaFlag|=16384
   if z.m_Name=='Layers' and z.m_Type=='string':z.m_Type='vector'
  nodes=TypeTreeNode.from_list([TypeTreeNode(z.m_Level,z.m_Type,z.m_Name,0,0,m_MetaFlag=z.m_MetaFlag) for z in ns]);raw=o.get_raw_data()
  out.append({'class':c,'file':str(o.assets_file.name),'pathId':o.path_id,'byteStart':o.byte_start,'byteSize':o.byte_size,'sha256':hashlib.sha256(raw).hexdigest(),'tree':o.read_typetree(nodes=nodes)})
 return out

def pool_plan(count,block_size,active_blocks,list_capacity,existing_block=False):
 if not all(isinstance(v,int) for v in [count,block_size,active_blocks,list_capacity]) or count<1 or block_size<1 or active_blocks<0 or list_capacity<1 or active_blocks>list_capacity:raise ValueError('invalid explicit pool metadata')
 if count>65535:raise ValueError('native ushort append wraps at65536; unsupported')
 effects=[];b=active_blocks;c=list_capacity
 if count>=b*block_size:
  if b==c:
   effects.append({'op':'expandDescriptorList','oldBytes':c*16,'newBytes':c*32,'preserveBytes':c*16,'zeroTailBytes':c*16,'freeOld':True});c*=2
  b+=1
  effects.append({'op':'clearExistingBlock' if existing_block else 'allocAndClearBlock','bytes':block_size*16,'alignment':None if existing_block else 8,'blockIndex':b-1})
 slot=count;block,offset=divmod(slot,block_size)
 if block>=b:raise ValueError('single UseNextBlock leaves append block unavailable; includes fresh blockSize1')
 effects.extend([{'op':'writeEntityRef','blockIndex':block,'offsetBytes':offset*8},{'op':'writeSparse','slot':slot},{'op':'writeView','blockIndex':block,'offsetBytes':block_size*8+offset*8}])
 return {'count':count+1,'blockSize':block_size,'activeBlocks':b,'listCapacity':c,'versionDelta':0,'slot':slot,'effects':effects,'metadataOnly':True}
def allocator_plan(old,allocated,new,types):
 if not all(isinstance(v,int) for v in [old,allocated,new,types]) or old<1 or allocated<old or new<=old or types<2:raise ValueError('explicit positive growth metadata required')
 if new<=allocated:raise ValueError('retained backing regrowth requires exact packed sparse backing; not zero-extension')
 return {'capacity':new,'allocatedCapacity':new,'culledBytes':((new+63)//64)*8,'entries':{'oldBytes':old*16,'newBytes':new*16},'masks':{'oldBytes':old*64,'newBytes':new*64},'sparse':{'newBytes':types*new*2,'rows':list(range(1,types)),'copyEntriesPerRow':old,'zeroTailEntriesPerRow':new-old},'order':['allocClearCulling','copyOldCulling','expandClearEntriesCopyFree','expandClearMasksCopyFree','updateCapacityAndAllocated','allocClearSparse','copyAndRebindEachType','freeOldCulling','freeOldSparse'],'metadataOnly':True}
def audit():
 sys.path.insert(0,str(HERE/'tools'))
 from capstone import Cs,CS_ARCH_X86,CS_MODE_64
 cs=Cs(CS_ARCH_X86,CS_MODE_64)
 ranges=[(0x18193c537,268),(0x18193cb6f,207),(0x18193d07f,309),(0x18193c941,86),(0x1816469b7,128),(0x18197739a,72),(0x181977593,77),(0x1819776df,160),(0x1819777fb,161),(0x1819783bb,542),(0x1819785da,205),(0x181979096,90),(0x18197afed,145),(0x18197b080,15),(0x18197b090,107)]
 blocks=[]
 for a,n in ranges:
  raw=X['DLL'][X['off'](a):X['off'](a)+n];blocks.append({'va':hex(a),'bytes':raw.hex(),'instructions':[{'va':hex(i.address),'text':i.mnemonic+' '+i.op_str} for i in cs.disasm(raw,a)]})
 configs=[]
 for row in asset_configs():
  t=row.pop('tree');settings=t['Settings'];raw=(pathlib.Path(X['S']['file']).parent/'pico_park_2_Data'/row['file']).read_bytes()[row['byteStart']:row['byteStart']+row['byteSize']]
  configs.append({**row,'name':t['m_Name'],'path':settings['Identifier']['Path'],'guid':str(settings['Identifier']['Guid']['Value']),'entities':settings['Entities'],'tailOffset':len(raw)-56,'tailHex':raw[-56:].hex(),'strictTreeConsumedWholeObject':True,'typeTreeCorrection':'Generated Layers node incorrectly labelled string while child is Array<string>; relabel vector to consume real string[] and require strict fullobject byte count.'})
 registrations=[]
 for i in cs.disasm(X['DLL'][X['off'](0x18174cc60):X['off'](0x1817563d0)],0x18174cc60):
  if i.mnemonic=='mov' and 'qword ptr [rip' in i.op_str and len(i.bytes)==7:
   slot=i.address+7+struct.unpack_from('<i',i.bytes,3)[0];token=X['u64'](X['off'](slot))
   if token>>29==6:
    u=X['usage'](slot)
    if u.get('method')=='ComponentTypeId.Add':registrations.append(dict(instructionVA=hex(i.address),**u))
 builtins=json.loads((HERE/'native-materialization-report.json').read_text(encoding='utf8'))['followup']['builtinRegistrations']
 return {'registry':{'reservedTypes':1,'builtinRegistrations':builtins,'gameRegistrations':registrations,'conditionalStandardTypeCount':1+len(builtins)+len(registrations)},'schemaVersion':1,'status':'evidence generated; narrative pending','nativeCodeExecuted':False,'dllSha256':hashlib.sha256(X['DLL']).hexdigest(),'metadataSha256':hashlib.sha256(X['META']).hexdigest(),'configs':configs,'methodPointers':[m for ti in [8316,8736,12989] for m in X['methods'](ti) if m['method'] in ['Create','ChangeEntityCapacity','UseNextBlock','AllocateBlock','GetBufferEntry','Expand','GetComponentBlockCapacity','.ctor']],'fields':{'ComponentDataBuffer':X['fields'](8316),'EntitiesConfig':X['fields'](8736)},'nativeBlocks':blocks,'poolOracleCases':[{'input':a,'result':pool_plan(**a)} for a in [{'count':1,'block_size':128,'active_blocks':0,'list_capacity':4},{'count':127,'block_size':128,'active_blocks':1,'list_capacity':4},{'count':128,'block_size':128,'active_blocks':1,'list_capacity':4},{'count':512,'block_size':128,'active_blocks':4,'list_capacity':4},{'count':128,'block_size':128,'active_blocks':1,'list_capacity':4,'existing_block':True},{'count':65535,'block_size':128,'active_blocks':512,'list_capacity':512}]],'allocatorOracleCases':[{'input':a,'result':allocator_plan(**a)} for a in [{'old':32,'allocated':32,'new':64,'types':20},{'old':1024,'allocated':1024,'new':2048,'types':20},{'old':64,'allocated':128,'new':256,'types':3}]]}
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 if '--assets' in sys.argv:print(json.dumps(asset_configs(),ensure_ascii=False,indent=2))
 elif '--oracle' in sys.argv:
  q=json.loads(sys.argv[sys.argv.index('--oracle')+1]);f=pool_plan if q.pop('kind')=='pool' else allocator_plan;print(json.dumps(f(**q)))
 elif '--audit' in sys.argv:
  p=HERE/'native-pool-growth-report.json';r=audit()
  if p.exists():
   old=json.loads(p.read_text(encoding='utf8'))
   for k in ['conclusions','hostContract','unresolved','verification','corrections']: 
    if k in old:r[k]=old[k]
  p.write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8');print('native/config/oracle evidence regenerated')
