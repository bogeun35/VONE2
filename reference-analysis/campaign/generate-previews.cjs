'use strict';
// Actual input replay of rebuild/engine.test.cjs completeTwoPlayer(). No state/position injection.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,GlobalFonts}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const E=require('../rebuild/engine.js'),out=path.join(__dirname,'assets');fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath('C:/Windows/Fonts/malgun.ttf','Malgun');
const snapshots=[],s=E.create(['a','b']);
function capture(id,name){snapshots.push({id,name,state:JSON.parse(JSON.stringify(s))});}
const tick=(inputs={},frames=1)=>{for(let i=0;i<frames;i++)E.step(s,inputs,1/60);};
function walk(id,target,jumpAt=[],observe){let next=0,frames=0;while(s.players.find(p=>p.id===id).x<target-2&&s.status==='play'&&frames++<1800){const p=s.players.find(p=>p.id===id),jump=next<jumpAt.length&&p.grounded&&p.x>=jumpAt[next];if(jump)next++;tick({[id]:{right:true,jump}});if(observe)observe(p);}assert.equal(s.status,'play');assert(frames<1800);tick({},2);}
tick({},2);capture('start','함께 출발');
walk('b',1170,[350,750]);walk('a',1090,[350,750]);
tick({a:{right:true,jump:true}},20);tick({},30);assert.equal(s.players[0].supportId,'b');capture('boost','어깨를 빌려줘');
walk('a',1194);tick({a:{right:true,jump:true}},55);assert.equal(s.players[0].supportId,'button-bank');walk('a',1510);
assert(s.map.devices.find(d=>d.id==='gap-bridge').active);
let bridgeCaptured=false;walk('b',1460,[],p=>{if(!bridgeCaptured&&p.x>=1310){bridgeCaptured=true;capture('bridge','다리를 지켜줘');}});
walk('a',1860);assert(!s.map.devices.find(d=>d.id==='gap-bridge').active);walk('b',1820);
tick({},120);assert.equal(s.map.devices.find(d=>d.id==='team-lift').occupancy,2);capture('lift','같이 올라가자');
tick({},110);assert.equal(s.map.devices.find(d=>d.id==='team-lift').y,360);assert(s.keyTaken);
let jumped=false;for(let frame=0;frame<300&&s.status==='play';frame++){const a=s.players[0],b=s.players[1],jump=!jumped&&b.x>=1875&&b.grounded;if(jump)jumped=true;tick({a:{right:a.x<2266},b:{right:b.x<2234,jump}});}
assert.equal(s.status,'clear','the captured input route must actually finish');

