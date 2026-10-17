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
  if t['m_Name'] in ['Ghost']:found.append((o.path_id,t))
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
pathlib.Path('source-migration/ghost-prototype-evidence.json').write_text(json.dumps(rows,indent=2),encoding='utf8')

print([(r['gameObject']['m_Name'],r['pathId'],len(r['components'])) for r in rows])
