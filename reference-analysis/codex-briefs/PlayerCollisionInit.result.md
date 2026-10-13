# PlayerCollisionInit — result
status: partial (호스트 연결), scoped native helper 검증 완료
files: source-migration/source-player-collision-init.js, source-migration/source-player-collision-init.test.cjs, source-migration/player-collision-init-report.json, source-migration/player-collision-init-scale-evidence.json
tests: 전용29 passing; 전체957 passing / 0 failing. 실제3-2/10-4 × 2..8인 × 온/오프라인28선택. 독립Python signed64fixture11건.
what it is: 일반Player의 첫 collider와 귀 길이/몸크기 변화에 따른 scale을 native 순서로 복원한 helper입니다. collider 생성·Actor.SetInitPos·SetBaseScale의 단계별 스냅샷을 제공하며 일반Player 전체 이동을 대체하지 않습니다.
stage compiles alone: no. 실제Actor/collider할당·registry·PlayerContact·scene/runtime 어댑터 연결이 필요합니다.

key findings:
- initCollision0x1816bde50: ordinaryPlayer27은 collider1개,rect46×32(-16,-47),layer1,priority-1,pushBack3,syncPos,pivot(0,-1),forceSearchflag5입니다. callbackflag1은 ActorType27 registry 결과를 호스트가 명시해야 합니다. 기존collision-bootstrap-evidence.json을재사용했습니다.
- Collider처음positions/current/pre/expected는0이고attribute도0입니다(0x1817f64fa,Collision.initialize0x181690a90/setup0x18169f790). setup은entity/index/holder/callbackflag만쓰며위치를쓰지않습니다. Player.initCollision은dynamicScale(1,Actor.scaleY)후currentScale을pre/expected에도복사합니다(0x1816be014..020).
- Player.CreateEntity가FactoryParam.y에서32768을뺍니다(0x1816bd4e8). CreateActor0x1816a3658이수정된vector를읽고AddActor0x1816a3687에넘깁니다. SetInitPos0x18169d41f/423은Collidercurrent/pre위치를스폰으로갱신하고flag6을끄며expected는0으로유지합니다. 따라서3-2/10-4 y432의초기actor/colliderY는431.5/raw28278784입니다.
- Actor.Initialize0x18169cd02/06의baseScale=Stage.scale,Actor.scaleXY=1. AddActor→SetBaseScale0x1816a7422→setAllCollisionScale0x1816a0370은current/pre/expected모두ActorXY×baseScale로곱합니다. 매tick할당이나대입으로바꾸면안됩니다.
- GetEarLength0x1816bc850 =8×earScale-8. setCollisionScale0x1816bf700은몸크기>1/ear<1.25때.88..1modifier와귀길이를높이46에반영합니다. signed64product의low16을지운뒤더해높이로나누는순서까지복원했습니다. currentScale만변하며history는유지됩니다. body2/ear1이면Yscale123207(1.8799896)이며X131072입니다.
- AddScale0x1816bf5f0은몸크기.4/raw26214..3.5/raw229376 clamp,ActorXY같게갱신하고actualdelta를반환합니다. OnInitialize_Default0x1816c2f70은추가collider를만들지않습니다. 10-4slot5=1은playerflag22이고귀확장flag20과다릅니다.

호스트 계약:
compile(authoredActors,count,{actorSceneFlags,stageScaleRaw,bindings})에actualfactory제한flagbit2와실제생성된 {id,entityId,hasOnCollided}binding을제공합니다. bootstrap.phases는playerInitCollision/actorSetInitPos/actorSetBaseScale이며최종collisions는leadscene의baseRectRaw/rectRaw/preRectRaw/3개scale/pivot/position형태를사용합니다.
updateScale(player{earScaleRaw},Actor{baseScaleRaw,scaleYRaw},collision),addBodyScale는순수transaction입니다. 현재Actor단계에서만호출하며sharedscene이scale변화와Actor동기화·contactcallbacks를처리합니다. expectedPos0을birth단계에서임의로currentPos로채우지말고,firstnativeActorPre/expectedtarget준비를실제순서에연결해야합니다.
호스트는actorExists/playerFacts/actorFlags 및콜백delegate를실제조회로공급합니다. attribute0을가짜attribute1로바꾸지마세요. supportedTypes=[]는일반Player전체가완성된것으로등록되는것을막습니다. browser는기존SourceCollisionRect를먼저로드합니다.

unresolved: 일반Player이동/입력/귀확장접촉운반/이벤트/다른state와collider는범위밖입니다. checkExpandEar0x1816c45c0의scale호출0x1816c48a8/MoveContactActor0x1816c4a1d는sharedPlayer의실제처리가필요합니다. Collider할당실패/null은actualbinding없을때거부합니다. 출하3-2/10-4외nondefaultparams도명시거부합니다. 원본실행/인간완주증거는없습니다.

다음/재개: 리드가실제3-2/10-4Playercreation에descriptor및단계snapshot을넣고보조2의lifecycle/delegatefacts와연결합니다. 정확주소검산명령: python -I tools/disasm.py 0x1816bf700 0x1816bc850 0x1816bf5f0 0x1816a0370 0x18169d230. 초기spawnhalfPixel후속trace는0x1816a3658/3687/73ee이며이전TopView/Cardboard파일은동결대로미수정입니다.
Gear/ColorBox/TopView/Cardboard/Broadphase/공유PlayerContact/runtime/lifecycle/scene와Git/play/배포를수정하지않았습니다.
