# 6-3 PlaneObstacle 구현 스펙 (정적 분석, 2026-10-17)

출처: 저장형 Ghidra 의사코드 `source-migration/pobs.local.txt`, `pobs2..4.local.txt` (커밋 안 됨, `decompile.sh` 로 재생성) +
`tools/disasm.py` 어셈블리 확인. FP = 16.16 raw. 좌표계 y 아래로 증가(QGameDefine FAIL_UP_Y = −2400, FAIL_DOWN_Y = +2400).
**[확인]** = 어셈블리로 확인, **[의사코드]** = Ghidra 의사코드만, **UNCONFIRMED** = 확인 못 함.

> 앞서 알려진 내용 중 고칠 점 (아래에 근거 있음):
> - 슬롯 3 은 RectType 이 아니다. 슬롯 3 → `m_OffsetIndex`(+1), **슬롯 6 → RectType(+0x19)** 이 DamageRect/Rect 를 정한다.
> - 슬롯 5 = 0 이면 Random 은 0 이 아니라 **기본값 100** 이다(Reset). 그래서 6-3 은 장애물마다 RNG 로 세로 위치를 고른다.
> - +0x20 은 CurveStep 이다(m_Level ≥ 1 이면 ×2). 6-3 에서는 쓰이지 않는다.
> - 6-3 은 MoveSpeed = 0 이라 벽 조각이 **전혀 움직이지 않는다**. OnPost 는 왼쪽으로 빠져나간 조각을 지우는 일만 한다.

## 0. 액터·콜백 연결
- 타입 25 PlaneObstacle → `NormalPlaneObstacleComponent.Creator` 0x181887ab0 (creator-delegates-resolved). 갱신 콜백
  (actor-lifecycle-report): OnStart 0x181888240, OnPost 0x181888310, OnExit 0x181888170, OnRecvEvent 0x1818883e0, OnUpdate 없음.
- Creator: `PlaneObstacleComponent.Initialize` 0x18188e8b0 (ObstacleComponent.Initialize 0x18188a420 = 조각 목록 할당,
  `PlaneObstacle_Param.Reset` 0x181699c40, `m_PrevRandom`(+4) = −1) → `ParseParameter` 0x181887cf0.
- OnStart 0x181888240 → PlaneObstacleComponent 를 찾아 tail-jmp `generateObstacles` 0x18188eb90 (0x181888300) [확인].
  (`PlaneObstacleComponent.OnStart` 0x18188ea10 도 `jmp 0x18188eb90` 일 뿐 [확인].)
- OnPost 0x181888310 → jmp `PlaneObstacleComponent.OnPost` 0x18188ea20 (0x1818883d0) → jmp `ObstacleComponent.OnPost` 0x18188a670 (0x18188eabe).
- OnRecvEvent → `PlaneObstacleComponent.OnRecvEvent` 0x18188ead0: 이벤트 0x35(53, pause) 를 받으면 조각 전부에 0x35 를 다시 보냄
  (IsPause 복사, 0x18188ead0 의 목록 순회). 나머지 이벤트는 공통 Actor 처리.

## 1. 파라미터 구조체와 정적 상수
필드 이름: `quantum-field-offsets.json` (인스턴스 오프셋 = il2cpp − 16). 오프셋은 **PlaneObstacleComponent 기준**.

| 오프셋 | 필드 | 6-3 값 | 출처 |
|---|---|---|---|
| +0x00 sbyte | m_Level | 0 (슬롯1, 0 이 아닐 때만 씀) | 0x181888018 |
| +0x01 sbyte | m_OffsetIndex | 0 (슬롯3, ≠0 일 때만) | 0x18188805e |
| +0x04 int | m_PrevRandom | −1 (Initialize) | 0x18188e8b0 |
| +0x08 | m_EntityRef (ObstacleComponent 가 있는 엔티티) | — | |
| +0x10 FP | m_OffsetX | 0 (슬롯4, ≠QFP._0 일 때만) | 0x181888093 |
| +0x18 byte | Param.BreakableLevel | **4** (= 종류 8 − 4) | 0x181887eda |
| +0x19 byte | Param.RectType | **≤4인 0 / ≥5인 1** (슬롯6, `(raw>>16)` 하위 바이트, 무조건 씀) | 0x181887e86, 0x18188814b |
| +0x1a byte | Param.Type (1 Road, 2 Curve) | 1 | 0x181887ed5 |
| +0x1c int | Param.HasPushBox | 0 | (종류 1 일 때만 1, 0x181887ff3) |
| +0x20 FP | Param.CurveStep | 10 (Reset; m_Level ≥ 1 이면 ×QFP._2) | 0x181699cc9, 0x1818880cc |
| +0x28 FP | Param.MoveSpeed | 0 (종류 2 = −MOVE_SPEED 0x181887fdf, 3 = +MOVE_SPEED 0x181887f9f) | 0x181887f68..0x181887fe3 |
| +0x30 FP | Param.MoveSpeedGapHeightScale | 78643 (1.2, QFP+0x100; Reset 값 1.0 을 덮어씀) | 0x181888147 |
| +0x38 FP | Param.Random | **100 (6553600)** — 슬롯5 = 0 이라 Reset 기본값 유지 | 0x181699cb0, 0x1818880c3 |
| +0x40 FP | Param.Width | 480 (31457280, 슬롯2) | 0x18188804c |

