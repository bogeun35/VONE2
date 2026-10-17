import pathlib,sys,json
sys.path.insert(0,str(pathlib.Path('../.tools/unity-analysis').resolve()))
import UnityPy
D=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data')
e=UnityPy.load(str(D/'resources.assets'),str(D/'globalgamemanagers.assets'))
o={x.path_id:x for x in e.objects if pathlib.Path(x.assets_file.name).name=='resources.assets'}
for x in o.values():
 if x.type.name!='GameObject':continue
 t=x.read_typetree()
 if 'camera' not in t['m_Name'].lower():continue
 comps=[]
 for c in t['m_Component']:
  a=o[c['component']['m_PathID']]
  comps.append([a.path_id,a.read(check_read=False).m_Script.read().m_ClassName if a.type.name=='MonoBehaviour' else a.type.name])
 print(json.dumps({'pathId':x.path_id,'name':t['m_Name'],'components':comps}))
