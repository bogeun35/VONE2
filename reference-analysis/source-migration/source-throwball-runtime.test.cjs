'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('./source-throwball-runtime.js'),R=require('./source-stage-runtime.js'),L=require('./source-fplut-math.js');
const source=require('./installed-stage-decoded.local.json'),geometry=require('./source-geometry.local.json');
const F=65536;
const acts=id=>source.stages.find(s=>s.stageId===id).json.stageInitParamList[0].actorCreateParamList;
const mk=(n,id='st_w_08_02')=>R.create(R.compile({source,geometry,count:n,stageId:id}));
const mul=(a,b)=>Number((BigInt(a)*BigInt(b))>>16n);

test('8-2 / 8-4 data: targets per count, one cannon per player at 90 / 90, controller 1 / 2 / 0.5 and 0 / 25 %',()=>{
 const want=[[7],[8],[9],[6,5],[4,4,4],[5,4,4],[6,4,4]];
 for(let n=2;n<=8;n++){const c=T.compile(acts('st_w_08_02'),n);assert.deepEqual(c.baskets.map(b=>b.target),want[n-2],'count '+n);assert.equal(c.cannons.length,n);
  assert.ok(c.baskets.every(b=>b.heightRaw===10*F&&b.scaleRaw===98304));}
 const c=T.compile(acts('st_w_08_02'),2);assert.deepEqual([c.cannons[0].aimSpeedRaw,c.cannons[0].powerSpeedRaw],[90*F,90*F]);
 assert.deepEqual([c.controller.speedRaw,c.controller.accelRaw,c.controller.intervalRaw,c.controller.bomb],[F,2*F,32768,0]);
 assert.equal(T.compile(acts('st_w_08_04'),2).controller.bomb,25);
 // body 42x36 and mouth 20x8 times 1.5, 160 px up the pole
 const b=c.baskets[0],body=T.basketRect(b,0),mouth=T.basketRect(b,1);
 assert.deepEqual([body.w/F,body.h/F,body.x/F-b.xRaw/F,body.y/F-b.yRaw/F],[63,54,-31.5,-233.5]);
 assert.deepEqual([mouth.w/F,mouth.h/F,mouth.x/F-b.xRaw/F,mouth.y/F-b.yRaw/F],[30,12,-15,-235]);
});
test('createAreaInfo 0x181729b10: the view less 32 px, cut 32 px round each basket',()=>{
 const st=T.create(T.compile(acts('st_w_08_02'),6));T.createAreas(st,{x:0,y:0,w:960*F,h:528*F});// baskets at 204, 480, 756
 assert.deepEqual(st.controller.areas.map(a=>a.map(v=>v/F)),[[32,172],[236,448],[512,724],[788,928]]);
});
test('the cannon swings sin(90 deg/s) * 45 and sits 36 px above its player',()=>{
 const s=mk(2),c=s.throwState.cannons[0];R.step(s,{});const p=s.players[0];
 assert.ok(Math.abs(c.yRaw/F-(p.y+47-36))<1e-3);
 for(let i=0;i<60;i++)R.step(s,{});assert.ok(Math.abs(c.angleRaw/F-45)<0.3,'45 after 1 s: '+c.angleRaw/F);
});
test('no ball, no shot; with a ball: press -> power |sin|, press -> fire; 4 s of power without a press drops it',()=>{
 const s=mk(2),st=s.throwState,c=st.cannons[0],p=s.players[0];R.step(s,{});
 R.step(s,{[p.id]:{shot:true}});R.step(s,{});assert.equal(c.phase,0);
 c.balls=2;R.step(s,{[p.id]:{shot:true}});assert.equal(c.phase,1);
 let n=0;while(c.phase===1&&n<300){R.step(s,{});n++;}assert.ok(n>=239&&n<=241,'timeout '+n);assert.equal(c.balls,2);
 R.step(s,{[p.id]:{shot:true}});R.step(s,{});for(let i=0;i<20;i++)R.step(s,{});R.step(s,{[p.id]:{shot:true}});
 assert.equal(c.balls,1);assert.equal(st.shots.length,1);assert.equal(c.phase,2);
});
test('a falling ball on a cannon loads it; a bomb faints the player (dx * 8, -2) and blasts for 0.5 s',()=>{
 const s=mk(2,'st_w_08_04'),st=s.throwState,c=st.cannons[0];R.step(s,{});st.drops=[];st.controller.timerRaw=99*F;
 st.drops.push({id:'d1',bomb:false,xRaw:c.xRaw,yRaw:c.yRaw-40*F,veloRaw:{xRaw:0,yRaw:F},accelRaw:2*F,phase:0,collisionOn:true,visible:true,gone:false,disappearing:false,timerRaw:0});
 for(let i=0;i<30&&!c.balls;i++)R.step(s,{});assert.equal(c.balls,1);
 st.drops.push({id:'d2',bomb:true,xRaw:c.xRaw-10*F,yRaw:c.yRaw-40*F,veloRaw:{xRaw:0,yRaw:F},accelRaw:2*F,phase:0,collisionOn:true,visible:true,gone:false,disappearing:false,timerRaw:0});
 let d=st.drops[0];for(let i=0;i<30&&d.phase===0;i++)R.step(s,{});
 assert.equal(d.phase>=1,true);R.step(s,{});const p=s.players[0];assert.ok(p.faint,'fainted');assert.ok(p.faint.vxRaw>0);assert.equal(p.faint.vyRaw,-2*F);
 let n=0;while(st.drops.includes(d)&&n<60){R.step(s,{});n++;}assert.ok(n>=28&&n<=32,'blast '+n);
});
test('a shot in the mouth scores; on the body it is reflected (|v| * 0.5); on the floor it fades in 0.5 s',()=>{
 const st=T.create(T.compile(acts('st_w_08_02'),2)),b=st.baskets[0];const out={sounds:[]};
 const host=(o)=>({dtRaw:1092,gravityRaw:0xa666,viewRaw:{x:0,y:0,w:960*F,h:528*F},players:[],sweep:(bx,dx,dy)=>({dxRaw:dx,dyRaw:dy,blocked:false}),...o});
 st.controller.timerRaw=99*F;
 const mouth=T.basketRect(b,1);st.shots.push({id:'s1',colorIndex:0,xRaw:mouth.x+mouth.w/2,yRaw:mouth.y-8*F,jumpRaw:{xRaw:0,yRaw:0},veloRaw:{xRaw:0,yRaw:2*F},jumping:false,phase:0,timerRaw:0,collisionOn:true,gone:false});
 T.step(st,host());assert.equal(b.score,1);assert.equal(st.shots.length,0);
 const body=T.basketRect(b,0);st.shots.push({id:'s2',colorIndex:0,xRaw:body.x-9*F,yRaw:body.y+30*F,jumpRaw:{xRaw:0,yRaw:0},veloRaw:{xRaw:6*F,yRaw:0},jumping:false,phase:0,timerRaw:0,collisionOn:true,gone:false});
 T.step(st,host());assert.equal(st.shots[0].veloRaw.xRaw,-3*F);
 st.shots[0].veloRaw={xRaw:0,yRaw:3*F};T.step(st,host({sweep:(bx,dx,dy)=>({dxRaw:0,dyRaw:0,blocked:true})}));
 let n=0;while(st.shots.length&&n<60){T.step(st,host());n++;}assert.ok(n>=29&&n<=31,'fade '+n);
});
test('every basket at its target: event 1 lights the key and the controller stops',()=>{
 const s=mk(3),st=s.throwState;R.step(s,{});assert.equal(s.keyActive,false);
 for(const b of st.baskets)b.score=b.target;R.step(s,{});assert.equal(s.keyActive,true);assert.equal(st.controller.stopped,true);
});
// Bot: catch drops under the cannon; when loaded, charge and fire when the predicted arc
// drops into the mouth (same jump / gravity / speed formulas as the module).
function predictHits(st,c,power,b){const a=mul(-90*F-c.angleRaw,0x477),[si,co]=L.sincosRaw(a),speed=mul(16*F,power)+4*F;
 let x=c.xRaw+mul(40*F,co),y=c.yRaw+mul(40*F,si)-4*F,vx=mul(speed,co),vy=mul(speed,si);const m=T.basketRect(b,1),body=T.basketRect(b,0);
 for(let i=0;i<240;i++){vy+=0xa666;x+=vx;y+=vy;const box={x:x-8*F,y:y-8*F,w:16*F,h:16*F};
  const hit=r=>box.x<r.x+r.w&&r.x<box.x+box.w&&box.y<r.y+r.h&&r.y<box.y+box.h;
  if(hit(m))return vy>0;if(hit(body))return false;if(y>500*F)return false;}return false;}