- 종류(슬롯0) 분기 0x181887e93..0x181887ede [확인]: 0 Road / 1 Road+PushBox / 2·3 Road + MoveSpeed ∓0.5 /
  4·5 Curve + CurveStep ∓10 / **≥6 Road + BreakableLevel = 종류−4**.
- 6-3 데이터(`installed-stage-decoded.local.json`, variant 0 하나뿐): `[8,0,480,0,0,0,RT]`, 위치 (1656,336) (2616,240) (3624,216) (4536,312).
  playerCount −4 묶음은 RT=0, 5 묶음(Obs1..4)은 RT=1. `population-rules.cjs` 로 2..8인 확인: 2~4인 RT0 4개, 5~8인 RT1 4개.
- 정적 상수
  - NormalPlaneObstacleComponent (TypeInfo 0x18316e460, .cctor 0x1818884d0): MOVE_SPEED = QFP+0x90 = 0.5, CURVE_STEP = QFP+0x170 = 10.
  - ObstacleComponent (TypeInfo 0x1831b5660, .cctor 0x18188b490): RECT_HEIGHT = QFP+0x230 = **1000** (65536000).
  - QGameDefine (TypeInfo 0x1831c3b18, .cctor 0x181780720, `--cctor` 로 읽음): +0 MAP_CHIP_SIZE_FP = **48**, +0x20 WINDOW_WIDTH = 853.333 (raw 55924053),
    +0x28 WINDOW_HEIGHT = 480 (31457280).
  - QFP (TypeInfo 0x1831d0a40): `notes/qfp-table.md` (+0 0, +0x88 0.4, +0x98 0.6, +0xf8 1.1, +0x100 1.2, +0x118 2, +0x188 20, +0x190 25,
    +0x1c0 50, +0x1e0 85, +0x230 1000).
  - PlaneObstacle_Param.Reset 0x181699c40 [확인]: Param+0x18 = 1.0, **Param+0x20(Random) = 100**, Param+0x8(CurveStep) = 10.

## 2. 생성 (OnStart → generateObstacles 0x18188eb90 → GenerateRoad 0x18188ed70)
generateObstacles: `Type != 0` 일 때만. 먼저 `actor.posX += m_OffsetIndex × (Frame.GetPlayerActorCount − 2) × m_OffsetX`
(int×FP, >>16 없음; 6-3 은 0). Type 1 → GenerateRoad, 2 → GenerateCurve 0x18188f790 (6-3 안 씀). Param 은 **복사본**으로 넘김.

### 2.1 randomY 0x181890120 (Random = 100) [확인]
```
n = int((Random<<16) / QFP._25 >> 16)            // 100/25 = 4      (QFP+0x190)
if n < 1: return QFP._0
list = QUtility.IndexList (공용, 비움 0x181787130)
for i in 0..n-1:
  if m_PrevRandom < 0 or (|i - m_PrevRandom| - 2) as uint <= 4: list.Add(i)   // 0x181890251..0x181890261 (|d|∈[2,6])
k = RNG.Next(0, list.Count)                       // FUN_181662090, rng = *(frame+0xc8)+0xb8   (0x1818902b7)
m_PrevRandom = list[k]                            // 컴포넌트 +4 에 저장
return (−Random<<16)/QFP._2 + m_PrevRandom × QFP._25 // = 25·m_PrevRandom − 50
```
6-3: 장애물마다 m_PrevRandom 이 처음 −1 이라 후보 {0,1,2,3} 전부 → **Next(0,4)** 1회 → 세로 오프셋 −50/−25/0/+25.

