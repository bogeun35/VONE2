# ActorWarpJump 결과
상태: partial — native활성warp/jump 코어검증완료, 실제host연결대기
담당: 보조 세션3
전용40/40,전체1125/1125통과 (2026-10-15)

새source-actor-warp-jump.js의warpProc/jumpProc는리드SourceActorMotion.post1 host함수로연결할수있습니다. 공용motion과기존완료모듈은수정하지않았습니다.

핵심: warpProc는활성/idle모두항상false입니다 (0x18169e69f). 따라서활성warp후에도bit19jump와bit18이없을때outmap검사가이어집니다. bit25는활성warp표식이며returntrue와혼동하면안됩니다. absWarp>=4raw가활성,둘다<4이면bit25만지우고예약요청을보존합니다.

활성순서: bit25set → Player27/flag20clear/Stagebyte+0x91>0일때만camera왼쪽X보정 → 모든holder의actorcontact와역접촉첫matchingid제거 → SetPosForce로ActorPos/PrePos동시쓰기 → sync holder의collisioncurrent/pre좌표동시쓰기및bit6clear → WarpVelo를Velo로복사하고예약Pos/Velozero → bit17이면자기entityowner로SetVisible(true)동기호출후17clear. mapcontact와PreVelo는직접초기화하지않습니다. nonsync holder도contact는지우지만좌표는옮기지않습니다.

Stagebyte+0x91의symbolicfieldname은아직미확정입니다. 실제byte를world.stageByte91로명시적으로요구하며false를추정하지않았습니다. 활성Playerwarp/flag20clear에서만필요하고>0이면nativeCameraViewStageArea.left가필요합니다. 다른actor/flag20set은이보정을건너뜁니다.

jump는absJump>=4이면현재Velo를예약Jump로대체후Jumpzero. collisionindex0의exactDown(0,+1) actor/map cachednormal로접촉판정합니다. collision있고공중이면Frame.Gravity raw를VeloY에더하며dt를곱하지않습니다. grounded또는nocollision이면positiveVeloY만zero,negative는유지합니다. bit19는지우지않습니다.

PlayerCapture66에서예약된WarpPos/WarpVelo가실제소비되고visibility는host호출,그뒤Post2의CollisionVelo=Pos−PrePos=0인것을검증했습니다. FrozenCapture의worldVelocityRaw와리드motion의velocityRaw는같은native+0xf0에대한schemaalias이므로hostadapter에서명시적으로맞춰야합니다. 해당기존파일을고치지않았습니다.

host.setVisible(world,a,true,a.entityId)는native55/ActorLifecycle/Player/equipmenthandler를동기로실행해야합니다. helpers는actor/world를in-place변경하므로host전체frame transaction이nested부작용/오류를rollback해야합니다. 원작실행이나실제playable검수는없습니다. completePhysicsFidelity=false.

기존WarpInit과Gear에도일부편의warp/jump복원이있어소유권중첩가능성을확인했습니다. 읽기만했고새공용helper이외겹치는수정은하지않았습니다. 리드는중복소비되지않게한경로만선택해야합니다.

신규파일: source-migration/source-actor-warp-jump.js/.test.cjs, actor-warp-jump-report.json, actor-warp-jump.native.local.txt; codex-briefs/ActorWarpJump.result.md 및작업중-ActorWarpJump.md.
모든명령cwd=C:\Users\user\projects\VONE2\reference-analysis. 전용/전체testcommand와native주소/순서는JSONreport에기록했습니다.
다음: 리드실제stagebyte/cache/visibilityadapter연결,source-actor-motion host wiring,실제원작병행검수. 기존완료/runtime/play/HANDOFF/Git/배포변경없음.


## 좁은 후속 완료 — 2026-10-15, 리드 검토용 동결
Stage+0x91의 실제 필드는 `StageComponent.m_ScrollParam.ScrollType`입니다. quantum-field-offsets: Stage.m_ScrollParam offset160−16=0x90, QScrollParam.ScrollType offset17−16=1이므로0x91입니다. QStageInitParam.scrollType offset0x2c도 확인했습니다. 이전 본문에서 필드명 미확정이라고 한 내용은 이 후속 근거로 해소했습니다.

생성·설정 경로: QStageFileConverter0x180553d20가 authored scrollType byte(+0x20)를 읽고0x180553d25에서QStageInitParam+0x2c에저장합니다. Stage.prepare3는0x18170ad22에서그값을읽고0x18170ad29에서Stage+0x91에저장합니다. ChangeScrollType0x18170d5fa는실행중같은byte를덮어씁니다. 새추가API stageWarpFacts(selectedVariant)는초기scrollType만검증·복사합니다. 기존stageByte91/warpProc/jumpProc API는유지했습니다. 호스트는초기variant를매tick재적용하지말고현재liveScrollType을stageByte91로제공해야합니다. unknown값의zero추정은없습니다.

실제3-2/10-4는2~8인모두Normal1,12-4는2~8인모두Auto2입니다. 각variant를selectVariant(...,count,true)로골라총21개케이스를검증했습니다. 모두>0이므로Player27/bit20clear에서는actualCameraViewStageArea.leftX가필요하며왼쪽보정이적용됩니다. IsUnreturnScroll은별도nested필드이므로이byte와혼동하지않습니다.

Velocityalias정정: native+0xf0=m_Velo는FrozenPlayerCapture.worldVelocityRaw→leadMotion.velocityRaw, native+0x60=m_Accel은FrozenCapture.moveVelocityRaw→leadMotion.accelerationRaw로매핑해야합니다. 기존본문의MoveVelo표현은legacyAPI이름을따른것이고실제필드명은Accel입니다. jumpVelocityRaw(+0x90)/warpPositionRaw(+0x100)/warpVelocityRaw(+0x110)는같습니다. FrozenCapture파일을고치지않고후속bridge검증에명시했습니다. event66에서Velo/Accel/Jumpzero,warp에서WarpVelo→Velo소비이므로가속도를별도속도처럼취급하면안됩니다.

Lifecycle읽기대조: setVisible(...,true,self)→receiveControl(event55,value:true,sourceId:self). 자기visibleOwner가일치할때bit3/owner와displaybit5를해제하고setCollisionActive(true,self)요청및Player의2-slot장비notify55를생성합니다. 호스트는반환calls까지동기재귀실행하고collisionowner gate도적용해야합니다. foreignvisibleOwner는거부하여장비·collisioncalls가없으며,warpProc는그경우에도예약벡터와bit17을소비합니다. 이두분기를실제read-onlylifecyclehelper로검증했습니다.

최종 전용40/40,전체1125/1125통과. ActorWarpJump 소유파일만수정했습니다. 후속완료/동결하며리드staging재개가능합니다. motion/lifecycle/capture/runtime/play/HANDOFF/Git/이전완료파일은미변경.
