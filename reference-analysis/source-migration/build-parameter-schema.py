"""Record verified parameter meanings separately from undecoded native access evidence."""
import pathlib,json,re,collections
H=pathlib.Path(__file__).parent
stages=json.loads((H/'installed-stage-decoded.local.json').read_text())['stages']
world=[s for s in stages if s['stageId'].startswith('st_w_')]
actors=collections.defaultdict(list)
for s in world:
 for v in s['json']['stageInitParamList']:
  for a in v['actorCreateParamList']:actors[a['typeName']].append(a)
text=(H/'quantum-parameter-disassembly.txt').read_text()
methods={k:(va,body) for k,va,body in re.findall(r'\n(\w+)\.ParseParameter (0x\w+)\n(.*?)(?=\n\n|\Z)',text,re.S)}
aliases={'Thorn':'ThornComponent','Switch':'NormalSwitchComponent','WeightedLift':'NormalWeightedLiftComponent','WeightedLiftEx':'ExtraWeightedLiftComponent','PlayerGun':'PlayerGunComponent','PlayerMagnet':'PlayerMagnetComponent','PlayerPunch':'PlayerPunchComponent','PlayerBlockGun':'PlayerBlockGunComponent','PlayerWarpGun':'PlayerWarpGunComponent','CannonPlayer':'PlayerCannonComponent','BasketPlayer':'PlayerBasketComponent','TargetPlayer':'PlayerTargetComponent'}
verified={
 'MapRect':{'parameters':{'0':'gridX','1':'gridY','2':'widthInTiles','3':'heightInTiles','4':'mode'},'geometry':'For0<=i<width and0<=j<height, modifiesgrid(x+i,y-j). Nativeworldtile48pixels. Datas coordinates ratherthanactorpos determine rectangle.','nativeEvidence':['ParseParameter0x18172e800','modifyMap0x18187f210']},
 'Rect':{'parameters':{'0':'widthPixels','1':'heightPixels','2':'widthIncrementPerPlayerAbove2','3':'heightIncrementPerPlayerAbove2','4':'posXIncrementPerPlayerAbove2','5':'posYIncrementPerPlayerAbove2','6':'playerCountPosXOffsets','7':'playerCountPosYOffsets'},'geometry':'Width=d0+d2*(n-2); Height=d1+d3*(n-2). Actorposition addsd4/d5*(n-2) and d6/d7 populationoffset selection. Native localRect=(0,-Height,Width,Height):actorpos upper-left,worldYup. NegativeWidth shiftsactorXbyWidth andusesabsWidth. Exactoffsetstring grammar pending.','nativeEvidence':['ParseParameter0x1816e69a0','RectFPfields Height/Width/X/Y','RectComponent.InitCollision0x1816e6d90']}
}
out={'source':'Installed PP2 static native method and metadata analysis','completeActorParameterSemantics':False,'verifiedMeaningsOnly':True,'geometryFile':'source-geometry.local.json','types':[]}
for name,instances in sorted(actors.items()):
 component=aliases.get(name,name+'Component');method=methods.get(component)
 used=sorted({i for a in instances for i,d in enumerate(a['datas']) if d['t']!=0})
 row={'actorType':name,'componentCandidate':component,'instanceCount':len(instances),'populatedDatasIndices':used,'verifiedSchema':verified.get(name),'nativeParseParameter':None,'status':'meaning-pending'}
 if method:
  va,body=method
  checks=[{'index':int(x,0),'address':addr} for addr,x in re.findall(r'(0x\w+) cmp dword ptr \[\w+ \+ 0x18\], (0x[0-9a-f]+|\d+)',body) if int(x,0)<32]
  row['nativeParseParameter']={'va':va,'boundCheckCandidates':checks,'caution':'Bounds checks may include other arrays. Parameter meaning needs register dataflow and componentfield matching.'}
 if row['verifiedSchema']:row['status']='geometry-verified'
 out['types'].append(row)
(H/'parameter-schema.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'actorTypes':len(out['types']),'verifiedGeometryTypes':sum(t['status']=='geometry-verified' for t in out['types']),'nativeParseMatched':sum(t['nativeParseParameter'] is not None for t in out['types'])}))
