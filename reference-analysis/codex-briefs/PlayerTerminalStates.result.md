# PlayerTerminalStates — result
status: done (Clear/Dead 함수 본문·Stage 집계 core 완료, native leaf host 필요, 신규 소유 파일 동결)
files: source-migration/source-player-terminal-states.js, source-player-terminal-states.test.cjs, player-terminal-states-report.json, 이 결과 노트, 작업중-PlayerTerminalStates.md

tests: 전용30/30 통과. 전체 `node --test source-migration/*.test.cjs` 1,490/1,490 통과. 실제3-2·10-4 각각2..8인 오프라인/온라인28개 선택의 맵 높이를 검증했습니다. roster 테스트는 명시적인 native-schema 단위 fixture이며 실제 명부를 캡처했다거나 population에서 명부를 만들었다고 주장하지 않습니다. 원작 실행 없음.

what it is: Clear5의 Initialize/Finalize/OnPost_Clear, Dead3의 Initialize/Update, Stage.CountGameOver를 함수 단위로 복원했습니다. 타이머 일부만 돌리는 대체 구현이 아니라 각 분기의 실제 필드 쓰기와 동기 이벤트·충돌 조회 순서를 포함합니다. 미확정 leaf 쿼리와 receiver는 host가 없으면 throw합니다.

stage compiles alone: 전체 stage 실행·실패/클리어 완료 주장은 아닙니다. 기존 dispatcher와 실제 leaf host/공통 Player.Post·typed Scene을 리드가 연결해야 합니다. `supportedTypes=[]`, `completePhysicsFidelity=false`입니다.

## Clear5

- Initialize0x1816c2690: **subState(+0xf)=0 → Actor velocity0 → SetVisible(false,owner=Player.entityRef) → ClearCollisionContactInfo**(0x1816c26da..2745). current main state를0으로 바꾸는 것이 아닙니다.
- visibility55는 실제 Pool.GetEventParam/NotifyEvent로 registry를 동기 호출합니다. source는 native Player.entityRef이고 owner 게이트·equipment 후속 효과는 registry가 처리합니다. null lease는 원작처럼 예외입니다. visible flag만 임의로 바꾸지 않습니다.
- 접촉 정리는 기존 ActorWarpJump.clearCollisionContactInfo를 재사용합니다. ALL holders(비동기 position holder도 포함), 각 이웃의 **첫 reciprocal 링크** 제거 후 자기 contacts 초기화, map cache 유지(0x1816916ae/16ed, 0x18169149b/4b3). 누락 holder collision은 skip합니다.
- Finalize0x1816c2750: 같은 Player owner로 SetVisible(true)(0x1816c27dd). velocity를 다시 초기화하지 않습니다.
- Post0x1816c2800 phase0: waitTimer raw65536/subState1(0x1816c2a9e). phase1: dt 차감, <=0이면2(0x1816c2a5a..2a8b). dt1092이면60회 뒤16raw가 남고61회째 -1076에 phase2가 되며, 입력 검사는 그 다음 Post부터입니다.
- phase2: **PressInput4 → Collision0 조회(null 허용) → IsCollidedByPushBackTarget(mask3)**(0x1816c289c..292c). 무입력/누락collision/blocked면 현재 flag/request 유지.
- 통과하면 catch 상태 중 **Player bit11 우선, 아니면 flags2 bit2, 아니면 flags2 bit3** 하나만 해제(0x1816c294e..2986). Player bit12가 없으면 bit17에 따라 Default1/TopView9, bit12가 있으면 flags2 bit4에 따라 Plane6/BattlePlane7을 요청(0x1816c2990..2a46)합니다. main state 즉시 변경은 하지 않습니다.

## Dead3

