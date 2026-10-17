import pathlib,sys,json
sys.path.insert(0,str(pathlib.Path('../.tools/unity-analysis').resolve()))
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
from UnityPy.helpers.TypeTreeNode import TypeTreeNode
D=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data')
e=UnityPy.load(str(D/'resources.assets'),str(D/'globalgamemanagers.assets'));obs={o.path_id:o for o in e.objects if pathlib.Path(o.assets_file.name).name=='resources.assets'}
g=TypeTreeGenerator('2022.3.5f1');g.load_local_game(str(D.parent));ns=g.get_nodes('PhotonQuantum','EntityPrototype')
for n in ns:
 if n.m_Name=='m_Enabled':n.m_MetaFlag|=16384
root=TypeTreeNode.from_list([TypeTreeNode(n.m_Level,n.m_Type,n.m_Name,0,0,m_MetaFlag=n.m_MetaFlag) for n in ns])
r={'prototype':obs[6678].read_typetree(nodes=root),'gameObject':obs[1385].read_typetree(),'transform':obs[3115].read_typetree()}
pathlib.Path('source-migration/lead-camera-prototype.local.json').write_text(json.dumps(r,indent=2),encoding='utf-8')
print(json.dumps(r['prototype']))