### 2.2 GenerateRoad, BreakableLevel ≠ 0 경로(6-3) [확인]
```
y   = actor.posY + randomY()                                  // 0x18188ee26, 0x18188ee60
T   = QGameDefine.MAP_CHIP_SIZE_FP (48)
y   = (((y<<16) / T) & ~0xFFFF) * T >> 16                     // 48 격자로 내림(부호 있는 나눗셈 후 소수 버림) 0x18188eec6..0x18188eeff
gap = BreakableLevel × T                                      // 4×48 = 192  0x18188ef03
if MoveSpeed != QFP._0: (아래 2.3 의 방향 보정)               // 6-3 은 0 → 건너뜀 0x18188f08f
if BreakableLevel 짝수: top = y − (gap<<16)/QFP._2            // y − 96
else:                    top = y − (BreakableLevel>>1)×T       // 0x18188f1fb..0x18188f20e
R = ObstacleComponent.RECT_HEIGHT (1000); X = actor.posX; W = Width (480)
rectA = {H: R + top, W, X, Y: −R}      // 위 벽: y −1000 .. top
rectB = {H: R,       W, X, Y: top+gap} // 아래 벽: y top+192 .. top+1192
ObstacleComponent.GenerateRect_18188b300(obs, frame, RectType, rectA, MoveSpeed)   // 0x18188f3c2
ObstacleComponent.GenerateRect_18188b300(obs, frame, RectType, rectB, MoveSpeed)   // 0x18188f483
if HasPushBox: GeneratePushBox 0x18188fec0                    // 6-3 아님
→ 2.4 색 블록
```
- rect 구조체 순서는 **Height, Width, X, Y** (Key 에서 확인된 규칙과 같음).
- 6-3 계산값 (posY+오프셋 → 격자 중심 y, 빈틈 = 중심±96):
  | 장애물 | k=0 | k=1 | k=2 | k=3 |
  |---|---|---|---|---|
  | (1656,336) | 240 | 288 | 336 | 336 |
  | (2616,240) | 144 | 192 | 240 | 240 |
  | (3624,216) | 144 | 144 | 192 | 240 |
  | (4536,312) | 240 | 240 | 288 | 336 |

### 2.3 BreakableLevel = 0 경로 (종류 0~3, 6-3 아님) [확인]
```
gap = 85 + (cnt <= 4 ? (cnt−2)×5 : 50 − (m_Level >= 2 ? 20 : 0))    // cnt = Frame.GetPlayerActorCount 0x18188ef48; QFP+0x1e0/+0x1c0/+0x188
if |MoveSpeed| >= 4 raw: gap = gap×GapHeightScale>>16; if cnt <= 4: gap = gap×QFP._1_10>>16   // 0x18188eff6, 0x18188f043
y 는 격자에 맞추지 않음. MoveSpeed != 0 이면: y < 0.4×480(raw 12582720) → MoveSpeed = +|MoveSpeed|,
  y > 0.6×480(raw 18874080) → −|MoveSpeed| (y-down 기준 화면 가운데 쪽으로)   // 0x18188f0c1..0x18188f16c
top = y − gap/2 (gap<<16 / QFP._2) — 이하 rectA/rectB 동일
```

