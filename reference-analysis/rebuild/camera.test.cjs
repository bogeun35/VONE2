'use strict';
const assert=require('node:assert/strict'),C=require('./camera.js');
const viewport={width:1200,height:675},map={width:2440,height:720};
let checks=0;
function visible(camera,players){
 for(const p of players.filter(p=>!p.exit)){
  const a=C.point(camera,p.x-10,p.y-18),b=C.point(camera,p.x+p.w,p.y+p.h);
  assert(a.x>=53.99&&b.x<=1146.01,`horizontal clipping ${JSON.stringify({p,camera,a,b})}`);
  assert(a.y>=67.99&&b.y<=647.01,`vertical clipping ${JSON.stringify({p,camera,a,b})}`);
 }
}
for(let n=2;n<=8;n++){
 const players=Array.from({length:n},(_,i)=>({id:'p'+i,x:65+i*40,y:562,w:32,h:38,exit:false}));
 let camera=C.update(null,players,map,viewport);visible(camera,players);
 for(let frame=0;frame<500;frame++){
  players[n-1].x=Math.min(2300,players[n-1].x+5);
  players[n-1].y=360-38-80*Math.abs(Math.sin(frame/20));
  camera=C.update(camera,players,map,viewport);visible(camera,players);
 }
 for(let i=0;i<n-1;i++){players[i].x=1800;players[i].y=562-i*38;}
 players[n-1].exit=true;camera=C.update(camera,players,map,viewport);visible(camera,players);
 for(let frame=0;frame<240;frame++){camera=C.update(camera,players,map,viewport);visible(camera,players);}
 console.log(`PASS ${n} players: spread, moving lead, stacked group, early exit and zoom recovery`);checks++;
}
assert.deepEqual(C.update(null,[],map),{x:0,y:0,zoom:1});
console.log(`${checks} population camera scenarios passed; every frame keeps active players visible.`);

// The source window, not the whole map: world01-01 declares displayTileHeight 10
// on a 20 tile map, so the closest framing shows 480px, not 960px.
{
 const sourceMap={width:2976,height:960,view:{displayHeight:480}};
 const together=[{id:'a',x:100,y:864,w:32,h:46,exit:false},{id:'b',x:140,y:864,w:32,h:46,exit:false}];
 let camera=C.update(null,together,sourceMap,viewport);
 for(let i=0;i<120;i++)camera=C.update(camera,together,sourceMap,viewport);
 const shown=viewport.height/camera.zoom;
 assert(Math.abs(shown-480)<1,`grouped players must see the source window, saw ${shown}`);
 assert(camera.y>=-0.01,`the view must not pass the map top, y=${camera.y}`);
 assert(camera.y+shown<=sourceMap.height+0.01,`the view must not pass the map floor, bottom=${camera.y+shown}`);
 console.log('PASS source window framing stays inside the map');checks++;
}
// A map with no declared window keeps the previous 1:1 framing.
{
 const plain={width:2440,height:720};
 const together=[{id:'a',x:100,y:600,w:32,h:46,exit:false},{id:'b',x:140,y:600,w:32,h:46,exit:false}];
 let camera=C.update(null,together,plain,viewport);
 for(let i=0;i<120;i++)camera=C.update(camera,together,plain,viewport);
 assert(Math.abs(camera.zoom-1)<1e-6,`undeclared window must stay at 1:1, zoom=${camera.zoom}`);
 console.log('PASS undeclared window keeps 1:1 framing');checks++;
}
// A player who leaves the map still has to be visible: the map clamp must not win
// over the visibility guarantee, or a falling teammate would vanish.
{
 const sourceMap={width:2976,height:960,view:{displayHeight:480}};
 const falling=[{id:'a',x:880,y:1300,w:32,h:46,exit:false},{id:'b',x:880,y:864,w:32,h:46,exit:false}];
 let camera=C.update(null,falling,sourceMap,viewport);
 for(let i=0;i<120;i++)camera=C.update(camera,falling,sourceMap,viewport);
 visible(camera,falling);
 console.log('PASS a player past the map floor is still framed');checks++;
}

// A declared view without displayTileHeight shows the whole map height, so a
// 10 tile scroll stage gets the same 480px window world01-01 declares and the
// floor sits on the bottom edge with nothing under it.
{
 const short={width:2400,height:480,view:{displayHeight:0,scrollType:1}};
 const floor=[{id:'a',x:1194,y:384,w:32,h:46,exit:false},{id:'b',x:1244,y:384,w:32,h:46,exit:false}];
 for(const vp of [viewport,{width:1818,height:675},{width:311,height:675}]){
  let camera=C.update(null,floor,short,vp);
  for(let i=0;i<60;i++)camera=C.update(camera,floor,short,vp);
  const bottom=(short.height-camera.y)*camera.zoom;
  assert(Math.abs(bottom-vp.height)<0.5,`map floor must meet the screen bottom, gap=${vp.height-bottom} at ${vp.width}`);
  const feet=(430-camera.y)*camera.zoom/vp.height;
  assert(feet>2/3,`friends must stand in the lower third, at ${feet}`);
 }
 console.log('PASS undeclared window fits the map height and anchors the floor at the bottom');checks++;
}
// scrollType 0 stages are framed whole and centred across a wider screen.
{
 const fixed={width:960,height:528,view:{displayHeight:0,scrollType:0}};
 const two=[{id:'a',x:44,y:98,w:32,h:46,exit:false},{id:'b',x:44,y:242,w:32,h:46,exit:false}];
 const wide={width:1818,height:675};
 let camera=C.update(null,two,fixed,wide);
 assert(Math.abs(camera.zoom-675/528)<1e-9,'a fixed stage fits its height on a wide screen');
 assert(Math.abs(camera.x-(960-wide.width/camera.zoom)/2)<1e-6,'and sits in the middle');
 assert(Math.abs(camera.y)<1e-6,'with its whole height shown');
 camera=C.update(null,two,fixed,viewport);
 assert(Math.abs(camera.zoom-1200/960)<1e-9,'on 16:9 the width limits the zoom');
 assert(Math.abs((528-camera.y)*camera.zoom-675)<0.5,'and the spare height goes above the map');
 console.log('PASS scrollType 0 frames the whole stage');checks++;
}
// The first frame of a round does not animate the zoom in from 1:1.
{
 const sourceMap={width:2976,height:960,view:{displayHeight:480}};
 const camera=C.update(null,[{id:'a',x:100,y:864,w:32,h:46,exit:false}],sourceMap,viewport);
 assert(Math.abs(camera.zoom-675/480)<1e-9,'first frame snaps to the window');
 console.log('PASS first frame snaps');checks++;
}

console.log(`${checks} camera scenarios passed.`);
