const fs=require('fs'),R=require('../source-stage-runtime.js');
for(const n of [2,4,8]){
 // simulate with players parked off-map? Use ghost: remove players from hits by placing them... just record lastSet changes with idle players far away is impossible; record from the module with no players
 const c=JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','play','data','st_w_11_04',n+'.json')));
 const T=require('../source-thorn-ceiling-devices.js');const st=T.create(c.thornCeilings);
 let last=null;const rows=[];
 for(let t=0;t<60*45;t++){T.afterStep(st,{dt:1/60,players:[],platforms:c.map.platforms,width:c.map.width,height:c.map.height});const ce=st.ceilings[0];if(ce.lastSet!==last){last=ce.lastSet;rows.push({t:+(t/60).toFixed(2),safe:last.safeColumns.join(','),trap:last.trapColumns.join(','),n:last.safeZoneCount});}if(ce.phase>=5){rows.push({t:+(t/60).toFixed(2),done:true});break;}}
 console.log('n',n,'x0',c.thornCeilings.ceilings[0].x,'width',c.thornCeilings.ceilings[0].ceilingWidth);for(const r of rows)console.log(' ',JSON.stringify(r));
}