### 2.4 색 블록 (맵 칩) [확인]
```
cols = MapBlockReplacerComponent.GetValidColorIndexArray(frame, requireGun=true)   // 0x18188f539
n = cols.Length
for i = 1; i < n; i++:                         // 0x18188f560..0x18188f5cc
  j = RNG.Next(0, i+1)                         // FUN_181662090
  swap(cols[i], cols[j])
half = (T<<16)/QFP._2                          // 24
col  = int((Width − half + posX) >> 16) / 48   // C# int 나눗셈(0쪽 버림), 0x18188f61a..0x18188f67a
row0 = int((top + half) >> 16) / 48
map  = Frame.GetMap
for k = 0 .. BreakableLevel−1:                 // 0x18188f6b0..
  c = (byte) cols[(k >> 1) % n]                // cdq/idiv, 위 2칸 = cols[0], 아래 2칸 = cols[1 % n]
  ModifyMapChip 인라인: (col, row0+k) 가 범위 안(0≤x<m_TileWidth(+0x1004), 0≤y<m_TileHeight(+0x1002), y·W+x < 0x1000)이면
  m_MapData[y·W+x] = c + 0x1E
```
- GetValidColorIndexArray 0x18187c6b0 [확인]: 새 List. `Frame.GetStage` 가 null 이면 빈 배열. i = 0..`ActorScene.GetPlayerIndexCount`−1
  (0x1816a8000, ActorScene+0x2c 목록 길이): `p = ActorScene.GetPlayerByActorIndex(scene, frame, i)` (0x1816a8200, +0x30 목록);
  p 가 있고 (requireGun 이면) `hasGunByPlayerIndex(frame, i)` 이면 `list.Add((sbyte)p.m_ColorIndex)` (PlayerComponent+7, 0x18187c861).
  `ToArray` 반환(호출마다 새 배열, 0x18187c897). m_ColorIndex 정의는 `player-index-list-report.json` (GamePlayerInfo 색 바이트).
- hasGunByPlayerIndex 0x18187c8b0: `Frame.GetPlayerByActorIndex(frame,i)` → `PlayerComponent.GetEquip` 액터 타입 == 0x6c(108 PlayerGun).
  총은 PlayerGun 생성 때 `PlayerGunComponent.ParseParameter` 0x1816cd810 안의 `PlayerComponent.Equip` 으로 장착됨 → 6-3 은 있는 플레이어 전원이
  총을 가지므로 n = 인원수. (생성 < OnStart 순서라고 가정 — 스케줄 순서 자체는 UNCONFIRMED.)
- n = 0 이면 `% 0` 으로 DivideByZero 가 날 경로(6-3 에서는 일어나지 않음).
- 6-3 칸 좌표: col = 44 / 64 / 85 / 104 (장애물 순). row0 = 중심/48 − 2 (중심 336→5, 288→4, 240→3, 192→2, 144→1). 행 row0..row0+3 이
  빈틈 4칸을 정확히 막음. 6-3 맵은 124×10 칸, 시작 바닥(9행 0~18열, 칩 3·5) 외엔 전부 0 이라 덮어쓸 기존 칩 없음 (`source-geometry.local.json`).

### 2.5 RNG 순서 (장애물 1개당, 인원 N)
1) randomY: `Next(0, 4)` 1회. 2) 셔플: `Next(0,2), Next(0,3), …, Next(0,N)` (N−1회). 합계 N회.
`FUN_181662090(rng, lo, hi)` 0x181662090 [의사코드, 사용자 설명과 일치]: lo==hi 이면 lo; min/max 정렬; range = max−min;
PCG32 XSH-RR(state·0x5851f42d4c957f2d + (inc|1)) 출력이 `(2^32−range) % range` 미만이면 다시 뽑기; `min + r % range`.
RNG 위치 `*(frame+0xc8) + 0xb8` (0x18188f560, 0x181890296). **UNCONFIRMED:** 장애물 4개(와 다른 액터)의 OnStart 호출 순서 — 생성 순서로 추정.

## 3. 조각 액터 (ObstacleComponent.generateRect 0x18188afc0, GenerateRect_18188b300 0x18188b300) [의사코드]
- 공용 QActorCreateParam(`QUtility.get_QActorCreateParam` 0x181787250 가 pos/type/name 과 datas 전 슬롯(t=0, 값 0, 문자열 null)을 비움):
  type = `RectType != 0 ? 0x1E(30 Rect) : 9(DamageRect)`, posX = rect.X, **posY = rect.Y + rect.H**, datas[0] = W (t1), datas[1] = H (t1).
  → 생성 delegate → `ActorSceneComponent.AddActor(pos)`. 이름은 `ActorFactoryComponent.GetUniqueName`.
- 두 타입 모두 ParseParameter 가 로컬 rect = {H: d1, W: d0, X: 0, Y: −H} (DamageRect 0x18180ded0, Rect 0x1816e69a0) → 실제 범위
  **[X, X+W] × [rect.Y, rect.Y+H]** (위 2.2 의 rectA/rectB 그대로). Rect 는 d2..d5 와 FP7 문자열(슬롯6·7)로 인원별 보정을 하지만
  모두 0/null → 보정 없음 (FP7 디코더 0x18096f720: 문자열 null/빈 문자열이면 0).
