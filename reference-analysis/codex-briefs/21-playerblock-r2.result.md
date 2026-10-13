# 21-playerblock-r2 — result

status: done

files: 수정 `source-migration/source-dossun-devices.js`, `source-migration/source-dossun-devices.test.cjs`, `source-migration/dossun-device-report.json`; 생성 `source-migration/source-playerblock-devices.js`, `source-migration/source-playerblock-devices.test.cjs`, `source-migration/playerblock-device-report.json`, `codex-briefs/21-playerblock-r2.result.md`.

tests: Dossun/Gun 파일 20 passing, PlayerBlock 파일 5 passing. 각 파일을 개별 `node --test`로 실행했다. 전체 `node --test source-migration/*.test.cjs` 최종 관측은 478 passing, 0 failures이다. 병렬 작업 중 앞선 전체 관측은 467건이었으며 다른 작업의 파일은 수정하지 않았다.

what it is: 총은 입력 9의 눌림 순간에 발사하며, 기존 총알이 완전히 소멸할 때까지 다음 총알을 만들지 않는다. 타 플레이어를 맞히면 해당 플레이어를 숨기고 일시 정지시킨 뒤 별도 solid PlayerBlock을 만들며, 맞은 플레이어가 입력 9를 누르면 블록의 위치와 속도로 복귀한다. Dossun은 Map.Move로 만든 센서의 충돌을 받아 낙하·착지·대기·복귀하며, 네이티브 collision index/layer 조건에 따라 대상 사망 이벤트를 보낸다.

stage compiles alone: **이 장치 모듈의 compile은 st_w_14_03의 2..8인 전부 성공한다. 전체 source-stage-runtime 단독 컴파일·플레이 성공을 뜻하지 않는다.** 미등록 상태이며 Claude가 아래 런타임 계약을 연결해야 한다. st_w_14_01의 총도 2..8인 컴파일하지만 해당 라운드에는 별도 BreakableRect/Text 의존성이 있다. 런타임 등록, 패키징, 배포, 커밋, 푸시는 하지 않았다.

key findings:

- PlayerBlock은 플레이어 엔티티에 붙는 컴포넌트가 아니라 **별도 actor163**이다(`Creator 0x181891282`). Initialize는 실제 플레이어 충돌 H를 복사하여 H×H, X=-H/2, Y=기존Y인 solid를 만든다(`0x18189152e..592`). 임의 플레이어 크기 상수는 없다.
- event65는 플레이어 숨김·pause·키 반환·player flag10을 요청한다(`0x1818916cd..6f1`, 수신 `0x1816c12e8..1399`). 블록이 움직인 뒤 플레이어 위치를 SetPosForce로 따라오게 한다(`0x181891b49`).
- active PlayerBlock은 시간 만료가 없다. 입력 9 edge로 event66에 블록 위치와 속도를 넣고 해제한다(`0x18189187f..936`). 숨긴 블록은 QFP._0_10 raw6553, 즉 raw1092 기준 **7틱** 후 제거되며 해제 대기 중 collision은 유지된다(`0x181891980..9ed`). event66는 player의 warpPos/warpVelo와 flags를 설정하므로 호스트의 기존 warpProc를 사용해야 한다(`0x1816c1259..12de`).
- 총알 상자는 10×10, (-5,-5)(`0x181892d98..dd1`). 접촉 시 속도0·animation2·fade raw32768이며 **31틱** 후 제거된다(`0x181892c47..c8c`, `0x181892721..774`). owner gun의 bullet ref는 OnExit에서만 해제한다(`0x181892977`). 자기 플레이어에 맞아도 총알은 사라지며 블록 생성만 제외한다(`0x181892acd`, `0x181892b73`). 비행 중 임의 수명은 없다.
- gun offset은 (21,-10), bullet offset은 (10,-7), 기본 속도6이다(`0x18189407f..13d`). effective scale과 flipH/flipV를 적용한다(`0x1818937cf..8b7`). offscreen은 카메라 수평 범위 `[left-10,right+10)`만 사용하며 Y는 검사하지 않는다(`0x181892884..8d9`).
- Dossun 센서는 `(0,10000)` Map.Move의 **out-vector Y**를 받아 local H=`FPmul(FPdiv(1,effectiveScaleY),max(outY,0))+8`, W458, X-229, Y0으로 만든다(`0x18181d225`, `0x18181d254..338`). 요청 이동량·반환 위치·고정 거리로 대체하지 않았다.
- collision+4는 **m_Index**, +1은 **m_Layer**다(`quantum-field-offsets.json`). Dossun index2 센서는 actor27/163을 허용하고 `(currentY-initialY)/localSensorH <= 0.5`에서 낙하한다(`0x18181d605..6a3`). index1 가시는 상대 layer1에 event19를 보내고, OnContacted는 phase1일 때 contactY>0인 layer1 대상에 event19를 보낸 뒤 phase2로 간다(`0x18181d6bf..703`, `0x18181d7ab..8c5`). 불사 여부는 사망 이벤트 수신 측에서 처리한다.
- Actor.Initialize는 scale=(raw65536,raw65536)을 rdata `0x182e87af0`에서 읽지만 BaseScale은 **StageComponent에서 복사**한다(`0x18169ccfa..cd02`). stage scale을 1로 추정하지 않고 호스트 인자로 받으며 누락되면 실행을 거부한다.

