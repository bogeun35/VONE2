import pathlib,sys,json,struct,hashlib,base64
sys.path.insert(0,str(pathlib.Path('../.tools/unity-analysis').resolve()))
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
from UnityPy.helpers.TypeTreeNode import TypeTreeNode
D=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data');env=UnityPy.load(str(D/'resources.assets'),str(D/'globalgamemanagers.assets'))
obs={o.path_id:o for o in env.objects if pathlib.Path(o.assets_file.name).name=='resources.assets'}
found=[]
for o in obs.values():
 if o.type.name=='GameObject':
  t=o.read_typetree()
  if t['m_Name']=='UpDownLift':found.append((o.path_id,t))
g=TypeTreeGenerator('2022.3.5f1');g.load_local_game(str(D.parent))
rows=[]
for pid,t in found:
 comps=[]
 for c in t['m_Component']:
  cid=c['component']['m_PathID'];obj=obs[cid]
  if obj.type.name=='MonoBehaviour':
   script=obj.read(check_read=False).m_Script.read();name=script.m_ClassName
   if name=='EntityPrototype':
    ns=g.get_nodes('PhotonQuantum','EntityPrototype')
    for n in ns:
     if n.m_Name=='m_Enabled':n.m_MetaFlag|=16384
    node=TypeTreeNode.from_list([TypeTreeNode(n.m_Level,n.m_Type,n.m_Name,0,0,m_MetaFlag=n.m_MetaFlag) for n in ns]);data=obj.read_typetree(nodes=node)
   else:data={'scriptClass':name}
  else:
   data=obj.read_typetree()
   if obj.type.name=='Transform':
    for child in data['m_Children']:
     cp=obs[child['m_PathID']].read_typetree()['m_GameObject']['m_PathID']
     if cp not in [p for p,t in found]:found.append((cp,obs[cp].read_typetree()))
  comps.append({'pathId':cid,'type':obj.type.name,'data':data})
 rows.append({'pathId':pid,'gameObject':t,'components':comps})
pathlib.Path('source-migration/updownlift-prototype-evidence.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
b=(D/'resources.assets').read_bytes();v=struct.unpack_from('<411775i',b,4908336)[::1] if False else [struct.unpack_from('<i',b,4908336+i*8)[0] for i in range(411775)]
diff=bytes((a-z)&255 for a,z in zip(v,[0]+v[:-1]));assert all(-128<=a-z<=127 for a,z in zip(v,[0]+v[:-1]))
sha=hashlib.sha256(struct.pack('<411775i',*v)).hexdigest();encoded=base64.b64encode(diff).decode()
js="""/* UpDownLift-owned exact FPSin LUT: resources.assets body4908336 stride8.
 * 411775 int32 sine values; stored signed byte deltas, SHA256 %s.
 * native Sin0x1816465d0: sign restoration + abs radians modulo0x6487e.
 * Static numeric extraction only; no original game execution/runtime file IO. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceUpDownLiftMath=api;})(globalThis,function(){'use strict';
const DATA='%s';let table;
function values(){if(!table){const b=typeof Buffer!=='undefined'?Buffer.from(DATA,'base64'):Uint8Array.from(atob(DATA),c=>c.charCodeAt(0));table=new Int32Array(b.length);let v=0;for(let i=0;i<b.length;i++){v+=b[i]<128?b[i]:b[i]-256;table[i]=v;}}return table;}
function sinRaw(r){if(!Number.isSafeInteger(r))throw Error('UpDownLift sine raw must be safe integer');const v=values()[Math.abs(r)%%0x6487e];return v===0?0:r<0?-v:v;}
return {sinRaw,count:411775,sha256:'%s'};});
"""%(sha,encoded,sha)
pathlib.Path('source-migration/source-updownlift-math.js').write_text(js,encoding='utf8')
print(json.dumps({'prefabs':[(r['pathId'],[(c['pathId'],c['data'].get('scriptClass',c['type'])) for c in r['components']]) for r in rows],'sinCount':len(v),'sineHash':sha}))