- 충돌 (`ActorComponent.CreateCollision` 0x18169f4d0: rect 저장, m_CollisionType=0, `Collision.initialize` 0x181690a90 가 m_PushBackTarget(+3)=2):
  - DamageRect `InitCollision` 0x18180dfc0: m_Layer(+1) = 6, m_Flags(+6) |= 0x14; Creator/InitPost 에서 Actor 플래그 |= 0x40000;
    **OnStart 0x18180e0e0 이 `SetCollisionActive(false)`** (0x18169ff50, m_InactiveCollisionEntity = 자기) → 밀어내지 않음.
    OnUpdate 0x18180e190 / checkDamage 0x18180e330 가 접촉한 플레이어에게 이벤트 43(CauseDead 0) = 즉사
    (세부는 `damage-rect-update-report.json`).
  - Rect `InitCollision` 0x1816e6d90: (u16)+0 = 0x602 → m_Attribute 2, m_Layer 6, m_Flags |= 0x14 → 단단한 벽(기존 런타임 'Rect' 와 같음).
    갱신 콜백은 OnRecvEvent 뿐.
  - 레이어 6 = CollisionLayer.Object2 (enum 이 선언 순서대로 0부터라면; 총알이 layer 1=Player, 8=Enemy 로 판정하는 것과 맞음 — 값 자체는 UNCONFIRMED).
- 조각 목록: Obstacle_Info{IsEnableVelo = (|MoveSpeed| ≥ 4 raw), EntityRef, Velo = (0, MoveSpeed)} 를 ObstacleComponent 목록에 Add
  (0x18188b300). 6-3 은 IsEnableVelo = false, Velo = (0,0).
- 총알: `ResuablePlayerGunBulletComponent.OnCollided` 0x1816e8f30 — 부딪힌 액터 타입이 9/0x1C/0x1E 면 총알 비활성 → **벽 너머로 못 쏨**.

## 4. OnPost (ObstacleComponent.OnPost 0x18188a670) — 매 프레임 [의사코드]
```
view = Camera.CalcCameraViewStageArea()                  // 0x1817dfd10, {H, W, X, Y} 스테이지 좌표
limit = view.X + view.W + ((QFP._1_20 × WINDOW_WIDTH)>>16 − WINDOW_WIDTH)   // 여유 raw 11184639 = 170.664 px
for info in 목록:
  a = Frame.GetActor(info.EntityRef); 없으면 넘어감
  if NotifyEvent(a, 이벤트 4) == 0:  a.m_Flags |= 0x2000 (exit); 목록에서 제거(루프 뒤 공용 EntityList 로 RemoveAt)
  elif info.IsEnableVelo and a.posX < limit:  a.m_Velo(+0xf0/+0xf8) = info.Velo; info.IsEnableVelo = 0
```
- 이벤트 4 응답: DamageRect 0x18180ebf0 / Rect 0x1816e6e70 모두 `view.X <= a.posX + rect.X + rect.W` (1 = 유지).
  → **조각의 오른쪽 끝이 카메라 왼쪽 끝보다 왼쪽으로 가면 삭제.** 6-3 은 위·아래 벽이 X 가 같아 같은 프레임에 지워짐.
- 6-3 은 IsEnableVelo 가 모두 0 → 속도 적용 없음. 벽은 제자리에 있고 카메라(scrollType 2, autoScrollSpeed 3)만 지나감.
- 맵 칩(색 블록)은 지우지 않음. PlaneObstacle 액터 자신도 이 코드로는 지워지지 않음. OnExit 0x181888170 은 목록 메모리만 해제.

## 5. 맵 칩
- `MapComponent` (TypeInfo 0x1831c8f08): m_MapData +0 (0x1000 바이트, 행 우선 y·W+x), m_Flags +0x1000, m_TileHeight +0x1002, m_TileWidth +0x1004.
  칸 (x,y) = 월드 [48x, 48x+48) × [48y, 48y+48) (`export-source-geometry.py` 의 coordinateEvidence).
- `ModifyMapChip` 0x18187db40 [의사코드]: 범위 검사(0≤x<W, 0≤y<H, y·W+x<0x1000) 후 바이트 하나 쓰기. frame 인자 안 씀, 다른 부작용 없음
  (SetMapChip 0x18187d8d0/0x18187d910 과 같음).
