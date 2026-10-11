const fs=require('fs'),R=require('../source-stage-runtime.js');
const stages=['st_w_01_01','st_w_01_02','st_w_01_03','st_w_01_04','st_w_04_01','st_w_04_03','st_w_04_04','st_w_05_02','st_w_10_02','st_w_11_04'];
for(const id of stages){const row=[];for(let n=2;n<=8;n++){const s=R.create(JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','play','data',id,n+'.json'))));let t=0;while(s.status==='play'&&s.ticks<60*300){R.step(s,{},1/60);}row.push(s.status==='play'?'-':`${(s.ticks/60).toFixed(2)}s(${s.failure.reason},${s.failure.playerId})`);}console.log(id,row.join(' | '));}
