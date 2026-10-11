"""Extract embedded PP1 Lua data statically; does not execute game or Lua code."""
import ast, collections, hashlib, json, pathlib, re
HERE = pathlib.Path(__file__).parent
SOURCE = pathlib.Path('D:/SteamLibrary/steamapps/common/PICO_PARK_ONLINE/pico_park.exe')
b = SOURCE.read_bytes()
definitions = list(re.finditer(rb'(stage_\w+)\s*=\s*Stage.New\(\)', b))
name_table_start=b.index(b'stage/stage_battle_stopwatch_m.lua\x00')
paths = [m.group()[:-1].decode() for m in re.finditer(rb'stage/[^\x00]{1,80}\.lua\x00', b[name_table_start:definitions[0].start()]) if b'stage_common' not in m.group()]
assert len(paths) == len(definitions) == 104
expected_legacy_names={'stage/candidate/stage_jump03.lua':'stage_jump01','stage/candidate/stage_multijump01.lua':'stage_jump00','stage/candidate/stage_constraint02.lua':'stage_constraint00'}
assert all(m.group(1).decode()==expected_legacy_names.get(p,pathlib.PurePosixPath(p).stem) for p,m in zip(paths,definitions))
common = next(m.group().decode('cp932', errors='replace') for m in re.finditer(rb'[^\x00]{20,}', b) if b'WINDOW_WIDTH = 1280' in m.group())
constants = {n: int(v) for n,v in re.findall(r'\b([A-Z][A-Z_0-9]*)\s*=\s*(\d+)\s*;', common)}
constants.update(TYPE_BEST_TIME=0, TYPE_BATTLE=1, TYPE_SCORE=2)

def clean(s):
    return re.sub(r'--[^\r\n]*', '', s)

def split_table(s):
    rows=[]; start=0; depth=0; quote=None
    for i,c in enumerate(s):
        if quote:
            if c==quote and (i==0 or s[i-1]!='\\'): quote=None
        elif c in '\"\'': quote=c
        elif c in '{(': depth+=1
        elif c in '})': depth-=1
        elif c in ',;' and depth==0:
            if s[start:i].strip(): rows.append(s[start:i].strip())
            start=i+1
    if s[start:].strip(): rows.append(s[start:].strip())
    return rows

def value(s, env):
    s=s.strip().rstrip(';').strip()
    if s.startswith('{') and s.endswith('}'): return [value(x,env) for x in split_table(s[1:-1])]
    if s in env: return env[s]
    if s in ('true','false','nil'): return {'true':True,'false':False,'nil':None}[s]
    try:
        node=ast.parse(s,mode='eval').body
        def calc(n):
            if isinstance(n,ast.Constant) and isinstance(n.value,(int,float,str)): return n.value
            if isinstance(n,ast.Name) and n.id in env: return env[n.id]
            if isinstance(n,ast.Attribute):
                key=ast.unparse(n)
                if key in env: return env[key]
            if isinstance(n,ast.UnaryOp) and isinstance(n.op,(ast.USub,ast.UAdd)):
                x=calc(n.operand); return -x if isinstance(n.op,ast.USub) else x
            if isinstance(n,ast.BinOp):
                x,y=calc(n.left),calc(n.right)
                if isinstance(n.op,ast.Add): return x+y
                if isinstance(n.op,ast.Sub): return x-y
                if isinstance(n.op,ast.Mult): return x*y
                if isinstance(n.op,ast.Div): return x/y
            raise ValueError()
        return calc(node)
    except (SyntaxError,ValueError,TypeError,ZeroDivisionError): return {'expression':s}