- `QTileMapChipAttrData.Get` 0x181781820: chip > 0x4E 이면 0, 아니면 .cctor 0x1817818b0 가 만든 80 바이트 표[chip]
  (`source-geometry.local.json.tileAttributes`, 메타데이터 blob 에서 추출). 비트: 1 Collision, 2 Ice, 4 Break, 8 BreakColor, 16 Fall.
  **칩 0x1E..0x26 (30..38) = 13 = Collision|Break|BreakColor** (색 0..8), 0x27 = 1, 칩 0·1 = 0. 맵 충돌은 질의 때 `GetMapChipAttr` 0x18187daa0 로 읽음.
- 색 블록 깨기 `ResuablePlayerGunBulletComponent.OnContacted` 0x1816e8c70 (맵 접촉 갈래) [확인 0x1816e8e59..0x1816e8e97]:
  SE 3 재생 → 접촉 칸 칩의 속성에 8 이 있고 `칩 − 0x1E == 총알 주인(m_ParentPlayer +0x18) 의 m_ColorIndex` 이면
  `ModifyMapChip(x, y, 1)` → 칩 1(속성 0) = **통과 가능**. 색이 다르면 칩은 그대로, 총알만 비활성.
  칩 1 과 0 은 시뮬레이션에서 차이 없음(기존 PlayerContactQueries 도 chip<2 를 빈칸 취급). 칩 1 의 그림(부서진 표시 등)은 UNCONFIRMED(뷰 쪽).
- 6-3 스테이지 값 isShowBreakColorNumber = true → `MapComponent.Initialize` 0x18187d4f0 가 m_Flags |= 2 (`IsShowBreakColorNumber` 0x18187d2a0).
  색 블록에 번호를 그리는 뷰 동작으로 추정 — UNCONFIRMED.

## 6. 정리: 6-3 에서 장애물이 하는 일
1. 장애물 4개(인원 무관 같은 위치). 각자 OnStart 에서 RNG 로 빈틈 위치(격자 48 단위, 표 2.2) 결정.
2. 폭 480 의 위 벽(y −1000..top)·아래 벽(y top+192..top+1192). **2~4인 = DamageRect(닿으면 즉사, 안 막힘), 5~8인 = Rect(단단한 벽, 안 죽음).**
   ≤4/≥5 묶음의 차이는 이 슬롯 6 하나뿐이다(종류·위치·폭·슬롯 4/5 동일).
3. 빈틈 4칸(열 col, 행 row0..row0+3)을 BreakColor 맵 칩으로 막음: 위 2칸 = 셔플된 색 배열[0], 아래 2칸 = [1 % N]. 인원 ≥2 이면 서로 다른
   두 플레이어 색. 해당 색 플레이어의 총알만 칩을 1 로 바꿔 길을 연다.
4. 벽은 움직이지 않고, 카메라 왼쪽 밖으로 완전히 나가면 삭제. 총알은 벽에 막힌다.
5. 길 자체는 맵 칩이 아니다(두 벽 액터 사이 공간). 맵 칩을 쓰는 건 색 블록뿐.
6. 슬롯 4(m_OffsetX)·슬롯 3(m_OffsetIndex): 인원수 따라 X 를 `OffsetIndex×(cnt−2)×OffsetX` 만큼 옮기는 장치 — 6-3 은 0.
   슬롯 5(Random): 세로 무작위 폭, `floor(Random/25)` 개 레인(간격 25, −Random/2 부터), 직전 레인과 2~6 차이 나는 것만 후보; 0 은 "기본 100".

## UNCONFIRMED 목록
- 장애물 4개와 다른 액터들의 OnStart 순서(=공용 RNG 소비 순서), 그리고 그 시점의 RNG 상태.
- 실행 중 생성된 DamageRect/Rect 조각의 InitPost/OnStart 가 저작 액터와 같은 경로로 도는지(DamageRect 의 SetCollisionActive(false) 에 필요).
- CollisionLayer 6 의 이름(Object2)과 m_Attribute 2 / m_Flags 0x14 의 정확한 의미 — 기존 런타임 Rect 구현을 그대로 쓰면 됨.
- 칩 1 과 isShowBreakColorNumber 의 화면 표현(뷰 레이어).
- GenerateCurve(종류 4·5)·GeneratePushBox(종류 1)는 6-3 에서 쓰지 않아 상세 분석 안 함.
