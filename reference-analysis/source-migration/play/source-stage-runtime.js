/* Interpreted original world01-01. No native code, source assets or file IO. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./terrain-runtime.js'):root.SourceTerrainRuntime,
  common?require('./actor-runtime.js'):root.SourceActorRuntime,
  common?require('./spring-switch-runtime.js'):root.SourceSpringSwitch,
  common?require('./source-devices-runtime.js'):root.SourceDevicesRuntime,
  common?require('./source-motion-devices.js'):root.SourceMotionDevices,
  common?require('./source-gate-devices.js'):root.SourceGateDevices,
  common?require('./source-bridge-devices.js'):root.SourceBridgeDevices,
  common?require('./source-blink-devices.js'):root.SourceBlinkDevices,
  common?require('./source-blinkthunder-devices.js'):root.SourceBlinkThunderDevices,
  common?require('./source-warpinit-devices.js'):root.SourceWarpInitDevices,
  common?require('./source-switchtimer-devices.js'):root.SourceSwitchTimerDevices,
  common?require('./source-enemy-devices.js'):root.SourceEnemyDevices,
  common?require('./source-thorn-ceiling-devices.js'):root.SourceThornCeilingDevices,
  common?require('./source-countup-devices.js'):root.SourceCountUpDevices,
  common?require('./source-lift-devices.js'):root.SourceLiftDevices,
  common?require('./source-landmine-devices.js'):root.SourceLandmineDevices,
  common?require('./source-pole-devices.js'):root.SourcePoleDevices,
  common?require('./source-wind-devices.js'):root.SourceWindDevices,
  common?require('./source-movewall-devices.js'):root.SourceMoveWallDevices,
  common?require('./source-linepath-devices.js'):root.SourceLinepathDevices,
  common?require('./source-text-devices.js'):root.SourceTextDevices,
  common?require('./source-coin-devices.js'):root.SourceCoinDevices,
  common?require('./source-checkpoint-devices.js'):root.SourceCheckpointDevices,
  common?require('./source-touchenergy-devices.js'):root.SourceTouchEnergyDevices,
  common?require('./source-boundballpitcher-devices.js'):root.SourceBoundBallPitcherDevices,
  common?require('./source-boundball.js'):root.SourceBoundBall,
  common?require('./source-ballkeybox-devices.js'):root.SourceBallKeyBoxDevices,
  common?require('./source-blackout-devices.js'):root.SourceBlackoutDevices,
  common?require('./source-playerblock-devices.js'):root.SourcePlayerBlockDevices,
  common?require('./source-dossun-devices.js'):root.SourceDossunDevices,
  common?require('./source-searchlight-devices.js'):root.SourceSearchLightDevices,
  common?require('./source-linepathgear-devices.js'):root.SourceLinePathGearDevices,
  common?require('./source-updownlift-devices.js'):root.SourceUpDownLiftDevices,
  common?require('./source-playerwarpgun-devices.js'):root.SourcePlayerWarpGunDevices,
  common?require('./source-breakablerect-devices.js'):root.SourceBreakableRectDevices,
  common?require('./source-playermagnet-devices.js'):root.SourcePlayerMagnetDevices,
  common?require('./source-colorbox-devices.js'):root.SourceColorBoxDevices,
  common?require('./source-move-contact.js'):root.SourceMoveContact,
  common?require('./source-gear-devices.js'):root.SourceGearDevices,
  common?require('./source-switchtargetgroup-devices.js'):root.SourceSwitchTargetGroupDevices,
  common?require('./source-sinelift-devices.js'):root.SourceSineLiftDevices,
  common?require('./source-ghost-devices.js'):root.SourceGhostDevices);
 if(common)module.exports=api;root.SourceStageRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Terrain,Actor,Relay,Devices,Motion,Gates,Bridges,Blink,BlinkThunders,WarpInit,SwitchTimers,Enemies,ThornCeilings,CountUps,Lifts,Landmines,Poles,Winds,SpeedSwitches,LinePaths,Texts,Coins,Checkpoints,TouchEnergies,Pitchers,Balls,KeyBoxes,Blackouts,Players,Dossuns,SearchLights,LinePathGears,UpDownLifts,WarpGuns,BreakableRects,PlayerMagnets,ColorBoxes,MoveContact,Gears,TargetGroups,SineLifts,Ghosts){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const horizontal=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x;
 const box=r=>({x:r.x,y:r.y,w:r.width,h:r.height});
 const NATIVE=Object.freeze({walk:3,jump:-334234/65536,gravity:42598/65536,terminal:19.5,holdFactor:13107/65536,holdFrames:14});
 function compile({source,geometry,count,stageId='st_w_01_01',nativeTickRate=60}={}){
  if(!['st_w_01_01','st_w_01_02','st_w_01_03','st_w_01_04','st_w_04_01','st_w_04_03','st_w_04_04','st_w_05_02','st_w_10_02','st_w_11_04','st_w_07_02','st_w_10_01','st_w_10_04','st_w_13_01','st_w_11_02','st_w_12_03','st_w_03_02','st_w_10_03','st_w_05_01','st_w_02_02','st_w_07_03','st_w_14_03','st_w_03_01','st_w_15_01','st_w_05_04','st_w_14_01','st_w_03_03','st_w_12_02','st_w_15_02','st_w_12_04','st_w_02_04','st_w_04_02','st_w_07_04','st_w_05_03'].includes(stageId))throw new Error('Source stage runtime does not support this stage yet');
  if(!Number.isFinite(nativeTickRate)||nativeTickRate<1||nativeTickRate>240)throw new Error('Invalid calibration tick rate');
  const t=Terrain.createTerrain({source,geometry,count,stageId});
  // The original frames a fixed window, not the whole map: mapInitParam carries
  // displayTileHeight (10 tiles on world01-01, i.e. 480px of a 960px map) and the
  // stage carries its scroll mode. Record them so the camera can match the
  // source framing instead of inventing one.
  const sourceStage=(source&&source.stages||[]).find(entry=>entry.stageId===stageId);
  const sourceVariant=sourceStage&&sourceStage.json&&sourceStage.json.stageInitParamList[t.variant.index];
  const mapInit=sourceVariant&&sourceVariant.mapInitParam||{};
  const view={displayTileHeight:Number(mapInit.displayTileHeight)||0,
   displayHeight:(Number(mapInit.displayTileHeight)||0)*t.tileSize,
   startTileX:Number(mapInit.startTileX)||0,startTileY:Number(mapInit.startTileY)||0,
   scrollType:sourceVariant?Number(sourceVariant.scrollType)||0:0,
   zoomOut:sourceVariant?Number(sourceVariant.zoomOut)||0:0,
   scrollingPorted:false};
  const relays=Relay.create(t.actors,count);
  const devices=Devices.compile(t.actors,count);
  const motion=Motion.compile(t.actors,count);
  const gates=Gates.compile(t.actors,count);
  const bridges=Bridges.compile(t.actors,count);
  const blink=Blink.compile(t.actors,count);
  const blinkThunders=BlinkThunders.compile(t.actors,count);
  const warpInit=WarpInit.compile(t.actors,count);
  const switchTimers=SwitchTimers.compile(t.actors,count);
  const enemies=Enemies.compile(t.actors,count);
  const thornCeilings=ThornCeilings.compile(t.actors,count);
  const countUps=CountUps.compile(t.actors,count);
  const lifts=Lifts.compile(t.actors,count);
  const landmines=Landmines.compile(t.actors,count);
  const poles=Poles.compile(t.actors,count,{});
  const winds=Winds.compile(t.actors,count,{});
  const speedSwitches=SpeedSwitches.compile(t.actors,count,{nativeContactFacts:true});
  const linePaths=LinePaths.compile(t.actors,count,{});
  const texts=Texts.compile(t.actors,count,{});
  const coins=Coins.compile(t.actors,count,{});
  const checkpoints=Checkpoints.compile(t.actors,count,{});
  const touchEnergies=TouchEnergies.compile(t.actors,count,{});
  const pitchers=Pitchers.compile(t.actors,count);
  const keyBoxes=KeyBoxes.compile(t.actors,count);
  const blackouts=Blackouts.compile(t.actors,count,{});
  // StageComponent's actor scale (Actor.Initialize 0x18169cd02) is the selected
  // variant's stageInitParam.scale, a stage float, so it goes through convertFP
  // 0x180554310 like every other one. Only the Dossun family reads it so far.
  const stageScaleRaw=sourceVariant&&Number.isFinite(sourceVariant.scale)?Math.trunc(Math.fround(Math.fround(sourceVariant.scale)*65536)):null;
  const dossunActors=t.actors.filter(a=>['Dossun','PlayerBlockGun'].includes(a.typeName));
  if(dossunActors.length&&stageScaleRaw===null)throw new Error('Dossun stage without stageInitParam.scale: '+stageId);
  const searchLights=SearchLights.compile(t.actors,count,{chipSize:t.tileSize});
  const linePathGears=LinePathGears.compile(t.actors,count,{chipSize:t.tileSize});
  const upDownLifts=UpDownLifts.compile(t.actors,count);
  const warpGuns=WarpGuns.compile(t.actors,count);
  const breakableRects=BreakableRects.compile(t.actors,count);
  const playerMagnets=PlayerMagnets.compile(t.actors,count);
  const colorBoxes=ColorBoxes.compile(t.actors,count,{nativeActorBridge:true,framePlayerIndexList:Array.from({length:count},(_,i)=>i),gamePlayerInfo:Array.from({length:count},(_,i)=>({playerRef:i+1,colorIndex:i}))});
  const gears=Gears.compile(t.actors,count,{nativeActorBridge:true});
  const targetGroups=TargetGroups.compile(t.actors,count);
  const sineLifts=SineLifts.compile(t.actors,count);
  const ghosts=Ghosts.compile(t.actors,count,{checkpointInfo:{isActive:false}});
  const dossuns=Dossuns.compile(t.actors,count,stageScaleRaw===null?{}:{actorScaleRaw:stageScaleRaw});
  const springs=relays.relays.filter(r=>r.type==='JumpStand').map(r=>({...r,x:r.x-16,y:r.y-(r.parent?38:34),w:32,h:r.parent?38:34}));
  // The sensor rectangle is the one SwitchComponent.GetCollisionByDirection
  // 0x1817145a0 picks for this switch's direction byte; spring-switch-runtime
  // decodes the table out of SwitchComponent..cctor 0x181715330 and carries it on
  // the relay. Direction 0 keeps the previous 18x9 box above the anchor.
  const switches=relays.relays.filter(r=>r.type==='Switch'||r.type==='DelaySwitch'||r.type==='LandmineSwitch'||r.type==='DeadSwitch')
   .map(r=>({...r,x:r.x+r.rect.x,y:r.y+r.rect.y,w:r.rect.w,h:r.rect.h}));
  const goal=t.actors.find(a=>a.typeName==='Goal'),key=t.actors.find(a=>a.typeName==='Key');
  if(!goal)throw new Error('Original stage Goal is missing');
  // WarpComponent.ParseParameter 0x181734390 + OnCollided 0x181734a00:
  // slots width,height,destX,destY,ordinalOffsetX,ordinalOffsetY. Event63
  // ActorComponent handler/warpProc resets velocity and collision contacts.
  const warps=t.actors.filter(a=>a.typeName==='Warp').map((a,i)=>{
   const n=j=>a.datas[j]?.t===1?a.datas[j].f:0;
   if(n(0)<=0||n(1)<=0)throw new Error('Unsupported Warp dimensions');
   return {id:'warp:'+i,type:'Warp',x:a.x,y:a.y,w:n(0),h:n(1),
    destination:{x:n(2),y:n(3)},ordinalOffset:{x:n(4),y:n(5)},counter:0};
  });
  const supported=new Set(['Player','Key','Goal','Warp','MapRect','TopViewMapRect','JumpStand','JumpStandMediator','Switch','DelaySwitch','DeadSwitch','Rect','DashBoard','FallingWall',...Devices.supportedTypes,...Gates.supportedTypes,...Bridges.supportedTypes,...Blink.supportedTypes,...BlinkThunders.supportedTypes,...WarpInit.supportedTypes,...SwitchTimers.supportedTypes,...Enemies.supportedTypes,...ThornCeilings.supportedTypes,...CountUps.supportedTypes,...Lifts.supportedTypes,...Landmines.supportedTypes,...Poles.supportedTypes,...Winds.supportedTypes,'SpeedSwitch','MoveWall',...LinePaths.supportedTypes,...Texts.supportedTypes,...Coins.supportedTypes,...Checkpoints.supportedTypes,...TouchEnergies.supportedTypes,'BoundBallPitcher',...KeyBoxes.supportedTypes,...Blackouts.supportedTypes,...Dossuns.supportedTypes,...SearchLights.supportedTypes,...LinePathGears.supportedTypes,...UpDownLifts.supportedTypes,...WarpGuns.supportedTypes,...BreakableRects.supportedTypes,...PlayerMagnets.supportedTypes,...ColorBoxes.supportedTypes,...Gears.supportedTypes,...TargetGroups.supportedTypes,...SineLifts.supportedTypes,...Ghosts.supportedTypes]);
  const unsupported=[...new Set(t.actors.filter(a=>!supported.has(a.typeName)).map(a=>a.typeName))];
  const missingMechanics=['Native tick frequency (60 Hz explicit prototype calibration)',
   'Native collision pushback and update ordering equivalence',
   'Key attach, transfer and goal-opening state machine (overlap pickup used)'];
  for(const type of unsupported)missingMechanics.push(type+' handler ('+t.actors.filter(a=>a.typeName===type).length+' source actor)');
  missingMechanics.push(...devices.warnings,...(blink.warnings||[]),...(blinkThunders.warnings||[]),...(warpInit.warnings||[]),...(switchTimers.warnings||[]),...(enemies.warnings||[]),...(thornCeilings.warnings||[]),...(countUps.warnings||[]),...(lifts.warnings||[]),...(landmines.warnings||[]),...(poles.warnings||[]),...(winds.warnings||[]),...(speedSwitches.warnings||[]),...(linePaths.warnings||[]),...(texts.warnings||[]),...(coins.warnings||[]),...(checkpoints.warnings||[]),...(touchEnergies.warnings||[]),...(searchLights.warnings||[]),...(linePathGears.warnings||[]),...(upDownLifts.warnings||[]),...(warpGuns.warnings||[]),...(breakableRects.warnings||[]),...(playerMagnets.warnings||[]),...(colorBoxes.warnings||[]),...(gears.warnings||[]),...(targetGroups.warnings||[]),...(sineLifts.warnings||[]),...(ghosts.warnings||[]));
  if(texts.texts.some(t=>t.textId))missingMechanics.push('Text localization asset unresolved; authored textId retained without invented display string');
  if(unsupported.length||devices.warnings.length)throw Error('Unsupported source devices: '+[...unsupported,...devices.warnings].join(', '));
  if(t.cells.some(c=>(c.flags&~1)!==0))missingMechanics.push('Dynamic tile attributes');
  const map={id:stageId,count,width:t.width,height:t.height,tileSize:t.tileSize,variant:t.variant,
   platforms:t.platforms.map((p,i)=>({...p,id:'terrain:'+i})),springs,switches,warps,
   spawns:Actor.playerSpawns(t.actors,count).map(p=>({x:p.collision.x,y:p.collision.y-0.5})),
   // KeyComponent.ParseParameter 0x18186b780 moves the key off its authored
   // anchor before ActorFactoryComponent.CreateActor 0x1816a3658 reads the
   // position back for ActorSceneComponent.AddActor 0x1816a3687, so the key box
   // has to be built at the population-dependent spawn anchor, not at posX/posY.
   // Without this, st_w_04_03's key stayed at (240,480) - its 32x56 box
   // (224,452) sat inside the floor tiles at gridY 9 and half of it below the
   // map, so no player could overlap it. See actor-runtime.js keySpawnOffset
   // and key-reach-report.json.
   key:key?{...box(Actor.collisionRect(key,1,count)),id:'key'}:null,
   // Key slot 3: the name KeyComponent notifies with event 61 on first pickup
   keyTarget:key&&key.datas&&key.datas[3]&&key.datas[3].t===2&&key.datas[3].s?key.datas[3].s:null,
   keyHoldYRaw:key&&key.datas&&key.datas[4]&&key.datas[4].t===1?Math.trunc(Math.fround(Math.fround(key.datas[4].f)*65536)):0,
   keyGhostYRaw:key&&key.datas&&key.datas[5]&&key.datas[5].t===1?Math.trunc(Math.fround(Math.fround(key.datas[5].f)*65536)):0,
   exit:{...box(Actor.collisionRect(goal)),id:'goal'},
   // StageComponent.prepare3 0x18170aad0 writes FailFallY = mapHeight*chipSize +
   // stageInitParam.failDownY. failDownY is 0.0 for every World stage, so the
   // QGameDefine..cctor 0x181780720 default applies: statics+0x10 = 0x9600000 =
   // 2400. killY is compared against the collision box top, and the native anchor
   // sits 47 below it (PlayerComponent.CreateEntity 0x1816bd4e8), hence -47.
   // A margin of 144 leaves 7 of the 16 authored Warp volumes unreachable; 2400
   // makes 15 of 16 reachable, which is what the shipped level data expects.
   failFallY:t.height+2400,killY:t.height+2400-47,
   devices:[],coins:[],hazards:[],timers:[],movingPlatforms:[],crates:[],requiredCoins:0,
   physics:{playerWidth:32,playerHeight:46,nativeTickRate,status:'calibration_pending'},
   unsupportedActors:t.actors.filter(a=>!supported.has(a.typeName)).map(a=>({type:a.typeName,x:a.x,y:a.y})),
   view,coordinateSystem:'Y-down'};
  return {schemaVersion:1,count,map,relays,devices,motion,gates,bridges,blink,blinkThunders,warpInit,switchTimers,enemies,thornCeilings,countUps,lifts,landmines,poles,winds,speedSwitches,linePaths,texts,coins,checkpoints,touchEnergies,pitchers,keyBoxes,blackouts,dossuns,ghosts,sineLifts,targetGroups,gears,colorBoxes,playerMagnets,breakableRects,warpGuns,upDownLifts,linePathGears,searchLights,status:{state:'calibration_pending',missingMechanics,
   unsupportedActorTypes:unsupported,sourceStage:stageId,sourceY:'down',completePhysicsFidelity:false}};
 }
 function create(compiled,options={}){
  if(!compiled||compiled.schemaVersion!==1)throw new Error('Compiled source stage required');
  const map=clone(compiled.map),count=compiled.count,ids=options.ids||Array.from({length:count},(_,i)=>'p'+(i+1));
  if(ids.length!==count||new Set(ids).size!==count||ids.some(id=>typeof id!=='string'||!id))throw new Error('Unique IDs must match player count');
  const initPositions=(compiled.warpInit&&compiled.warpInit.initPositions)||[];
  const state={map,players:ids.map((id,i)=>({id,...map.spawns[i],initPos:initPositions[i]||{x:map.spawns[i].x+16,y:map.spawns[i].y+47.5},onPole:!!(compiled.poles&&compiled.poles.poles&&compiled.poles.poles.length),lookingRight:true,w:32,h:46,vx:0,vy:0,grounded:false,ground:false,
   supportId:null,jump:false,jumpFrame:0,exit:false,visible:true,playerState:1})),
   relayState:clone(compiled.relays),deviceState:Devices.create(compiled.devices||{schemaVersion:1,count,devices:[],warnings:[]}),motionState:Motion.create(compiled.motion||{count,rects:[],dashBoards:[],walls:[]}),gateState:Gates.create(compiled.gates||{count,gates:[],observers:[],keys:[]}),bridgeState:Bridges.create(compiled.bridges||{count,bridges:[],thunders:[],keyTargets:[],keyTaken:false}),blinkState:Blink.create(compiled.blink||Blink.compile([],count)),blinkThunderState:BlinkThunders.create(compiled.blinkThunders||BlinkThunders.compile([],count)),warpInitState:WarpInit.create(compiled.warpInit||WarpInit.compile([],count)),switchTimerState:SwitchTimers.create(compiled.switchTimers||SwitchTimers.compile([],count)),enemyState:Enemies.create(compiled.enemies||Enemies.compile([],count)),thornCeilingState:ThornCeilings.create(compiled.thornCeilings||ThornCeilings.compile([],count)),countUpState:CountUps.create(compiled.countUps||CountUps.compile([],count)),liftState:Lifts.create(compiled.lifts||Lifts.compile([],count)),landmineState:Landmines.create(compiled.landmines||Landmines.compile([],count)),poleState:Poles.create(compiled.poles||Poles.compile([],count,{})),windState:Winds.create(compiled.winds||Winds.compile([],count,{})),speedSwitchState:SpeedSwitches.create(compiled.speedSwitches||SpeedSwitches.compile([],count,{})),linePathState:LinePaths.create(compiled.linePaths||LinePaths.compile([],count,{})),textsState:Texts.create(compiled.texts||Texts.compile([],count,{})),coinsState:Coins.create(compiled.coins||Coins.compile([],count,{})),checkpointsState:Checkpoints.create(compiled.checkpoints||Checkpoints.compile([],count,{})),touchEnergiesState:TouchEnergies.create(compiled.touchEnergies||TouchEnergies.compile([],count,{})),pitcherState:Pitchers.create(compiled.pitchers||Pitchers.compile([],count)),keyBoxState:KeyBoxes.create(compiled.keyBoxes||KeyBoxes.compile([],count)),blackoutState:Blackouts.create(compiled.blackouts||Blackouts.compile([],count,{})),dossunState:Dossuns.create(compiled.dossuns||Dossuns.compile([],count,{})),ghostState:Ghosts.create(compiled.ghosts||Ghosts.compile([],count,{checkpointInfo:{isActive:false}})),sineLiftState:SineLifts.create(compiled.sineLifts||SineLifts.compile([],count)),targetGroupState:TargetGroups.create(compiled.targetGroups||TargetGroups.compile([],count)),rollGearState:Gears.create(compiled.gears||Gears.compile([],count,{})),colorBoxState:ColorBoxes.create(compiled.colorBoxes||ColorBoxes.compile([],count,{})),magnetState:PlayerMagnets.create(compiled.playerMagnets||PlayerMagnets.compile([],count)),breakableState:BreakableRects.create(compiled.breakableRects||BreakableRects.compile([],count)),warpGunState:WarpGuns.create(compiled.warpGuns||WarpGuns.compile([],count)),upDownLiftState:UpDownLifts.create(compiled.upDownLifts||UpDownLifts.compile([],count)),gearState:LinePathGears.create(compiled.linePathGears||LinePathGears.compile([],count,{})),searchLightState:SearchLights.create(compiled.searchLights||SearchLights.compile([],count,{})),ballActors:{},boxActors:{},ballMeta:{serial:0,gone:{},key:null},playTimeRaw:0,keyActive:!compiled.gates||compiled.gates.keys.every(k=>k.active),sourceStatus:clone(compiled.status),physics:clone(map.physics),
   status:'play',elapsed:0,ticks:0,accumulator:0,// A BallKeyBox creates the key later (createKeyAt), so its round starts locked.
   keyTaken:!map.key&&!((compiled.keyBoxes&&compiled.keyBoxes.boxes)||[]).length,
   // GoalComponent flag 1: opened only by the key's collision (layer 10) or event 61
   goalOpen:!map.key&&!((compiled.keyBoxes&&compiled.keyBoxes.boxes)||[]).length,keyState:null,coinsTaken:0,deaths:0,failure:null,
   lastRelayEvents:[],lastImpulses:[],lastContacts:{switchContacts:[],springContacts:[]}};
  if(options.checkpointInfo){
   state.checkpointsState=Checkpoints.create({...compiled.checkpoints,checkpointInfo:clone(options.checkpointInfo)});
   // Creator zeroes the local checked flag; global checkpoint info persists on retry.
   for(const c of state.checkpointsState.checkpoints)c.checked=false;
   if(state.checkpointsState.checkpointInfo.isActive){
    state.players.forEach((p,i)=>{const r=Checkpoints.respawn(state.checkpointsState,i,i);p.x=r.actorPosition.x-16;p.y=r.actorPosition.y-47;});
    state.playTimeRaw=state.checkpointsState.checkpointInfo.playTimeRaw;
    state.elapsed=state.playTimeRaw/65536;
   }
  }
  return state;
 }
 function restart(compiled,previous,options={}){
  const info=previous&&previous.map.id===compiled.map.id?previous.checkpointsState?.checkpointInfo:null;
  return create(compiled,{...options,checkpointInfo:info?.isActive?{...clone(info),gameOverCount:info.gameOverCount+(previous.status==='dead'?1:0)}:undefined});
 }
 function active(s){return s.players.filter(p=>!p.exit&&!p.asBlock);}
 // Native switch contact rule, recovered from SwitchComponent.OnCollided
 // 0x181714f80: the handler is entered for ANY overlap with the direction's
 // sensor rectangle and then inspects only the collided Collision.m_PushBackTarget
 // (bit1, 0x18171502a) and Collision.m_Layer (1,2,3 or 8,
 // 0x181715034..0x181715042). Nothing in it reads a contact normal, a relative
 // velocity or a grounded flag, and the direction byte is used only to pick the
 // rectangle (GetCollisionByDirection 0x1817145a0) plus two direction-0-only side
 // effects: the flags bit5/bit6 jump impulse at 0x181715116 (never set on a
 // shipped Switch) and the cosmetic m_OffsetDrawPos.y = ACTOR_DRAW_OFFSET_Y (-3)
 // write at 0x181715244. Plain overlap is therefore the rule.
 function switchSensorOverlap(body,button){return overlap(body,button);}
 // Exception, deliberately kept: for direction 0 the player test stays the
 // narrower "landed on the sensor's top face" condition this runtime has used
 // since the first round was connected. Widening it would change all 101
 // direction-0 World switches, which is out of scope for this change; it is
 // listed as a known deviation in switch-direction-report.json.
 function playerPressesSwitch(p,button){
  if(button.direction!==0)return switchSensorOverlap(p,button);
  return p.grounded&&horizontal(p,button)&&p.y<button.y&&p.y+p.h>=button.y&&p.y+p.h<=button.y+button.h+0.01;
 }
 // Switch.InitCollision 0x181714790 creates a sensor, not a solid: CreateCollision
 // gets 0 for m_PushBackTarget (0x1817147fa) and m_CollisionType stays 0
 // (0x18169f586), then 0x18171486e sets m_Layer 5. Switches never block anybody.
 // PoleLadder (source-pole-devices.js). The native OnPost puts every player
 // that is not in state 3..5 into state 10 and snaps them to the pole, with no
 // contact test, so in practice the whole party rides the pole from the first
 // tick. A rider climbs with up/down at the walk speed instead of walking or
 // jumping (PlayerComponent.OnUpdate_PoleLadder 0x1816c95b0 via poleStep), is
 // snapped to the pole's x by the module's playerConstraints and clamped to its
 // span, and the pole itself moves (PoleLadder OnUpdate).
 //   anchor <-> top-left: players are 32x46 boxes whose native anchor sits at
 //   (+16, +47), the transform actor-runtime.js already uses.
 function poleMove(s,p,input,terrain){
  const F=65536,anchorX=p.x+16,anchorY=p.y+47;
  const dir=input.up?-1:input.down?1:0;
  // Collision.IsContactedMapOrRect: a rider does not climb into terrain.
  let nextY=anchorY+dir*NATIVE.walk;
  const box={x:anchorX-10,y:nextY-47,w:20,h:44};
  if(dir&&terrain.some(b=>overlap(box,b)))nextY=anchorY;
  p.lookingRight=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;p.jump=false;
  p.animation=dir<0?14:dir>0?15:13;
  const out=Poles.afterStep(s.poleState,{players:[{id:p.id,nativeState:10,lookingRight:true,anchorYRaw:Math.round(nextY*F)}]});
  const c=out.playerConstraints.find(q=>q.playerId===p.id);
  p.x=c.anchorXRaw/F-16;p.y=c.anchorYRaw/F-47;
 }
 // FloatingThorn collision: the native callback sends event 43 to a category 1
 // (player) or 8 actor it touches, and event 43 is the player death path that
 // still respects immortality (pole-device-report.json). A rider's box is the
 // native pole rect from poleEnter: 20 wide, 44 tall, at (-10,-47) from the anchor.
 function poleContacts(s,players){
  if(!s.poleState.thorns.length)return [];
  const F=65536,collisions=[],view=Poles.displays(s.poleState);
  for(const p of players){
   if(p.exit||p.dead)continue;
   const body=p.onPole?{x:p.x+16-10,y:p.y,w:20,h:44}:p;
   for(const t of view.thorns)for(const r of t.collisionRects)
    if(overlap(body,{x:r.xRaw/F,y:r.yRaw/F,w:r.widthRaw/F,h:r.heightRaw/F})){collisions.push({thornId:t.id,targetId:p.id,category:1});break;}
  }
  if(!collisions.length)return [];
  const riders=players.filter(p=>!p.exit&&!p.dead).map(p=>({id:p.id,nativeState:p.onPole?10:1,lookingRight:true,anchorYRaw:Math.round((p.y+47)*F)}));
  const out=Poles.afterStep(s.poleState,{players:riders,collisions});
  return out.events.filter(e=>e.eventType===43).map(e=>players.find(q=>q.id===e.targetId)).filter(q=>q&&!q.immortal).map(q=>q.id);
 }
 // Host side of source-linepath-devices.js. The module asks; this answers with
 // the port's AABB world. Approximations are named here, not hidden.
 function linePathHost(s,players,h){
  const F=65536,live=players.filter(p=>!p.exit&&!p.dead);
  const rect=d=>({x:(d.xRaw+d.rectRaw.x)/F,y:(d.yRaw+d.rectRaw.y)/F,w:d.rectRaw.width/F,h:d.rectRaw.height/F});
  const device=id=>s.linePathState.devices.find(d=>d.id===id);
  // Existing support graph adapter: include each stacked player once.
  // Native getRideCount0x18187a341..361 passes face0, recursive=true(r9b1),
  // mask6. The old direct-only count mistook recursive=true for face1.
  const riders=id=>ridersOf({id},live);
  return {dt:h,
   isActorPaused:()=>false,
   // IsCollidedByPushBackTarget(mask 3) 0x18180e291: the rect arms itself the
   // first update nothing pushable overlaps it. Players are the pushable bodies
   // here; whether terrain also counts under mask 3 was not established.
   isCollidedByPushBackTarget:id=>live.some(p=>overlap(p,rect(device(id)))),
   setCollisionActive:()=>{},
   damageRectOwnContacts:id=>{const d=device(id);if(d.collisionInactive)return [];
    return live.filter(p=>overlap(p,rect(d))).map(p=>({collisionType:1,entityId:p.id}));},
   damageRectReversePlayers:()=>[],
   // Collision.GetContactCount Up/recursive/mask6 @0x18187a361.
   getRideCount:id=>riders(id).length,
   // IsEnableMoveContactActor is only partly reversed (codex brief 17). The
   // port refuses a move that would push a rider into terrain, and otherwise allows it.
   isEnableMoveContactActor:(id,vector)=>{const dy=Math.sign(vector.yRaw);if(dy>=0)return true;
    const solid=s.map.platforms;return !riders(id).some(p=>solid.some(b=>overlap({x:p.x,y:p.y-1,w:p.w,h:p.h},b)));},
   // MoveContactActor 0x1816a0b70 gets (0, deltaY) only: a line-path lift lifts
   // and lowers its riders (0x18187a1dd..221). Horizontal movement belongs
   // to CollisionScene inertia, which this legacy host has not integrated.
   moveLinePathLiftContactActors:(id,delta)=>{for(const p of riders(id))p.y+=delta.yRaw/F;}};
 }
 // ---- 10-3: BoundBallPitcher / BoundBall / BallKeyBox host ----------------
 // The three modules (Codex) hold the native decisions; this runtime supplies the
 // actor world they ask for. Everything is in FP raws, one update = one 60Hz frame
 // (1092 raw, QFP.OneFrame). Approximations are named where they happen.
 //  - gravity: the ball's activation writes "the actual Gravity" into Actor.AccelY;
 //    this runtime's only verified gravity is the player increment 42598, used here.
 //  - Player weight is QPlayerDefine.WEIGHT_MAX = QFP._100 (PlayerComponent.Initialize
 //    0x1816bd7bb stores it to ActorComponent.m_Weight +0x58; ..cctor 0x18177e2e1).
 //  - collision: the ball is the native radius-12 circle; terrain and the box body
 //    are static rectangles (contact with targetActor null), players are actors.
 const BALL_F=65536,BALL_GRAVITY_RAW=42598,PLAYER_WEIGHT_RAW=100*65536,BALL_RADIUS=12;
 function circleRectContact(cx,cy,r,b){
  const nx=Math.max(b.x,Math.min(cx,b.x+b.w)),ny=Math.max(b.y,Math.min(cy,b.y+b.h));
  const dx=nx-cx,dy=ny-cy,d=Math.hypot(dx,dy);
  if(d>=r)return null;
  if(d<1e-9){// centre inside: leave along the shallowest axis
   const pen=[[cx-b.x,-1,0],[b.x+b.w-cx,1,0],[cy-b.y,0,-1],[b.y+b.h-cy,0,1]].sort((a,c)=>a[0]-c[0])[0];
   return {nx:-pen[1],ny:-pen[2],depth:r+pen[0]};}
  return {nx:dx/d,ny:dy/d,depth:r-d};
 }
 function boxRects(s){
  const out=[];
  for(const b of (s.keyBoxState&&s.keyBoxState.boxes)||[]){const a=s.boxActors[b.id];if(!a||(a.flags&8192))continue;
   for(const c of b.colliders){const r=c.rectRaw;out.push({boxId:b.id,index:c.index,x:(a.positionRaw.xRaw+r.xRaw)/BALL_F,y:(a.positionRaw.yRaw+r.yRaw)/BALL_F,w:r.widthRaw/BALL_F,h:r.heightRaw/BALL_F});}}
  return out;
 }
 // KeyComponent.Creator, called by BallKeyBox.onCollided: the key appears above
 // the box with the established Key rect around that anchor.
 function createKeyAt(s,positionRaw){
  const ax=positionRaw.xRaw/BALL_F,ay=positionRaw.yRaw/BALL_F,r=Actor.rects.Key;
  s.map.key={x:ax+r.x,y:ay+r.y,w:r.width,h:r.height,id:'key',taken:false};s.keyTaken=false;s.keyState=null;s.ballMeta.key={...s.map.key};
 }
 function ballTick(s,players,hz){
  if(!s.pitcherState||!(s.pitcherState.pitchers||[]).length)return;
  const live=players.filter(p=>!p.exit&&!p.dead),terrain=s.map.platforms;
  for(const b of s.keyBoxState.boxes||[])if(!s.boxActors[b.id]&&!s.ballMeta.gone[b.id])s.boxActors[b.id]={entityId:b.id,flags:0,positionRaw:{...b.positionRaw},velocityRaw:{xRaw:0,yRaw:0},baseScaleRaw:BALL_F};
  const host={transaction:fn=>fn(),dtRaw:1092,gravityRaw:BALL_GRAVITY_RAW,playSe:()=>{},
   createActorEntity:()=>{const id='ball:'+(++s.ballMeta.serial);
    const a={entityId:id,flags:0,positionRaw:{xRaw:0,yRaw:0},velocityRaw:{xRaw:0,yRaw:0},accelerationRaw:{xRaw:0,yRaw:0},
     previousPositionRaw:{xRaw:0,yRaw:0},previousVelocityRaw:{xRaw:0,yRaw:0},weightRaw:BALL_F,baseScaleRaw:BALL_F,visible:false,collisionActive:true};
    s.ballActors[id]=a;return {entityId:id,actor:a};},
   initBallCollision:()=>{},initBallPost:()=>{},
   addActor:(born,positionRaw)=>{born.actor.positionRaw={...positionRaw};born.actor.previousPositionRaw={...positionRaw};},
   moduleIdForPitcherEntity:e=>e};
  // 1. pitchers (birth / wait), then the balls' own update, in that order.
  const existing=Object.keys(s.ballActors);
  const pitcherActors={};
  for(const p of s.pitcherState.pitchers)pitcherActors[p.id]={entityId:p.id,flags:0,positionRaw:{...p.positionRaw},velocityRaw:{xRaw:0,yRaw:0},baseScaleRaw:BALL_F,initPositionRaw:{...p.positionRaw}};
  const before=Pitchers.beforeStep(s.pitcherState,{...host,actors:pitcherActors,ballActors:s.ballActors,ballUpdateEntityIds:existing,
   contactedDownByEntity:Object.fromEntries(existing.map(id=>[id,!!s.ballActors[id].contactedDown]))});
  for(const c of before.actorChanges)if(s.ballActors[c.id])Object.assign(s.ballActors[c.id],c);
  // 2. Actor.Update2: velocity += acceleration, then position += velocity.
  for(const a of Object.values(s.ballActors)){if(a.flags&8192)continue;
   a.previousPositionRaw={...a.positionRaw};a.previousVelocityRaw={...a.velocityRaw};
   a.velocityRaw={xRaw:a.velocityRaw.xRaw+a.accelerationRaw.xRaw,yRaw:a.velocityRaw.yRaw+a.accelerationRaw.yRaw};
   a.positionRaw={xRaw:a.positionRaw.xRaw+a.velocityRaw.xRaw,yRaw:a.positionRaw.yRaw+a.velocityRaw.yRaw};}
  // 3. collision phase.
  const contacts=[],boxContacts=[],rects=boxRects(s);
  for(const a of Object.values(s.ballActors)){
   if((a.flags&8192)||a.collisionActive===false||a.visible===false){a.contactedDown=false;continue;}
   let cx=a.positionRaw.xRaw/BALL_F,cy=a.positionRaw.yRaw/BALL_F,down=false;
   for(const b of [...terrain,...rects.filter(r=>r.index===0)]){const c=circleRectContact(cx,cy,BALL_RADIUS,b);if(!c)continue;
    cx-=c.nx*c.depth;cy-=c.ny*c.depth;if(c.ny>0.7)down=true;
    contacts.push({ballEntityId:a.entityId,normalRaw:{xRaw:Math.round(c.nx*BALL_F),yRaw:Math.round(c.ny*BALL_F)},targetActor:null,targetLayer:0});}
   for(const p of live){const c=circleRectContact(cx,cy,BALL_RADIUS,p);if(!c)continue;
    cx-=c.nx*c.depth;cy-=c.ny*c.depth;if(c.ny>0.7)down=true;
    contacts.push({ballEntityId:a.entityId,normalRaw:{xRaw:Math.round(c.nx*BALL_F),yRaw:Math.round(c.ny*BALL_F)},
     targetActor:{entityId:p.id,flags:0,positionRaw:{xRaw:Math.round((p.x+16)*BALL_F),yRaw:Math.round((p.y+47)*BALL_F)},
      velocityRaw:{xRaw:Math.round(p.vx/hz*BALL_F),yRaw:Math.round(p.vy/hz*BALL_F)},weightRaw:PLAYER_WEIGHT_RAW},targetLayer:1});}
   a.positionRaw={xRaw:Math.round(cx*BALL_F),yRaw:Math.round(cy*BALL_F)};a.contactedDown=down;
   for(const r of rects.filter(r=>r.index===1))if(circleRectContact(cx,cy,BALL_RADIUS,r))boxContacts.push({boxId:r.boxId,ownCollisionIndex:1,targetActor:a});
  }
  if(contacts.length){const after=Pitchers.afterStep(s.pitcherState,{...host,contacts,ballActors:s.ballActors});
   for(const c of after.actorChanges)if(s.ballActors[c.id])Object.assign(s.ballActors[c.id],c);}
  // 4. the key box: its own gravity, then the ball in its slot.
  const boxCtx={actors:s.boxActors,dtRaw:1092,gravityRaw:BALL_GRAVITY_RAW,collision0ByBox:{}};
  for(const b of s.keyBoxState.boxes||[]){if(!s.boxActors[b.id])continue;
   const body=rects.find(r=>r.boxId===b.id&&r.index===0),onFloor=!!body&&terrain.some(t=>horizontal(body,t)&&Math.abs(body.y+body.h-t.y)<0.5);
   boxCtx.collision0ByBox[b.id]={contacts:[],mapNormals:onFloor?[{x:0,y:1}]:[]};}
  const live_boxes=(s.keyBoxState.boxes||[]).filter(b=>s.boxActors[b.id]);
  if(live_boxes.length)for(const c of KeyBoxes.beforeStep(s.keyBoxState,{...boxCtx,pausedBoxIds:(s.keyBoxState.boxes||[]).filter(b=>!s.boxActors[b.id]).map(b=>b.id)}).actorChanges){
   const a=s.boxActors[c.id];if(!a)continue;Object.assign(a,c);
   a.positionRaw={xRaw:a.positionRaw.xRaw+a.velocityRaw.xRaw,yRaw:a.positionRaw.yRaw+a.velocityRaw.yRaw};}
  if(boxContacts.length)KeyBoxes.afterStep(s.keyBoxState,{transaction:fn=>fn(),actors:s.boxActors,contacts:boxContacts,
   dispatchActorEvent:e=>{const b=s.pitcherState.balls.find(q=>q.entityId===e.targetId),a=s.ballActors[e.targetId];return b&&a?Balls.receive(b,a,e):0;},
   createKey:positionRaw=>createKeyAt(s,positionRaw)});
  // 5. exits: a finished fade (Actor flag bit13) or leaving the map ends the ball,
  //    and OnExit clears the pitcher's reference so it pitches again.
  const exited=Object.values(s.ballActors).filter(a=>(a.flags&8192)||a.positionRaw.yRaw/BALL_F>s.map.height+48).map(a=>a.entityId);
  if(exited.length){Pitchers.afterStep(s.pitcherState,{...host,exitedEntityIds:exited,ballActors:s.ballActors});for(const id of exited)delete s.ballActors[id];}
  for(const [id,a] of Object.entries(s.boxActors))if(a.flags&8192){delete s.boxActors[id];s.ballMeta.gone[id]=true;}
 }
 function keyBoxSolids(s){return s.boxActors?boxRects(s).filter(r=>r.index===0).map(r=>({id:'keybox:'+r.boxId,x:r.x,y:r.y,w:r.w,h:r.h})):[];}
 // ---- 7-4: Ghost host --------------------------------------------------------
 // source-ghost-devices.js runs the native Ghost; this supplies its facts:
 // player slots (index i, one live generation), facing (actor flag 0x400),
 // ActorManager.m_Key (loose: no attach target) and the key holder's layer.
 // The ghost has no pushback (both colliders pushBackTarget 0), so its velocity
 // is applied straight (OnUpdate2). Collider 0 (layer 8) touching a player sends
 // event 43; collider 1 (layer 11) is the one the key collides with.
 const GHOST_RECT={x:-20,y:-55,w:40,h:54};
 function ghostTick(s,hz){
  const st=s.ghostState;if(!st||!st.ghosts.length)return [];
  const F=65536;
  if(!s.ghostActors){s.ghostActors={};for(const g of st.ghosts)s.ghostActors[g.id]={positionRaw:{...g.positionRaw},flags:0,keyCollider1Flags:0};}
  const k=s.keyState,holder=k&&k.holderId;
  const keyFacts=g=>({collision1Flags:s.ghostActors[g.id].keyCollider1Flags,attachTargetCollisionLayer:holder?(st.ghosts.some(x=>x.id===holder)?11:1):null});
  const slots=s.players.map((p,i)=>({entityRef:{index:i,generation:1,actorId:p.id},state:p.exit?5:1,flags:p.exit?512:0,
   actor:{id:p.id,xRaw:Math.round((p.x+16)*F),yRaw:Math.round((p.y+47)*F),flags:p.facingLeft?1024:0}}));
  const entities=s.players.map(()=>({generation:1,components:['PlayerComponent','ActorComponent']}));
  const managerKey=!s.map.key||(k&&k.used)?null:{attachTarget:holder||null,actor:k?{xRaw:k.xRaw,yRaw:k.yRaw}:{xRaw:Math.round((s.map.key.x+16)*F),yRaw:Math.round((s.map.key.y+28)*F)}};
  const actors=Object.fromEntries(st.ghosts.map(g=>[g.id,{positionRaw:{...s.ghostActors[g.id].positionRaw},flags:s.ghostActors[g.id].flags}]));
  const dead=[];
  // one call for every ghost (the module writes its result back into st); the
  // key facts are the first ghost's collider (7-4 has a single ghost)
  const r=Ghosts.beforeStep(st,{actors,playerSlots:slots,entities,managerKey,keyTargetFacts:keyFacts(st.ghosts[0]),stage:{flags:0}});
  for(const e of r.effects)if(e.kind==='SetCollisionFlag'&&e.index===1&&e.bit===0&&s.ghostActors[e.actorId])s.ghostActors[e.actorId].keyCollider1Flags|=1;
  for(const c of r.actorChanges){const a=s.ghostActors[c.id];a.positionRaw={xRaw:c.positionRaw.xRaw+c.velocityRaw.xRaw,yRaw:c.positionRaw.yRaw+c.velocityRaw.yRaw};a.flags=c.actorFlags;a.facingLeft=c.velocityRaw.xRaw<0?true:c.velocityRaw.xRaw>0?false:a.facingLeft;}
  for(const g of st.ghosts){
   const a=s.ghostActors[g.id],box={x:a.positionRaw.xRaw/F+GHOST_RECT.x,y:a.positionRaw.yRaw/F+GHOST_RECT.y,w:GHOST_RECT.w,h:GHOST_RECT.h};
   const contacts=s.players.filter(p=>!p.exit&&!p.asBlock&&overlap(p,box)).map(p=>({ghostId:g.id,layer:1,entityId:p.id}));
   for(const e of Ghosts.afterStep(st,{contacts}).events)if(e.eventType===43){const p=s.players.find(q=>q.id===e.targetId);if(p&&!p.immortal)dead.push(p.id);}
  }
  return dead;
 }
 function ghostKeyBoxes(s){
  if(!s.ghostState||!s.ghostActors)return [];const F=65536;
  return s.ghostState.ghosts.filter(g=>!(s.ghostActors[g.id].keyCollider1Flags&1)).map(g=>{const a=s.ghostActors[g.id];return {id:g.id,x:a.positionRaw.xRaw/F+GHOST_RECT.x,y:a.positionRaw.yRaw/F+GHOST_RECT.y,w:GHOST_RECT.w,h:GHOST_RECT.h};});
 }
 // ---- Key carry (every round with a key) ------------------------------------
 // KeyComponent, from the saved Ghidra project: OnCollided 0x18186cc20,
 // updatePhase 0x18186c340, OnUpdate 0x18186c2c0, .cctor 0x18186d310.
 //  - the first player (layer 1) it touches becomes its holder (pickup SE, event
 //    61 to slot 3's name); another player touching it takes it over, and the
 //    previous holder is excluded for QFP._0_25 (refreshed while it keeps touching);
 //  - it moves 0x1999/0x10000 of the way to its target each update and snaps
 //    when (d.x^2 + d.y^2) >> 16 < 0x1999: for a player holder the target is the
 //    holder's Pos + rect X (+ W when facing left), + rect Y + slot-4 offset;
 //  - touching the Goal (layer 12) opens it (Goal.OnCollided layer 10) and uses
 //    the key: hidden next update, event 40 to the holder.
 const KEY_RECT={x:-16,y:-28,w:32,h:56},KEY_EXCLUDE=Math.trunc(0.25*65536);
 function keyInit(s){
  if(!s.map.key)return null;const k=s.map.key;
  return {holderId:null,excludeId:null,excludeRaw:0,phase:0,used:false,justAttached:false,
   xRaw:Math.round((k.x-KEY_RECT.x)*65536),yRaw:Math.round((k.y-KEY_RECT.y)*65536),
   initXRaw:Math.round((k.x-KEY_RECT.x)*65536),initYRaw:Math.round((k.y-KEY_RECT.y)*65536),holdYRaw:s.map.keyHoldYRaw||0};
 }
 function keyTick(s,inputs,hz){
  if(!s.map.key)return;if(!s.keyState)s.keyState=keyInit(s);const k=s.keyState;if(!k||k.used&&k.phase>=3)return;const F=65536;
  // OnUpdate: the exclusion timer runs down
  if(k.excludeRaw>0){k.excludeRaw-=Math.trunc(F/hz);if(k.excludeRaw<=0){k.excludeRaw=0;k.excludeId=null;}}
  // updatePhase
  const holder=k.holderId&&s.players.find(p=>p.id===k.holderId&&!p.exit);const ghostHolder=k.holderId&&s.ghostActors&&s.ghostActors[k.holderId];
  let target=null;
  if(holder){target={xRaw:Math.round((holder.x+16-16+(holder.facingLeft?32:0))*F),yRaw:Math.round((holder.y+47-47)*F)+k.holdYRaw};}
  else if(k.holderId&&s.ghostActors&&s.ghostActors[k.holderId]){const g=s.ghostActors[k.holderId];
   target={xRaw:g.positionRaw.xRaw+(GHOST_RECT.x+(g.facingLeft?GHOST_RECT.w:0))*F,yRaw:g.positionRaw.yRaw+GHOST_RECT.y*F+(s.map.keyGhostYRaw||0)};}
  if(k.phase===2){k.phase=3;s.map.key.hidden=true;return;}
  if(k.phase===1&&!holder&&!ghostHolder)target={xRaw:k.initXRaw,yRaw:k.initYRaw};
  if(target){const dx=target.xRaw-k.xRaw,dy=target.yRaw-k.yRaw;
   if(Number((BigInt(dy)*BigInt(dy))>>16n)+Number((BigInt(dx)*BigInt(dx))>>16n)<0x1999){k.xRaw=target.xRaw;k.yRaw=target.yRaw;if(k.phase===1)k.phase=0;}
   else{k.xRaw+=Number((BigInt(dx)*0x1999n)>>16n);k.yRaw+=Number((BigInt(dy)*0x1999n)>>16n);}}
  k.justAttached=false;
  s.map.key.x=k.xRaw/F+KEY_RECT.x;s.map.key.y=k.yRaw/F+KEY_RECT.y;
 }
 function keyCollide(s){
  const k=s.keyState;if(!k||k.used||!s.keyActive||!s.map.key)return;
  for(const p of s.players){if(p.exit||p.asBlock||p.dead||!overlap(p,s.map.key))continue;
   if(p.id===k.holderId)continue;
   if(p.id===k.excludeId){k.excludeRaw=KEY_EXCLUDE;continue;}
   if(k.justAttached)continue;
   if(!k.holderId){s.keyTaken=true;s.map.key.taken=true;if(s.map.keyTarget)notifyByName(s,s.map.keyTarget,61);}
   else{k.excludeId=k.holderId;k.excludeRaw=KEY_EXCLUDE;}
   if(s.ghostActors&&s.ghostActors[k.holderId])k.takenFromGhost=true;
   k.holderId=p.id;k.justAttached=true;}
  for(const g of ghostKeyBoxes(s)){if(g.id===k.holderId||!overlap(g,s.map.key))continue;
   if(g.id===k.excludeId){k.excludeRaw=KEY_EXCLUDE;continue;}
   // a ghost cannot take back a key a player took from it (flag 0x10)
   if(k.justAttached||k.takenFromGhost)continue;
   if(!k.holderId){s.keyTaken=true;s.map.key.taken=true;if(s.map.keyTarget)notifyByName(s,s.map.keyTarget,61);}
   else{k.excludeId=k.holderId;k.excludeRaw=KEY_EXCLUDE;}
   k.holderId=g.id;k.justAttached=true;}
  // the key against the Goal: Goal opens, key is used
  if(s.map.exit&&overlap(s.map.key,s.map.exit)){if(!s.goalOpen)s.goalOpen=true;k.used=true;k.phase=2;}
 }
 // ---- 7-4: Lift (sine) host ----------------------------------------------
 // source-sinelift-devices.js holds LiftComponent; preflight and vertical carry
 // go through the shared contact transport over the four-face contact world
 // (the MoveWall host's named approximation). Horizontal steps reach riders
 // through inertiaCarry like every other moving solid.
 function sineLiftTick(s,hz){
  const st=s.sineLiftState;if(!st||!st.lifts.length)return;
  for(const l of st.lifts){
   const box=SineLifts.solids({lifts:[l]})[0],world=sideContactWorld(s,[{...box,actorType:73}],hz);
   SineLifts.update(l,{dtRaw:Math.trunc(65536/hz),
    isEnableMoveContactActor:(lift,dir)=>MoveContact.isEnableMoveContactActor(world,lift.id,dir,{face:0}),
    moveContactActor:(lift,delta,face)=>{const r=MoveContact.moveContactActor(world,lift.id,delta,{face});
     for(const m of r.moved){const p=s.players.find(q=>q.id===m.id);if(p){p.x+=m.xRaw/65536;p.y+=m.yRaw/65536;continue;}const cb=s.colorBoxActors&&s.colorBoxActors[m.id];if(cb){cb.xRaw+=m.xRaw;cb.yRaw+=m.yRaw;}}return r;}});
  }
 }
 // ---- 4-2: Gear (rolling) host ---------------------------------------------
 // source-gear-devices.js: update (velocity), contact (flip / bounce / event 43),
 // integrateActorMotion (OnUpdate2), actorJumpPost (Post1: pending jump,
 // gravity), rotate. This keeps the gear actors and finds their contacts with
 // the native circle (radius 45 at -2,-48). Named approximations:
 //  - collision: the circle is pushed out of terrain / solids along the
 //    centre-to-nearest-point normal (as the ball host), contacts are reported
 //    with that normal; face1 (standing) = a contact whose normal is straight down;
 //  - players are killed through event 43 (immortality survives), other solid
 //    actors (PushBox) only give the flip contact.
 const RG_R=45,RG_DX=-2,RG_DY=-48;
 function rollGearTick(s,hz){
  const st=s.rollGearState;if(!st||!st.gears.length)return [];
  const F=65536;
  if(!s.rollGearActors){s.rollGearActors={};for(const g of st.gears){const p0=Gears.initialPositionRaw(g);s.rollGearActors[g.id]={actorId:g.id,xRaw:p0.xRaw,yRaw:p0.yRaw,vxRaw:0,vyRaw:0,accelXRaw:0,accelYRaw:0,enableJump:true,pendingJumpXRaw:0,pendingJumpYRaw:0,face1:false};
   g.preXRaw=p0.xRaw;g.preYRaw=p0.yRaw;}}
  const snaps=()=>st.gears.map(g=>({...s.rollGearActors[g.id],collisionExists:true,face1Contact:s.rollGearActors[g.id].face1}));
  // Gear.OnUpdate
  const before=Gears.beforeStep(st,{actorSnapshots:snaps()});
  for(const v of before.actorVelocities){const a=s.rollGearActors[v.actorId];a.vxRaw=v.vxRaw;a.vyRaw=v.vyRaw;}
  // Actor.OnUpdate2
  for(const g of st.gears){const a=s.rollGearActors[g.id];Object.assign(a,Gears.integrateActorMotion(a));}
  // collision phase
  const contacts=[],dead=[],solidsNow=baseSolids(s),live=s.players.filter(p=>!p.exit&&!p.asBlock);
  for(const g of st.gears){const a=s.rollGearActors[g.id];let cx=a.xRaw/F+RG_DX,cy=a.yRaw/F+RG_DY,down=false;
   for(const b of solidsNow){const c=circleRectContact(cx,cy,RG_R,b);if(!c)continue;cx-=c.nx*c.depth;cy-=c.ny*c.depth;if(c.ny>0.99)down=true;
    const box=Devices.solids(s.deviceState).find(d=>d.id===b.id);
    contacts.push(box?{actorId:g.id,contactType:1,otherActorExists:true,otherLayer:2,otherId:b.id,otherVxRaw:Math.round((box.vx||0)*F),normalXRaw:Math.round(c.nx*F),normalYRaw:Math.round(c.ny*F)}
     :{actorId:g.id,contactType:0,normalXRaw:Math.round(c.nx*F),normalYRaw:Math.round(c.ny*F)});}
   for(const p of live){const c=circleRectContact(cx,cy,RG_R,p);if(!c)continue;
    contacts.push({actorId:g.id,contactType:1,otherActorExists:true,otherLayer:1,otherId:p.id,otherVxRaw:Math.round((p.vx||0)/hz*F),normalXRaw:Math.round(c.nx*F),normalYRaw:Math.round(c.ny*F)});}
   for(const h of st.gears){if(h===g)continue;const b=s.rollGearActors[h.id],ox=b.xRaw/F+RG_DX,oy=b.yRaw/F+RG_DY,dx=ox-cx,dy=oy-cy,d=Math.hypot(dx,dy);
    if(d<2*RG_R&&d>0)contacts.push({actorId:g.id,contactType:1,otherActorExists:true,otherLayer:8,otherId:h.id,otherVxRaw:b.vxRaw,normalXRaw:Math.round(dx/d*F),normalYRaw:Math.round(dy/d*F)});}
   // resting exactly on a top face (within half a pixel) is the face-1 contact too
   if(!down)down=solidsNow.some(b=>cx>=b.x&&cx<=b.x+b.w&&Math.abs(cy+RG_R-b.y)<0.5);
   a.xRaw=Math.round((cx-RG_DX)*F);a.yRaw=Math.round((cy-RG_DY)*F);a.face1=down;}
  const out=Gears.afterStep(st,{actorSnapshots:snaps(),contacts});
  for(const e of out.events)if(e.eventType===43){const p=s.players.find(q=>q.id===e.targetId);if(p&&!p.immortal)dead.push(p.id);}
  for(const j of out.jumps){const a=s.rollGearActors[j.actorId];Object.assign(a,Gears.requestGearJump(a,j));}
  // Actor.Post1
  for(const g of st.gears){const a=s.rollGearActors[g.id];Object.assign(a,Gears.actorJumpPost(a,{warpTaken:false,collisionExists:true,face1Contact:a.face1,gravityRaw:Gears.stageGravityRaw(s.map.stageScaleRaw||F)}));}
  return dead;
 }
 // Event 61 / 60 to a named actor, delivered at once (Frame.NotifyEvent by name):
 // SwitchTargetGroup re-sends to its targets, Gear toggles standby.
 function notifyByName(s,name,eventType,depth=0){
  if(!name||depth>8)return;
  if(s.targetGroupState&&s.targetGroupState.groups.some(g=>g.name===name)){
   const r=TargetGroups.signal(s.targetGroupState,{targetName:name,eventType});for(const e of r.events||[])notifyByName(s,e.targetName??e.target,e.eventType??e.event,depth+1);}
  if(s.rollGearState&&s.rollGearState.gears.some(g=>g.name===name))Gears.signal(s.rollGearState,{targetName:name,eventType});
 }
 function rollGearSolids(s){return [];}
 // ---- MoveWall host (12-4, 2-4) -------------------------------------------
 // source-movewall-devices.js runs the native wall states (idle, wait, outward
 // 2 px per update, return 1.5); its preflight and push go through the shared
 // native contact transport (source-move-contact.js) over a contact world
 // built from bodies touching this update (within half a pixel) - the same
 // named approximation as the UpDownLift host, on all four faces:
 //  - b touching a's face F is in a's contacts with F's normal;
 //  - a player's mapNormals are the faces where terrain touches it.
 // Players and ColorBoxes are transported: ActorComponent's MoveByContact
 // callback dictionary registers only PlayerMagnet (ordinal 72, initCallbacks
 // 0x18177c2ff), so neither has a callback and both just take the delta.
 const SIDE_NORMALS=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
 const SIDE_TOUCH=[(a,b)=>Math.abs(b.y+b.h-a.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,(a,b)=>Math.abs(a.y+a.h-b.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,
  (a,b)=>Math.abs(b.x+b.w-a.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y,(a,b)=>Math.abs(a.x+a.w-b.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y];
 function sideContactWorld(s,roots,hz){
  const F=65536,snap=v=>Math.round(v*F)/F,live=s.players.filter(p=>!p.exit&&!p.asBlock),terrain=s.map.platforms;
  const cboxes=colorBoxSolids(s).map(b=>({...b,actorType:7,contactResponse:'none',vx:(s.colorBoxActors[b.id].vxRaw||0)/F,vy:(s.colorBoxActors[b.id].vyRaw||0)/F}));
  const boxes=[...roots,...live.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,actorType:27,vx:(p.vx||0)/hz,vy:(p.vy||0)/hz})),...cboxes];
  const movable=b=>b.actorType===27||b.actorType===7;
  return {bodies:boxes.map(a=>({id:a.id,entityId:a.id,actorType:a.actorType,contactResponse:a.contactResponse,x:snap(a.x),y:snap(a.y),hasCollision:true,flags:0,actor:true,
   velocity:{x:snap(a.vx||0),y:snap(a.vy||0)},
   mapNormals:movable(a)?SIDE_NORMALS.filter((n,f)=>terrain.some(t=>SIDE_TOUCH[f](a,t))):[],
   contacts:boxes.flatMap(b=>b===a||!movable(b)?[]:SIDE_NORMALS.map((n,f)=>SIDE_TOUCH[f](a,b)?{id:b.id,normal:n}:null).filter(Boolean))}))};
 }
 // After a wall step, a body it now overlaps (it was not touching, so not in
 // the contact world) is pushed out along the wall's motion - the collision
 // phase's pushback (named approximation, same as the magnet host's).
 function moveWallPushOut(s,before){
  const F=65536;
  for(const w of SpeedSwitches.solids(s.speedSwitchState)){const b0=before.find(x=>x.id===w.id);if(!b0||b0.x===w.x)continue;const dir=Math.sign(w.x-b0.x);
   for(const p of s.players)if(!p.exit&&!p.asBlock&&overlap(p,w))p.x=dir>0?w.x+w.w:w.x-p.w;
   for(const cb of colorBoxSolids(s))if(overlap(cb,w)){const a=s.colorBoxActors[cb.id],nx=dir>0?w.x+w.w:w.x-cb.w;a.xRaw+=Math.round((nx-cb.x)*F);}}
 }
 function moveWallCallbacks(s,hz){
  const st=s.speedSwitchState,worlds={};
  const worldFor=id=>{if(!worlds[id]){const w=SpeedSwitches.solids(st).find(x=>x.id===id);worlds[id]=sideContactWorld(s,[{...w,actorType:23}],hz);}return worlds[id];};
  return {
   isEnableMoveContactActor:req=>MoveContact.isEnableMoveContactActor(worldFor(req.wallId),req.wallId,req.delta,{face:req.face||0}),
   moveContactActor:req=>{const r=MoveContact.moveContactActor(worldFor(req.wallId),req.wallId,req.delta,{face:req.face,isEnableIgnoreTargetVelo:true,isEnableRecursive:true});
    for(const m of r.moved){const p=s.players.find(q=>q.id===m.id);if(p){p.x+=m.xRaw/65536;p.y+=m.yRaw/65536;continue;}
     const cb=s.colorBoxActors&&s.colorBoxActors[m.id];if(cb){cb.xRaw+=m.xRaw;cb.yRaw+=m.yRaw;}}return r;}};
 }
 // ---- ColorBox host (12-2, 15-2, 2-4) --------------------------------------
 // source-colorbox-devices.js decides the box's velocity (only its own player's
 // push moves it, 1 px per update; jump / gravity / forces); this keeps the
 // box actors and answers its contact questions. Named approximations:
 //  - contacts are bodies touching a face within half a pixel this update,
 //    ordered terrain-free: players by index, then boxes by creation;
 //  - Frame.GetGravity = the player increment 42598, jump velocity = the
 //    player's NATIVE.jump; the collision phase is a move-then-stop against
 //    solids and live players (a box rests on players, as in PICO PARK);
 //  - a rider on a box is not carried sideways (horizontal carry is still an
 //    open question for every pushed solid in this runtime).
 function colorBoxBodies(s){
  const F=65536,out=[];
  s.players.forEach((p,i)=>{if(!p.exit&&!p.asBlock)out.push({id:p.id,kind:'player',index:i,x:p.x,y:p.y,w:p.w,h:p.h,layer:1});});
  for(const b of s.colorBoxState.boxes){const a=s.colorBoxActors[b.id];if(!a||a.hidden)continue;
   out.push({id:b.id,kind:'box',x:(a.xRaw+b.rect.xRaw)/F,y:(a.yRaw+b.rect.yRaw)/F,w:b.rect.widthRaw/F,h:b.rect.heightRaw/F,layer:b.enableJump?5:2});}
  return out;
 }
 const CB_TOUCH=[(a,b)=>Math.abs(b.y+b.h-a.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,(a,b)=>Math.abs(a.y+a.h-b.y)<0.5&&b.x<a.x+a.w&&b.x+b.w>a.x,
  (a,b)=>Math.abs(b.x+b.w-a.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y,(a,b)=>Math.abs(a.x+a.w-b.x)<0.5&&b.y<a.y+a.h&&b.y+b.h>a.y];
 function colorBoxTick(s,inputs,hz){
  const st=s.colorBoxState;if(!st||!st.boxes.length)return;
  const F=65536;
  if(!s.colorBoxActors){s.colorBoxActors={};for(const b of st.boxes){const p0=ColorBoxes.initialPositionRaw(b);s.colorBoxActors[b.id]={xRaw:p0.xRaw,yRaw:p0.yRaw,vxRaw:0,vyRaw:0,actorFlags:b.actorFlags};}}
  s.cbJumpPrev=s.cbJumpPrev||{};
  const jumpEdge={};for(const p of s.players){const held=!!(inputs[p.id]&&inputs[p.id].jump);jumpEdge[p.id]=held&&!s.cbJumpPrev[p.id];s.cbJumpPrev[p.id]=held;}
  const terrain=baseSolids(s).filter(b=>!st.boxes.some(x=>x.id===b.id));
  for(const b of st.boxes){const a=s.colorBoxActors[b.id];if(a.hidden)continue;
   const bodies=colorBoxBodies(s),me=bodies.find(q=>q.id===b.id),others=bodies.filter(q=>q.id!==b.id);
   const ctx={
    getCollision:actor=>({id:actor&&actor.id!==undefined?actor.id:b.id}),
    getContactCollisionList:(c,face)=>{const src=c.id===b.id?me:bodies.find(q=>q.id===c.id);return src?others.filter(o=>o.id!==src.id&&CB_TOUCH[face](src,o)).map(o=>o.id):[];},
    getCollisionById:id=>{const o=bodies.find(q=>q.id===id);return o?{id,actorId:id,layer:o.layer}:null;},
    getActor:id=>{const p=s.players.find(q=>q.id===id);if(p)return {id,vxRaw:Math.round((p.vx||0)/hz*F),vyRaw:Math.round((p.vy||0)/hz*F)};const x=s.colorBoxActors[id];return x?{id,vxRaw:x.vxRaw,vyRaw:x.vyRaw}:null;},
    getPlayer:id=>{const i=s.players.findIndex(q=>q.id===id);return i>=0?{playerIndex:i}:null;},
    isContacted:(c,face)=>{const src=c.id===b.id?me:bodies.find(q=>q.id===c.id);return !!src&&(terrain.some(o=>CB_TOUCH[face](src,o))||others.some(o=>o.id!==src.id&&CB_TOUCH[face](src,o)));},
    getPlayerByIndex:i=>{const p=s.players[i];return p&&!p.exit?p:null;},
    isPressInput:(p,n)=>n===8&&!!jumpEdge[p.id],
    isOnInput:(p,n)=>n===8&&!!(inputs[p.id]&&inputs[p.id].jump),
    getJumpVelo:()=>Math.round(NATIVE.jump*F),
    getGravityRaw:()=>Math.round(NATIVE.gravity*F)};
   const r=ColorBoxes.update(b,{vxRaw:a.vxRaw,vyRaw:a.vyRaw,actorFlags:a.actorFlags},ctx);
   a.vxRaw=r.actor.vxRaw;a.vyRaw=r.actor.vyRaw;
   // OnUpdate2 then the collision phase: move x, then y, stopping on solids
   const obstacles=[...terrain,...others];
   const box={x:me.x,y:me.y,w:me.w,h:me.h};let dx=a.vxRaw/F,dy=a.vyRaw/F;
   // bodies only touching above / below (a stacked box) do not block sideways
   let nx=box.x+dx;for(const o of obstacles)if(box.y<o.y+o.h-0.01&&box.y+box.h>o.y+0.01){if(dx>0&&box.x+box.w<=o.x+0.001)nx=Math.min(nx,o.x-box.w);if(dx<0&&box.x>=o.x+o.w-0.001)nx=Math.max(nx,o.x+o.w);}
   let ny=box.y+dy;for(const o of obstacles)if(nx<o.x+o.w&&nx+box.w>o.x){if(dy>=0&&box.y+box.h<=o.y+0.001&&ny+box.h>=o.y){ny=Math.min(ny,o.y-box.h);}if(dy<0&&box.y>=o.y+o.h-0.001&&ny<o.y+o.h)ny=Math.max(ny,o.y+o.h);}
   a.xRaw=Math.round((nx-b.rect.xRaw/F)*F);a.yRaw=Math.round((ny-b.rect.yRaw/F)*F);
   if(ny!==box.y+dy&&dy>0)a.vyRaw=0;
  }
 }
 function colorBoxSolids(s){
  if(!s.colorBoxState||!s.colorBoxState.boxes.length||!s.colorBoxActors)return [];const F=65536;
  return s.colorBoxState.boxes.filter(b=>!s.colorBoxActors[b.id].hidden).map(b=>{const a=s.colorBoxActors[b.id];return {id:b.id,x:(a.xRaw+b.rect.xRaw)/F,y:(a.yRaw+b.rect.yRaw)/F,w:b.rect.widthRaw/F,h:b.rect.heightRaw/F};});
 }
 // ---- 3-3 / 5-3: PlayerMagnet host ----------------------------------------
 // source-playermagnet-devices.js holds the native magnet decisions; this hands
 // it the players as actors and applies event 16. Named approximations:
 //  - contacted(face): the player's rect touches a solid within half a pixel;
 //  - after the magnet moves a caught player, an overlap with a solid is pushed
 //    out along the move, standing in for the collision phase's pushback;
 //  - the collision phase (candidates) runs right after the magnets update.
 const MAG_RECT={heightRaw:46*65536,widthRaw:32*65536,xRaw:-16*65536,yRaw:-47*65536};
 function magnetWorld(s,inputs,hz){
  const F=65536,solidsNow=baseSolids(s);
  const touch=(p,face)=>solidsNow.some(b=>face==='left'?Math.abs(b.x+b.w-p.x)<0.5&&b.y<p.y+p.h&&b.y+b.h>p.y:face==='right'?Math.abs(p.x+p.w-b.x)<0.5&&b.y<p.y+p.h&&b.y+b.h>p.y:Math.abs(b.y+b.h-p.y)<0.5&&b.x<p.x+p.w&&b.x+b.w>p.x);
  return {
   actors:()=>s.players.map((p,i)=>({id:p.id,index:i,isPlayer:true,catchable:true,xRaw:Math.round((p.x+16)*F),yRaw:Math.round((p.y+47)*F),rect:MAG_RECT,
    facingLeft:!!p.facingLeft,vxRaw:Math.round((p.vx||0)/hz*F),vyRaw:Math.round((p.vy||0)/hz*F),canInput:!p.inputLocked,
    inputHeld:!!(inputs[p.id]&&inputs[p.id].shot),exited:!!p.exit||!!p.dead||!!p.asBlock})),
   // Player.OnRecvEvent_Default event 16: SetCatched + velocity 0; refused only
   // when already caught twice and asked to catch.
   catchEvent:(id,catching)=>{const p=s.players.find(q=>q.id===id);if(!p)return 0;
    if(catching&&(p.catchLevel||0)>=2)return 0;
    p.catchLevel=catching?Math.min(2,(p.catchLevel||0)+1):0;p.vx=0;p.vy=0;if(catching){p.grounded=false;p.supportId=null;}return 1;},
   contacted:(id,face)=>{const p=s.players.find(q=>q.id===id);return !!p&&touch(p,face);},
   moveTarget:(id,dx,dy)=>{const p=s.players.find(q=>q.id===id);if(!p)return;
    p.x+=dx/F;for(const b of solidsNow)if(overlap(p,b))p.x=dx>0?b.x-p.w:b.x+b.w;
    p.y+=dy/F;for(const b of solidsNow)if(overlap(p,b))p.y=dy>0?b.y-p.h:b.y+b.h;}
  };
 }
 function magnetTick(s,inputs,hz){
  if(!s.magnetState||!s.magnetState.magnets.length)return;
  const w=magnetWorld(s,inputs,hz);PlayerMagnets.update(s.magnetState,w);PlayerMagnets.collide(s.magnetState,w);
 }
 function magnetPost(s,hz){if(s.magnetState&&s.magnetState.magnets.length)PlayerMagnets.post(s.magnetState,magnetWorld(s,{},hz));}
 // ---- 5-4: PlayerWarpGun host ---------------------------------------------
 // source-playerwarpgun-devices.js: the first bullet that hits another player
 // captures them (event 65: hidden and paused), the next bullet that hits
 // anything puts them back beside that point (event 66). Named approximations:
 //  - bullet motion: straight by its velocity; on terrain it stops flush with the
 //    wall, as Map.Move's pushback leaves it, and reports OnContacted with the
 //    travel direction as normal (what OnCollided substitutes for its normal);
 //  - the shooter's own body never reports a contact (same reading as 14-3);
 //  - IsCollidedByPushBackTarget(mask 3) at a release candidate = the target's
 //    rect overlaps a solid or another live player;
 //  - the bullet's camera area is the live players' span widened by half a view.
 const WG_RECT={xRaw:-16*65536,yRaw:-47*65536,widthRaw:32*65536,heightRaw:46*65536};
 function warpGunTick(s,inputs,hz){
  const st=s.warpGunState;if(!st||!st.guns.length)return;
  const F=65536,live=s.players.filter(p=>!p.exit&&!p.asBlock),solidsNow=baseSolids(s);
  s.warpShotPrev=s.warpShotPrev||{};
  const facts=s.players.map((p,i)=>{const held=!!(inputs[p.id]&&inputs[p.id].shot),edge=held&&!s.warpShotPrev[p.id];s.warpShotPrev[p.id]=held;
   return {id:p.id,actorIndex:i,playerIndex:i,colorIndex:i,actorFlags:p.facingLeft?0x400:0,xRaw:Math.round((p.x+16)*F),yRaw:Math.round((p.y+47)*F),
    scaleRaw:F,directionRaw:{xRaw:F,yRaw:F},gunScaleRaw:F,sortingOrder:0,pressInput9:edge&&!p.exit&&!p.asBlock};});
  const colorByPlayerIndex=[0,1,2,3,4,5,6,7];
  const dispatchActorEvent=e=>{const p=s.players.find(q=>q.id===e.targetId);if(!p)return 0;
   if(e.eventType===30)return s.players.indexOf(p)+1; // Player.OnRecvEvent 0x1e: m_PlayerIndex + 1
   if(e.eventType===65){p.asBlock=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;}
   else if(e.eventType===66){p.asBlock=false;p.x=e.positionRaw.xRaw/F-16;p.y=e.positionRaw.yRaw/F-47;p.vx=0;p.vy=0;}
   return 0;};
  const xs=live.map(p=>p.x),lo=(xs.length?Math.min(...xs):0)-480,hi=(xs.length?Math.max(...xs):0)+512;
  const before=WarpGuns.beforeStep(st,{players:facts,dtRaw:1092,cameraViewRaw:{xRaw:Math.round(lo*F),widthRaw:Math.round((hi-lo)*F)},colorByPlayerIndex});
  const moved=[],contacts=[];
  for(const req of before.actorMotionRequests){const b=st.bullets.find(q=>q.id===req.id);if(!b)continue;
   let x=b.xRaw+req.velocityRaw.xRaw,y=b.yRaw+req.velocityRaw.yRaw;
   if(!req.collisionDisabled){const box={x:x/F-5,y:y/F-5,w:10,h:10},dir=Math.sign(req.velocityRaw.xRaw)||1;
    const wall=solidsNow.filter(t=>overlap(box,t)).sort((a,c)=>dir>0?a.x-c.x:(c.x+c.w)-(a.x+a.w))[0];
    const owner=s.players[b.playerIndex],hit=live.filter(p=>p!==owner&&overlap(box,p)).sort((a,c)=>dir*(a.x-c.x))[0];
    const g=st.guns.find(q=>q.id===b.gunId),target=g&&g.targetId?s.players.find(q=>q.id===g.targetId):null;
    const queries=(normal)=>target?WarpGuns.releaseCandidates({...b,xRaw:x,yRaw:y},WG_RECT,normal).map(pos=>{const r={x:pos.xRaw/F-16,y:pos.yRaw/F-47,w:32,h:46};
     return {targetId:target.id,mask:3,positionRaw:pos,blocked:solidsNow.some(t=>overlap(r,t))||live.some(q=>q!==target&&overlap(r,q))};}):[];
    if(wall){x=Math.round((dir>0?wall.x-5:wall.x+wall.w+5)*F);const normal={xRaw:dir*F,yRaw:0};
     contacts.push({bulletId:b.id,kind:'OnContacted',normalRaw:normal,targetActor:null,targetRectRaw:WG_RECT,velocityXRaw:req.velocityRaw.xRaw,releaseQueries:queries(normal)});}
    else if(hit)contacts.push({bulletId:b.id,kind:'OnCollided',targetActor:{id:hit.id,actorType:27,playerIndex:s.players.indexOf(hit)},targetRectRaw:WG_RECT,velocityXRaw:req.velocityRaw.xRaw,releaseQueries:queries({xRaw:dir*F,yRaw:0})});}
   moved.push({id:b.id,xRaw:x,yRaw:y});}
  WarpGuns.afterStep(st,{players:facts,bulletActorStates:moved,contacts,exitedBulletIds:before.deleteActorIds,dispatchActorEvent,colorByPlayerIndex});
 }
 // ---- 5-4: UpDownLift host ------------------------------------------------
 // source-updownlift-devices.js runs the native sine timer, the pushback
 // preflight and the rider transport over a cached contact world. The runtime
 // has no native contact cache, so the world is built from bodies that touch
 // (within 0.5px) this tick - the named approximation:
 //  - a body resting on another is in the lower one's contacts with normal Up,
 //    and the lower one is in its contacts with normal Down;
 //  - mapNormals: Up when terrain touches the head, Down when it touches the feet.
 // Transport moves riders only; the lift's own position is base + offset.
 const UDL_UP={x:0,y:-1},UDL_DOWN={x:0,y:1};
 function upDownLiftTick(s){
  const st=s.upDownLiftState;if(!st||!st.lifts.length)return;
  const F=65536,snap=v=>Math.round(v*F)/F,live=s.players.filter(p=>!p.exit&&!p.asBlock),terrain=s.map.platforms;
  const boxes=[...UpDownLifts.solids(st).map(b=>({...b,actorType:40})),...live.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,actorType:27}))];
  const across=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x,on=(a,b)=>across(a,b)&&Math.abs(a.y+a.h-b.y)<0.5;
  const bodies=boxes.map(a=>({id:a.id,entityId:a.id,actorType:a.actorType,x:snap(a.x),y:snap(a.y),hasCollision:true,flags:0,actor:true,
   mapNormals:a.actorType===27?[...(terrain.some(t=>on(a,t))?[UDL_DOWN]:[]),...(terrain.some(t=>on(t,a))?[UDL_UP]:[])]:[],
   contacts:[...boxes.filter(b=>b!==a&&b.actorType===27&&on(b,a)).map(b=>({id:b.id,normal:UDL_UP})),...boxes.filter(b=>b!==a&&b.actorType===27&&on(a,b)).map(b=>({id:b.id,normal:UDL_DOWN}))]}));
  const r=UpDownLifts.beforeStep(st,{dtRaw:1092,contactWorld:{bodies}});
  for(const m of r.moves)for(const mv of m.moved||[]){const p=s.players.find(q=>q.id===mv.id);if(p){p.x+=mv.xRaw/F;p.y+=mv.yRaw/F;}}
 }
 // ---- 15-1: LinePathGear host ---------------------------------------------
 // source-linepathgear-devices.js plans the rail position (OnUpdate) and the
 // spin (OnPost); this keeps each gear's Actor position and answers collisions.
 //  - collision: Gear.COLLISION_CIRCLE (radius 45, offset -2,-48 from the actor)
 //    against the live players' rects; OnCollided turns layer-1 player contact
 //    into event 43, the death path that immortality survives.
 //  - CollisionSwitch's event 61 is delivered the moment it is sent (receiveEvent),
 //    like the native synchronous SendEvent.
 const GEAR_R=45,GEAR_DX=-2,GEAR_DY=-48;
 function gearTick(s,hz){
  const st=s.gearState;if(!st||!st.gears.length)return [];
  const F=65536;
  if(!s.gearActors){s.gearActors={};for(const g of st.gears)s.gearActors[g.id]={initXRaw:g.xRaw,initYRaw:g.yRaw,xRaw:g.xRaw,yRaw:g.yRaw};}
  const r=LinePathGears.beforeStep(st,{dtRaw:Math.trunc(F/hz),actorSnapshots:st.gears.map((g,i)=>({actorId:g.id,initXRaw:s.gearActors[g.id].initXRaw,initYRaw:s.gearActors[g.id].initYRaw,collisionSlots:[{valid:true,collision:{id:i+1,flags:0}}]}))});
  for(const plan of r.positionPlans){const a=s.gearActors[plan.actorId];if(a){a.xRaw=plan.actorPatch.xRaw;a.yRaw=plan.actorPatch.yRaw;}}
  const dead=[],live=s.players.filter(p=>!p.exit&&!p.asBlock);
  for(const g of st.gears){const a=s.gearActors[g.id],cx=a.xRaw/F+GEAR_DX,cy=a.yRaw/F+GEAR_DY;
   for(const p of live)if(circleRectContact(cx,cy,GEAR_R,p))
    for(const e of LinePathGears.collided(g,{otherLayer:1,playerExists:true,playerState:1,playerEntityId:p.id}))if(e.eventType===43&&!p.immortal)dead.push(p.id);}
  LinePathGears.afterStep(st,{actorSnapshots:st.gears.map(g=>({actorId:g.id,xRaw:s.gearActors[g.id].xRaw,yRaw:s.gearActors[g.id].yRaw}))});
  return dead;
 }
 function gearEvents(s,events){
  for(const e of events||[])for(const g of (s.gearState&&s.gearState.gears)||[])if(e.target===g.name)LinePathGears.receiveEvent(g,e.event);
 }
 // ---- 14-3: Dossun / PlayerBlockGun / PlayerBlock host ---------------------
 // source-dossun-devices.js (+ source-playerblock-devices.js) make the native
 // decisions; this answers what they ask, in FP raws. Named approximations:
 //  - cameraAreaRaw: the native kills a bullet that leaves the CAMERA's stage
 //    area. The host simulates for everyone, so the area here is the span of the
 //    live players widened by half a 960px view on each side.
 //  - moveDeviceActor: a straight move by the actor's velocity; the Dossun stops
 //    on the first terrain or player below it, a bullet ends on terrain.
 //  - a PlayerBlock does not fall: the module never gives it an acceleration and
 //    nothing in it reads gravity.
 const DS_F=65536,PLAYER_RECT_RAW={height:46*65536,width:32*65536,x:-16*65536,y:-47*65536};
 const rawBox=r=>({x:r.x/DS_F,y:r.y/DS_F,w:r.width/DS_F,h:r.height/DS_F});
 function dossunSnapshots(s,hz){
  // players are actors too: Actor.Initialize gives them the same stage scale
  const stageScale=(s.dossunState.devices[0]&&s.dossunState.devices[0].actorScaleRaw)||DS_F;
  return s.players.map((p,i)=>({id:p.id,actorIndex:i,playerIndex:i,colorIndex:i,playerState:p.dead?3:1,sortingOrder:0,
   xRaw:Math.round((p.x+16)*DS_F),yRaw:Math.round((p.y+47)*DS_F),
   vxRaw:Math.round((p.vx||0)/hz*DS_F),vyRaw:Math.round((p.vy||0)/hz*DS_F),
   flipH:!!p.facingLeft,flipV:false,scaleXRaw:DS_F,scaleYRaw:DS_F,actorScaleRaw:stageScale,rectRaw:{...PLAYER_RECT_RAW}}));
 }
 function applyDossunEvents(s,events,hz){
  const dead=[];
  for(const e of events||[]){const p=s.players.find(q=>q.id===e.targetId);if(!p)continue;
   if(e.eventType===19){if(!p.immortal&&!p.asBlock)dead.push(p.id);}
   // event 65: the hit player is paused and hidden while its PlayerBlock stands in
   else if(e.eventType===65){p.asBlock=true;p.vx=0;p.vy=0;p.grounded=false;p.supportId=null;}
   // event 66: Shot again returns the player at the block's position and velocity
   else if(e.eventType===66){p.asBlock=false;
    if(e.restorePosition){p.x=e.xRaw/DS_F-16;p.y=e.yRaw/DS_F-47;p.vx=e.vxRaw/DS_F*hz;p.vy=e.vyRaw/DS_F*hz;}}
  }
  return dead;
 }
 function dossunTick(s,inputs,hz){
  const st=s.dossunState;if(!st||!st.devices.length)return [];
  const live=s.players.filter(p=>!p.exit&&!p.asBlock&&!p.dead),terrain=s.map.platforms;
  const xs=live.map(p=>p.x),lo=(xs.length?Math.min(...xs):0)-480,hi=(xs.length?Math.max(...xs):0)+512;
  const snaps=dossunSnapshots(s,hz);
  const input9=Object.fromEntries(s.players.map(p=>[p.id,!!(inputs[p.id]&&inputs[p.id].shot)]));
  const before=Dossuns.beforeStep(st,{dt:1/hz,players:snaps,input9,
   cameraAreaRaw:{x:Math.round(lo*DS_F),width:Math.round((hi-lo)*DS_F)},
   // Map.Move of the Dossun body straight down: how far until terrain.
   mapMoveDossunSensor:req=>{const b=rawBox(Players.rectAt(req.actor,req.rectRaw));let best=req.dyRaw/DS_F;
    for(const t of terrain)if(t.x<b.x+b.w&&t.x+t.w>b.x&&t.y>=b.y+b.h-0.001)best=Math.min(best,t.y-(b.y+b.h));
    return {moveYRaw:Math.round(Math.max(0,best)*DS_F)};}});
  const dead=applyDossunEvents(s,before.events,hz);
  const contacts=[];
  Dossuns.moveActors(st,(actor)=>{
   if(actor.type==='Dossun'){
    if(!actor.vyRaw)return;
    actor.yRaw+=actor.vyRaw;
    const now=dossunBody(st,actor);if(!now)return;
    // A standing PlayerBlock is collision kind 3, the same kind as terrain and
    // the Dossun body, so the Dossun comes to rest on it (contact on layer 2,
    // which contactDossun does not turn into a death).
    const blockRects=Players.solids(st.playerBlocks).map(b=>({id:b.id,...rawBox(b)}));
    const hit=t=>t.x<now.x+now.w&&t.x+t.w>now.x&&t.y<now.y+now.h&&t.y+t.h>now.y;
    const ground=terrain.filter(hit),onBlocks=blockRects.filter(hit);
    if(onBlocks.length&&!ground.length){const top=Math.min(...onBlocks.map(b=>b.y));actor.yRaw-=Math.round((now.y+now.h-top)*DS_F);
     for(const b of onBlocks)contacts.push({actorId:actor.id,callback:'OnContacted',otherId:b.id,otherLayer:2,contactYRaw:DS_F});}
    const under=live.filter(p=>p.x<now.x+now.w&&p.x+p.w>now.x&&p.y<now.y+now.h&&p.y+p.h>now.y);
    if(ground.length){const top=Math.min(...ground.map(t=>t.y));actor.yRaw-=Math.round((now.y+now.h-top)*DS_F);
     contacts.push({actorId:actor.id,callback:'OnContacted',otherId:null,otherLayer:0,contactYRaw:DS_F});}
    for(const p of under)contacts.push({actorId:actor.id,callback:'OnContacted',otherId:p.id,otherLayer:1,contactYRaw:DS_F});
   }else if(actor.type==='PlayerBlockGunBullet'){
    actor.xRaw+=actor.vxRaw;actor.yRaw+=actor.vyRaw;
    const b=rawBox(Players.rectAt(actor));
    if(terrain.some(t=>t.x<b.x+b.w&&t.x+t.w>b.x&&t.y<b.y+b.h&&t.y+t.h>b.y))contacts.push({actorId:actor.id,callback:'OnContacted',otherId:null,otherLayer:0});
   }
  });
  // collision phase: thorns (index 1) and the sensor (index 2) of the Dossun,
  // bullets against players; a bullet ignores its own shooter in the module.
  for(const d of Dossuns.solids(st)){const box=rawBox(d);
   if(d.actorType===157&&(d.collisionIndex===1||d.collisionIndex===2)){
    for(const p of live)if(overlap(p,box))contacts.push({actorId:d.actorId,callback:'OnCollided',collisionIndex:d.collisionIndex,otherLayer:1,otherId:p.id,otherActorType:27});
    if(d.collisionIndex===2)for(const b of Players.solids(st.playerBlocks))if(overlap(rawBox(b),box))contacts.push({actorId:d.actorId,callback:'OnCollided',collisionIndex:2,otherLayer:2,otherId:b.id,otherActorType:163});
   }else if(d.actorType===162){
    // A bullet is born inside its shooter (muzzle +10px from the anchor), and
    // collideBullet requests the disappear before it checks the owner - so the
    // native collision must never report the shooter, or the gun could not work.
    const bullet=st.bullets.find(b=>b.id===d.actorId),owner=bullet?s.players[bullet.playerIndex]:null;
    for(const p of live)if(p!==owner&&overlap(p,box))contacts.push({actorId:d.actorId,callback:'OnCollided',otherLayer:1,otherId:p.id,otherActorType:27});
   }
  }
  const after=Dossuns.afterStep(st,{players:dossunSnapshots(s,hz),contacts});
  dead.push(...applyDossunEvents(s,after.events,hz));
  return dead;
 }
 function dossunBody(st,actor){
  const body=Dossuns.solids(st).find(x=>x.actorId===actor.id&&x.collisionIndex===0);
  return body?rawBox(body):null;
 }
 // The Dossun body (collision kind 3) and standing PlayerBlocks are solids.
 function dossunSolids(s){
  if(!s.dossunState||!s.dossunState.devices.length)return [];
  try{return Dossuns.solids(s.dossunState).filter(d=>(d.actorType===157&&d.collisionIndex===0)||d.actorType===163).map(d=>({id:d.id,...rawBox(d)}));}
  catch(e){return [];}
 }
 function baseSolids(s){return [...s.map.platforms,...s.map.springs.filter(b=>s.relayState.relays.find(r=>r.id===b.id)?.visible),...Motion.solids(s.motionState),...Gates.solids(s.gateState),...Bridges.solids(s.bridgeState),...Blink.solids(s.blinkState),...BlinkThunders.solids(s.blinkThunderState),...Lifts.solids(s.liftState),...Winds.solids(s.windState),...LinePaths.solids(s.linePathState),...keyBoxSolids(s),...dossunSolids(s),...UpDownLifts.solids(s.upDownLiftState),...BreakableRects.solids(s.breakableState),...colorBoxSolids(s),...SpeedSwitches.solids(s.speedSwitchState),...SineLifts.solids(s.sineLiftState)];}
 function solids(s){return [...baseSolids(s),...Devices.solids(s.deviceState)];}
 function ridersOf(p,players){
  const ids=new Set([p.id]);let added=true;
  while(added){added=false;for(const q of players)if(q.grounded&&ids.has(q.supportId)&&!ids.has(q.id)){ids.add(q.id);added=true;}}
  return players.filter(q=>q!==p&&ids.has(q.id));
 }
 function moveX(p,dx,obstacles,width){
  let target=Math.max(0,Math.min(width-p.w,p.x+dx));
  for(const b of obstacles){
   if(p.y>=b.y+b.h||p.y+p.h<=b.y)continue;
   if(dx>0&&p.x+p.w<=b.x+0.001&&target+p.w>b.x)target=Math.min(target,b.x-p.w);
   if(dx<0&&p.x>=b.x+b.w-0.001&&target<b.x+b.w)target=Math.max(target,b.x+b.w);
  }
  const moved=target-p.x;p.x=target;return moved;
 }
 function moveY(p,dy,obstacles){
  const before=p.y;let target=before+dy,support=null;
  p.grounded=false;p.ground=false;p.supportId=null;
  for(const b of obstacles){
   if(!horizontal(p,b))continue;
   if(dy>=0&&before+p.h<=b.y+0.001&&target+p.h>=b.y){
    if(b.y-p.h<=target){
     // Equal-height teammates must not change the carrier when actor array
     // order changes. Prefer the widest contact, then a stable actor ID.
     const contact=Math.min(p.x+p.w,b.x+b.w)-Math.max(p.x,b.x);
     const previous=support?Math.min(p.x+p.w,support.x+support.w)-Math.max(p.x,support.x):-1;
     if(b.y-p.h<target-1e-9||!support||contact>previous+1e-9||Math.abs(contact-previous)<=1e-9&&String(b.id)<String(support.id)){
      target=b.y-p.h;support=b;
     }
    }
   }else if(dy<0&&before>=b.y+b.h-0.001&&target<b.y+b.h){target=Math.max(target,b.y+b.h);p.vy=0;p.jumpFrame=0;}
  }
  p.y=target;
  if(support){p.grounded=true;p.ground=true;p.supportId=support.id;p.vy=0;}
 }
 // Horizontal carry: CollisionScene.postPushBack -> updateInertia 0x1817fc480 ->
 // moveForInertia 0x1817fd100 moves what stands on a layer 1/2/13 collision by
 // that collision's currentX - preX (vertical travel is each device's own
 // MoveContactActor). Named approximation of the contact-face list: a player
 // standing on a solid (grounded, supportId) is carried by the solid's x step
 // this tick, together with everyone standing on that player; the move stops at
 // terrain like a walk. Players carrying players already happens in the walk.
 function inertiaCarry(s,before){
  const players=active(s),now=baseSolids(s),terrainIds=new Set(s.map.platforms.map(b=>b.id));
  for(const b of now){if(terrainIds.has(b.id))continue;const x0=before.get(b.id);if(x0===undefined)continue;const dx=b.x-x0;if(Math.abs(dx)<1/65536*4)continue;
   const riders=players.filter(p=>p.grounded&&p.supportId===b.id);if(!riders.length)continue;
   const others=now.filter(o=>o.id!==b.id);
   for(const r of riders){const group=[r,...ridersOf(r,players)];for(const q of group)moveX(q,dx,others.filter(o=>o.id!==q.id&&!group.some(g=>g.id===o.id)),s.map.width);}}
 }
 function tick(s,inputs,h){
  const hz=s.physics.nativeTickRate,players=active(s);
  const solidXBefore=new Map(baseSolids(s).map(b=>[b.id,b.x]));
  s.playTimeRaw+=Math.trunc(h*65536);
  const coinUpdate=Coins.beforeStep(s.coinsState);
  // TimerComponent.onTimeUp 0x18172e0cb sends event 61 to the single actor named
  // in slot5. Route it to every device signal handler in the same tick.
  // The DeadTimer kills by broadcasting QEventType.Dead 19 to every actor
  // (TimerComponent.onTimeUp 0x18172e132..0x18172e168) and the receiving
  // PlayerComponent.OnRecvEvent 0x1816c174e is what actually dies, so the module
  // needs the player list and reports the casualties. Only a DeadTimer can fill
  // deadPlayerIds; a SwitchTimer time-up never does.
  const timerResult=SwitchTimers.beforeStep(s.switchTimerState,{dt:h,players});
  Bridges.beforeStep(s.bridgeState,{players,platforms:s.map.platforms,keyTaken:s.keyTaken,dt:h,nativeTickRate:hz,events:timerResult.events});
  for(const e of timerResult.events){Gates.signal(s.gateState,e);Devices.signal(s.deviceState,e);BlinkThunders.signal(s.blinkThunderState,e);}
  if(timerResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:timerResult.deadPlayerIds[0],reason:'시간이 다 됐어요'};return;}
  Gates.beforeStep(s.gateState,{players,platforms:s.map.platforms,dt:h,nativeTickRate:hz});
  // Blackout pauses lifts too (setPause on every ordinary actor); the previous
  // tick's pause flag is used because the lift runs before the blackout update.
  if(!s.blackoutState.actorsPaused)Lifts.beforeStep(s.liftState,{players,platforms:s.map.platforms,dt:h,nativeTickRate:hz});
  upDownLiftTick(s);
  sineLiftTick(s,hz);
  const linePathResult=LinePaths.beforeStep(s.linePathState,linePathHost(s,players,h));
  Blink.beforeStep(s.blinkState,{players,dt:h});
  // Bowwow2EnemyComponent has no solid body (m_PushBackTarget 0) and declares no
  // OnRecvEvent, so it never joins the solid list and nothing can signal it.
  Enemies.beforeStep(s.enemyState,{dt:h});
  ThornCeilings.beforeStep(s.thornCeilingState,{dt:h});
  BlinkThunders.beforeStep(s.blinkThunderState,{dt:h,platforms:s.map.platforms,width:s.map.width,height:s.map.height});
  const oldMotion=Motion.solids(s.motionState);Motion.step(s.motionState,h);
  const movingSolids=Motion.solids(s.motionState);
  for(const p of players){
   const carrier=movingSolids.find(b=>b.id===p.supportId),old=oldMotion.find(b=>b.id===p.supportId);
   if(carrier&&old){p.x+=carrier.x-old.x;p.y+=carrier.y-old.y;}
   for(const b of movingSolids){const previous=oldMotion.find(old=>old.id===b.id);if(!previous||!overlap(p,b)||previous.x===b.x&&previous.y===b.y)continue;
    if(b.x>previous.x)p.x=b.x+b.w;else if(b.x<previous.x)p.x=b.x-p.w;else if(b.y<previous.y)p.y=b.y-p.h;else p.y=b.y+b.h;
   }
  }
  Devices.beforeStep(s.deviceState,{players,inputs,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width});
  const terrain=solids(s);
  // A box resting on someone's head has to travel with them: st_w_01_02 is
  // carried-box-as-a-shield and the thorns only stop at the box's own rect.
  // The engine moves contact actors generically (ActorComponent
  // MoveContactActor 0x1816a0980, MoveByContactActor 0x1816a10e0,
  // IsEnableMoveContactActor 0x1816a15c0, GetMoveContactOption 0x18169dc90);
  // that whole system is not decoded, so this reproduces only the one case
  // the connected rounds need, with the same one-frame lag the other carries
  // in this runtime already have.
  const carriedBefore=new Map(players.map(p=>[p.id,{x:p.x,y:p.y}]));
  Poles.beforeStep(s.poleState,{dt:h});
  // Blackout (source-blackout-devices.js): it and its controller keep ticking even
  // while they pause everyone else. The controller's chosen player turns the
  // lights back on with Shot - an edge, the native WasPressed (0x1817d08e2..f3).
  if(s.blackoutState.blackouts.length){
   const shots=s.players.map(p=>{const held=!!(inputs[p.id]&&inputs[p.id].shot),pressed=held&&!p.shotHeld;p.shotHeld=held;return {shotPressed:pressed};});
   Blackouts.beforeStep(s.blackoutState,{dt:h,players:s.players.map(p=>({id:p.id,dead:!!p.dead})),gamePlayerInputs:shots});
  }
  // Event 53 with pause true (Blackout option 1) stops ordinary actor simulation:
  // ActorComponent.OnRecvEvent 0x18169eaa8 -> setPause 0x18169f020. A paused player
  // keeps its velocity and simply does not update until the lights go out.
  const paused=!!s.blackoutState.actorsPaused;
  // Wind: a one-tick movement offset in native px/tick, never accumulated into
  // velocity (default Player update adds and clears m_Wind, 0x1816c3dcc..e00).
  for(const f of Winds.beforeStep(s.windState,{}).forces){const p=players.find(q=>q.id===f.actorId);if(p)p.windDx=f.x;}
  // SpeedSwitch: event 57 to every Player (actor type 27). The receiver replaces
  // the walk speed, never compounds it; at scale 1 the formula gives exactly the
  // 3 px/tick this runtime has always used, which is the cross-check.
  const wallsBefore=SpeedSwitches.solids(s.speedSwitchState);const speedResult=SpeedSwitches.beforeStep(s.speedSwitchState,{dt:h,...moveWallCallbacks(s,hz)});moveWallPushOut(s,wallsBefore);
  for(const e of speedResult.events||[])if(e.eventType===57&&e.broadcastActorType===27)
   for(const p of players){const next=SpeedSwitches.applyPlayerSpeedEvent({stageBaseScaleRaw:s.map.stageScaleRaw||65536,iceSpeedUpRaw:s.map.iceSpeedUpRaw||65536},e);p.walkSpeed=next.walkSpeedRaw/65536;}
  for(const p of [...players].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id))){
   if(paused)continue;
   if(p.catchLevel){p.vx=0;p.vy=0;continue;}
   {const inp=inputs[p.id]||{};if(inp.left&&!inp.right)p.facingLeft=true;else if(inp.right&&!inp.left)p.facingLeft=false;}
   if(p.onPole){poleMove(s,p,p.inputLocked?{}:(inputs[p.id]||{}),terrain);continue;}
   const input=p.inputLocked?{}:(inputs[p.id]||{}),held=!!input.jump,edge=held&&!p.jump,riders=ridersOf(p,players);
   p.jumpBlocked=!!(edge&&p.grounded&&riders.length);
   const started=edge&&p.grounded&&!riders.length;
   if(started){p.vy=NATIVE.jump*hz;p.jumpFrame=1;p.grounded=false;p.supportId=null;}
   // Native dec(frame)<=12 accepts frames1..13; frame0 cannot restart an
   // airborne jump after release. The initial jump is its own update.
   if(!started&&held&&p.jumpFrame>0&&p.jumpFrame<NATIVE.holdFrames){
    p.vy+=NATIVE.jump*NATIVE.holdFactor*(1-p.jumpFrame/NATIVE.holdFrames)*hz;p.jumpFrame++;
   }else if(!started)p.jumpFrame=0;
   if(p.grounded)p.forcedVx=0;
   p.jump=held;p.vx=p.forcedVx||((input.right?1:0)-(input.left?1:0))*(p.walkSpeed||NATIVE.walk)*hz;
   // Keep a grounded stack together, limited by every rider's available space.
   const obstacles=terrain.concat(players.filter(q=>q!==p&&!riders.includes(q)));let dx=p.vx*h+(p.windDx||0);p.windDx=0;
   for(const q of [p,...riders]){const trial={...q},allowed=moveX(trial,dx,obstacles.filter(b=>b.id!==q.id),s.map.width);if(Math.abs(allowed)<Math.abs(dx))dx=allowed;}
   p.x+=dx;for(const q of riders)q.x+=dx;
   const wall=terrain.find(b=>b.wallId&&horizontal({x:p.x-0.01,y:p.y,w:p.w+0.02,h:p.h},b)&&p.y<b.y+b.h&&p.y+p.h>b.y&&Math.abs(dx-p.vx*h)>.001);
   if(wall){const contact=Motion.contactWall(s.motionState,wall.wallId,{vx:p.vx/hz,vy:p.vy/hz,face:p.vx>0?'left':'right'});if(contact.impulse){p.vx=contact.impulse.vx*hz;p.forcedVx=p.vx;p.vy=contact.impulse.vy*hz;p.grounded=false;p.supportId=null;p.jumpFrame=0;}}
   p.vy=Math.min(NATIVE.terminal*hz,p.vy+NATIVE.gravity*hz);
   moveY(p,p.vy*h,terrain.concat(players.filter(q=>q!==p)));
   const top=terrain.find(b=>b.wallId&&b.id===p.supportId);
   if(top){const contact=Motion.contactWall(s.motionState,top.wallId,{vx:p.vx/hz,vy:p.vy/hz,face:'top',playerCenterX:p.x+p.w/2,blockCenterX:top.x+top.w/2});if(contact.impulse){p.forcedVx=contact.impulse.vx*hz;p.vx=p.forcedVx;p.vy=contact.impulse.vy*hz;p.grounded=false;p.supportId=null;}}
   const board=s.motionState.dashBoards.find(b=>overlap(p,b));
   if(board&&p.lastDashBoardId!==board.id){const impulse=Motion.triggerDash(board);p.forcedVx=impulse.vx*hz;p.vx=p.forcedVx;p.vy=impulse.vy*hz;p.grounded=false;p.supportId=null;p.jumpFrame=0;}
   p.lastDashBoardId=board?.id||null;
  }
  for(const box of Devices.solids(s.deviceState)){
   const base=box.supportId&&carriedBefore.get(box.supportId);if(!base)continue;
   const carrier=players.find(q=>q.id===box.supportId);if(!carrier)continue;
   box.x=Math.max(0,Math.min(s.map.width-box.w,box.x+carrier.x-base.x));
   box.y+=carrier.y-base.y;
  }
  colorBoxTick(s,inputs,hz);
  magnetTick(s,inputs,hz);
  ballTick(s,players,hz);
  const dossunDeaths=dossunTick(s,inputs,hz);
  if(dossunDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:dossunDeaths[0],reason:'쿵쿵 블록에 당했어요'};return;}
  warpGunTick(s,inputs,hz);
  const ghostDeaths=ghostTick(s,hz);
  if(ghostDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:ghostDeaths[0],reason:'유령에게 잡혔어요'};return;}
  const rollDeaths=rollGearTick(s,hz);
  if(rollDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:rollDeaths[0],reason:'톱니바퀴에 닿았어요'};return;}
  const gearDeaths=gearTick(s,hz);
  if(gearDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:gearDeaths[0],reason:'톱니에 닿았어요'};return;}
  // SearchLight (3-1): FATAL seconds inside a lit cone send event 26, which
  // PlayerComponent.OnRecvEvent 0x1816c1080 takes down event 19's death path
  // (immortality and invincibility still refuse it).
  if(s.searchLightState.lights.length){
   const F=65536,lit=SearchLights.beforeStep(s.searchLightState,{dt:1/hz,dtRaw:Math.trunc(F/hz),
    searchLightPlayers:s.players.map((p,i)=>({index:i,id:p.id,state:1,hasCollision:!p.exit&&!p.asBlock,collisionDisabled:false,
     collisionRectRaw:{xRaw:Math.round(p.x*F),yRaw:Math.round(p.y*F),widthRaw:Math.round(p.w*F),heightRaw:Math.round(p.h*F)}}))});
   const caught=lit.events.filter(e=>e.eventType===26).map(e=>s.players.find(p=>p.id===e.targetId)).filter(p=>p&&!p.immortal&&!p.exit);
   if(caught.length){s.status='dead';s.deaths++;s.failure={playerId:caught[0].id,reason:'서치라이트에 들켰어요'};return;}
  }
  const facts={switchContacts:[],springContacts:[]};
  for(const p of players){
   const upContactCount=players.filter(q=>q!==p&&q.grounded&&q.supportId===p.id).length;
   for(const spring of s.map.springs)if(p.grounded&&horizontal(p,spring)&&Math.abs(p.y+p.h-spring.y)<0.01){
    facts.springContacts.push({relayId:spring.id,actorId:p.id,layer:1,upContactCount,velocityX:p.vx/hz});
   }
   // Player collision is m_Layer 1 / m_PushBackTarget 3: PlayerComponent
   // InitCollision passes 3 to ActorComponent.CreateCollision at 0x1816bdf4b
   // (stored to m_PushBackTarget by Collision.initialize 0x181690b08) and writes
   // `mov byte [rax+1],1` at 0x1816bdf87.
   for(const button of s.map.switches)if(playerPressesSwitch(p,button)){
    facts.switchContacts.push({relayId:button.id,actorId:p.id,layer:1,attributeFlags:3});
   }
  }
  // PushBox collision is m_Layer 2 / m_PushBackTarget 3 (argument 3 at
  // 0x1816db625, `mov word [rax],0x202` at 0x1816db651) - inside the accepted set, so a
  // box resting against a button holds it down in the original too. None of the
  // nine already-connected rounds contains a PushBox and a Switch at once, so
  // this cannot move them.
  for(const box of Devices.solids(s.deviceState))for(const button of s.map.switches){
   if(switchSensorOverlap(box,button))facts.switchContacts.push({relayId:button.id,actorId:box.id,layer:2,attributeFlags:3});
  }
  // ColorBox collision: attribute 2, layer 2 (5 when it can jump) - in the set.
  for(const box of colorBoxSolids(s))for(const button of s.map.switches){
   const cb=s.colorBoxState.boxes.find(b=>b.id===box.id);
   if(switchSensorOverlap(box,button))facts.switchContacts.push({relayId:button.id,actorId:box.id,layer:cb&&cb.enableJump?5:2,attributeFlags:2});
  }
  const speedContacts=[];
  for(const sw of SpeedSwitches.displays(s.speedSwitchState).switches){const box={x:sw.x+sw.rect.x,y:sw.y+sw.rect.y,w:sw.rect.w,h:sw.rect.h,direction:0};
   for(const p of players)if(!p.exit&&!p.dead&&playerPressesSwitch(p,box))speedContacts.push({switchId:sw.id,actorId:p.id,layer:1,attributeFlags:3});}
  // MoveWall trigger: layer-1 bodies inside the widened sensor rect
  const wallContacts=[];for(const w of SpeedSwitches.displays(s.speedSwitchState).walls)for(const p of players)if(!p.exit&&!p.dead&&overlap(p,w.trigger))wallContacts.push({wallId:w.id,layer:1});
  SpeedSwitches.afterStep(s.speedSwitchState,{switchContacts:speedContacts,wallContacts});
  const windContacts=[];
  for(const v of Winds.volumes(s.windState))for(const p of players)if(!p.exit&&!p.dead&&overlap(p,v))windContacts.push({windId:v.windId,actorId:p.id});
  const relay=Relay.step(s.relayState,h,facts);
  // DeadSwitch: event 26 / 19 take the player death path (immortality refuses it);
  // a box that presses it ignores event 26.
  for(const e of relay.events.filter(e=>e.deadSwitch)){
   const victims=e.eventType===19?s.players.filter(p=>!p.exit&&!p.immortal):s.players.filter(p=>p.id===e.targetId&&!p.exit&&!p.immortal);
   if(victims.length){if(e.flash)s.flash=1;s.status='dead';s.deaths++;s.failure={playerId:victims[0].id,reason:'데드 스위치를 밟았어요'};return;}
  }
  // LinePathLift.OnRecvEvent receives a DelaySwitch's event 61 the moment it is
  // sent (SendEvent is synchronous), not on the lift's next update.
  for(const e of relay.events)if((e.eventType??e.event)===61)for(const l of s.sineLiftState.lifts)if(e.targetName===l.name||e.targetId===l.id)SineLifts.receiveEvent(l,61);
  if(s.linePathState.devices.some(d=>d.externalStart)){const host=linePathHost(s,players,h);
   for(const e of relay.events)if((e.eventType??e.event)===61)for(const d of s.linePathState.devices)
    if(d.type==='LinePathLift'&&(e.targetName===d.name||e.targetId===d.id))LinePaths.receiveEvent(d,61,host.getRideCount(d.id));}
  Winds.afterStep(s.windState,{events:relay.events,windContacts});
  // The coop count-up machine takes only its own players' switch events and
  // answers with an event 1 to every Key, so it runs before the gate layer
  // recomputes whether the key can be touched. Its other outgoing event is the
  // lost-round broadcast 47, which no other module in scope reacts to.
  const countUpResult=CountUps.beforeStep(s.countUpState,{dt:h,events:relay.events});
  const landmineResult=Landmines.beforeStep(s.landmineState,{dt:h,players,switchContacts:facts.switchContacts});
  s.landmines=Landmines.displays(s.landmineState);
  const gateResult=Gates.afterStep(s.gateState,{relayState:s.relayState,events:[...relay.events,...countUpResult.events,...landmineResult.events,...coinUpdate.events],keyTaken:s.keyTaken});s.keyActive=gateResult.keyActive;
  s.countUps=CountUps.displays(s.countUpState);
  s.lastContacts=facts;s.lastRelayEvents=relay.events;s.lastImpulses=relay.impulses;
  for(const impulse of relay.impulses){
   const p=players.find(q=>q.id===impulse.actorId);if(!p)continue;
   p.vx=impulse.velocity.x*hz;p.vy=impulse.velocity.y*hz;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;
  }
  for(const button of s.map.switches){const r=s.relayState.relays.find(r=>r.id===button.id);button.pressed=r.pressed;button.remaining=r.remaining||0;}
  for(const spring of s.map.springs){const r=s.relayState.relays.find(r=>r.id===spring.id);spring.phase=r.phase;spring.visible=r.visible;}
  Texts.afterStep(s.textsState,{dt:h});
  Coins.afterStep(s.coinsState,{players});
  Checkpoints.afterStep(s.checkpointsState,{players,playTimeRaw:s.playTimeRaw});
  // Existing port AABBs adapted to FP world bounds; native collision ordering remains unverified.
  const energyResult=TouchEnergies.afterStep(s.touchEnergiesState,{dt:h,players:s.players.map((p,index)=>({index,nativeState:p.playerState,
   collisionRectRaw:p.exit?null:{left:Math.trunc(p.x*65536),right:Math.trunc((p.x+p.w)*65536),top:Math.trunc(p.y*65536),bottom:Math.trunc((p.y+p.h)*65536)}}))});
  if(energyResult.events.some(e=>e.eventType===43)){
   const victim=players.find(p=>!p.immortal);if(victim){s.status='dead';s.deaths++;s.failure={playerId:victim.id,reason:'접촉 에너지가 다 됐어요'};return;}
  }
  const movingThorns=s.breakableState.blocks.length?s.deviceState.devices.filter(d=>d.type==='Thorn'&&d.active&&d.phase==='move').map(d=>d.id):[];
  const deviceResult=Devices.afterStep(s.deviceState,{players,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width,height:s.map.height});
  // BreakableRect.OnContacted 0x1817d73b0: a Thorn (type 0x5d) stopped against
  // the block this tick touches it - the sweep leaves it flush, so touching
  // means within half a pixel of the block's rect.
  for(const id of movingThorns){const d=s.deviceState.devices.find(q=>q.id===id);if(!d)continue;
   for(const b of BreakableRects.solids(s.breakableState))
    if(Devices.thornRects[d.direction].some(([ox,oy,w,hh])=>overlap({x:d.x+ox-0.5,y:d.y+oy-0.5,w:w+1,h:hh+1},b)))BreakableRects.contacted(s.breakableState,b.id,0x5d);}
  BreakableRects.beforeStep(s.breakableState,{dtRaw:1092});
  SwitchTimers.afterStep(s.switchTimerState,{events:[...relay.events,...deviceResult.events]});
  gearEvents(s,deviceResult.events);
  const bridgeResult=Bridges.afterStep(s.bridgeState,{players,platforms:s.map.platforms,width:s.map.width,height:s.map.height,events:[...relay.events,...deviceResult.events]});
  const blinkThunderResult=BlinkThunders.afterStep(s.blinkThunderState,{players,platforms:s.map.platforms,width:s.map.width,height:s.map.height});
  const enemyResult=Enemies.afterStep(s.enemyState,{players,dt:h});
  const thornCeilingResult=ThornCeilings.afterStep(s.thornCeilingState,{players,platforms:baseSolids(s),dt:h,nativeTickRate:hz,width:s.map.width,height:s.map.height});
  for(const e of thornCeilingResult.events)if(e.event===61){Gates.signal(s.gateState,e);Devices.signal(s.deviceState,e);BlinkThunders.signal(s.blinkThunderState,e);Bridges.signal(s.bridgeState,e);}
  s.map.hazards=[...bridgeResult.hazards,...blinkThunderResult.hazards,...enemyResult.hazards,...thornCeilingResult.hazards];
  // DamageRect event 43: the player death path, which immortality survives
  // (playerEvent43Outcome, Player.OnRecvEvent 0x1816c14a2..16e1).
  const damageDeaths=(linePathResult.events||[]).filter(e=>e.eventType===43)
   .map(e=>players.find(p=>p.id===e.targetId)).filter(p=>p&&LinePaths.playerEvent43Outcome({life:1,immortal:!!p.immortal})==='dead').map(p=>p.id);
  if(damageDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:damageDeaths[0],reason:'위험 구역에 닿았어요'};return;}
  const poleDeaths=poleContacts(s,players);
  if(poleDeaths.length){s.status='dead';s.deaths++;s.failure={playerId:poleDeaths[0],reason:'가시에 찔렸어요'};return;}
  if(landmineResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:landmineResult.deadPlayerIds[0],reason:'지뢰를 밟았어요'};return;}
  if(enemyResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:enemyResult.deadPlayerIds[0],reason:'적에게 당했어요'};return;}
  if(thornCeilingResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:thornCeilingResult.deadPlayerIds[0],reason:'가시에 닿았어요'};return;}
  if(blinkThunderResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:blinkThunderResult.deadPlayerIds[0],reason:'전기에 닿았어요'};return;}
  // Native OnPost1 0x18169e260 applies a pending warp before CheckOutMap, so
  // every warp resolves ahead of the out-of-map test below.
  WarpInit.afterStep(s.warpInitState,{players,boxes:Devices.solids(s.deviceState),dt:h,nativeTickRate:hz});
  if(bridgeResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:bridgeResult.deadPlayerIds[0],reason:'전기에 닿았어요'};return;}
  if(deviceResult.deadPlayerIds.length){s.status='dead';s.deaths++;s.failure={playerId:deviceResult.deadPlayerIds[0],reason:'가시에 닿았어요'};return;}
  for(const p of players){
   for(const warp of s.map.warps||[])if(overlap(p,warp)){
    const ordinal=warp.counter;
    p.x=warp.destination.x+warp.ordinalOffset.x*ordinal-16;
    p.y=warp.destination.y+warp.ordinalOffset.y*ordinal-47;
    p.vx=0;p.vy=0;p.grounded=false;p.ground=false;p.supportId=null;p.jumpFrame=0;
    warp.counter=(ordinal+1)%s.players.length;
    for(const q of players)if(q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
    break;
   }
   // ActorComponent.OnPost1 0x18169e260 applies warpProc 0x18169e460 and only
   // then runs CheckOutMap 0x1816a1cb0, which additionally early-outs while a
   // warp is pending. A warped player is therefore never out of the map.
   if(p.y>s.map.killY){s.status='dead';s.failure={playerId:p.id,reason:'fall'};s.deaths++;return;}
   if(Actor.canEnterGoal({open:s.goalOpen,overlapping:overlap(p,s.map.exit),upPressed:!p.inputLocked&&!!inputs[p.id]?.up,cleared:p.exit,playerState:p.playerState})){
    p.exit=true;p.visible=false;p.playerState=5;p.vx=0;p.vy=0;p.grounded=false;p.ground=false;p.supportId=null;
    for(const q of players)if(q.supportId===p.id){q.supportId=null;q.grounded=false;q.ground=false;}
   }
  }
  keyTick(s,inputs,hz);keyCollide(s);
  inertiaCarry(s,solidXBefore);
  magnetPost(s,hz);
  if(s.players.every(p=>p.exit))s.status='clear';
 }
 function step(s,inputs={},dt=1/60){
  if(!Number.isFinite(dt)||dt<0||dt>10)throw new Error('dt must be 0..10 seconds');
  if(s.status!=='play')return s;
  const h=1/s.physics.nativeTickRate;s.accumulator+=dt;
  while(s.accumulator+1e-10>=h&&s.status==='play'){tick(s,inputs,h);s.accumulator-=h;s.elapsed+=h;s.ticks++;}
  return s;
 }
 return {compile,create,restart,step,solids,overlap,NATIVE};
});
