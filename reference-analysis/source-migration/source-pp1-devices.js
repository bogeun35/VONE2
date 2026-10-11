/* PP1 native-derived device state. No source asset or native executable is included. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourcePP1Devices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const f=Math.fround;
 const num=(a,i,fallback=0)=>Number.isFinite(a.parameters[i])?a.parameters[i]:fallback;
 const sourcePos=a=>a.sourcePosition||a.position||{x:a.x,y:a.y};
 const PLAYER=Object.freeze({localX:-16,localY:-47,width:32,height:46,walk:3,jump:-5.099999904632568,gravity:0.6499999761581421,terminal:19.5,holdModelVerified:false});
 function compilePlayer(a){const p=sourcePos(a);return {id:a.id,x:p.x+PLAYER.localX,y:p.y+PLAYER.localY,w:PLAYER.width,h:PLAYER.height,anchor:{...p}};}
 function compileKey(a){const p=sourcePos(a);return {id:a.id,type:'Key',x:p.x-16,y:p.y-28,w:32,h:56,initialVelocity:{x:Math.trunc(num(a,1)),y:Math.trunc(num(a,0))},contactGeometryVerified:true,attachmentBehaviorVerified:false};}
 function compileWarp(a){const p=sourcePos(a);return {id:a.id,type:'Warp',x:p.x,y:p.y,w:Math.trunc(num(a,0)),h:Math.trunc(num(a,1)),destination:{x:Math.trunc(num(a,2)),y:Math.trunc(num(a,3))},ordinalOffset:{x:Math.trunc(num(a,4)),y:Math.trunc(num(a,5))},contactGeometryVerified:true,warpStateResetVerified:false};}
 function tileFlags(code){
  if(!Number.isInteger(code)||code<0||code>34)throw Error('Unknown PP1 MC tile '+code);
  return code<2?0:code>=26&&code<=29?3:1;
 }
 function terrainRects(geometry){
  const {width,height,tileSize}=geometry;
  if(![width,height,tileSize].every(n=>Number.isInteger(n)&&n>0))throw Error('Invalid PP1 geometry');
  const cells=geometry.cells||geometry.tileVariants?.[0]?.cells;
  if(!cells)throw Error('Explicit PP1 tile variant required');
  const rects=[];
  for(let y=0;y<height;y++){
   let start=-1;
   for(let x=0;x<=width;x++){
    const cell=x<width?cells[x*height+y]:null;
    const solid=cell&&(tileFlags(cell.code)&1)!==0;
    if(solid&&start<0)start=x;
    if(!solid&&start>=0){rects.push({id:'pp1:tile:'+start+':'+y,x:start*tileSize,y:y*tileSize,w:(x-start)*tileSize,h:tileSize});start=-1;}
   }
  }return rects;
 }
 function countCheck(count){if(!Number.isInteger(count)||count<2||count>8)throw Error('PP1 needs 2 through 8 players');}
 function compileRect(a,count){
  countCheck(count);const p=sourcePos(a),extra=count-2;
  let width=f(num(a,0)+f(extra*num(a,2))),height=f(num(a,1)+f(extra*num(a,3)));
  let x=p.x+f(extra*num(a,4)),y=p.y+f(extra*num(a,5));
  if(width<0){x+=width;width=-width;}
  return {id:a.id,type:'Rect',x,y:y-height,w:width,h:height,sourceType:a.type,
   evidence:'PP1 factory 0x1400e6872..0x1400e6995',nativeGeometryVerified:true};
 }
 function compileLift(a,count){
  countCheck(count);const p=sourcePos(a);
  // Native setters accept p0 only when trunc(p0)!=0 and p1 only when trunc(p1)>0.
  const distance=Math.trunc(num(a,0))!==0?f(num(a,0)+(Math.trunc(num(a,2))!==0?f(count*num(a,2)):0)):-70;
  const percent=Math.trunc(num(a,1));
  const minimum=Math.trunc(num(a,3))||2;
  const required=percent>0?Math.max(minimum,Math.ceil(f(f(percent/100)*count))):Math.max(2,Math.ceil(f(count*0.5)));
  const returnSpeed=f(1+f(Math.max(0,count-2)*num(a,5)));
  return {id:a.id,type:'WeightedLift',x:p.x,y:p.y,origin:{x:p.x,y:p.y},distance,requiredPlayers:required,
   offset:0,raisePerTick:1,returnPerTick:returnSpeed,returnEnabled:Math.trunc(num(a,4))<=0,pauseSeconds:0,
   collision:{x:p.x-92,y:p.y+67,w:194,h:18},nativeParametersVerified:true,collisionGeometryVerified:true,
   evidence:'factory 0x1400e4108..0x1400e4223; setter 0x1400d4100; update 0x1400d4310'};
 }
 function stepLift(lift,{riderCount=0,blockedContact=false,dt=1/60,canMove=()=>true}={}){
  if(lift.pauseSeconds>0)lift.pauseSeconds=f(lift.pauseSeconds-dt);
  if(blockedContact)lift.pauseSeconds=f(0.06);
  if(lift.pauseSeconds>0)return {dy:0,moved:false};
  const old=lift.offset;let magnitude=Math.abs(old);
  if(riderCount>=lift.requiredPlayers)magnitude=Math.min(Math.abs(lift.distance),f(magnitude+lift.raisePerTick));
  else if(lift.returnEnabled)magnitude=Math.max(0,f(magnitude-lift.returnPerTick));
  const next=f(magnitude*(lift.distance<0?-1:1)),dy=f(next-old);
  if(!canMove(dy))return {dy:0,moved:false};
  lift.offset=next;lift.y=f(lift.origin.y+next);lift.collision.y=f(lift.y+67);return {dy,moved:dy!==0};
 }
 function compileBridge(a,count){
  countCheck(count);const p=sourcePos(a),n=Math.trunc(num(a,0)),size=Math.trunc(num(a,4))||32;
  if(n<1||n>32)throw Error('Unsupported PP1 Bridge segment count');
  const vx=Math.trunc(num(a,1)),vy=Math.trunc(num(a,2)),norm=Math.hypot(vx,vy);
  if(!norm)throw Error('Bridge requires a direction');
  const direction={x:vx/norm,y:vy/norm};
  const initialSegments=num(a,3)>0?Math.trunc(f(f((8-count)*Math.trunc(num(a,3)))*f(0.1))):0;
  const segments=Array.from({length:n},(_,i)=>({id:a.id+':'+i,index:i,x:p.x,y:p.y,
   target:{x:p.x+direction.x*size*(n-i-1),y:p.y+direction.y*size*(n-i-1)},
   // Native bridge initializes visual-only preextension; collider origin remains collapsed until movement.
   visualX:i<initialSegments?p.x+direction.x*size*(initialSegments-i):p.x,
   visualY:i<initialSegments?p.y+direction.y*size*(initialSegments-i):p.y,
   state:0,delayTicks:0,first:i===0,w:Math.abs(direction.y)>1.1920928955078125e-7?size+1:size,
   h:Math.abs(direction.y)>1.1920928955078125e-7?size:size+1}));
  return {id:a.id,type:'Bridge',origin:{...p},direction,size,initialSegments,segments,
   nativeParametersVerified:true,collisionCarryVerified:false,evidence:'factory 0x1400e6c59; segments 0x1400bf630; signal 0x1400bfea0; tick 0x1400bf230'};
 }
 function signalBridge(bridge,event){
  if(event!==9&&event!==10)return false;
  const firstState=bridge.segments[0].state;
  for(const segment of bridge.segments){
   if(event===9&&(segment.state===0||segment.state===2)){
    if(firstState===0)segment.delayTicks=0;segment.state=1;
    if(bridge.initialSegments>0)segment.delayTicks=-1;
   }else if(event===10&&(segment.state===1||segment.state===3)){
    if(firstState===3)segment.delayTicks=0;segment.state=2;
   }
  }return true;
 }
 function stepBridge(bridge){
  const movements=[];
  for(const segment of bridge.segments){
   if(segment.state!==1&&segment.state!==2)continue;
   // -1 is compared unsigned in native, skipping the four-tick start delay.
   if(!segment.first&&segment.delayTicks>=0&&segment.delayTicks<4){segment.delayTicks++;continue;}
   const target=segment.state===1?segment.target:bridge.origin;
   const dx=target.x-segment.x,dy=target.y-segment.y,distance=Math.hypot(dx,dy),speed=segment.state===1?2:1;
   const amount=Math.min(speed,distance),mx=distance?dx/distance*amount:0,my=distance?dy/distance*amount:0;
   segment.x+=mx;segment.y+=my;segment.visualX=segment.x;segment.visualY=segment.y;
   if(distance<=speed)segment.state=segment.state===1?3:0;
   movements.push({id:segment.id,dx:mx,dy:my});
  }return movements;
 }
 return {PLAYER,compilePlayer,compileKey,compileWarp,tileFlags,terrainRects,compileRect,compileLift,stepLift,compileBridge,signalBridge,stepBridge};
});
