# PlayerIndexList — result
status: done / FROZEN (정적 검증된 명부·index·native RNG helper)
files: source-migration/source-player-index-list.js, source-migration/source-player-index-list.test.cjs, source-migration/player-index-list-report.json, 이 결과 및 선점

tests: 전용28 passing; 전체1810 passing / 0 failing. 원작 실행 없음.

what it is: Stage.prepare3의 실제 GamePlayerInfo 순서 → PlayerRef raw-1 → native shuffle → signed-byte scene index list를 복원한다. native creator가 Index/PlayerIndex/ColorIndex를 선택하는 경로와 Normal/Simple의 GamePlayerInfoList 생성 규칙도 제공한다. 실제 roster·scene list·RNG snapshot을 입력받으며 네트워크 명부나 stage seed를 생성하지 않는다.

stage compiles alone: no. 실제3-2/10-4 온·오프라인2..8 총28조합의 stage 파라미터, 명시적 명부/RNG fixture, PlayerBootstrap 연결을 검증했다. session/lobby·native allocator·factory 구현은 건드리지 않았다.

## 확인된 순서

1. Normal 모드는 RuntimeConfig.IsOnline일 때 먼저 organizeJoinPlayerList(false)를 실행한다(0x18184c3b6/3dd). 그 뒤 createGamePlayerInfoList(true)를 호출한다(0x18184c403). offline Normal도 같은 true 필터이며, **offline=Simple이 아니다**.
2. Simple 모드는 createGamePlayerInfoList(false)를 호출한다(0x18184cd33). GameFunc와 IsOnline은 별도 입력이다.
3. prepare3은 limitPlayer로 scene flags bit2를 설정/해제한 뒤, shufflePlayer를 InitPlayerIndexList에 전달한다(0x18170acdf..ad0f).
4. InitPlayerIndexList는 실제 GamePlayerInfo QList 순서로 raw PlayerRef를 읽어 **1을 뺀 int32**를 scratch에 쓴다(0x1816a64b5..bf).
5. shufflePlayer1이면 **i=1..n-1 오름차순**, 매번 **Next(0,i+1)** 결과 j로 i/j를 swap한다(0x1816a64e2..655d). 임의의 descending Fisher-Yates를 넣지 않았다.
6. scratch int32의 **하위 byte**를 signed-byte scene index list에 append한다(0x1816a66dd). **이 함수는 기존 index list를 clear하지 않는다.** prepare1의 scene 초기화/실제 기존 prefix는 host 책임이다.
7. 이후 threshold0 ActorFactory.Update가 실행된다(0x18170ae0c). 실제 두 stage에는 authored Player8슬롯이 있다.

## GamePlayerInfoList 규칙

| 분기 | native 동작 |
|---|---|
| 공통 cap | join 명부의 **첫 min(count,8)개를 먼저** 취한다. 필터 뒤 빈자리를9번째로 채우지 않음 |
| Normal Func1 | Join.flags bit2(4)와 bit3(8)가 모두 있는 항목만 복사 |
| Simple Func2 | 위 필터 없음 |
| 복사 | PlayerRef raw, ColorIndex, PlayerHatNo, BattleWinCount; flags는 **bit0만** 복사 |
| count<2 | **첫 join 항목 기준 dummy를 한 번만** 추가. 첫 항목이 필터로 제외됐어도 그 항목 사용 |
| dummy 값 | rawRef>=8이면1, 아니면rawRef+1; color>=7이면0, 아니면color+1; wins0/hat0/flags4 |

따라서 전부 필터된 경우에도 loop로2명을 보장하지 않고 dummy1개만 남을 수 있다. 빈 join 명부의 first-slot 접근은 거부한다. 한 명의 rawRef8/color7은 dummy rawRef1/color0으로 wrap한다. 근거는 createGamePlayerInfoList0x18184f2d0, cap0x18184f3ae, filter0x18184f480/488, dummy0x18184f517..59b다.

온라인 Normal의 organize는 연결 flags bit1(2) 또는 Join.flags bit4(16) 조건을 검사해 제거 후보를 수집한다(0x18184eeb5..eec5). 이후 removeJoinPlayerInfo(0x18184f04d)가 raw PlayerRef 첫 일치 항목을 찾아 list 제거 helper를 호출한다(0x18184f288..2b1). 전체 connection/명부 제거 순서를 추측하지 않으며 **실제 post-organize snapshot**을 요구한다.

## RNG를 동일시하지 않고 확인한 근거

- PhotonDeterministic.dll codegen module **0x182d54da0**, method table **0x1832acad0**, method count1004를 독립 읽었다.
- Next(int,int) token06000396 → **0x181662090**, ctor(int32) token06000398 → **0x1816621c0**, NextUInt32 token06000399 →0x181662250으로 매핑된다. raw metadata 인자도 signed int32임을 검사했다.
- shuffle의 실제 call0x1816a6512가 이 Next를 호출하고 Frame globals+0xb8 RNGSession을 사용한다.
- Next의 multiplier5851f42d4c957f2d, state advance, `(old>>45) XOR (old>>27)` low32 및 old>>59 rotate, raw increment의 local OR1까지 확인했다. **같은 native 주소를 구현한 기존 Landmine.pcg32만 읽기 전용 재사용**한다.
- bounded range는 uint32 threshold `(-span mod2^32)%span`보다 작은 draw를 버린다. 단순 modulo 한 번이 아니다. 명시적 state0/inc0에서 Next(0,3)은 **[0,0,3837872008] 3draw**를 소비한다.
- raw increment가 even이어도 저장값은 바꾸지 않고 계산 때만 OR1 한다. seed0 constructor의 raw increment7960286522194355700도 그대로 보존한다.
- ctor는 signed int32 seed를 sign-extend한 뒤 두 SplitMix64를 seed+G/seed+2G에 적용한다. G9e3779b97f4a7c15, factorsbf58476d1ce4e5b9/94d049bb133111eb는 native literal이다.

