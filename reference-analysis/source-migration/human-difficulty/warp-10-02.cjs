const {Game,Halt,walkTo,jump,holdKeys}=require('./hd-kit.cjs');
// get a player onto its upper platform via the pit warp
function* toUpper(g,i){
 const p=g.P(i);const left=p.x<1000;let warped=false,lastY=p.y;
 for(let k=0;k<900;k++){
  if(p.grounded&&p.y<400&&k>5)return;
  if(p.y<lastY-300)warped=true;lastY=p.y;
  if(warped){yield {};continue;}
  if(left)yield {right:true};
  else yield {left:p.y<620||p.x>1380};
 }
}
function setup(n){
 const g=new Game('st_w_10_02',n);g.idle(10);
 const tasks={};for(let i=0;i<n;i++)tasks[i]=toUpper(g,i);g.together(tasks,{max:1200});
 return g;
}
const g=setup(2);console.log(g.players.map(p=>[Math.round(p.x),Math.round(p.y),p.grounded].join(',')).join(' | '),'t',g.t);
module.exports={setup,toUpper};
