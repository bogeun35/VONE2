# StageAutoScroll — result
status: done (Stage scrollPosition producer 범위)
files: source-migration/source-stage-autoscroll.js; source-migration/source-stage-autoscroll.test.cjs; source-migration/stage-autoscroll-report.json; codex-briefs/StageAutoScroll.result.md; codex-briefs/작업중-StageAutoScroll.md
tests: 전용20/20; 전체1097/1097, 실패0 (동시 작업 포함 실행 시점 수치)
what it is: Stage.updateAutoScroll이 Camera.funcAuto에 공급하는 scrollPosition의 순수 생성 helper입니다. 실제12-4 offline/online ×2..8인14개 선택의 timer/speed/end 설정과 FP 이동을 검증했습니다.
stage compiles alone: producer 설정은2..8 모두 컴파일. 전체 라운드 실행은 no; host phase/Player/Collision/Camera 연결은 리드 담당.

## 복원된 핵심 사실
- prepare3 0x18170ad22..65: actual PlayerIndexCount-2를 n으로 사용. delay=authoredDelay, speed=baseSpeed+n*speedOffset, endOffset=n*endOffset. speed/end는 정수 n 곱이며 FP곱이나 dt곱이 아님.
- converter0x180553d29..67는 authored float32를 convertFP0x180554310→FromString으로 변환. 실제12-4의 값은0/5여서 정확한 integral 변환을 자체 처리합니다. 소수값은 검증된 nativeParamRaws를 명시적으로 요구하며 추측하지 않습니다.
- fresh Stage get-or-add0x180787c61..6c는184byte를 zero-fill. Stage raw scrollPosition+0x60/68은(0,0)에서 시작. Initialize/prepare3/initScroll에서 이를 변경하지 않습니다. initScroll0x18170b310의 ToPlayerCenter/ToMapCenter는 Camera position만 변경하며 Stage position을 쓰지 않습니다. 기존 component의 origin은 host가 공급해야 합니다.
- updateAutoScroll0x18170b810: type2만 처리, delay>0이면 Frame.DeltaTime을 빼고 이번 호출에서<=0이면 바로 이동합니다. 음수 overshoot는 그대로 보존하며 이후 다시 줄이지 않습니다. delay=65536, dt1092이면60회 후16,61회에서-1076이 되며 그때 첫 이동.
- CalcAutoScrollSpeed0x18170d680: Stage flagsbit8가 없을 때 어떤 Player든 bit9(IsDead)이면 이동0. life0나 requestedState3으로 대체하지 않습니다. dead 상태에서도 timer 감소는 먼저 진행됩니다.
- 정상 end 위치는 Map word+0x1004의 tile width×48FP + endOffset - preceding CameraStageArea.width. 48은0x18170d820..824의3<<20이며 chipSize를 대신 넣지 않았습니다.
- delta=min(endPosition-scrollX, preparedSpeed), scrollX+=delta; scrollY는 보존. dt곱/보간/clip/terminal flag/lower0 clamp 없음. overshot이면 음수 delta로 보정할 수 있습니다.
- IsUnlimitScroll branch0x18170d853..60은 limit=(scrollX+width)+width로 치환하므로 유효 distance=width입니다. producer의 이 분기 확인이 기존 Camera의 unlimit 지원을 의미하지는 않습니다.
- Stage flagsbit14 또는 flags&3는 바깥 onUpdate에서 producer를 생략. gate는 Actor.Update 이전 진입 시 결정되며 helper 호출 때의 flags로 다시 계산하면 중간 이벤트 시점이 달라집니다.
- 실제 순서0x18170b4cc..61b: Actor.Update→Collision.Update→calcPlayerRange→Stage.updateAutoScroll→Actor.Post→Camera.funcAuto. producer는 아직 갱신하지 않은 CameraStageArea 폭을 사용. Collision도 이전 camera 상태를 소비합니다.
- SetAutoScrollSpeed0x18169d180는 raw+0xb0 직접쓰기. ChangeScrollType0x18170d5f0는 type과 Camera request만 바꾸고 timer/position을 reset하지 않습니다.

## 실제12-4 결과
모든14개 선택: createIndex0, scrollType2, map width139, delay0, speed327680(5px/call), speedOffset0/endOffset0, initial Stage origin(0,0).

기존 camera helper가 구한 view width55924032/height31457280을 사용하면 최종 scrollX381332160.1163회는327680 이동,1164회는240320만 이동, 그 다음은0. 첫 StageX327680에 대해 CameraAreaX320736이며 차이6944는 reciprocal matrix raw1365의 FP 정밀도 결과입니다. Camera 결과를 Stage origin으로 writeback하면 원작과 달라집니다.

## 정확한 host 계약
- compile(actors,count,{stage:selectedVariant,nativeParamRaws?}) — 선택된 원작 stage variant와 실제 PlayerIndexCount2..8 필수. 이 helper는 Actor를 소유하지 않으므로 supportedTypes=[]이며 actor list는 인터페이스 인자입니다.
- create(compiled,{freshStageComponent:true}) — 새 zero component임을 확인한 경우만. 기존/외부 component는 {initialScrollPositionRaw:{xRaw,yRaw}} 필수.
- Stage.onUpdate 진입 때 const eligible=phaseEligible(stageFlagsAtEntry)를 저장.
- Collision.Update와 calcPlayerRange 후, Actor.Post 전에 beforeStep(state,{phase:'afterCollisionBeforePost',phaseEligibleAtEntry:eligible,stageFlags:currentStageFlags,dtRaw:actualFrameDelta,players:[null|{flags}],cameraAreaRaw:precedingCameraStageArea}) 호출.
- Actor.Post 다음 기존 camera.update(cameraState,null,dtRaw,state.scrollPositionRaw) 호출. Stage origin에 반환된 cameraArea.x/y를 복사하지 않음.
- updateAutoScroll은 원작 producer 함수 자체를 그대로 제공하므로 바깥 Stage gate를 검사하지 않습니다. calculateStepRaw는 해당 호출의 이동량. setAutoScrollSpeed/setScrollPosition/changeScrollType mutator와 standard solids/afterStep/displays 제공. changeScrollType의 반환 cameraRequest는 host가 기존 camera.requestAuto/Normal/Stop으로 연결.
- 상태는 JSON 복원 가능, browser UMD global은 SourceStageAutoScroll.

## 검증 및 한계
원작 GameAssembly를 실행하지 않았습니다. 원본 bytes의 E8 call target으로 phase순서와 producer Calc 호출을 독립 대조하고, X 단순 addition/Map width shift/184byte zero-fill literal도 대조했습니다. 테스트에는 마지막 partial tick, timer 정확한 crossing, deadbit/bit8, stage gate, negative speed/overshoot, population offset, JSON 재시작, 기존 camera 통합 raw 값, browser UMD 검증을 포함했습니다.

unresolved: nonintegral authored 입력의 일반 FromString 재현은 검증된 raw 주입을 요구. runtime 등록·실제12-4 전체 생성/물리·게임 완료 검증은 미수행. singleton 재사용/외부 Stage 초기값은 host 입력 필수. signed64 결과 중 JSON safe 범위 밖은 거부. 기존 camera/motion/lifecycle/runtime/play/HANDOFF/Git을 수정하지 않았으며 Thunder도 작업하지 않았습니다.