def assignments(text, env):
    text=clean(text); result={}
    for m in re.finditer(r'(?m)([\w.]+)\s*=\s*(?![=])', text):
        i=m.end(); start=i; depth=0; quote=None
        while i<len(text):
            c=text[i]
            if quote:
                if c==quote and (i==0 or text[i-1]!='\\'): quote=None
            elif c in '\"\'': quote=c
            elif c in '{(': depth+=1
            elif c in '})':
                depth-=1
                if depth<0: break
            elif c in ';\r\n' and depth==0:
                if not text[start:i].strip(): i+=1; continue
                break
            i+=1
        rhs=text[start:i].strip()
        if 'function' in rhs or not rhs: continue
        v=value(rhs,env); env[m.group(1)]=v; result[m.group(1)]=v
    return result

stages=[]
for i,(path,m) in enumerate(zip(paths,definitions)):
    end=definitions[i+1].start() if i+1<len(definitions) else b.find(b'\x00',m.end())
    # Adjacent embedded resources may include binary data; Lua stops at its first NUL.
    null=b.find(b'\x00',m.end()); end=min(end,null) if null>=0 else end
    raw=b[m.start():end]
    try: text=raw.decode('utf8')
    except UnicodeDecodeError: text=raw.decode('cp932',errors='replace')
    stage_id=m.group(1).decode(); env=dict(constants)
    props=assignments(text,env)
    stageprops={k[len(stage_id)+1:]:v for k,v in props.items() if k.startswith(stage_id+'.')}
    stages.append({'file':path,'stageId':stage_id,'sourceOffset':m.start(),'sourceSha256':hashlib.sha256(raw).hexdigest(),'json':stageprops,'lua':text})
list_source=next(m.group().decode('utf8',errors='replace') for m in re.finditer(rb'[^\x00]{20,}',b) if b'stageList = ' in m.group() and b'world = ' in m.group())
catalog=assignments(list_source,dict(constants))
assert len(catalog['stageList'])==57
assert len(catalog['world'])==12
assert sorted(n for w in catalog['world'] for n in w[4])==list(range(48))
lookup={pathlib.PurePosixPath(s['file']).stem:s for s in stages if s['file'].count('/')==1}
entries=[]
for i,row in enumerate(catalog['stageList']):
    assert row[0] in lookup, row[0]
    s=lookup[row[0]]
    entries.append({'index':i,'stageId':row[0],'mode':['world','battle','endless'][row[1]],'file':s['file'],'sourceOffset':s['sourceOffset'],'actorCount':len(s['json'].get('createTable',[])),'mapWidth':s['json'].get('map.width'),'mapHeight':s['json'].get('map.height'),'variantRules':row[2:]})
checks=[]
for e in entries:
    props=lookup[e['stageId']]['json']; table=props.get('map.table',[])
    expected=props['map.width']*props['map.height']
    variants=table if props.get('map.variable')==1 else [table]
    checks.append({'stageId':e['stageId'],'expectedCells':expected,'variantCellCounts':[len(v) if isinstance(v,list) else None for v in variants],'allMapsHaveExpectedCells':all(isinstance(v,list) and len(v)==expected for v in variants)})
decoded={'source':str(SOURCE),'readOnlySource':True,'nativeCodeExecuted':False,'luaExecuted':False,'bruteForceUsed':False,'constants':constants,'catalog':catalog,'stages':stages}
(HERE/'pp1-stage-decoded.local.json').write_text(json.dumps(decoded,ensure_ascii=False,indent=2),encoding='utf8')
report={'source':'Installed PICO PARK ONLINE embedded plaintext Lua resources','nativeCodeExecuted':False,'luaExecuted':False,'bruteForceUsed':False,'embeddedStageResources':len(stages),'menuCatalogCounts':dict(collections.Counter(e['mode'] for e in entries)),'visibleEndlessMenuCount':len(catalog['endlessStage']),'worlds':catalog['world'],'entries':entries,'mapChecks':checks,'remaining':'Actor runtime behavior and conditional Lua code are preserved as expressions, not executed or claimed ported.'}
(HERE/'pp1-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k not in ('entries','worlds','mapChecks')},ensure_ascii=False))