- Initialize0x1816c2ad0: Player bit9 set, subState0, waitTimer0, flags2 bit1 clear(0x1816c2b11..4b). 실제 GamePlayerInfoList를 순서대로 읽어 **PlayerRef raw == signed playerIndex+1**인 첫 항목만 flags bit1 set(0x1816c2bdb..2c0d). actor 생성 index나 목록 index로 대체하지 않습니다. actual empty list/no-match는 그대로 종료, 누락 명부는 throw합니다.
- Update0x1816c2c20 phase0: **SortingOrder=(signed m_Index+592)×10**를 event54로 먼저 수신(0x1816c2e73..89)시킨 뒤 velocity0, SetCollisionActive(false,owner=self), currentAnim7(변경 시 request7), wait65536, subState1(0x1816c2e9a..2f4b). sorting 수신기는 초기 velocity를 관찰할 수 있습니다. Player bit14여도 죽음 animation 요청은7입니다. 이미 currentAnim7이면 Actor 요청을 덮지 않습니다.
- phase1: dt 차감, <=0이면 **Actor vy=-589824(-9FP)**와 subState2(0x1816c2de7..2e40). 이 호출에서 gravity를 추가하지 않고 다음 Update부터 phase2가 시작됩니다.
- phase2: **Frame.GetGravity를 vy에 더함 → current Actor Y 비교**(0x1816c2cbd..2d23). 종료 기준은 unsigned **Map.tileHeight ×6291456raw = height×96FP**입니다. metadata m_TileHeight1012-16=1002와 native `height*3 <<21`을 확인했습니다. 높이×48FP로 바꾸면 안 됩니다. 실제 두 stage의 선택된 height10이므로62914560raw가 경계이며 equality 포함입니다.
- 기준 도달 시 **SetPause(true,Player owner) → Actor bit24 clear → requestedState4**(0x1816c2d6c..80). Stage bit8이 없으면 CountGameOver 호출 후 Stage bit9 clear/bit10 set(0x1816c2d84..df). 마지막 subState 증가로3이 됩니다. Stage bit8이 있어도 pause/request4/subState3은 수행하고 집계·stage9/10 변경만 건너뜁니다.
- Stage.CountGameOver0x18170dd60는 Stage bit15가 없을 때만 Frame._globals+f0의 dword를 증가하고 bit15를 설정(0x18170dda6..dde6)합니다. metadata로 이것이 **globals.CheckPointInfo.GameOverCount**임을 확인했습니다. 별도의 임의 전역 counter가 아닙니다. 여러 Player가 같은 stage에서 종료해도 한 번만 증가합니다.

## 리드 연결

```js
const terminal = SourcePlayerTerminalStates.createCallbacks({
  invokeOnRecvEvent: (world, actor, qEventParam) => exactNativeRegistry(world, actor, qEventParam),
  isPressInput: (world, actor, enum4) => nativePressed,
  getCollision: (world, actor, index0) => nativeCollisionOrNull,
  isCollidedByPushBackTarget: (world, collision, mask3) => nativeSceneAndMapQuery
});
// dispatcher host에 OnInitialize_Clear/OnFinalize_Clear/OnInitialize_Dead/OnUpdate_Dead 전달
// 실제 Player.OnPost의 state5 분기에서 terminal.OnPost_Clear(world,actor) 호출
```

world 필수 데이터는 해당 분기에서 읽는 실제 `{collisions,eventPool,deltaTimeRaw,gravityRaw,stage:{flags},map:{tileHeight},checkpointInfo:{gameOverCount},gamePlayerInfos}`입니다. Player는 `{entityId,flags,flags2,state,requestedPlayerState,index,playerIndex,subState,waitTimerRaw,currentAnimationId}`를 사용하며 **index와 playerIndex는 별도 signed byte**입니다. native Player.entityRef는 control owner에 쓰이므로 임의 생략하지 않습니다. Actor collision holders/inactiveCollisionEntity 등은 기존 Motion/Warp canonical schema 그대로입니다.

새 pool 또는 명부를 함수 호출마다 만들지 않습니다. callback은 동기 int32 registry이며, 실제8슬롯을 공유합니다. 동기 수신기가 actor.player를 교체하는 경우 Dead의 후속 쓰기는 최신 canonical Player를 읽습니다. World는 transaction clone이며 예외 시 일부 변경/busy lease가 남을 수 있어 clone을 폐기해야 합니다.

## 남은 실제 host 요구사항

IsCollidedByPushBackTarget0x1817f73b0는 pushBackTarget bits·Map.IsContacted·active Scene 겹침을 포함합니다. 이 leaf를 단순 AABB나 무조건false로 대체하지 않았으며 host가 없으면 명시 거부합니다. visibility/pause/sorting은 Player/equipment/owner registry 전체를 수행해야 합니다. 기존 Lifecycle/Motion/Pool core를 재사용한 단위 fixture가 실제 모든 장치 수신기를 검증한 것은 아닙니다.

Clear5에는 native Update callback이 없고 Dead3에는 Finalize callback이 없습니다(기존 dispatcher 표 근거). 가짜 함수를 넣지 않았습니다. 공통 Player.OnPost의 pushBack/outmap, Stage의 전체 클리어 감시·typed Scene 일정 및 반환 상태6/7/9 본문은 여전히 각 실제 host가 필요합니다. 따라서 전체 R.create/R.step 또는 전체 게임 실패/클리어 완전 동등을 주장하지 않습니다.

기존 dispatcher/default/effects/bridge/lifecycle/runtime/play/Git은 수정하지 않았으며, 신규 다섯 소유 파일만 작성·동결했습니다.