`rngSnapshotFromNativeSeed(seed)`는 검증된 **constructor 경계 utility**다. 실제 stage 시작 전 draw 수를 모르면 constructor 결과를 stage-entry snapshot으로 대체할 수 없다. `initialize`는 seed만 주면 shuffle을 거부하고, 실제 `{algorithm,state,increment}` snapshot을 요구한다. 64-bit state/increment는 정확한 decimal/hex string이며 JSON round-trip 가능하다. 기본 seed·Math.random은 없다.

## 실제 stage 검증

| Stage | shuffle | 소비 |
|---|---:|---|
| 3-2 | 0 | 명부 순서 그대로, RNG0 draw |
| 10-4 | 1 | n-1 **range call**, rejection에 따라 raw draw는 더 많을 수 있음 |

온/오프라인 각각2..8인에 실제 variant/population/Player8슬롯을 읽었다. offline fixture 명부는 rawRef1..n, online fixture는 `[8,3,6,1,5,2,7,4]` 일부이며 색상도 다르게 주었다. 이들은 **실제 세션 캡처라고 주장하지 않는 명시적 host fixture**다. seed42 native constructor 경계/이전draw0 fixture에서 반복 실행·JSON 복원 결과가 같고, RNG를 한 번 advance한 입력은 다른 결과를 내는 것도 검증했다.

참고로 rawRef1..8 명부, n8, 위 seed42 fixture의 index list는 `[2,6,3,0,5,4,7,1]`이다. 다른 명부/entry snapshot에 이 값을 하드코딩하면 안 된다. 각28조합의 명부·range raw draws·post RNG·선택 결과는 JSON actualStageVerification에 있다.

## Index / PlayerIndex / ColorIndex / limit

- **Index**: 실제 scene PlayerInfoList의 현재 성공 생성 count. authored 이름/배열순번이 아니다. native0x1816a4000에서 읽는다.
- **PlayerIndex**: 위 count 위치의 scene index-list byte. creator는 unsigned0..255로 읽고, Player.Initialize는 signed byte에 저장한다.
- **ColorIndex**: unsigned PlayerIndex+1과 **full raw PlayerRef가 같은 첫 GamePlayerInfo**의 color byte. 조회는0x181746598..59e, 색상 읽기는0x1816a4062다.
- limit bit2가 있고 count>=indexList.count이면 creator 호출 전 skip한다. bit2가 없으면 범위 밖 QList access가 에러이며 modulo wrap이 아니다.
- missing GamePlayerInfo/null Player.CreateEntity는 성공 count를 늘리지 않는다. 성공한 Player.CreateEntity0x1816a3a82 뒤에야 PlayerInfoList append0x1816a3b5d가 있고, outer scene AddActor0x1816a3687는 그보다 나중이다.
- native는 duplicate rawRef의 첫 일치를 사용한다. helper는 dummy 때문에 생길 수도 있는 중복을 보존한다. 기존 PlayerBootstrap.compile의 중복-index 거부 범위를 우회하려고 deduplicate하지 않는다.

## API / host 계약

- `createGamePlayerInfoList(joinRoster,{gameFunc:1|2,online,postOnlineOrganizeVerified})`: 실제 ordered join 명부의 해당 native 생성 단계. Normal online만 postOnlineOrganizeVerified:true 필수.
- `initialize(gameRoster,{sceneFlags,limitPlayer:0|1,shufflePlayer:0|1,existingIndexList,rngSnapshot})`: 성공 경로의 순수 snapshot helper. 결과에는 indexList, 사용된 scratchPrefix, rangeCalls/rawDraws/drawCount, post rngSnapshot이 있다.
- `selectPlayer(state,createdPlayerCount,currentGameRoster)`: read-only 선택. selected / limit-player-skip / missing-game-player-info를 반환하며 counter나 EntityRef를 생성하지 않는다.
- `toBootstrapGamePlayerInfos(gameRoster)`: 기존 PlayerBootstrap용 signed-byte playerIndex/colorIndex projection. 원본 raw GPI는 별도 보존한다.
- `rngSnapshotFromNativeSeed(seed)`, `nextRange(snapshot,min,max)`: 위에서 검증한 native ctor/range utility.

host가 실제 명부·GameFunc/IsOnline·post-organize 결과·기존 scene list/count·stage-entry RNG state/raw increment·creator 성공 결과를 공급해야 한다. 모든 후속 RNG 소비자는 반환된 post-state를 이어 써야 한다. static scratch 사용되지 않은 tail, QList 메모리/handle/capacity, lobby/session protocol, 전체 earlier RNG history, EntityRef/충돌 allocation 및 실패 중 native partial mutation은 구현하지 않았다. unknown 값은 추측하지 않고 거부한다.

NativeCreationOrder/PlayerBootstrap/Population/RNG source core와 기존 factory/runtime/bridge/다른 파일·공유 문서·Git 변경 없음. 본인 신규 파일만 작성하고 동결한다.
