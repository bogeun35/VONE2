'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const atlas=path.resolve(__dirname,'atlas');
function handler(req,res){
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);return res.end();}
 const source=pathname==='/source-data'||pathname==='/source-geometry',helper=pathname==='/population-rules.js',play=pathname.startsWith('/play/'),playRoot=path.join(__dirname,'play');
 let file=source?path.join(__dirname,pathname==='/source-data'?'installed-stage-decoded.local.json':'source-geometry.local.json'):helper?path.join(__dirname,'population-rules.cjs'):play?path.resolve(playRoot,'.'+(pathname==='/play/'?'/index.html':pathname.slice(5))):path.resolve(atlas,'.'+(pathname==='/'?'/index.html':pathname));
 if(!source&&!helper&&!file.startsWith((play?playRoot:atlas)+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end('Not ready');}res.setHeader('Content-Type',source?'application/json; charset=utf-8':helper?'text/javascript; charset=utf-8':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wav':'audio/wav'})[path.extname(file)]||'text/plain');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(data);});
}
if(require.main===module){const port=Number(process.argv[2]||8796);http.createServer(handler).listen(port,'127.0.0.1',()=>console.log(`Local source review http://127.0.0.1:${port}/ (muted, no original media)`));}
module.exports={handler};
