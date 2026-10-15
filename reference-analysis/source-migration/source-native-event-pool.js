/* Native QEventParam singleton pool, static DLL reconstruction only.
 * cctor0x1817808b2 arraylength8; each QEventParam allocated@978..a23.
 * ctor0x180476130 bare ret, managed allocation zero-fills fields.
 * Initialize0x181780b58 ONLY clearsInUse. Reset0x181780810 resets payload
 * but NOTInUse. Get0x181780bdc..c49 firstfree0..7, Reset inline thenbusy1;
 * exhausted returnsnull@c52, no growth. Return0x181780c75 clearsbusy only.
 * Actor.GetEventParam0x18169dc43/4a writesEventType/NotifiedActor(source).
 * Actor.NotifyEvent0x18169ec02 synchronousInvoke thenclearInUse@ec1e;
 * exceptions do NOT reachclear. Nullparam logs/returns0@ec34..57.
 * Invoke_OnRecvEvent nullActor returns0@0x18177b7ec..802.
 * Object identity retained onreuse; pool is host/static lifetime, notperActor.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceNativeEventPool=api;})(globalThis,function(){
'use strict';const CAPACITY=8;
function int32(v,label){if(!Number.isInteger(v)||v<-2147483648||v>2147483647)throw Error('NativeEventPool signed int32 required: '+label);return v;}
function param(p){if(!p||typeof p!=='object'||Array.isArray(p))throw Error('NativeEventPool QEventParam object required');return p;}
function reset(p){param(p);p.EventType=0;p.NotifiedActor=0;p.Index=0;p.ColorIndex=0;p.Id=0;p.Position={xRaw:0,yRaw:0};p.Velo={xRaw:0,yRaw:0};p.Scale=0;p.Speed=0;p.Time=0;p.SortingOrder=0;p.CauseDead=0;p.Value=0;for(const k of['IsActive','IsVisible','IsPause','IsEnableAnimation','IsEnableDisplay','IsCatched','IsDarkness','IsImmortal','IsDisableCorrentWarpPos','IsDisablePlaySe'])p[k]=false;p.CollisionId=0;return p;}
function create(){return{schemaVersion:1,slots:Array.from({length:CAPACITY},()=>reset({InUse:false}))};}
function slots(pool){if(!Array.isArray(pool?.slots)||pool.slots.length!==CAPACITY||new Set(pool.slots).size!==CAPACITY)throw Error('NativeEventPool exact8 distinct native slots required');for(const p of pool.slots){param(p);if(typeof p.InUse!=='boolean')throw Error('NativeEventPool InUse boolean required');}return pool.slots;}
function initialize(pool){for(const p of slots(pool))p.InUse=false;return pool;}
function get(pool){for(const p of slots(pool))if(!p.InUse){reset(p);p.InUse=true;return p;}return null;}
function release(p){if(p===null||p===undefined)return;param(p);p.InUse=false;}
function freeCount(pool){return slots(pool).reduce((n,p)=>n+(p.InUse?0:1),0);}
function getEventParam(pool,sourceActor,eventType){int32(eventType,'EventType');const p=get(pool);if(!p)return null;if(sourceActor?.entityId===undefined)throw Error('NativeEventPool native source Actor.entityId required');p.EventType=eventType;p.NotifiedActor=sourceActor.entityId;return p;}
function notifyEvent(targetActor,event,invokeOnRecvEvent){if(event===null||event===undefined)return 0;param(event);let result=0;if(targetActor!==null&&targetActor!==undefined){if(typeof invokeOnRecvEvent!=='function')throw Error('NativeEventPool synchronous native registry dispatcher required');result=invokeOnRecvEvent(targetActor,event);if(result&&typeof result.then==='function')throw Error('NativeEventPool async dispatcher refused');int32(result,'OnRecvEvent return');}/* NOT finally: nativeclear only aftersuccessful synchronous return. */release(event);return result;}
function slotIndex(pool,event){return slots(pool).indexOf(event);}
function capture(pool){/* inspection preserves slot values, not stale external event references */return JSON.parse(JSON.stringify({schemaVersion:1,slots:slots(pool)}));}
return{create,initialize,reset,get,release,freeCount,getEventParam,notifyEvent,slotIndex,capture,nativeConstants:{capacity:CAPACITY},supportedTypes:[],completePhysicsFidelity:false};
});
