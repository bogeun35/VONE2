const {Game,Halt,walkTo}=require('./hd-kit.cjs');
// one scout at the floor walks into the first CollisionSwitch strip, keeps pressing right for k ticks
// after first contact, then holds left. Does the thorn hit?
for(const n of [2,8]){const out=[];
 for(let k=-3;k<=6;k++){
  const g=new Game('st_w_01_02',n);
  const sw=g.s.deviceState.devices.find(d=>d.type==='CollisionSwitch');
  // place a scout on the corridor floor: route p(last) down? simpler: use the scout already on the floor (p1 starts at 104 on floor y 433)
  const idx=g.players.map((q,i)=>i).sort((a,b)=>g.P(b).x-g.P(a).x)[0];const p=g.P(idx);const pid=p.id;
  try{
   g.together({[idx]:walkTo(g,idx,560,{tol:1.5})});
   let contactAt=null,t0=g.t;
   for(let q=0;q<200;q++){
    const touching=p.x+p.w>sw.x&&p.x<sw.x+sw.w;
    if(touching&&contactAt===null)contactAt=g.t;
    const right=contactAt===null?(k>=0||p.x+p.w<sw.x+k*3):(g.t-contactAt<k);
    g.step({[pid]:right?{right:true}:{left:true}});
    if(contactAt!==null&&g.t-contactAt>40)break;
   }
   out.push(k+':'+g.s.status);
  }catch(e){if(!(e instanceof Halt))throw e;out.push(k+':'+g.s.status);}
 }
 console.log('n',n,out.join(' '));
}
