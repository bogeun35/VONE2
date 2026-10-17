/* ShootingEnemySpawner (113), ShootingEnemy (112), OptimizedBulletObserver (222) and its
 * OptimizedBullets, MapBlockReplacer (111), MapBreakBlockRect (114): 6-1 / 6-2, the
 * playable reconstruction from the saved Ghidra project; the full reading with every
 * address is notes/shooting-enemy-spec.md. No game executed. FP 16.16.
 *  Spawner ParseParameter 0x181706e00: slots 0..7 up to four path points relative to the
 *   spawner (ending at a (0, 0) pair, UnpackVector2ArrayParam 0x181786800), 8 count
 *   (1..16), 9 interval (>= 0.5), 10 stop offset px, 11 timing (0 always, 1 after the
 *   path), 12 direction (0/1 left, 2 random player, 3 nearest), 13 attack speed, 14 bullet
 *   speed, 15 active from the start, 16 range (<= 0 unlimited).
 *   OnStart -> createCache 0x181707410: every enemy at the spawner, hidden (event 49),
 *   enemy i stops (i * offset) px before the path's end. OnUpdate 0x181707190: timer
 *   from 0, below 1 -> the next enemy is switched on, timer = interval; all out -> gone.
 *  Enemy (.cctor 0x1817062f0): 48x48 at (-24, -24), layer 8, no push back; Initialize
 *   0x181703720: life 2, move speed 3, Random = Next(0, 100) (frame PCG, one draw);
 *   fire interval = (1.5 << 16) / clamp(attack speed, 0.1, 2), bullet speed = 3 *
 *   clamp(bullet speed, 0.1, 5). OnUpdate 0x181704570: waitDisappear, then (active)
 *   checkOffScreen (outside view x +- 500 -> gone without the blast), damageUpdate (life 0
 *   -> the 0.5 s blast), moveUpdate 0x181705080 (Timer += dt * 3; segment length = |the
 *   segment * (1365, -1365)| in world units, ViewMatrix 1/48; Pos = InitPos + prev + t * d,
 *   the next segment once t passes 1, the remainder dropped) and shootAttackUpdate
 *   0x181704970 (players in range, AttackTimer += dt, at the interval aim and fire, then
 *   0). Event 21 (active) -> life - 1 (AddDamage 0x181706210). Touching a layer-1 body
 *   -> event 21 to it and the blast (tryAddDamageToPlayer 0x181705cc0).
 *  OptimizedBullet (Observer slot 0 = pool size; Initialize 0x18188b750 draws one
 *   Frame.RandomFP; .cctor 0x18188cb30: valid 6 s, disappear 0.1 s, size 10):
 *   OnUpdate 0x18188b8a0: Pos + Velo per frame; outside view x +- 10 -> gone;
 *   checkContact 0x18188c230: the 10x10 box against the living players (event 21,
 *   tryAddDamageToPlayer 0x18188c950), then the map (any blocking chip, both ends of the
 *   chip range included) -> gone without moving.
 *  MapBlockReplacer.OnStart 0x18187c400: x outer, y inner over BreakColor chips; the k-th
 *   colour met becomes gun colours[k % n]. MapBreakBlockRect.OnStart 0x18187ce60: option 1
 *   / 2 picks from the (gun) colours (Next(0, n) when the slot is -1), then paints
 *   (X + i, Y - j) for i < W, j < H.
 * Named approximations:
 *  - one module PCG stream stands for the frame RNG; OnStart runs in actor order;
 *  - the map check of a bullet uses the runtime's merged terrain rectangles.
 */
