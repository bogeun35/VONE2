"""Read-only heap collection evidence and logical oracle; never loads game code."""
import runpy,pathlib,json,sys,struct,hashlib
HERE=pathlib.Path(__file__).resolve().parent
X=runpy.run_path(str(HERE/'native-materialization-audit.local.py'))
ROLES={'path':(10,16),'fakePath':(2,16),'holders':(4,8)}
def allocation(role):
 if role not in ROLES:raise ValueError('audited role required')
 cap,stride=ROLES[role]
 return {'kind':'QList','capacity':cap,'stride':stride,'count':0,'headerBytes':16,'dataBytes':cap*stride,'handlesBound':False,'effects':[{'op':'allocateHeaderAndClear','bytes':16},{'op':'allocateDataAndClearPtr','bytes':cap*stride},{'op':'writeDataHandle','offset':12,'binding':'host-required'},{'op':'writeStride','offset':8,'value':stride},{'op':'writeCapacity','offset':4,'value':cap},{'op':'writeCount','offset':0,'value':0},{'op':'constructTransientView','bytes':16},{'op':'pointerToHeaderRef32','binding':'host-required'}]}
def set_capacity(count,capacity,stride,new_capacity,data_hex):
 if not all(isinstance(x,int) for x in [count,capacity,stride,new_capacity]) or not 0<=count<=capacity or capacity<1 or stride not in [8,16] or len(data_hex)!=capacity*stride*2:raise ValueError('full valid collection prestate required')
 raw=bytes.fromhex(data_hex)
 if new_capacity==capacity:return {'count':count,'capacity':capacity,'stride':stride,'dataHex':data_hex,'effects':[]}
 if new_capacity<=0:return {'count':0,'capacity':0,'stride':0,'dataHex':'','effects':[{'op':'writeCount','value':0},{'op':'freeOldDataPtr'},{'op':'zeroQBuffer','bytes':12}],'headerRetained':True}
 size=new_capacity*stride
 if size>65536:raise ValueError('native request exceeds64KiB; actual page-size bound also host-required')
 n=min(count,new_capacity);buf=bytearray(size);buf[:n*stride]=raw[:n*stride]
 effects=[{'op':'allocateDataAndClearPtr','bytes':size}]
 if count>new_capacity:effects.append({'op':'truncateCount','value':n})
 if n:effects.append({'op':'copyActiveBytes','bytes':n*stride})
 effects.extend([{'op':'freeOldDataPtr'},{'op':'zeroOldQBuffer','bytes':12},{'op':'writeNewQBuffer','capacity':new_capacity,'stride':stride,'dataHandle':'host-required'}])
 return {'count':n,'capacity':new_capacity,'stride':stride,'dataHex':buf.hex(),'effects':effects,'headerRetained':True}
def append(count,capacity,stride,data_hex,value_hex):
 if stride not in [8,16] or len(value_hex)!=stride*2 or not 0<=count<=capacity:raise ValueError('exact supported element and valid list required')
 r=set_capacity(count,capacity,stride,max(2,capacity*2) if count>=capacity else capacity,data_hex)
 b=bytearray.fromhex(r['dataHex']);b[count*stride:(count+1)*stride]=bytes.fromhex(value_hex);r['dataHex']=b.hex();r['count']=count+1;r['effects'].extend([{'op':'writeElement','offset':count*stride,'bytes':stride},{'op':'writeCount','value':count+1}]);return r
def clear(count,capacity,stride,data_hex):
 if not 0<=count<=capacity or len(data_hex)!=capacity*stride*2:raise ValueError('full list prestate required')
 return {'count':0,'capacity':capacity,'stride':stride,'dataHex':data_hex,'effects':[{'op':'writeCount','value':0}]}
def pack_header(count,capacity,stride,data_handle):
 if not 0<=count<=capacity or stride not in [8,16] or not -2147483648<=data_handle<=2147483647:raise ValueError('explicit signed32 handle and valid header required')
 return {'hex':struct.pack('<4i',count,capacity,stride,data_handle).hex(),'binding':'caller-provided; no allocation performed'}
def handle_algebra(base,pointer=None,handle=None):
 b=int(base)
 if pointer is not None:
  raw=(int(pointer)-b)&0xffffffff;return {'handle':raw if raw<0x80000000 else raw-0x100000000,'validity':'arithmetic only; real heap topology required'}
 if not isinstance(handle,int) or not -2147483648<=handle<=2147483647:raise ValueError('signed32 handle required')
 return {'pointer':str(b+handle),'validity':'arithmetic only; not proof of allocated pointer'}
def free_plan(outer_handle_present,header_bound=True,data_bound=True):
 if not outer_handle_present:return {'freed':False,'effects':[]}
 if not header_bound or not data_bound:raise ValueError('full header/data lifetime binding required; zero Ptr Free is not assumed safe')
 return {'freed':True,'effects':[{'op':'freeDataPtr'},{'op':'zeroQBuffer','bytes':12},{'op':'freeHeaderPointer'},{'op':'clearTransientView','bytes':16},{'op':'zeroCallerHandle'}]}
