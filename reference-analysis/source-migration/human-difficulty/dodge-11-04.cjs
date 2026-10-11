const fs=require('fs'),T=require('../source-thorn-ceiling-devices.js');
function sim(c,rowIndex,stacked,startAbs){
 const st=T.create(c.thornCeilings);let rows=0,last=null,ref=null,hit=false,placed=false,x0,col;
 const ps=[{id:'b',x:-500,y:578,w:32,h:46},...(stacked?[{id:'t',x:-500,y:532,w:32,h:46}]:[])];
 for(let t=0;t<60*45;t++){
  const ce=st.ceilings[0];
  if(ce.lastSet!==last){if(placed)break;last=ce.lastSet;rows++;if(rows===rowIndex+1){col=last.trapColumns[0];x0=ce.x+48*col-16;placed=true;}}
  if(placed){if(ref===null&&ce.thorns.filter(q=>q.active&&!q.trap&&q.phase<4).length===0&&ce.thorns.some(q=>q.active&&q.trap))ref=t;
   const x=startAbs===null||t<startAbs?x0:Math.min(x0+36,x0+3*(t-startAbs+1));for(const p of ps)p.x=x;}
  const r=T.afterStep(st,{dt:1/60,players:placed?ps:[],platforms:c.map.platforms,width:c.map.width,height:c.map.height});
  if(placed&&r.events.some(e=>e.reason&&e.reason.startsWith('thornCeiling')))hit=true;
  if(placed&&ref!==null&&t>ref+60)break;
 }
 return {ref,hit};
}
for(const [n,row,stk] of [[2,6,true],[2,6,false],[4,6,true],[8,5,true]]){
 const c=JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','play','data','st_w_11_04',n+'.json')));
 const ref=sim(c,row,stk,null).ref;const ok=[];
 for(let d=-30;d<=30;d++){if(!sim(c,row,stk,ref+d).hit)ok.push(d);}
 console.log('n',n,'row',row,'stacked',stk,'ref tick',ref,'ok start offsets',ok[0],'..',ok.at(-1),'count',ok.length);
}
