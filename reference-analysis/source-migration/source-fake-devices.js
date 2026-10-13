/* Source-derived PP2 FakePlayer / FakeTimer, PARTIAL, not a playable port.
 * Static reads only; no original code executed. Runtime compile refuses either
 * actor until FakeCage / FakeCursor and the remaining physics are supplied.
 *
 * Participant identities come from Frame.GetPlayerIndexList, not authored
 * Player spawn actors. FakeTimer.OnStart 0x181842458 calls assignPlayer.
 * assignPlayer 0x181842963..0x1818429ce draws an index from the remaining fake
 * list and removes it (stable removal, NOT Fisher-Yates). At 0x181842a8d it
 * stores the participant index, at 0x181842a97 their colour, and at
 * 0x181842aa3 sets mode=1 (manual). Additional fakes get input masks at
 * 0x181842b1f/0x181842ba6, colour=8, mode=1; they are NOT participant slots.
 * FakePlayer.Creator 0x18183e1b5 creates a FakeCage. Timer.showCursor
 * 0x181843741 creates one FakeCursor per participant. Neither helper has a
 * web module in the current tree. Ordinary Player spawn fallback is unsafe.
 *
 * A fake has actual collision (InitCollision 0x18183e30f), initially attribute
 * 6 (0x18183e319). It moves via aiProc/manualProc/actionProc, in that order
 * (OnUpdate 0x18183e50a/0x18183e51b/0x18183e53b). A correct cursor result
 * sends event 35 to its cage, event 1 with parameter +0x70=1 to its fake,
 * then clears the info's FakePlayer ref (ReceiveResult 0x181844fa3..fee).
 * Wrong result sets Stage flags bit10 (0x181844e9a). Event 1 with nonzero
 * param only reveals a manual fake: fadeState=1, collision attribute=1
 * (OnRecvEvent 0x181840b74..bbc). IsPlayer tests fadeState>0, NOT mode=1
 * (0x181840e00). IsClear tests flags bit3 (0x181840e10). A revealed body
 * consequently becomes a player for collision; no new Player actor is
 * created by ReceiveResult. The generic late-join Player path is separate
 * (ActorFactory.CreateJoinedPlayer 0x1816a4b50), not implemented here.
 *
 * Constants: FP scale=65536 and truncation: FP.FromFloat_UNSAFE 0x18163fc40.
 * FakeTimer.ParseParameter 0x181841e29 decodes datas[0] as seven signed
 * 64-bit FP raws. Count-2 downward nonzero fallback at 0x181841f0b..f87.
 * Default second=10 (Initialize 0x181841d27 QFP+0x170). datas[4] is seven
 * signed int32 values (0x181841ed1 -> helper 0x180970770, byte decoder
 * 0x180970857..868; Find 0x181786950). Its result is stored as signed byte
 * at 0x181841fe4. UI base raw=0xa0000 (10), x=0, y=0x1a00000 (416)
 * at .cctor 0x181845127/13d/153; abs(scale raw)>=4 at 0x18184203f.
 * FakePlayer defaults: participant=-1 at 0x18183e20a, fakeLevel=1 at
 * 0x18183e234 (QFP+0xf0). Fade default timer=1; fadeProc 0x181840a65
 * subtracts DeltaTime until <=0 then increments fadeState to 2 and sets
 * fakeLevel=0 at 0x181840ab0..ab6.
 * History has FOUR samples of EIGHT byte slots (0x181843c4a/c62/d22).
 * Bits 1/2/4 are left/right/jump (0x181843cdc..cff), not arbitrary actions.
 * Trends count each bit over all 4 samples then divide by count*4
 * (0x181843e14..edc); QFP.One raw=65536 read at 0x181843db3..dc1.
 * PCG multiplier=6364136223846793005 at RNGSession.Next 0x1816620bc;
 * rngRange copied verbatim from source-landmine-devices.js.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceFakeDevices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FP_ONE=65536,HISTORY_SAMPLES=4,PLAYER_SLOTS=8;
const UI_BASE_RAW=0xa0000,UI_X_RAW=0,UI_Y_RAW=0x1a00000,DEFAULT_SECOND_RAW=10*FP_ONE;
const MASK64=(1n<<64n)-1n,PCG_MULT=6364136223846793005n;
const supportedTypes=['FakePlayer','FakeTimer'];
const UNRESOLVED='Fake devices incomplete: missing FakeCage collision/opening and FakeCursor selection/result lifecycle; FakePlayer AI/action physics and FakeTimer notice/phase integration are not ported';
const allowed=(v,c)=>!v||v<0&&c<=-v||v>0&&v<10&&c>=v||v>=10&&c>=Math.trunc(v/10)&&c<=v%10;
function rawFP(n){if(!Number.isFinite(n))throw Error('Invalid FP value');const r=Math.trunc(n*FP_ONE);if(!Number.isSafeInteger(r))throw Error('FP raw exceeds safe integer');return r;}
function decodeTable(slot,width){
 if(!slot||slot.t!==2||typeof slot.s!=='string')throw Error('Missing player-count table');
 let s=slot.s;if(s.length===7*width+2&&s.startsWith('"')&&s.endsWith('"'))s=s.slice(1,-1);
 if(s.length!==7*width)throw Error('Player-count table length must be '+7*width);
 const out=[];
 for(let i=0;i<7;i++){
  let v=0n;for(let b=width-1;b>=0;b--)v=(v<<8n)|BigInt(((s.charCodeAt(i*width+b)&255)-33)&255);
  const bits=BigInt(width*8);if(v>=(1n<<(bits-1n)))v-=1n<<bits;
  const n=Number(v);if(!Number.isSafeInteger(n))throw Error('Table value exceeds safe integer');out.push(n);
 }
 return out;
}
function findByCount(table,count){for(let i=count-2;i>=0;i--)if(table[i])return table[i];return 0;}
function inspectActors(actors,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Fake devices require 2..8 players');
 const fakes=[],timers=[];
 actors.forEach((raw,i)=>{
  const a=raw.properties||raw;if(!supportedTypes.includes(a.typeName)||!allowed(a.playerCount,count))return;
  const pos=raw.position||{x:raw.x??raw.posX,y:raw.y??raw.posY},d=raw.datas||raw.parameters||[];
  const n=j=>d[j]&&d[j].t===1?d[j].f:0;
  const common={id:raw.id||'source:a'+i,name:a.name||'',type:a.typeName,x:pos.x,y:pos.y};
  if(a.typeName==='FakePlayer'){
   // ParseParameter aliases a generic no-op; reject authored fields we have not established.
   if(d.some(x=>x.t===1&&x.f!==0||x.t===2&&x.s))throw Error('Unverified FakePlayer parameters');
   fakes.push({...common,playerIndex:-1,colorIndex:0,mode:0,phase:0,aiPhase:0,flags:0,fadeState:0,fakeLevelRaw:FP_ONE});
  }else{
   const secondTable=decodeTable(d[0],8),allInputTable=decodeTable(d[4],4);
   const second=findByCount(secondTable,count),all=findByCount(allInputTable,count);
   const scale=rawFP(n(3));
   timers.push({...common,secondTable,allInputTable,secondRaw:second>0?second:DEFAULT_SECOND_RAW,
    allInputFakePlayerCount:((all&255)^128)-128,
    uiPosRaw:{x:UI_X_RAW+rawFP(n(1)),y:UI_Y_RAW+rawFP(n(2))},
    uiScaleRaw:Math.abs(scale)>=4?Math.floor(scale*UI_BASE_RAW/FP_ONE):UI_BASE_RAW});
  }
 });
 return {count,fakes,timers,complete:false,unresolved:[UNRESOLVED]};
}
function pcg32(rng){const old=rng.state;rng.state=(old*PCG_MULT+(rng.inc|1n))&MASK64;const x=Number(((old>>45n)^(old>>27n))&0xffffffffn),rot=Number((old>>59n)&31n);return ((x>>>rot)|(x<<((32-rot)&31)))>>>0;}
function rngRange(rng,min,max){if(min>max){const t=min;min=max;max=t;}const span=max-min;if(span<=0)return min;const threshold=(0x100000000%span)>>>0;let x;do{x=pcg32(rng);}while(x<threshold);return min+x%span;}
// Explicit helper only: input list must already be in native registration order.
function assignPlayers(fakes,playerIndexes,colorIndexes,allInputCount,options){
 if(!options||options.rngState===undefined||options.rngIncrement===undefined)throw Error('Assignment requires explicit session RNG state/increment');
 if(colorIndexes.length!==playerIndexes.length||new Set(playerIndexes).size!==playerIndexes.length)throw Error('Invalid participant list');
 if(fakes.length<playerIndexes.length)throw Error('Not enough FakePlayers');
 const out=JSON.parse(JSON.stringify(fakes)),remaining=out.slice(),rng={state:BigInt(options.rngState)&MASK64,inc:BigInt(options.rngIncrement)&MASK64};
 const ids=[];
 for(let i=0;i<playerIndexes.length;i++){
  const f=remaining.splice(rngRange(rng,0,remaining.length),1)[0];
  Object.assign(f,{playerIndex:playerIndexes[i],colorIndex:colorIndexes[i],mode:1,phase:0,aiPhase:0});ids.push(f.id);
 }
 for(let i=0;i<allInputCount&&remaining.length;i++){
  const f=remaining.splice(rngRange(rng,0,remaining.length),1)[0];
  Object.assign(f,{flags:f.flags|(1<<(i+5)),colorIndex:8,mode:1});
 }
 return {fakes:out,manualPlayerIds:ids,rng:{state:rng.state.toString(),inc:rng.inc.toString()}};
}
function newHistory(){return {historyIndex:0,history:Array.from({length:HISTORY_SAMPLES},()=>new Array(PLAYER_SLOTS).fill(0)),trendRaw:{left:0,right:0,jump:0}};}
function storeHistory(state,buttons){
 if(buttons.length<2||buttons.length>8||buttons.some(b=>!Number.isInteger(b)||b<0||b>7))throw Error('History requires 2..8 left/right/jump bit masks');
 for(let i=0;i<buttons.length;i++)state.history[state.historyIndex][i]=buttons[i];
 state.historyIndex=(state.historyIndex+1)%HISTORY_SAMPLES;
 const totals={left:0,right:0,jump:0};
 for(const row of state.history)for(let i=0;i<buttons.length;i++){if(row[i]&1)totals.left++;if(row[i]&2)totals.right++;if(row[i]&4)totals.jump++;}
 for(const k of Object.keys(totals))state.trendRaw[k]=Math.trunc(totals[k]*FP_ONE/(buttons.length*HISTORY_SAMPLES));
 return state.trendRaw;
}
function checkPlayer(infos,index,playerIndex){if(index<0||index>=infos.length||!infos[index].fakePlayerId)return 0;return infos[index].playerIndex===playerIndex?1:-1;}
function applyPlayerEvent(fake,eventType,param=0){
 if(eventType===35){fake.flags|=1;return true;}
 if(eventType!==1)return false;
 fake.flags&=~1;
 if(param!==0&&fake.mode===1){fake.fadeState=1;fake.collisionAttribute=1;}
 return true;
}
function advanceFade(fake,dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid fake delta');if(fake.fadeState!==1)return;fake.fakeLevelRaw-=rawFP(dt);if(fake.fakeLevelRaw<=0){fake.fakeLevelRaw=0;fake.fadeState=2;}}
function isPlayer(fake){return fake.fadeState>0;}
function isManual(fake){return fake.mode===1;}
function isClear(fake){return (fake.flags&8)!==0;}
// Empty stages can use the interface. Any active fake stage is fail-closed.
function compile(actors,count,options){const v=inspectActors(actors,count);if(v.fakes.length||v.timers.length)throw Error(UNRESOLVED);return {count,fakes:[],timers:[],complete:true};}
function emptyOnly(s){if(!s||!s.complete||s.fakes.length||s.timers.length)throw Error(UNRESOLVED);}
function create(c){emptyOnly(c);return JSON.parse(JSON.stringify(c));}
function solids(s){emptyOnly(s);return [];}
function beforeStep(s,ctx){emptyOnly(s);return {events:[],solids:[]};}
function afterStep(s,ctx){emptyOnly(s);return {events:[],solids:[]};}
function displays(s){emptyOnly(s);return [];}
return {compile,create,solids,beforeStep,afterStep,displays,supportedTypes,inspectActors,
 decodeTable,findByCount,assignPlayers,pcg32,rngRange,newHistory,storeHistory,checkPlayer,
 applyPlayerEvent,advanceFade,isPlayer,isManual,isClear,rawFP,completePhysicsFidelity:false};
});