function draw(snapshot){
 const state=snapshot.state,m=state.map,canvas=createCanvas(960,540),ctx=canvas.getContext('2d');ctx.scale(.8,.8);
 const gradient=ctx.createLinearGradient(0,0,0,675);gradient.addColorStop(0,'#091622');gradient.addColorStop(1,'#173f50');ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,675);
 const center=state.players.reduce((a,p)=>a+p.x+p.w/2,0)/state.players.length,camera=Math.max(0,Math.min(m.width-1200,center-480));
 const box=(x,y,w,h,fill,r=4)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 ctx.save();ctx.translate(-camera,0);ctx.strokeStyle='#193a49';ctx.lineWidth=1;for(let x=0;x<m.width;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,675);ctx.stroke();}
 for(const p of m.platforms){box(p.x,p.y,p.w,p.h,'#264e5e');box(p.x,p.y,p.w,5,'#6ba5a8',2);}
 for(const d of m.devices){
  if(d.kind==='bridge'){if(d.active){box(d.x,d.y,d.w,d.h,'#4dd5bd');ctx.strokeStyle='#c9fff0';ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x+d.w,d.y);ctx.stroke();}else{ctx.strokeStyle='#42786d';ctx.setLineDash([8,10]);ctx.strokeRect(d.x,d.y,d.w,d.h);ctx.setLineDash([]);}}
  else if(d.kind==='lift'){box(d.x,d.y,d.w,d.h,'#eeae64');box(d.x+d.w/2-31,d.y-48,62,30,'#152b38');ctx.fillStyle='#ffdc9b';ctx.textAlign='center';ctx.font='bold 20px Malgun';ctx.fillText((d.occupancy||0)+' / '+d.requiredPlayers,d.x+d.w/2,d.y-26);}
  else if(d.kind==='gate'&&!d.active)box(d.x,d.y,d.w,d.h,'#8ca5bd');
 }
 for(const b of m.switches){box(b.x,b.y,b.w,b.h||7,'#fb868e');ctx.strokeStyle='#fdc2c7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x+b.w/2,b.y-13,6,0,Math.PI*2);ctx.stroke();}
 const ex=m.exit;box(ex.x,ex.y,ex.w,ex.h,state.keyTaken?'#5bbfa4':'#355666',12);ctx.strokeStyle=state.keyTaken?'#baffdf':'#7da2b0';ctx.lineWidth=3;ctx.strokeRect(ex.x+10,ex.y+12,ex.w-20,ex.h-12);ctx.fillStyle='#d9fff2';ctx.fillRect(ex.x+ex.w-19,ex.y+ex.h/2,4,4);
 if(!state.keyTaken){const k=m.key;ctx.strokeStyle='#ffe294';ctx.lineWidth=5;ctx.beginPath();ctx.arc(k.x+k.w/2,k.y+7,7,0,Math.PI*2);ctx.moveTo(k.x+k.w/2,k.y+14);ctx.lineTo(k.x+k.w/2,k.y+k.h+7);ctx.lineTo(k.x+k.w/2+8,k.y+k.h+7);ctx.stroke();}
 const colors=['#50dfd0','#ffbd79'];state.players.forEach((p,i)=>{box(p.x,p.y,p.w,p.h,colors[i],9);ctx.fillStyle=colors[i];ctx.beginPath();ctx.moveTo(p.x+4,p.y+14);ctx.lineTo(p.x-8,p.y+7);ctx.lineTo(p.x-8,p.y+29);ctx.lineTo(p.x+4,p.y+24);ctx.fill();ctx.fillStyle='#132c36';ctx.fillRect(p.x+p.w-12,p.y+12,5,6);ctx.font='bold 12px Malgun';ctx.textAlign='center';ctx.fillStyle='#eaffff';ctx.fillText(String(i+1),p.x+p.w/2,p.y-9);});ctx.restore();
 ctx.fillStyle='#b4d1dd';ctx.textAlign='left';ctx.font='bold 15px Malgun';ctx.fillText('01  ─  함께 건너기',28,38);ctx.textAlign='right';ctx.fillStyle=state.keyTaken?'#ffde94':'#718e9c';ctx.fillText(state.keyTaken?'열쇠 ●':'열쇠 ○',1170,38);
 const filename=`stage-01-01-${snapshot.id}.png`;fs.writeFileSync(path.join(out,filename),canvas.toBuffer('image/png'));
 return {id:snapshot.id,name:snapshot.name,file:filename,width:960,height:540,stageId:m.id,ticks:state.ticks,elapsed:state.elapsed,camera,players:state.players.map(p=>({id:p.id,x:p.x,y:p.y,supportId:p.supportId})),devices:state.map.devices.map(d=>({id:d.id,active:d.active,x:d.x,y:d.y,occupancy:d.occupancy}))};
}
const manifest={source:'Actual ParkRebuild engine input replay; not original-game screenshots',scope:'Only the implemented 1-1 route. Geometry/physics remain reconstruction/calibration pending.',replay:'../generate-previews.cjs',routeCompleted:s.status==='clear',audio:'none',engineHashes:Object.fromEntries(['engine.js','stage1-1.js','devices.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../rebuild',f))).digest('hex')])),images:snapshots.map(draw)};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(out,'replay-states.json'),JSON.stringify(snapshots,null,2)+'\n');console.log(JSON.stringify(manifest.images.map(x=>({file:x.file,name:x.name,ticks:x.ticks})),null,2));
