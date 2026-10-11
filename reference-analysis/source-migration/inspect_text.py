import sys,json,pathlib
sys.path.insert(0,str(pathlib.Path('.tools/unity-analysis').resolve()))
import UnityPy
p=pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets')
e=UnityPy.load(str(p));rows=[]
for o in e.objects:
 if o.type.name=='TextAsset':
  d=o.read();t=d.m_Script
  if isinstance(t,bytes): t=t.decode('utf8',errors='replace')
  rows.append({'id':o.path_id,'name':d.m_Name,'length':len(t),'preview':t[:1800]})
pathlib.Path('reference-analysis/source-migration/resource-text-index.json').write_text(json.dumps(rows,ensure_ascii=True,indent=2),encoding='utf8')
for r in rows: print(r['id'],r['name'],r['length'],repr(r['preview'][:120]))