def generic_closures():
 mi=X['TYPES'][8762][9];names={mi+j:m['method'] for j,m in enumerate(X['methods'](8762)) if m['method'] in ['Clear','Free','Add','SetCapacity','Allocate','op_Implicit','get_Item']};spec=X['u64'](X['off'](0x182ca8eb0+0x48));n=X['u64'](X['off'](0x182ca8eb0+0x40));inst=X['u64'](X['off'](0x182ca8eb0+0x18));rows={}
 for idx in range(n):
  m,c,g=struct.unpack_from('<iii',X['DLL'],X['off'](spec)+idx*12)
  if m not in names or c<0:continue
  p=X['u64'](X['off'](inst)+c*8)
  if struct.unpack_from('<I',X['DLL'],X['off'](p))[0]!=1:continue
  argv=X['u64'](X['off'](p+8));t=X['runtime_type_pointer'](X['u64'](X['off'](argv)))
  if t.get('typeIndex') in [12975,4437]:rows[idx]={'methodSpecIndex':idx,'method':names[m],'element':t,'specRowVA':hex(spec+idx*12),'specRow':list(struct.unpack_from('<iii',X['DLL'],X['off'](spec)+idx*12))}
 table=X['u64'](X['off'](0x182ca8eb0+0x28));count=X['u64'](X['off'](0x182ca8eb0+0x20));ptr=X['u64'](X['off'](0x18286d050+0x18))
 for j in range(count):
  row=struct.unpack_from('<4i',X['DLL'],X['off'](table)+j*16)
  if row[0] in rows:rows[row[0]].update(functionRowVA=hex(table+j*16),functionRow=list(row),pointerEntryVA=hex(ptr+row[1]*8),methodVA=hex(X['u64'](X['off'](ptr)+row[1]*8)))
 return list(rows.values())
def audit():
 sys.path.insert(0,str(HERE/'tools'));from capstone import Cs,CS_ARCH_X86,CS_MODE_64
 cs=Cs(CS_ARCH_X86,CS_MODE_64);blocks=[]
 ranges=[(0x181878461,320),(0x18169cd31,178),(0x18001cecc,25),(0x18001cfcc,25),(0x1807fda8b,190),(0x180005a77,128),(0x1819882a0,28),(0x180231fc2,31),(0x1807a5ef6,74),(0x1807a5c57,167),(0x18095ca7e,191),(0x18095cc32,108),(0x18095ccc8,231),(0x18095cdc6,93),(0x180953e06,30),(0x18001e263,193),(0x1801f7a5a,96),(0x181878c98,79),(0x181877e53,12),(0x18169c713,10),(0x18169dfdc,185),(0x181878892,188),(0x1817868e6,61),(0x180025385,19),(0x180025606,17),(0x1807a66e0,142)]
 for a,n in ranges:
  raw=X['DLL'][X['off'](a):X['off'](a)+n];blocks.append({'va':hex(a),'bytes':raw.hex(),'instructions':[{'va':hex(i.address),'text':i.mnemonic+' '+i.op_str} for i in cs.disasm(raw,a)]})
 usages=[]
 for a in [0x181878441,0x1818784fe,0x18169cd15,0x181878892,0x1818788f0,0x181878908,0x181878c39,0x180025344]:
  slot=a+7+struct.unpack_from('<i',X['DLL'],X['off'](a)+3)[0];usages.append(dict(instructionVA=hex(a),**X['usage'](slot)))
 return {'schemaVersion':1,'status':'evidence generated; narrative pending','nativeCodeExecuted':False,'dllSha256':hashlib.sha256(X['DLL']).hexdigest(),'metadataSha256':hashlib.sha256(X['META']).hexdigest(),'metadataUsages':usages,'genericClosures':generic_closures(),'fields':{X['ms'](X['TYPES'][ti][0]):X['fields'](ti) for ti in [4739,4490,4437,8484,8752,8763,8782,8788]},'nativeBlocks':blocks,'allocationOracles':{role:allocation(role) for role in ROLES}}
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 if '--oracle' in sys.argv:
  q=json.loads(sys.argv[sys.argv.index('--oracle')+1]);kind=q.pop('kind');print(json.dumps({'allocation':allocation,'capacity':set_capacity,'append':append,'clear':clear,'header':pack_header,'handle':handle_algebra,'free':free_plan}[kind](**q)))
 elif '--audit' in sys.argv:
  p=HERE/'native-heap-collections-report.json';r=audit()
  if p.exists():
   old=json.loads(p.read_text(encoding='utf8'))
   for k in ['conclusions','hostContract','unresolved','verification','corrections']:
    if k in old:r[k]=old[k]
  p.write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8');print('native collection evidence generated')
