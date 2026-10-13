'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('./source-searchlight-devices.js'),Blackout=require('./source-blackout-devices.js'),pop=require('./population-rules.cjs');
const st=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json'),'utf8')).stages.find(s=>s.stageId==='st_w_03_01');
function variant(count){return pop.selectVariant(st.json.stageInitParamList,count,true);}
function actors(count){return pop.actorsForCount(variant(count),count);}
// Default component zero is established by prefab absence + native default allocation.
function compile(count=2){return D.compile(actors(count),count,{chipSize:variant(count).mapInitParam.chipSize});}
function light(name='SearchLight1',count=2){return D.create(compile(count)).lights.find(l=>l.name===name);}
const FP=65536;
function player(x,y,index=0,state=1){return {index,id:'p'+index,state,hasCollision:true,collisionDisabled:false,collisionRectRaw:{xRaw:x*FP,yRaw:y*FP,widthRaw:0,heightRaw:0}};}
for(let c=2;c<=8;c++)test(c+'p real stage all12 lights and independent per-count numeric slot selection',()=>{
 const a=D.create(compile(c));assert.equal(a.lights.length,12);
 assert.deepEqual(a.lights.map(l=>l.name),['SearchLight1','SearchLight2','SearchLight3','SearchLight6','SearchLight4','SearchLight5','SearchLight10','SearchLight7','SearchLight8','SearchLight9','SearchLight11','SearchLight12']);
 assert.deepEqual(a.lights.map(l=>[l.xRaw/FP,l.yRaw/FP]),[[594,1],[746,1],[898,1],[1050,1],[1202,1],[1354,1],[1848,2],[2018,2],[2188,2],[2358,2],[2748,141],[2748,141]]);
 assert.deepEqual(a.lights.map(l=>l.phase),[0,2,0,2,0,2,0,0,0,0,0,0]);
 assert.deepEqual(a.lights.map(l=>l.rangeRaw/FP),[800,[320,320,280,280,280,240,240][c-2],800,[320,320,280,280,280,240,240][c-2],800,[320,320,280,280,280,240,240][c-2],240,240,240,240,[330,330,306,306,282,272,272][c-2],[330,330,306,306,282,272,272][c-2]]);
 assert.deepEqual(a.lights.map(l=>l.brightRaw/FP),[3,2,3,2,3,2,2,2,2,2,2,2]);assert.deepEqual(a.lights.map(l=>l.darkRaw/FP),[2,3,2,3,2,3,6.5,6.5,6.5,6.5,6.5,6.5]);
 assert.equal(a.lights[10].rotationRaw,-45*FP);assert.equal(a.lights[10].angleRaw,45*FP);assert.equal(a.lights[0].angleRaw,30*FP);
});
test('shipped default compiles all populations; camera and override validity remain explicit',()=>{for(let c=2;c<=8;c++){assert.ok(compile(c).lights.every(l=>l.killPlayerOff===false));assert.throws(()=>D.compile(actors(c),c),/chipSize/);assert.throws(()=>D.compile(actors(c),c,{chipSize:48,prototypeKillPlayerOff:1.5}),/int32/);}});
test('installed sparse sine/cosine bytes and exact quaternion rotation',()=>{
 const bytes=fs.readFileSync('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data/resources.assets');
 for(const [i,v] of Object.entries(D.nativeConstants.sincos)){assert.equal(bytes.readInt32LE(4908336+Number(i)*8),v[0]);assert.equal(bytes.readInt32LE(4908336+Number(i)*8+4),v[1]);}
 assert.deepEqual(D.directionWorld(0),{xRaw:0,yRaw:-FP});assert.deepEqual(D.directionWorld(-45*FP),{xRaw:-46314,yRaw:-46368});
 assert.equal(D.coneThreshold(light()),63286);assert.equal(D.coneThreshold(light('SearchLight11')),60526);
});
test('point cone uses strict radius and native dot angle; origin itself is outside',()=>{
 const l=light();assert.equal(D.insidePoint(l,{xRaw:l.xRaw,yRaw:l.yRaw+799*FP}),true);assert.equal(D.insidePoint(l,{xRaw:l.xRaw,yRaw:l.yRaw+800*FP}),false);
 assert.equal(D.insidePoint(l,{xRaw:l.xRaw,yRaw:l.yRaw}),false);assert.equal(D.insidePoint(l,{xRaw:l.xRaw,yRaw:l.yRaw-100*FP}),false);
 assert.equal(D.insidePoint(l,{xRaw:l.xRaw+25*FP,yRaw:l.yRaw+100*FP}),true);assert.equal(D.insidePoint(l,{xRaw:l.xRaw+28*FP,yRaw:l.yRaw+100*FP}),false);
 const angled=light('SearchLight11');assert.equal(D.insidePoint(angled,{xRaw:angled.xRaw-100*FP,yRaw:angled.yRaw+100*FP}),true);assert.equal(D.insidePoint(angled,{xRaw:angled.xRaw+100*FP,yRaw:angled.yRaw+100*FP}),false);
});
test('rect uses any corner, not center or cone polygon overlap',()=>{
 const l=light(),r={xRaw:l.xRaw+200*FP,yRaw:l.yRaw+100*FP,widthRaw:-200*FP,heightRaw:0};assert.equal(D.insideRect(l,r),true);
 const enclosing={xRaw:l.xRaw-1000*FP,yRaw:l.yRaw-1000*FP,widthRaw:2000*FP,heightRaw:2000*FP};assert.equal(D.insideRect(l,enclosing),false);
});
test('exposure sends targeted event26 on exact13th bright tick, repeats for unchanged state1',()=>{
 const l=light(),p=player(594,101);assert.deepEqual(D.updateLight(l,{players:[p]}),[]); // phase0->1 does not check.
 for(let i=1;i<=12;i++)assert.deepEqual(D.updateLight(l,{players:[p]}),[]);
 assert.equal(l.playerTimersRaw[0],13104);assert.deepEqual(D.updateLight(l,{players:[p]}),[{eventType:26,targetId:'p0',senderId:l.id}]);assert.equal(l.playerTimersRaw[0],14196);
 assert.equal(D.updateLight(l,{players:[p]}).length,1);p.state=2;assert.deepEqual(D.updateLight(l,{players:[p]}),[]);
});
test('outside/missing/disabled collider resets only that exposure timer',()=>{
 const l=light(),a=player(594,101),b=player(594,101,1);D.updateLight(l,{players:[a,b]});for(let i=0;i<5;i++)D.updateLight(l,{players:[a,b]});assert.deepEqual(l.playerTimersRaw.slice(0,2),[5460,5460]);
 a.collisionDisabled=true;D.updateLight(l,{players:[a,b]});assert.deepEqual(l.playerTimersRaw.slice(0,2),[0,6552]);
 b.hasCollision=false;D.updateLight(l,{players:[a,b]});assert.deepEqual(l.playerTimersRaw.slice(0,2),[0,0]);
 assert.throws(()=>D.insidePlayer(l,{hasCollision:true,collisionDisabled:false}),/rect missing/);
});
test('phase1-to-dark fade clears all8 timers and stops exposure during fade/dark',()=>{
 const l=light(),p=player(594,101);l.phase=1;l.timerRaw=1092;l.playerTimersRaw[7]=9000;
 D.updateLight(l,{players:[p]});assert.equal(l.phase,2);assert.deepEqual(l.playerTimersRaw,Array(8).fill(0));
 D.updateLight(l,{players:[p]});assert.equal(l.phase,3);assert.equal(l.timerRaw,2*FP);assert.equal(l.alphaRaw,FP);
 for(let i=0;i<4;i++)D.updateLight(l,{players:[p]});assert.equal(l.alphaRaw,16);assert.equal(l.timerRaw,2*FP);
 D.updateLight(l,{players:[p]});assert.equal(l.alphaRaw,0);assert.equal(l.timerRaw,2*FP-1092);assert.deepEqual(l.playerTimersRaw,Array(8).fill(0));
});
test('bright fade takes5 FP frames, checking exposure only on completion',()=>{
 const l=light();D.startFade(l,true);l.phase=0;D.updateLight(l,{players:[]});assert.equal(l.phase,1);const p=player(594,101);
 for(let i=0;i<4;i++)D.updateLight(l,{players:[p]});assert.equal(l.alphaRaw,65520);assert.equal(l.playerTimersRaw[0],0);assert.equal(l.timerRaw,3*FP);
 D.updateLight(l,{players:[p]});assert.equal(l.alphaRaw,FP);assert.equal(l.playerTimersRaw[0],1092);assert.equal(l.timerRaw,3*FP-1092);
});
test('brightness special cases and phase1 IsLightsOn bypass multiplier',()=>{
 const l=light();D.setMulBrightness(l,0);l.phase=1;assert.equal(D.brightnessRaw(l),0);assert.equal(D.isLightsOn(l),true);
 l.phase=3;assert.equal(D.isLightsOn(l),false);D.setMulBrightness(l,FP);D.setLightEnable(l,false);assert.equal(D.brightnessRaw(l),0);
 D.setLightEnable(l,true);assert.equal(D.brightnessRaw(l),FP);assert.equal(l.phase,3);
});
test('killPlayerOff fact disables timer check without stopping phases; zero timers inert',()=>{
 const l=light(),p=player(594,101);l.killPlayerOff=true;D.updateLight(l,{players:[p]});for(let i=0;i<20;i++)assert.deepEqual(D.updateLight(l,{players:[p]}),[]);assert.equal(l.playerTimersRaw[0],0);assert.equal(l.timerRaw,3*FP-20*1092);
 l.brightRaw=0;l.darkRaw=0;const before=structuredClone(l);D.updateLight(l,{players:[p]});assert.deepEqual(l,before);
});
test('Blackout registration relation is separate from timers; authored static blackout remains static',()=>{
 const b=Blackout.create(Blackout.compile(actors(2),2)),l=D.create(compile());assert.equal(b.blackouts[0].phase,4);
 for(let i=0;i<400;i++){Blackout.beforeStep(b,{players:[]});D.beforeStep(l,{searchLightPlayers:[]});}
 assert.equal(b.blackouts[0].phase,4);assert.equal(b.blackouts[0].alphaRaw,29491);assert.notEqual(l.lights[0].phase,0);
});
test('event53 refuses unresolved Actor pause; resolved paused lights freeze independently',()=>{
 const s=D.create(compile()),before=structuredClone(s);assert.throws(()=>D.beforeStep(s,{events:[{eventType:53}],searchLightPlayers:[]}),/Actor pause dispatch unresolved/);assert.deepEqual(s,before);
 const id=s.lights[0].id;D.beforeStep(s,{events:[{eventType:53,broadcast:true,pause:true}],pausedLightIds:[id],searchLightPlayers:[]});assert.deepEqual(s.lights[0],before.lights[0]);assert.equal(s.lights[2].phase,1);
 D.beforeStep(s,{pausedLightIds:[],searchLightPlayers:[]});assert.equal(s.lights[0].phase,1);
});
test('compile population, nonfloat slots, no fallback, unsafe inputs and unknown angle guard',()=>{
 const a=structuredClone(actors(2).find(a=>a.typeName==='SearchLight'));a.datas[2].f=0;assert.equal(D.decodeActor(a,3).darkRaw,0);a.datas[8].f=12;assert.throws(()=>D.decodeActor(a,2),/unverified FPSinCos/);
 a.datas[8].f=0;a.playerCount=5;assert.equal(D.compile([a],4).lights.length,0);a.playerCount=0;a.createThreshold=1;assert.throws(()=>D.compile([a],4,{chipSize:48,prototypeKillPlayerOff:0}),/delayed creation/);
 const l=light(),old=l.criteriaRaw;assert.throws(()=>D.setDecisionCriteria(l,1000),/unverified FPSinCos/);assert.equal(l.criteriaRaw,old);assert.throws(()=>D.beforeStep(D.create(compile())),/collision facts missing/);assert.throws(()=>D.fp(Infinity),/numeric/);
});
test('JSON replay preserves exact phase, fade and exposure; interface remains no solids',()=>{
 const s=D.create(compile()),p=player(594,101);for(let i=0;i<200;i++)D.beforeStep(s,{searchLightPlayers:[p]});const t=JSON.parse(JSON.stringify(s));
 for(let i=0;i<100;i++)assert.deepEqual(D.beforeStep(s,{searchLightPlayers:[p]}),D.beforeStep(t,{searchLightPlayers:[p]}));assert.deepEqual(s,t);assert.deepEqual(D.displays(s),D.displays(t));assert.deepEqual(D.solids(s),[]);assert.deepEqual(D.afterStep(s),{events:[],actorEvents:[],deadPlayerIds:[]});
});
test('full real3s/2s cycle has separate starts and five-frame fade exact transition ticks',()=>{
 const l=light();for(let t=1;t<=181;t++)D.updateLight(l,{players:[]});assert.equal(l.phase,1);assert.equal(l.timerRaw,48);
 D.updateLight(l,{players:[]});assert.equal(l.phase,2);assert.equal(l.fade.active,true);
 D.updateLight(l,{players:[]});assert.equal(l.phase,3);assert.equal(l.timerRaw,131072);
 for(let t=184;t<=307;t++)D.updateLight(l,{players:[]});assert.equal(l.phase,3);assert.equal(l.timerRaw,32);
 D.updateLight(l,{players:[]});assert.equal(l.phase,0);assert.equal(l.fade.endRaw,FP);
 D.updateLight(l,{players:[]});assert.equal(l.phase,1);assert.equal(l.timerRaw,196608);
});
test('state9 alternate-collider facts accumulate exposure but do not emit state1 event',()=>{
 const l=light(),p=player(594,101,0,9);D.updateLight(l,{players:[p]});for(let t=0;t<13;t++)assert.deepEqual(D.updateLight(l,{players:[p]}),[]);assert.equal(l.playerTimersRaw[0],14196);
 p.state=1;assert.equal(D.updateLight(l,{players:[p]}).length,1);
});