test('8-2 with two players: catch, aim, fill the basket, take the key to the door',()=>{
 const s=mk(2),st=s.throwState,b=st.baskets[0];let i=0;
 for(;i<3600&&!s.keyActive&&s.status==='play';i++){const inp={};
  s.players.forEach((p,k)=>{const c=st.cannons[k];inp[p.id]={};const x=p.x+16;
   if(c.balls>0){if(c.phase===0&&i%2===0&&[...Array(21).keys()].some(k=>predictHits(st,c,Math.round(k/20*F),b)))inp[p.id]={shot:true};// charge only at an angle some power can use
    else if(c.phase===1&&predictHits(st,c,c.powerRaw,b)&&i%2===0)inp[p.id]={shot:true};
    if(Math.abs(x-(k?560:400))>4)inp[p.id][x<(k?560:400)?'right':'left']=true;return;}
   const mine=st.drops.filter(d=>!d.bomb&&d.phase===0&&!d.disappearing&&(k?d.xRaw/F>480:d.xRaw/F<480)).sort((a,b)=>b.yRaw-a.yRaw)[0];
   if(mine){const dx=mine.xRaw/F-x;if(dx>3)inp[p.id].right=true;else if(dx<-3)inp[p.id].left=true;}});
  R.step(s,inp);}
 assert.equal(s.status,'play',s.failure&&s.failure.reason);assert.equal(s.keyActive,true,'score '+b.score+'/'+b.target);
 const key=s.map.key,p=s.players[0];p.x=key.x;p.y=key.y;p.vy=0;R.step(s,{});R.step(s,{});
 p.x=s.map.exit.x;p.y=s.map.exit.y+s.map.exit.h-46;for(let j=0;j<120&&!s.goalOpen;j++)R.step(s,{});
 assert.equal(s.goalOpen,true);
});
