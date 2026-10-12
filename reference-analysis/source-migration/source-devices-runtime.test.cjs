'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('./source-devices-runtime.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'installed-stage-decoded.local.json')));
const actors=source.stages.find(s=>s.stageId==='st_w_01_02').json.stageInitParamList[0].actorCreateParamList;
const boxActor=actors.find(a=>a.typeName==='PushBox');
test('source 01-02 imports all 25 triggers and thorns plus box, preserving links',()=>{
 const c=D.compile(actors,8);assert.equal(c.devices.length,51);assert.deepEqual(c.warnings,[]);
 for(const trigger of c.devices.filter(d=>d.type==='CollisionSwitch')){assert.equal(trigger.w,12);assert.equal(trigger.h,480);assert.ok(c.devices.some(d=>d.type==='Thorn'&&d.name===trigger.targets[0]));}
 const b=c.devices.find(d=>d.type==='PushBox');assert.deepEqual([b.x,b.y,b.w,b.h],[424,102,48,40]);assert.equal(b.requiredPushers,7);
});
test('native push threshold scales from one of two to seven of eight players',()=>{
 for(let count=2;count<=8;count++)assert.equal(D.compile([boxActor],count).devices[0].requiredPushers,count-1);
 const s=D.create(D.compile([boxActor],4)),b=s.devices[0],inputs={a:{right:true},b:{right:true},c:{right:true}};
 const people=['a','b','c'].map((id,i)=>({id,x:b.x-32*(i+1),y:b.y,w:32,h:40}));
 D.step(s,{players:people.slice(0,2),inputs,gravity:0});assert.equal(b.x,424);
 D.step(s,{players:people,inputs,gravity:0});assert.equal(b.x,425);assert.equal(b.pushCount,3);
});
// st_w_01_02 mapInitParam is 56 x 11 chips of 48 px, and calcMoveDistance
// 0x1817219ce/0x1817219fc read exactly those chip counts (`n*3 << 20` = n*48).
const map01_02={width:56*48,height:11*48};
test('trigger queues event61 once then moves its named thorn at m_Speed squared, 36 px/tick',()=>{
 const selected=actors.filter(a=>a.name==='Thorn1'||a.name==='CollisionSwitch1');
 const s=D.create(D.compile(selected,2)),thorn=s.devices.find(d=>d.type==='Thorn');
 assert.equal(thorn.speed,6);assert.equal(thorn.direction,1);assert.equal(thorn.y,336);
 const p={id:'p',x:642,y:400,w:32,h:46};let events=[];
 for(let i=0;i<3;i++)events.push(...D.step(s,{players:[p],...map01_02}).events);
 assert.equal(events.length,1);assert.equal(events[0].target,'Thorn1');assert.equal(events[0].event,61);
 // phase 1 0x1817214c1 stores m_Velo = unit * m_Speed, phase 2 0x181721587 and
 // 0x18172159d multiply it by m_Speed again before 0x1817215b0/0x1817215b9 add it
 // to m_Pos, so one tick is 6*6 = 36 px. Do not "fix" this back to 6: the target
 // from calcMoveDistance is a lifetime (|edge - pos| + 200, no m_Speed division),
 // not a travelled length, so matching the two does not reproduce the binary.
 assert.equal(thorn.y,336+36);
 // 0x1817215cd/0x1817215d1 accumulate only m_Speed into m_Distance, and
 // calcMoveDistance 0x181721910 returns |mapHeight - y| + 0xc80000/65536 with no
 // m_Speed division anywhere in its body.
 assert.equal(thorn.distance,6);assert.equal(thorn.moveDistance,11*48-336+200);
 for(let i=0;i<10;i++)assert.equal(D.step(s,{players:[p],...map01_02}).events.length,0);
});
test('a flying thorn fades on the m_Distance target, long after it leaves the map',()=>{
 const s=D.create(D.compile(actors.filter(a=>a.name==='Thorn1'),2)),t=s.devices[0];
 D.signal(s,{event:61,target:'Thorn1'});
 // m_MoveDistance = 392 while m_Distance only grows by 6 per tick, so the stop
 // needs ceil(392/6) = 66 ticks even though the position already passed the
 // 528 px tall map after 6 ticks of 36 px. requestDisappear 0x1817221d0 and this
 // 0x1817215dd/0x1817215e3 target are the only despawn paths in the native
 // machine - there is no position based out-of-bounds rule.
 for(let i=0;i<65;i++)D.afterStep(s,{...map01_02});
 assert.equal(t.moveDistance,392);assert.equal(t.distance,390);
 assert.equal(t.phase,'move');assert.ok(t.y>map01_02.height);
 D.afterStep(s,{...map01_02});
 assert.equal(t.distance,396);assert.equal(t.phase,'fade');
});
test('thorn native cross section keeps outer sprite corners safe and tip lethal',()=>{
 const s=D.create(D.compile(actors.filter(a=>a.name==='Thorn1'),2));
 const corner={id:'corner',x:632,y:348,w:4,h:4},tip={id:'tip',x:645,y:348,w:2,h:2};
 assert.deepEqual(D.step(s,{players:[corner]}).deadPlayerIds,[]);
 assert.deepEqual(D.step(s,{players:[tip]}).deadPlayerIds,['tip']);
});
test('falling box lands on terrain and moving thorn disappears on terrain contact',()=>{
 const s=D.create(D.compile([boxActor],2)),b=s.devices[0],floor={x:0,y:200,w:1000,h:48};
 for(let i=0;i<40;i++)D.step(s,{platforms:[floor]});assert.equal(b.y+b.h,200);assert.equal(b.vy,0);
 const t=D.create(D.compile(actors.filter(a=>a.name==='Thorn1'),2));D.signal(t,{event:61,target:'Thorn1'});
 for(let i=0;i<30;i++)D.step(t,{platforms:[{x:600,y:380,w:100,h:48}]});assert.equal(t.devices[0].active,false);
});
test('a player on the opposite side blocks a pushed crate',()=>{
 const s=D.create(D.compile([boxActor],2)),b=s.devices[0],left={id:'left',x:b.x-32,y:b.y,w:32,h:40},right={id:'right',x:b.x+b.w,y:b.y,w:32,h:40};
 D.beforeStep(s,{players:[left,right],inputs:{left:{right:true}},gravity:0});assert.equal(b.x,424);assert.equal(b.x+b.w,right.x);
});
test('swept thorn hits player before terrain, and does not hit behind terrain',()=>{
 const s=D.create(D.compile(actors.filter(a=>a.name==='Thorn1'),2));D.signal(s,{event:61,target:'Thorn1'});
 const result=D.afterStep(s,{players:[{id:'near',x:646,y:354,w:2,h:2},{id:'shielded',x:646,y:360,w:2,h:2}],platforms:[{x:620,y:358,w:60,h:48}]});
 assert.deepEqual(result.deadPlayerIds,['near']);assert.equal(s.devices[0].phase,'fade');assert.equal(s.devices[0].y,340);
});

// B3 회귀: st_w_01_02 는 상자를 머리에 이고 가시를 막는 라운드다. 상자가 사람을
// 따라오지 않으면 방패가 성립하지 않아 라운드를 깰 수 없다. 가시가 상자에서
// 멈추는 처리는 이미 있었고(swept 충돌이 platforms 와 boxes 를 함께 본다),
// 빠진 것은 "사람 위에 얹힌 상자"를 옮기는 쪽이었다.
test('a box resting on a player records that player as its support',()=>{
 const selected=actors.filter(a=>a.typeName==='PushBox');
 const s=D.create(D.compile(selected,2)),box=s.devices[0];
 const carrier={id:'p1',x:box.x+8,y:box.y+box.h,w:32,h:46,supportId:null};
 const ground=[{id:'floor',x:0,y:carrier.y+carrier.h,w:4096,h:48}];
 for(let i=0;i<30;i++)D.beforeStep(s,{players:[carrier],platforms:ground});
 assert.equal(box.supportId,'p1','the box must know whose head it sits on');
 assert.equal(box.grounded,true);
 assert.ok(Math.abs((box.y+box.h)-carrier.y)<1.5,'the box must rest on the head, not inside it');
});
