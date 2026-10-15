# PushBackTargetQuery — result
status: done (query core 완료, 실제 host 데이터 연결 필요, 신규 소유 파일 동결)
files: source-migration/source-pushback-target-query.js, source-pushback-target-query.test.cjs, pushback-target-query-report.json, 이 결과 노트, 작업중-PushBackTargetQuery.md

tests: 전용30/30 통과. 전체 `node --test source-migration/*.test.cjs` 1,601/1,601 통과. 실제3-2·10-4의2..8인 오프라인/온라인28개 선택, Terrain/MapRect/속성표 및 Player 실제 birth collider로 Clear query fixture를 검증했습니다. 실제 goal-clear 플레이를 캡처한 것은 아니며 원작을 실행하지 않았습니다.

what it is: Terminal.OnPost_Clear가 요구한 IsCollidedByPushBackTarget0x1817f73b0입니다. map 우선 검사와 **전체 active Scene의 PRE 또는 current 겹침**을 원작 순서로 검사합니다. 현재chunk/AABB 가정이나 무조건false로 대체하지 않았습니다.

stage compiles alone: query와 Terminal phase2의 request 차단/허용 경계 검증이며 전체 stage 실행·클리어 완료 주장은 아닙니다. 실제 source storage+map/layer table을 리드가 연결해야 합니다. `supportedTypes=[]`, `completePhysicsFidelity=false`입니다.

## 원작 순서와 필터

1. mask bit0와 owner.pushBackTarget bit0가 모두 있으면 **Map.IsContacted**부터 호출(0x1817f7457..7499), true면 즉시 반환합니다. owner가 inactive라는 이유로 거부하지 않습니다.
2. Map.IsContacted0x18187ecc0는 현재 GetRect의 world 네 모서리를48FP로 나눈 cell 범위를 inclusive하게 검사합니다(0x18187ed46..ee2e). 방향/반픽셀 probe가 아닙니다. 기존 MapCore.isContacted에 **zero direction**을 주어 같은 cell/clamp/attrbit0 코어를 재사용했습니다. 맵 밖 좌표는 원작처럼 경계 cell로 clamp합니다.
3. mask bit1와 owner.pushBackTarget bit1가 모두 있으면 **createActiveCollisionInfoList** 호출(0x1817f74a9..74db). 기존 Broadphase의 primary→secondary occupied physical slot 순서와 inactive bit0 필터를 재사용합니다(0x1817f6c0a/6c53,0x181800565/621). priority/ID/Morton 정렬이나 현재 chunk만의 후보 목록을 사용하지 않습니다.
4. 후보별로 같은 collision ID skip → candidate.pushBackTarget bit1 확인 → IsEnableCheck(candidateLayer,ownerLayer)(0x1817f75ec..762d). layer>=16이면false, native flat index는 **ownerLayer×16+candidateLayer**(0x1817f627b..62e5)입니다. 추가 Actor/type/static/movement/attribute 필터는 없습니다.
5. **IsCollidedPre(ignoreInactive=true)** 먼저(0x1817f768b), false이면 **IsCollided current(ignoreInactive=true)**(0x1817f76d6). 따라서 PRE만 겹쳐도 차단합니다. 후보는 active 목록에서 필터되지만 owner inactive는 이 검사에서 무시됩니다.
6. same EntityRef는 ignoreInactive와 무관하게false(0x1816922bb/0x181691f1b). 양쪽 circle일 때는 원작 FP radial/√ 검사, mixed/rect는 **저장된 native rectangle의 GetPreRect/GetRect** 경로입니다. Scene/Gear/Rect 기존 검증 코어를 재사용했습니다. circle-rect에 nearest-point circle 공식을 새로 넣지 않았습니다.
7. Scene rect/circle의 접선 equality는 겹침이 아닙니다(0x1816925de..2608,0x18169223e..2265). 반대로 Map cell 범위는 inclusive이므로 tile 경계에 정확히 닿으면 차단할 수 있습니다.

## 실제 데이터 경계 검증

두 stage의 선택된 실제 grid에 Terrain의 MapRect overlay와 추출 tileAttributes를 적용했습니다. Player birthY raw28278784, 실제 rect bottom430.5FP에서1.5FP(raw98304) 내려 bottom432FP가 floor cell과 정확히 닿으면 map 차단, 그보다 **1raw 위는 열림**입니다. 이를 명시적인 Clear.subState2 fixture에 연결해 blocked에서는 request0 유지, open에서는 request1을 검증했습니다. 명부·실제 Clear 위치나 전체 Stage 상태를 만들어 검증했다고 주장하지 않습니다.

PRE/current 스케일·pivot, 양쪽 circle 접선/대각선, mixed shape 저장rect, inactive owner, 같은 entity/ID, secondary 저장소, LIFO slot 재사용 순서, current overlay의 flags·좌표 반영도 검증했습니다.

## 리드 host 연결

```js
host.isCollidedByPushBackTarget =
  (world, currentCollision, mask) =>
    SourcePushBackTargetQuery.isCollidedByPushBackTarget(world, currentCollision, mask);
```

또는 `createHost({getWorld:providedWorld=>currentPhaseWorld})`가 같은 Terminal 시그니처를 반환합니다. world는 다음 **현재 native 상태**를 가져야 합니다.

- `storage`: 기존 Broadphase의 완전한 primary/secondary dictionaries. source live dictionary slot을 공급해야 하며 `{collisions:currentChunk}`만 주면 throw합니다.
- `collisions`: 선택적인 current phase/chunk overlay입니다. matching registered ID의 값을 전체 storage에 덮어 읽은 뒤 active를 판정합니다. overlay에 없는 secondary·다른 chunk의 등록 collision도 여전히 조회합니다. overlay가 전체 Scene을 대신하지 않습니다.
- `map:{tileFlags}`: 실제 현재 attribute grid. mapNormals/requestMapNormals나 merged platforms가 아닙니다. dynamic Map 변경 이후 최신 grid여야 합니다.
- `nativeLayerChecks:[256 DWORD]` 또는 `layerChecks[16][16]` bool. 각 조회는 [owner][candidate] 방향입니다. 임의로 대칭화하거나 모든 layer를 true로 만들면 안 됩니다.

현재 collision에는 실제 id/entityId/flags/layer/pushBackTarget/shape/current·prePos/current·preScale/baseRect/pivot와 필요시 circleRaw가 있어야 합니다. query는 상태·캐시·위치를 바꾸지 않습니다. `evaluate`는 map-first/PRE-current 근거 trace도 반환합니다.

unresolved: shape0/1 이외의 미확정 shape, 기존 Map 코어에서 검증되지 않은 negative rectangle 및 FP shift overflow 좌표는 명시 거부합니다. Map 좌표 shift-safe 범위는[-2^47,2^47-1]raw이며 임의로 정밀도를 버리지 않습니다. 실제 전체 storage/map/layer/current owner 연결은 호스트 요구사항입니다. Terminal/dispatcher/runtime/bridge/play/Git은 수정하지 않았습니다. 신규 다섯 소유 파일만 작성·동결했습니다.
