# StagePreparation — result
status: done (호스트 필수 준비 스케줄/분기 복원; 전체 stage boot 완료 아님)
files: source-migration/source-stage-preparation.js, source-migration/source-stage-preparation.test.cjs, source-migration/stage-preparation-report.json, codex-briefs/StagePreparation.result.md, codex-briefs/작업중-StagePreparation.md
tests: 전용63/63 통과; 전체1754/1754 통과. 설치 DLL의 call target/상태 증가 명령/jump table을 읽기 전용 oracle로 대조.

what it is: Stage.Update의 prepare1~5를 한 Update마다 하나씩 실행하고, verified 프레임의 성공 시 실제 phase byte를1 증가시킨 뒤 반환한다. prepare5의 카메라 초기 중심·darkness·비활성 전환과 각 host 호출 순서/예외 후 남는 쓰기까지 제공한다.

stage compiles alone: 아니오. 3-2/10-4의2..8인·offline/online 설정 순서28건은 공급한 명시적 host fixture로 검증했다. 실제 allocator/prototype/creator/listener/RNG/Scene 등록과 전체 Game boot는 외부 host에 필수이며 테스트가 그 완료를 주장하지 않는다.

key findings:
- Stage.Update0x18170a570: prepare 성공 후 LIVE phase byte 증가·즉시 return. phase6에서 Stage flag2(mask4)일 때만 onUpdate 호출 자체를 억제한다. prepare1~5의 공통 false 조건은 Frame.IsVerified=false; getter0x18050ac60은 Frame+18을 읽는다.
- prepare1(0x18170a740): Manager → Scene+Initialize → Factory+Initialize. 기존 singleton도 EntityRef를 다시 쓰고 Initialize 호출. 없는 singleton의 Frame.Create는 getOrAddSingleton host가 실제로 수행해야 한다(Manager helper0x180786e80, Create@0x180786f08).
- prepare2(0x18170aa20): Map → Camera → CollisionScene → StageNotice.CreateEntity. 모두 필수 host이며 root/prototype/materialization을 생략하지 않는다.
- prepare3(0x18170aad0): scale/fail/gravity/ice → Stage bit3 → Scene limit bit2 → InitPlayerIndexList(shuffle) → 실제 count → scroll 설정 → darkness bit4 → Camera.Request → ActorFactory.Update(threshold0). **입력 singleton은 그 다음 Update의 prepare4**다.
- 기본 iceResistivity raw64881(0x18170ac42)는 실제 stage의 authored0.99 변환 raw64880과 다르다. 중력은 signed64 곱 wrap 후 >>16(0x18170ac47..53). 기존 StageAutoScroll.compile/Camera request·center 함수를 읽기 전용 재사용.
- prepare4(0x18170ae40): input0 Normal,1 Majority,2 Multi+Initialize,3 Half;4..255는 원작 default의 true 반환. inputType은 외부 Stage 필드에서 받아야 한다.
- prepare5(0x18170b220): initScroll → CheckDarkness → GetGame → SetActive(false,Game.entityRef). phase6이 되어도 동일 Update에서 onUpdate는 실행하지 않는다. 초기화 완료가 곧 게임 활성화가 아니다.
- initScroll(0x18170b310): start0은 PlayerActorCount>0일 때만 range 계산·ToPlayerCenter, start1 ToMapCenter, 기타는 return. Stage.scrollPosition은 변경하지 않는다.
- CheckDarkness(0x18170d930): Stage bit4일 때 Map invisible owner의 조건부 쓰기/flag0 → Camera bit5 → event18.IsDarkness=true → Frame.NotifyEvent. pool 고갈은 성공 처리하지 않으며 이전 쓰기는 유지한다.
- SetActive(0x18170ce00): bit0=inactive, 상태가 바뀔 때만 Stage flag를 먼저 쓰고 Scene.SetActive → Map.SetActive. Scene 예외 후 flag를 rollback하지 않으며 같은 상태의 재호출은 다시 전파하지 않는다.

API: `compile/create/update/prepare1..5/initScroll/checkDarkness/setActive`, browser global `SourceStagePreparation`. `compile`의 비정수 FP 입력은 `nativeParamRaws` 필수. `create(compiled,{nativeStage})`는 이미 Initialize된 snapshot을 받으며 임의 초기 flags/inputType/EntityRef를 생성하지 않는다. `getStageInitParam` host는 compiled와 같은 `{stage,nativeParamRaws}` 형태의 실제 변환 asset을 반환한다.

주요 host 계약:
- `getOrAddSingleton(frame,kind,{suppliedEntityRef:0,site}) -> {branch:'existing'|'created',component}`, `getSingletonEntityRef(frame,kind)`. created이면 실제 Frame.Create/AddComponent/listener 작업이 선행되어야 한다.
- `initializeActorScene/initializeActorFactory`, 네 `create*Entity`, `getStageInitParam/getActorScene/initPlayerIndexList/getPlayerIndexCount/getCamera/getActorFactory/updateActorFactory(factory,frame,0)`, Multi의 `initializeMultiInput`.
- `getPlayerActorCount/calcPlayerRange(stage,frame)->range`, darkness의 `getMap/getStageEventParam(stage,18)/notifyEvent(frame,event)`, `getGame`, `setActorSceneActive/setMapActive`, phase6 `onUpdate`. 도달한 필수 callback 누락·비동기는 throw.

unresolved: 이전 Game/global 생성과 Stage.CreateEntity/Initialize는 상위 host 소유. allocator/prototype/creator/Scene name registry,10-4 shuffle RNG·정체성,Scene/Map 활성화 내부 ownership·event dispatcher는 실제 host 필요. Camera unlimit/unreturn 등 기존 거부 범위 유지. shared runtime/bridge/factory/play/HANDOFF/Git 변경 없음.

동결: 위 신규 파일만 작성. 실행 검증은 helper와 explicit host fixture이며 원작 실행·전체 boot·원본 플레이 일치 검증이 아니다.
