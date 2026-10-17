# Ghost 후속 결과
상태: partial — 실제 출하 초기화와 정상 phase0 코어 구현·검증 완료, 실제 Actor/충돌/scene 통합 대기
담당: 보조 세션3
전용 25/25, 최종 전체 1385/1385 통과 (2026-10-15).

이번에는 동일한 compile 거부를 반복하지 않고, 실제 프리팹·생성·체크포인트·순서 보존 Player/Key 선택을 추가 조사하여 정상 phase0까지 연결했습니다. 기존 다른 모듈·runtime·Git은 변경하지 않았습니다. 이 결과가 실제7-4 playable 개방이나 전체 물리 검수를 뜻하지는 않습니다.

## 출하 생성과 compile 계약
Ghost는 ordinal55, Creator0x181853c60/delegate0x181776d4a입니다. 실제7-4 전2~8인은 Ghost1 하나, 위치(93,191), 슬롯(0.5,6,100,0,0)입니다. 슬롯은 borderRate/speed/keyRange/initDir/flagsbit0입니다.

실제 resources.assets의Ghost prefab1100과자손1880/1983/2551을읽었습니다. EntityPrototype/EntityView/GhostView 및view용SortingGroup/SpriteRenderer/SpriteArray만있고serializedGhostcomponent는없습니다. Ghost에instance.ctor도없습니다. generichelper0x180224390→defaultfactory0x1806874a0→RuntimeType.CreateInstanceDefaultCtor0x1806875de→72bytescopy0x180687611..647이므로componentphase/flags/floatingtime/timer/nearref초기0입니다. Initialize가border32768,keyrange6553600,speed85195,alpha65536,sprite4를저장하고Parse가슬롯을적용합니다.

기존“FrameConfig entry8”설명은정정했습니다. 실제로는Frame._globals(+0xc8)의CheckPointInfo(raw+0xf0)입니다. IsActive(raw+4)가참이고RespawnPositionList(raw+8)의count>8이면목록8번좌표를QFactoryParam.InitPos(+0x28/+0x30)에복사합니다. Actor의inactive-owner필드나설정테이블을쓰는것이아닙니다. activecheckpoint라도목록이짧으면기존factory위치를유지합니다.

따라서 `compile(actors,count,{checkpointInfo:{isActive:false}})`는실제fresh-frame체크포인트비활성상태에해당하고전2~8인Ghost1개를compile합니다. checkpoint가활성이면실제respawnPositionsRaw목록을제공해야합니다. 실제Globals정보가없으면계속throw하며inactive0을추정하지않습니다. 생략입력거부와실제checkpoint좌표변경/짧은목록분기를검증했습니다.

## 두 collision과 초기 flags
InitCollision0x181854090는같은rect H54/W40/X−20/Y−55를두번CreateCollision합니다. 두개모두pushBackTarget0/syncPos=true/type0이고index0 layer8, index1 layer11입니다. InitPost는Actorbit9/24를설정하며initDir0이면Lookbit10을clear,그외set합니다. 전체Actorflags·collisionID·기본/현재scale·등록순서는hostActorCreateCollision/SetBaseScale연결대상이며임의값을넣지않았습니다. module의colliders는정의계획입니다.

## 순서 보존 Player 선택
Frame.GetPlayerActorCount만큼actorindex0..count−1을조회합니다. null, generation불일치,Playercomponent누락,state5,deadflag512,Actorcomponent/Actor조회실패를제외합니다. 실제Actor가있을때만activeCount를증가시킵니다. 거리계산은nativeFPSqrt이며strict `<`라동일거리에서는먼저나온actorindex가유지됩니다.

playerX−ghostX<0이면LookRight일때응시,그외(X같음포함)는LookLeft일때응시합니다. Y나각도범위로응시를제한하지않습니다. inactiveGhost는looking0일때만active가되고,active는looking>=max(1,floor(activeCount×borderRate))에서멈춥니다. queryfacts는실제playerSlots와liveentitiesgeneration/components를요구합니다.

## Key 선택과 정상 이동
getNearKey0x181854ce0는Key목록을순회하지않습니다. ActorManager.m_Key(+0x50)단하나의primaryref를봅니다. Ghostflag0이면Key조회skip,Key없음/Key.AttachTarget(+8)nonnull/Actor조회실패이면선택하지않습니다. abs(keyX−ghostX)<keyRange의strictX거리만검사하며Y는무시합니다.

move입구에NearPlayernonnull조건이있으므로살아있는최근접플레이어가없으면Key가있어도추적하지않습니다. NearPlayer가있으면유효Key가우선이고그외NearPlayer를향합니다. 목표Y+16,exactnative거리·normalize후min(distance,speed)를곱하며dt를곱하지않습니다. 부유는exactSin(time×2)×8전후차이를현재Actor.PosY에더합니다. 이후일반Actor.Update2가velocity를적용해야합니다.

checkKeyTarget은collisionindex1이활성일때Frame.GetKey의byte0을봅니다. 이필드는m_AttachTargetCollisionLayer이며Phase(+1)가아닙니다. 값1이면index1 collisionflag0을설정합니다. 최종API는ctx.keyTargetFacts.attachTargetCollisionLayer로정리했고잘못된keyState/phase표현은폐기했습니다.

## 종료와 nested 계약
40/43은phase0에서패배phase1로전환,61은Ghostflagsbit2설정입니다. 패배중새53은무시하되기존Actorpauseflag16이있으면native공통phasequery처럼update를건너뜁니다. 충돌은phase0/상대layer1에서targetevent43을보내며실제Playerdamagehandler가죽음을처리합니다.

StopStage의Frame.NotifyEvent0x181749790은metadata token0x6001495/명시parameter1개입니다. call의r8=0은hiddenMethodInfo이며수신자선택자가아닙니다. 실제ActorScene생존저장목록을native순서로조회해OnRecvEvent를호출하는broadcast입니다. Stagebit9clear/ScrollType0/CameraStop/event53pausedtrue,SE11/shake효과를host가동기로적용해야합니다. Ghost는이미phase1이라자기53을무시하고패배진행을계속합니다. phase2는1초timer후VeloY−32768,phase3는alpha−2dt후Actor삭제bit13/Stagebit10/phase4입니다.

## 남은 통합과 파일
beforeStep는actualActor위치/flags,orderedplayerSlots/liveentitytable,ActorManager.m_Key,Frame.GetKey.AttachTargetCollisionLayer,collision1flags를받고actorChanges/effects를반환합니다. 실제nativeActor이동·충돌캐시·등록·장면순서·scale·layercheck·공통pause/broadcast·렌더연결은리드작업입니다. 임의승인callback이나가짜AABBcontact로통과시키지않았습니다. completePhysicsFidelity=false입니다.

신규Ghost고유파일: source-ghost-devices.js/.test.cjs,ghost-device-report.json,ghost-native.local.txt,ghost-helpers.native.local.txt,extract-ghost-prototype.local.py,ghost-prototype-evidence.json,Ghost.result.md및작업중-Ghost.md입니다. 정확한주소·과거추정정정이력·host계약은JSONreport에보존했습니다.
명령cwd=C:\Users\user\projects\VONE2\reference-analysis.
전용 node --test source-migration/source-ghost-devices.test.cjs
전체 node --test source-migration/*.test.cjs
기존완료모듈/runtime/play/deploy/HANDOFF/Git수정없음,원작실행없음. 검증단위완료후리드통합인수인계입니다.
