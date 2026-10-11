const {HUMAN}=require('./hd-kit.cjs');
const [file,stage,countsArg,trialsArg,modesArg,extra]=process.argv.slice(2);
const {run}=require('./'+file);
const counts=countsArg.split(',').map(Number),T=+trialsArg||30,modes=(modesArg||'online,local').split(',');
const opts=extra?JSON.parse(extra):{};
const out=[];
for(const n of counts)for(const mode of modes){
 const base=run(stage,n,{mode,...opts});
 let ok=0;const fails={};const secs=[];
 for(let seed=1;seed<=T;seed++){const r=run(stage,n,{mode,noise:HUMAN,seed,...opts});if(r.status==='clear'){ok++;secs.push(r.seconds);}else{const k=(r.failure?.reason||r.halt||r.status)+(r.deathAfterWrongPress?' (잘못 누름 직후)':'');fails[k]=(fails[k]||0)+1;}}
 secs.sort((a,b)=>a-b);
 const row={stage,count:n,mode,perfect:{status:base.status,seconds:base.seconds},trials:T,cleared:ok,rate:+(ok/T).toFixed(2),medianSeconds:secs.length?secs[Math.floor(secs.length/2)]:null,failures:fails};
 out.push(row);console.log(JSON.stringify(row));
}
require('fs').writeFileSync('trials-'+stage+'.json',JSON.stringify(out,null,1));
