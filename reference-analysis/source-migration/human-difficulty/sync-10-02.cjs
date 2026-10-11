const {setup}=require('./warp-10-02.cjs');
const {Halt}=require('./hd-kit.cjs');
function attempt(n,delta,a=0,b=1){
 const g=setup(n);g.idle(30);
 const A=g.P(a),B=g.P(b);
 // A walks right onto its dash, B walks left; B starts delta ticks later (negative: earlier)
 const startA=Math.max(0,-delta),startB=Math.max(0,delta);let launchA=null,launchB=null;
 try{
 for(let k=0;k<400;k++){
  const inp={};
  if(k>=startA&&!A.exit)inp[A.id]={right:launchA===null,up:launchA!==null};
  if(k>=startB&&!B.exit)inp[B.id]={left:launchB===null,up:launchB!==null};
  g.step(inp);
  if(launchA===null&&Math.abs(A.forcedVx||0)>100)launchA=g.t;
  if(launchB===null&&Math.abs(B.forcedVx||0)>100)launchB=g.t;
  if(A.exit&&B.exit)break;
  if(launchA&&launchB&&A.grounded&&B.grounded&&k>startB+60)break;
 }}catch(e){if(!(e instanceof Halt))throw e;}
 return {delta,launchDiff:launchB-launchA,key:g.s.keyTaken,exitA:A.exit,exitB:B.exit,status:g.s.status,A:[Math.round(A.x),Math.round(A.y)],B:[Math.round(B.x),Math.round(B.y)]};
}
for(let d=-6;d<=6;d++)console.log(JSON.stringify(attempt(2,d)));
module.exports={attempt};