런타임 호출 계약:

1. 브라우저에서는 `source-playerblock-devices.js` 다음 `source-dossun-devices.js`를 로드한다. 전체 등록은 수행하지 않았다.
2. `compile(actors,count,{actorScaleRaw})`에 실제 stage base scale raw를 넘긴다. 또는 첫 `beforeStep`에 `ctx.stageActorScaleRaw`로 제공한다. `ctx.players`는 native actor의 FP 좌표·속도·scale·rect 및 id/index/color/state/sorting/flip 메타데이터를 제공한다.
3. `beforeStep(state,ctx)`에서 `ctx.mapMoveDossunSensor(request)`를 호출한다. 이 함수는 임시 collision으로 Map.Move를 수행하여 `{moveYRaw}`를 돌려준다. `ctx.input9`는 플레이어별 held map이며 `ctx.pressed9`로 native edge 결과를 직접 제공할 수 있다. 반환 equipment를 Equip/SetHoldGun에 적용한다. 총알 비행 중에는 native 카메라 영역 `ctx.cameraAreaRaw{x,width}`가 필수다.
4. 공통 actor 이동 단계에서 `moveActors(state, moveDeviceActor)`를 호출한다. 콜백은 `(actor,collisionDescriptors)`를 받고 실제 위치·속도를 갱신한다. 작업17의 이동·접촉 구현을 이 경계에서 연결한다. 중력·dt 배율·AABB 충돌을 지어내지 않았다.
5. `afterStep(state,{players,contacts})`에 **원래 순서의** `{actorId,callback,collisionIndex,otherId,otherActorType,otherLayer,contactYRaw,otherRectRaw}`를 넘긴다. 반환 event19/65/66, sounds/shakes, actorPushes, playerPositions를 처리한다. 블록의 상대 플레이어 밀어내기를 먼저 반영하고 playerPositions를 SetPosForce로 처리한다. `solids()` geometry는 FP raw이고 kind/layer/index가 있으므로 센서·가시·총알을 일반 발판으로 취급하면 안 된다.

correction history: 기존 리포트의 미해석 rectangle은 AGENTS Established facts의 H,W,X,Y로 해석했다. collision discriminator라는 표현은 m_Index로, 상대 byte1은 m_Layer로 정정했다. float parameter를 double 곱셈 대신 확정된 float32→FP trunc chain으로 수정했고 raw72089 회귀 검증을 넣었다. Round1의 올바른 숫자·phase 동작과 당시 refusal/검증 결과는 report 및 round1 보존 필드에 남겼다.

unresolved: 실제 공통 이동·접촉·Actor 생성 플래그·stage scale·equipment·카메라·플레이어 event65/66 adapter 연결은 Claude/runtime 단계에 남아 있다. Gun의 event30/41/54 및 일반 actor 이벤트 forwarding은 기존 호스트 dispatcher를 사용해야 한다. 원작 실행, 런타임 전체 연결, 인간 플레이·클리어·원본 일치 검수는 수행하지 않았다. 이 경계가 연결되기 전에는 플레이 가능한 14-3으로 집계하지 말아야 한다.