(function(root,factory){const c=typeof module==='object'&&module.exports;const api=factory(c?require('./source-distanceconstraint-math.js'):root.SourceDistanceConstraintMath);if(c)module.exports=api;root.SourceShootingRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(N){
'use strict';
const F=65536,B=BigInt,i64=v=>BigInt.asIntN(64,v);
const num=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Shooting raw outside safe range');return n;};
const mul=(a,b)=>num(i64(B(a)*B(b))>>16n),div=(a,b)=>num(i64(B(a)<<16n)/B(b));
const clone=v=>JSON.parse(JSON.stringify(v));
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
const fp=v=>Math.trunc(Math.fround(Math.fround(v)*F));
const ENEMY={rect:{x:-24*F,y:-24*F,w:48*F,h:48*F},life:2,moveSpeedRaw:3*F,fireRateRaw:98304,bulletSpeedRaw:3*F,blastRaw:32768,marginRaw:500*F,view:1365};
const BULLET={sizeRaw:10*F,validRaw:6*F,fadeRaw:6553,marginRaw:10*F};
const CHIP_BASE=0x1e;
const PCG=6364136223846793005n,M64=(1n<<64n)-1n;
function pcg32(rng){const old=B(rng.state);rng.state=((old*PCG+(B(rng.inc)|1n))&M64).toString();const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number(old>>59n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function nextInt(rng,min,max){if(min===max)return min;let lo=max,hi=min;if(min<max){lo=min;hi=max;}const u=(hi-lo)>>>0,threshold=(2**32-u)%u;let x;do x=pcg32(rng);while(x<threshold);return lo+x%u;}
const randomFP=rng=>pcg32(rng)>>>16;// Frame.RandomFP 0x181747bc0: one PCG draw
function slot(a,i){const d=(a.datas||[])[i];return d&&d.t===1?fp(d.f):null;}
const slotInt=(a,i)=>{const v=slot(a,i);return v===null?null:v>>16;};
const len=(dx,dy)=>N.sqrtRaw(B(num(i64(B(dx)*B(dx))>>16n)+num(i64(B(dy)*B(dy))>>16n)));
function compile(actors,count,options={}){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Shooting count 2..8 required');
 const spawners=[],order=[];let pool=0,replacer=false;const breakRects=[];
 actors.forEach((raw,i)=>{const a=raw.properties||raw;if(!allowed(a.playerCount,count))return;const id=raw.id||'source:a'+i;
  if(a.typeName==='ShootingEnemySpawner'){const path=[];for(let k=0;k<4;k++){const x=slot(a,2*k)||0,y=slot(a,2*k+1)||0;if(x===0&&y===0)break;path.push({xRaw:x,yRaw:y});}
   let n=slotInt(a,8);if(n===null||n<1)n=1;if(n>16)n=16;let iv=slot(a,9);if(iv===null||iv<0x8000)iv=0x8000;
   spawners.push({id,name:a.name||'',xRaw:fp(a.posX),yRaw:fp(a.posY),path,count:n,intervalRaw:iv,stopOffset:slotInt(a,10)||0,timing:slotInt(a,11)||0,direction:slotInt(a,12)||0,
    attackSpeedRaw:slot(a,13)||0,bulletVelocityRaw:slot(a,14)||0,active:slotInt(a,15)===1,rangeRaw:slot(a,16)||0,timerRaw:0,spawned:0,gone:false,enemies:[]});order.push({kind:'spawner',id});return;}
  if(a.typeName==='OptimizedBulletObserver'){pool=slotInt(a,0)||0;order.push({kind:'observer'});return;}
  if(a.typeName==='MapBlockReplacer'){replacer=true;order.push({kind:'replacer'});return;}
  if(a.typeName==='MapBreakBlockRect'){let c=slotInt(a,4)||0;if(c<-1)c=-1;if(c>8)c=8;breakRects.push({id,x:slotInt(a,0)||0,y:slotInt(a,1)||0,w:slotInt(a,2)||0,h:slotInt(a,3)||0,colorIndex:c,option:slotInt(a,5)||0});order.push({kind:'breakRect',id});}
 });
 const chips={};for(const c of options.colorCells||[])chips[c.gridX+','+c.gridY]=c.tileId;
 return {schemaVersion:1,count,spawners,breakRects,pool,replacer,order,chips,width:options.widthInTiles||0,height:options.heightInTiles||0,enemies:[],bullets:[],started:false,completePhysicsFidelity:false};
}
const create=clone;
// ShootingEnemy.ParseParameter_181703a30: the path cut (i * offset) px before its end
function cutPath(path,stopRaw){let total=0,prev={xRaw:0,yRaw:0};for(const p of path){total+=len(p.xRaw-prev.xRaw,p.yRaw-prev.yRaw);prev=p;}
 const stop=total-stopRaw;if(stop<1)return [];const out=[];let acc=0;prev={xRaw:0,yRaw:0};
 for(const p of path){const seg=len(p.xRaw-prev.xRaw,p.yRaw-prev.yRaw);
  if(stop<=acc+seg){const u=N.normalizeRaw({xRaw:p.xRaw-prev.xRaw,yRaw:p.yRaw-prev.yRaw});out.push({xRaw:prev.xRaw+mul(u.xRaw,stop-acc),yRaw:prev.yRaw+mul(u.yRaw,stop-acc)});return out;}
  out.push(p);acc+=seg;prev=p;}
 return out;}
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
/* OnStart in actor order. host: {rng, colors (gun players' colours in player order),
 * validColors (every player's colour)}. */
function start(st,host){if(st.started)return;st.started=true;
 for(const o of st.order){
  if(o.kind==='replacer'){const arr=host.colors,n=arr.length;if(!n)throw Error('MapBlockReplacer: no player holds a gun');const seen=new Map();
   for(let x=0;x<st.width;x++)for(let y=0;y<st.height;y++){const k=x+','+y,v=st.chips[k];if(v===undefined)continue;const c=v-CHIP_BASE;if(!seen.has(c))seen.set(c,seen.size);st.chips[k]=arr[seen.get(c)%n]+CHIP_BASE;}}
  else if(o.kind==='spawner'){const sp=st.spawners.find(q=>q.id===o.id);
   for(let i=0;i<sp.count;i++){const r=nextInt(host.rng,0,100);
    st.enemies.push({id:sp.id+':e'+i,spawner:sp.id,initXRaw:sp.xRaw,initYRaw:sp.yRaw,xRaw:sp.xRaw,yRaw:sp.yRaw,path:cutPath(sp.path,i*sp.stopOffset*F),idx:0,timerRaw:0,
     life:ENEMY.life,active:false,shown:false,disappear:false,disappearRaw:0,gone:false,movingFinished:false,attackTimerRaw:0,randomRaw:div(r*F,100*F),
     intervalRaw:div(ENEMY.fireRateRaw,clamp(sp.attackSpeedRaw,0x1999,0x20000)),bulletSpeedRaw:mul(clamp(sp.bulletVelocityRaw,0x1999,0x50000),ENEMY.bulletSpeedRaw),
     timing:sp.timing,direction:sp.direction,rangeRaw:sp.rangeRaw,anim:1,blink:0});sp.enemies.push(sp.id+':e'+i);}}
  else if(o.kind==='breakRect'){const r=st.breakRects.find(q=>q.id===o.id);let c=r.colorIndex;
   if(r.option===1||r.option===2){const arr=r.option===2?host.colors:host.validColors;if(arr.length)c=c<0?arr[nextInt(host.rng,0,arr.length)]:arr[c%arr.length];}
   for(let i=0;i<r.w;i++)for(let j=0;j<r.h;j++){const x=r.x+i,y=r.y-j;if(x<0||y<0||x>=st.width||y>=st.height)continue;st.chips[x+','+y]=c+CHIP_BASE;}}}}
function enemyRect(e){return {x:e.xRaw+ENEMY.rect.x,y:e.yRaw+ENEMY.rect.y,w:ENEMY.rect.w,h:ENEMY.rect.h};}
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
function blast(e){if(e.disappear)return;e.collision=false;e.anim=2;e.disappear=true;e.disappearRaw=ENEMY.blastRaw;e.active=false;}
function vanish(e){e.collision=false;e.active=false;e.shown=false;e.gone=true;}
// ShootingEnemy.OnRecvEvent 21 -> AddDamage(1)
function enemyHit(st,id,out){const e=st.enemies.find(q=>q.id===id);if(!e||!e.active)return false;if(out)out.sounds.push({se:0xb});if(e.life>0)e.life--;e.blink=6553;return true;}
function enemyUpdate(st,e,dt,host,out){
 if(e.disappear){e.disappearRaw-=dt;if(e.disappearRaw<1){vanish(e);e.disappear=false;}return;}
 if(!e.active)return;
 const v=host.viewRaw;if(!(v.x-ENEMY.marginRaw<=e.xRaw&&e.xRaw<v.x+v.w+ENEMY.marginRaw)){vanish(e);return;}
 if(e.life<=0)blast(e);else if(e.blink>0)e.blink-=dt;
 if(!e.movingFinished&&!e.disappear){if(e.idx>=e.path.length)e.movingFinished=true;else{
  const prev=e.idx===0?{xRaw:0,yRaw:0}:e.path[e.idx-1],cur=e.path[e.idx],dx=cur.xRaw-prev.xRaw,dy=cur.yRaw-prev.yRaw;
  e.timerRaw+=mul(dt,ENEMY.moveSpeedRaw);const L=len(mul(dx,ENEMY.view),mul(dy,-ENEMY.view));const r=L<1?0:div(e.timerRaw,L),t=clamp(r,0,F);
  e.xRaw=e.initXRaw+prev.xRaw+mul(t,dx);e.yRaw=e.initYRaw+prev.yRaw+mul(dy,t);if(r>0xffff){e.idx++;e.timerRaw=0;}}}
 // shootAttackUpdate (does not look at Active again)
 if(e.timing===1&&!e.movingFinished)return;
 const inRange=host.players.filter(p=>e.rangeRaw<=0||num(i64(B(p.xRaw-e.xRaw)*B(p.xRaw-e.xRaw))>>16n)+num(i64(B(p.yRaw-e.yRaw)*B(p.yRaw-e.yRaw))>>16n)<=mul(e.rangeRaw,e.rangeRaw));
 e.attackTimerRaw+=dt;if(e.attackTimerRaw<e.intervalRaw)return;e.attackTimerRaw=0;
 let tx=0,ty=0;
 if(e.direction===0||e.direction===1){tx=e.xRaw-F;ty=e.yRaw;}
 else if(e.direction===2){if(inRange.length){const p=inRange[nextInt(host.rng,0,inRange.length)];tx=p.xRaw;ty=p.yRaw;}}
 else if(e.direction===3){let best=null,bd=null;for(const p of inRange){const d=num(i64(B(p.xRaw-e.xRaw)*B(p.xRaw-e.xRaw))>>16n)+num(i64(B(p.yRaw-e.yRaw)*B(p.yRaw-e.yRaw))>>16n);if(bd===null||d<bd){bd=d;best=p;}}if(best){tx=best.xRaw;ty=best.yRaw;}}
 if(tx===0&&ty===0)return;
 const u=N.normalizeRaw({xRaw:tx-e.xRaw,yRaw:ty-e.yRaw});createBullet(st,{xRaw:e.xRaw,yRaw:e.yRaw},{xRaw:mul(u.xRaw,e.bulletSpeedRaw),yRaw:mul(u.yRaw,e.bulletSpeedRaw)},host,out);}
// OptimizedBulletObserverComponent.CreateBullet 0x18188dc30
function createBullet(st,pos,velo,host,out){let b=st.bullets.find(q=>!q.active);
 if(!b){if(st.bullets.length>=st.pool)return false;b={};st.bullets.push(b);}
 Object.assign(b,{active:true,fading:false,seed:randomFP(host.rng),timerRaw:BULLET.validRaw,xRaw:pos.xRaw,yRaw:pos.yRaw,veloRaw:velo});out.sounds.push({se:0x14});return true;}
function bulletUpdate(st,b,dt,host,out){
 if(b.fading){b.timerRaw-=dt;if(b.timerRaw<1)b.active=false;return;}
 b.timerRaw-=dt;if(b.timerRaw<=0){b.fading=true;b.timerRaw=BULLET.fadeRaw;return;}
 const nx=b.xRaw+b.veloRaw.xRaw,ny=b.yRaw+b.veloRaw.yRaw,v=host.viewRaw;
 if(!(v.x-BULLET.marginRaw<=nx&&nx<v.x+v.w+BULLET.marginRaw)){b.fading=true;b.timerRaw=BULLET.fadeRaw;return;}
 const half=BULLET.sizeRaw>>1,box={x:nx-half,y:ny-half,w:BULLET.sizeRaw,h:BULLET.sizeRaw};
 const hitP=host.players.find(p=>p.alive&&p.bodyRaw&&overlap(box,p.bodyRaw));
 if(hitP){out.damage.push({player:hitP.index});b.fading=true;b.timerRaw=BULLET.fadeRaw;return;}
 if(host.mapBlocked(box)){b.fading=true;b.timerRaw=BULLET.fadeRaw;return;}
 b.xRaw=nx;b.yRaw=ny;}
/* One frame. host: {dtRaw, viewRaw:{x,w}, rng, players:[{index, xRaw, yRaw, alive, bodyRaw}],
 * mapBlocked(boxRaw)}. Returns {damage:[{player}], sounds}. */
function step(st,host){const dt=host.dtRaw,out={damage:[],sounds:[]};
 for(const sp of st.spawners){if(sp.gone||!sp.active)continue;sp.timerRaw-=dt;
  if(sp.timerRaw<1){const e=st.enemies.find(q=>q.id===sp.enemies[sp.spawned]);if(e){e.active=true;e.shown=true;e.collision=true;}sp.spawned++;sp.timerRaw=sp.intervalRaw;}
  if(sp.spawned>=sp.count)sp.gone=true;}
 for(const e of st.enemies)if(!e.gone)enemyUpdate(st,e,dt,host,out);
 // ShootingEnemy.OnCollided: a layer-1 body takes event 21, the enemy blasts
 for(const e of st.enemies){if(!e.active||!e.collision)continue;const r=enemyRect(e);
  const p=host.players.find(q=>q.alive&&q.bodyRaw&&overlap(r,q.bodyRaw));if(p){out.damage.push({player:p.index});blast(e);}}
 for(const b of st.bullets)if(b.active)bulletUpdate(st,b,dt,host,out);
 return out;}
function signal(st,e){if(e.eventType!==61)return;for(const sp of st.spawners)if(!e.targetName||sp.name===e.targetName)sp.active=true;}
// OnContacted on the map: the shooter's colour clears a BreakColor chip
function breakChip(st,chip,colorIndex){const k=chip.gx+','+chip.gy,v=st.chips[k];if(v===undefined||v-CHIP_BASE!==colorIndex)return false;delete st.chips[k];return true;}
function chipSolids(st){return Object.entries(st.chips).map(([k,v])=>{const [gx,gy]=k.split(',').map(Number);return {id:'cchip:'+k,x:gx*48,y:gy*48,w:48,h:48,chip:{gx,gy},colorIndex:v-CHIP_BASE};});}
function targets(st){return st.enemies.filter(e=>e.active&&e.collision).map(e=>{const r=enemyRect(e);return {id:e.id,x:r.x/F,y:r.y/F,w:r.w/F,h:r.h/F};});}
function displays(st){return {
 enemies:st.enemies.filter(e=>e.shown&&!e.gone).map(e=>({id:e.id,x:e.xRaw/F,y:e.yRaw/F,blast:e.disappear,blink:e.blink>0,t:e.disappear?1-e.disappearRaw/ENEMY.blastRaw:0})),
 bullets:st.bullets.filter(b=>b.active).map(b=>({x:b.xRaw/F,y:b.yRaw/F,r:5,fading:b.fading})),
 chips:Object.entries(st.chips).map(([k,v])=>{const [gx,gy]=k.split(',').map(Number);return {gx,gy,colorIndex:v-CHIP_BASE};})};}
return {compile,create,start,step,signal,enemyHit,breakChip,chipSolids,targets,displays,cutPath,pcg32,nextInt,
 supportedTypes:['ShootingEnemySpawner','OptimizedBulletObserver','MapBlockReplacer','MapBreakBlockRect'],nativeConstants:{ENEMY,BULLET},completePhysicsFidelity:false};
});
