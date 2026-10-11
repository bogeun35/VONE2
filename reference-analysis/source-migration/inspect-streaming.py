"""Read-only format inventory; never copies original payloads into the project."""
import collections, hashlib, json, math, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.tools' / 'unity-analysis'))
import UnityPy
SOURCE = pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/StreamingAssets')
rows=[]
for path in sorted(SOURCE.rglob('*')):
    if not path.is_file(): continue
    raw=path.read_bytes()
    counts=collections.Counter(raw)
    entropy=-sum((n/len(raw))*math.log2(n/len(raw)) for n in counts.values())
    row={'path':str(path.relative_to(SOURCE)).replace('\\','/'),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'header16':raw[:16].hex(),'multipleOf16':len(raw)%16==0,'entropyBitsPerByte':round(entropy,5)}
    try:
        env=UnityPy.load(str(path))
        row['unityObjectTypes']=dict(collections.Counter(o.type.name for o in env.objects))
        row['unityObjects']=sum(row['unityObjectTypes'].values())
    except Exception as e: row['parseError']=str(e)[:250]
    rows.append(row)
report={'source':str(SOURCE),'readOnly':True,'originalPayloadsCopied':False,'files':rows,'stageFiles':sum(r['path'].startswith('Stage/') for r in rows),'decodedStageLayouts':0,'verifiedWorldStageMappings':0,'conclusion':'Opaque high-entropy binary payloads; standard UnityPy load did not recover objects. Block alignment is consistent with block encryption but does not by itself identify the format or prove encryption. File count is not a verified playable-stage count.'}
out=pathlib.Path(__file__).with_name('streaming-inventory.json')
out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'files':len(rows),'stageFiles':report['stageFiles'],'blockAligned':sum(r['multipleOf16'] for r in rows),'minEntropy':min(r['entropyBitsPerByte'] for r in rows),'maxEntropy':max(r['entropyBitsPerByte'] for r in rows),'decodedObjects':sum(r.get('unityObjects',0) for r in rows),'errors':sum('parseError' in r for r in rows),'report':str(out)}))
