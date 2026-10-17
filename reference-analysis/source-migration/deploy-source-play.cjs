'use strict';
// Publishes the local source-play build into the chamchicode deploy clone and
// bumps the cache version every entry point uses, so a live reload picks up the
// new runtime instead of a cached one.
const fs=require('node:fs'),path=require('node:path');
const base=__dirname,play=path.join(base,'play');
const deploy=path.resolve(base,'../../deploy-chamchicode');
const target=path.join(deploy,'park','source-play');
const version=process.argv[2]||new Date().toISOString().slice(0,10).replace(/-/g,'')+'-01';

const app=['index.html','catalogue.json','status.json','music-info.json','browser-check.json',
 'actor-runtime.js','spring-switch-runtime.js','source-bridge-devices.js','source-gate-devices.js',
 'source-motion-devices.js','source-devices-runtime.js','source-blink-devices.js',
 'source-blinkthunder-devices.js','source-warpinit-devices.js','source-switchtimer-devices.js','source-thorn-ceiling-devices.js','source-enemy-devices.js','source-countup-devices.js','source-lift-devices.js','source-landmine-devices.js','source-pole-devices.js','source-wind-devices.js','source-movewall-devices.js','source-linepath-devices.js','source-distanceconstraint-math.js','source-boundball.js','source-boundballpitcher-devices.js','source-ballkeybox-devices.js','source-blackout-devices.js','source-text-devices.js','source-coin-devices.js','source-checkpoint-devices.js','source-touchenergy-devices.js',
 'source-stage-runtime.js','camera.js','park-art.js',
 'network.js','online.js','play.js','review.html',
 'population-review-report.json','whole-route-completion-report.json','whole-route-input-replay.json',
 'whole-route-review-report.json'];
const optional=new Set(['source-death-restart-report.json','browser-check.json']);
for(const name of ['source-death-restart-report.json','whole-route-replay-report.json'])if(fs.existsSync(path.join(play,name)))app.push(name);

fs.mkdirSync(target,{recursive:true});
let copied=0;
for(const name of app){
 const from=path.join(play,name);
 if(!fs.existsSync(from)){if(optional.has(name))continue;throw new Error('missing build file: '+name);}
 let content=fs.readFileSync(from);
 if(name.endsWith('.html'))content=Buffer.from(content.toString('utf8')
  .replace(/(src|href)="([^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g,(_,attr,url)=>`${attr}="${url}?v=${version}"`),'utf8');
 fs.writeFileSync(path.join(target,name),content);copied++;
}

// Stage data and audio are directory trees.
function tree(from,to){
 fs.mkdirSync(to,{recursive:true});
 for(const entry of fs.readdirSync(from,{withFileTypes:true})){
  const a=path.join(from,entry.name),b=path.join(to,entry.name);
  if(entry.isDirectory())tree(a,b);else{fs.copyFileSync(a,b);copied++;}
 }
}
tree(path.join(play,'data'),path.join(target,'data'));
if(fs.existsSync(path.join(play,'audio')))tree(path.join(play,'audio'),path.join(target,'audio'));

// Entry points that must not serve a stale runtime.
const entry=`park/source-play/index.html?v=${version}`;
fs.writeFileSync(path.join(deploy,'coop.html'),
 `<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${entry}"><title>참치파크</title>`+
 `<script>location.replace('${entry}');</script><a href="${entry}">참치파크 열기</a></html>\n`);

const hub=path.join(deploy,'index.html');
let html=fs.readFileSync(hub,'utf8');
const before=html;
html=html.replace(/park\/source-play\/index\.html\?v=[0-9A-Za-z-]+/g,entry);
if(html!==before)fs.writeFileSync(hub,html);

// Never publish a page that references a file this script does not copy.
const published=fs.readFileSync(path.join(target,'index.html'),'utf8');
const missing=[...published.matchAll(/(?:src|href)="([^"?]+)(?:\?[^"]*)?"/g)]
 .map(m=>m[1]).filter(url=>!/^(?:https?:)?\/\//.test(url))
 .filter(url=>!fs.existsSync(path.join(target,url)));
if(missing.length)throw new Error('index.html references files that were not deployed: '+missing.join(', '));

const catalogue=JSON.parse(fs.readFileSync(path.join(play,'catalogue.json'),'utf8'));
console.log(JSON.stringify({version,files:copied,stages:catalogue.stages.length,hubUpdated:html!==before}));