test('native sub-epsilon and negative period boundaries preserve shipped zero defaults',()=>{
 const a=structuredClone(actors(2).find(a=>a.typeName==='SearchLight'));
 for(const raw of [-5,-4,-3,-1,0,1,3,4,5]){a.datas[0].f=raw/FP;a.datas[1].f=raw/FP;const l=D.compile([a],2,{chipSize:48}).lights[0];const expected=raw<4?0:raw;assert.equal(l.brightRaw,expected);assert.equal(l.darkRaw,expected);if(expected===0){const before=structuredClone(l);for(let i=0;i<20;i++)assert.deepEqual(D.updateLight(l),[]);assert.deepEqual(l,before);}}
 a.datas[0].t=2;a.datas[1].t=2;const d=D.decodeActor(a,2);assert.equal(d.brightRaw,0);assert.equal(d.darkRaw,0);
});
test('static prefab and method fixtures prove default component path without instance constructor',()=>{
 const asset=JSON.parse(fs.readFileSync(path.join(__dirname,'searchlight-prototype-evidence.json'),'utf8').replace(/^\uFEFF/,''));
 assert.deepEqual(asset.searchLightTransform.m_Children,[]);assert.equal(asset.searchLightEntityPrototypeAsset.Parent.m_PathID,8037);assert.equal(asset.searchLightGameObject.m_Component.length,4);assert.equal(Object.hasOwn(asset.searchLightEntityPrototype,'m_KillPlayerOff'),false);
 const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'searchlight-default-native-evidence.json'),'utf8').replace(/^\uFEFF/,''));const component=rows.filter(r=>r.type==='Quantum.SearchLightComponent');assert.ok(component.length>30);assert.equal(component.some(r=>r.method==='.ctor'),false);assert.ok(rows.some(r=>r.method==='CreateInstanceDefaultCtor'&&r.va==='0x1814dc9b0'));
});
