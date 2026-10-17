# 사격 적 명세 (6-1·6-2) — ShootingEnemySpawner / ShootingEnemy / OptimizedBullet / 맵 색블록 — 2026-10-17 (Claude)

저장형 Ghidra(`tools/ghidra/decompile.sh`) 와 `tools/disasm.py --raw` 로만 읽음. 원작 실행 없음.
출력: `source-migration/shoot1~6.local.txt` (커밋 안 됨, 같은 명령으로 다시 뽑힘).
표기: 구조체 오프셋 = quantum-field-offsets.json 값 − 0x10. FP = 16.16, `mul(a,b)=(a*b)>>16`, 60 Hz dt = 1092.
정적 상수는 `resolve-string-literals.local.py --cctor` 로 확인한 raw. 확인 못 한 것은 **UNCONFIRMED** 로 표시.
PlaneObstacle / GetValidColorIndexArray 상세는 `plane-obstacle-spec.md` (다른 도우미) 를 볼 것.

---------------------------------------------------------------------------------------------------
## 1. ShootingEnemySpawner (actor 113, ShootingEnemySpawnerComponent)

필드(+): SpawnCount b0, SpawnedCount b1, StopLengthOffset i4, Active i8, CreatedEnemyList 0xc, PathPositions 0x10,
AttackDirection 0x14, AttackTiming 0x18, EntityRef 0x20, AttackSpeed 0x28, BulletVelocity 0x30, ShootingRange 0x38,
SpawnInterval 0x40, Timer 0x48.

**Initialize 0x181706cb0**: AttackSpeed = 1.0, BulletVelocity = 1.0, ShootingRange = −1.0, Active = 0,
PathPositions = 새 리스트(용량 4). Timer 는 안 씀(0).

**datas 슬롯** (Creator 0x181706ba0 가 ParseParameter 0x181706e00 를 인라인; 저장 주소는 disasm 으로 확인):

| 슬롯 | 의미 | 변환 | 저장 |
|---|---|---|---|
| 0..7 | 경로 4점 (x0,y0,…,x3,y3), 스포너 위치 기준 **상대 px** | UnpackVector2ArrayParam 0x181786800(start 0, max 4): 숫자 아닌 칸은 0, **(0,0) 쌍을 만나면 거기서 끝** | +0x10 리스트 |
| 8 | 소환 수 | int, 숫자 아니거나 <1 → 1, >16 → 16 | +0 |
| 9 | 소환 간격(초) | FP, 숫자 아니거나 < 0.5(0x8000) → 0.5 (0x181706edd) | +0x40 |
| 10 | 정지 길이 오프셋(px) | int | +4 |
| 11 | 공격 타이밍 0 Always / 1 FinishedMoving | int | +0x18 (0x181706fe7) |
| 12 | 공격 방향 0 Left / 1 Right / 2 RandomPlayer / 3 NearestPlayer | int | +0x14 (0x181707023) |
| 13 | 공격 속도 배율 | FP (숫자 아니면 0) | +0x28 |
| 14 | 탄속 배율 | FP | +0x30 |
| 15 | 처음부터 활성 | int == 1 | +8 |
| 16 | 사거리(px), ≤0 이면 무제한 | FP | +0x38 |

6-1·6-2 공통 데이터: Spawner1 (1600,144) `[-500,0, 0,432, -1200,432, _,_, 3, 1, 50, 0, 3, 1.5, 1, 1, 0]`,
Spawner2 (1600,576) 는 y 부호만 반대(0,−432),(−1200,−432). → 경로 3점(4번째 (_,_)=(0,0) 에서 끊김), 3기, 1초 간격,
정지 오프셋 50, Always, NearestPlayer, 공격속도 1.5, 탄속 1, 활성, 사거리 0(무제한).

**OnStart 0x181707120 → createCache 0x181707410** (Ghidra 가 한 함수로 보여 줌): 경로 리스트를 배열로 복사하고
i = 0..SpawnCount−1 마다:
1. `Frame.GetFactoryParam(0x70)` (= ShootingEnemy 112) 로 엔티티 생성, ShootingEnemy.Initialize →
   ParseParameter_181703a30(아래 묶음) → InitCollision → InitPost.
   묶음 = {경로배열, timing(+0x18), direction(+0x14), attackSpeed(+0x28), bulletVelocity(+0x30), range(+0x38),
   **정지오프셋 FP = (i × StopLengthOffset) << 16**}.
2. `ActorSceneComponent.AddActor` 0x1816a71d0 로 **스포너 위치**에 추가 (→ 적의 m_InitPos = 스포너 위치).
3. 이벤트 49(0x31) 를 적에게: +0x18 = 스포너 EntityRef(소유자), +0x74 = 0 → **SetActive(false)** (안 보이고 업데이트·충돌 없음).
4. CreatedEnemyList 에 추가.
→ 6-1 에선 스포너 2개 × 3기 = 6기가 시작 시 모두 만들어져 숨어 있다.

**OnUpdate 0x181707190** (Active 일 때만): `Timer -= dt`; `Timer < 1`(≤0) 이면 CreatedEnemyList[SpawnedCount] 를
`ActorComponent.SetActive(true, owner=스포너)`, 그 적의 m_Active(+4) = 1 (0x1817073af), SpawnedCount++ (0x1817073b7),
Timer = SpawnInterval (0x1817073c7). SpawnedCount ≥ SpawnCount 이면 스포너 actor 플래그 |= 0x2000(프레임 끝 제거).
Timer 초기값 0 → **첫 OnUpdate 에 1기, 그 뒤 61 업데이트마다 1기** (65536 − 1092·61 < 1). 6-1: 업데이트 1, 62, 123.
카메라·스크롤 트리거는 이 컴포넌트에 **없음**(스포너 x=1600 은 화면 오른쪽 밖에서 시작).

**OnRecvEvent 0x181707c90**: 이벤트 61(0x3d) → Active = 1 (슬롯15=0 인 스위치 연동용). 나머지는 base.
OnExit 0x181707d30: 두 리스트 해제. 사용 RNG 없음(적 Initialize 쪽에서 소비, 아래 6절).

---------------------------------------------------------------------------------------------------
## 2. ShootingEnemy (actor 112, ShootingEnemyComponent)

필드(+): HitPoint b0, TargetPathIndex b1, Active i4, IsDisappear i8, MovingFinished i0xc, Resuable i0x10,
CreatedBulletList 0x14, PathPositions 0x18, AttackDirection 0x1c, AttackTiming 0x20, EntityRef 0x28, HomingTarget 0x30,
InRangePlayerArray 0x38(EntityRef×8), AttackSpeed(=발사 간격) 0x78, AttackTimer 0x80, BulletVelocity 0x88,
DamageEffectTimer 0x90, DisappearTime 0x98, MoveSpeed 0xa0, Random 0xa8, ShootingRange 0xb0, Timer 0xb8, OffsetPos 0xc0.

**.cctor 0x1817062f0**: COLLISION_RECT (H,W,X,Y) = (48,48,−24,−24); EFF_DAMAGE_BLINK_TIME 6553(0.1);
FIRE_RATE 98304(1.5); BULLET_SPEED 196608(3); DISSAPEAR_TIME '0.5'=32768; MARGIN '500'; ROT_SPEED_PER_SEC '60';
VALID_TIME '16'.

**Initialize 0x181703720**: MoveSpeed = 3.0 (0x181703784, ParseParameter 가 안 바꿈 — disasm 확인), AttackSpeed 1.5,
BulletVelocity 3.0, ShootingRange −1, Active 0, **HitPoint = 2** (`mov word [rdi],2` 0x1817037b4, 경로 인덱스 0 동시),
Random = 프레임 RNG Next(0,100) 인라인(PCG32, 거부 임계 0x60) → `(r<<16)/100` FP, PathPositions = 새 리스트(용량 8),
Timer = 0. AttackTimer/DamageEffectTimer 는 0(새 컴포넌트).

**ParseParameter_181703a30** (스포너가 주는 묶음):
- 경로가 비면 목록 비운 채 아래 공통 처리만.
- 아니면 목록을 비우고, 시작점 (0,0) 에서 경로점을 잇는 픽셀 FP 길이 합 `total` (FPSqrt 0x181640c40,
  `sqrt((dx²>>16)+(dy²>>16))`). `stop = total − 정지오프셋`. stop < 1 이면 목록 빈 채 끝.
- 각 구간 i(prev = i==0 ? (0,0) : p[i−1]) 를 누적하며, `stop ≤ acc + seg` 인 구간에서
  `prev + normalize(p[i]−prev) × (stop − acc)` (normalize 0x1816463a0) 를 넣고 끝, 아니면 p[i] 를 넣고 계속.
  → 적 i 는 같은 경로를 **끝에서 50·i px 앞**까지만 간다.
- 공통: AttackTiming(+0x20)=묶음 timing, AttackDirection(+0x1c)=direction,
  **발사 간격 +0x78 = (FIRE_RATE<<16) / clamp(attackSpeed, 0x1999, 0x20000)** (0.1..2.0),
  **탄속 +0x88 = mul(clamp(bulletVelocity, 0x1999, 0x50000), BULLET_SPEED)** (0.1..5 × 3), ShootingRange(+0xb0)=range.
  6-1·6-2: 간격 65536(1 s), 탄속 196608(3 px/프레임).
- (직접 배치형 Creator 0x181703230 / perseActorCreateParam 0x181704200 은 슬롯0..15 경로 8점, 9 timing, 10 dir,
  11 atkSpeed, 12 bulletVel, 13 range, 8 정지오프셋 — 6-1/6-2 엔 배치 없음.)

**InitCollision 0x181704040**: `CreateCollision(COLLISION_RECT, pushBack 0, sync 1, rect)`, layer 8 (byte+1).
→ 48×48, 원점 중심(배율 = actor×stage, 6-x 는 1).
**InitPost 0x181704120**: 경로 점 수 == 0 이면 Active = 1, 아니면 0 유지(스포너가 켬).

**OnUpdate 0x181704570** 순서: waitDisappear → (Active 면) checkOffScreen → damageUpdate → moveUpdate →
`GetActor(HomingTarget)` 가 null 이면 shootAttackUpdate. (Active 판정은 진입 때 한 번 — damageUpdate 가 죽여도
같은 프레임 shootAttackUpdate 는 호출됨; 그 함수는 Active 를 다시 보지 않는다.)

**moveUpdate 0x181705080** (Active, HomingTarget 없음, MovingFinished == 0):
- idx = TargetPathIndex. idx ≥ 점 수 → MovingFinished = 1 (그 프레임은 이동 없음).
- prev = idx==0 ? (0,0) : p[idx−1], cur = p[idx]. `Timer += mul(dt, MoveSpeed)` (= 3276/프레임).
- `L = |Camera.StageToWorldPoint(cur − prev)|` — StageToWorldPoint 0x1817df840 = ViewMatrix(camera+0x130) 곱
  (0x181644610). ViewMatrix 는 스케일 (+1365, −1365) = ±trunc(65536/48), 이동 0 (linepathgear-path.js 와 같은 근거) →
  사실상 `wx = mul(dx,1365), wy = mul(dy,−1365)`, L = FPSqrt((wy²>>16)+(wx²>>16)). 즉 **속도 3 월드단위/s = 144 px/s**.
- `r = (Timer<<16)/L` (L<1 이면 r=0), t = clamp(r,0,65536). OffsetPos = (prev.x + mul(t,dx), prev.y + mul(dy,t)).
- **m_Pos = m_InitPos(+0x80) + OffsetPos** 를 직접 씀(속도 0 유지, 콜리전 sync). r > 0xffff 이면 idx++, Timer = 0
  (남은 몫 버림). 구간 프레임 수 = ceil(L/3276).
- 6-1 적0 (네이티브 sqrt 계산): 구간 L = 682497 / 901957 / 1637990 → **209 / 276 / 500 프레임** (총 985 ≈ 16.4 s).
  픽셀 총길이 154715776 raw (2360.78 px). 적1·2 는 마지막 점 ≈ (−1150,±432), (−1100,±432).
  경로: 왼쪽 500 → 대각선으로 반대편 줄(스포너 x, y±432) → 왼쪽 1200. 두 스포너의 흐름이 X 자로 교차.
- HomingTarget 분기(Timer < VALID_TIME 16, 회전 ≤ ROT_SPEED 60°/s, sin(Random·3+Timer·4) 흔들림)는 HomingTarget 을
  쓰는 보스 쪽 전용 — 6-1/6-2 경로에선 HomingTarget 이 0 으로 남아 안 쓰임. Timer ≥ 16 이면 inactive.

**shootAttackUpdate 0x181704970**: 조건 `Resuable == 0 && (AttackTiming != 1 || MovingFinished)`.
1. 플레이어 actor 인덱스 0..7 를 `Frame.GetPlayerByActorIndex`(null 이면 중단). range ≤ 0 이면 무조건, 아니면
   `(dx²>>16)+(dy²>>16) ≤ mul(range,range)` 인 플레이어를 InRangePlayerArray 에 0번부터 채움(개수 n).
   **IsAlive 검사는 없음.**
2. `AttackTimer += dt`; `AttackTimer ≥ 발사간격` 이면:
   - dir 0 **또는 1**: 목표 = (x − 1.0, y) — Right 도 왼쪽을 쏜다 (두 case 가 같은 블록 0x181704e59 로 감, disasm 확인).
   - dir 2: n>0 이면 프레임 RNG `Next(0,n)` (0x181662090) 로 고른 플레이어 위치.
   - dir 3: n>0 이면 제곱거리(FP) 최소인 플레이어(엄격 <, 앞 인덱스 우선).
   - 목표가 정확히 (0,0) (n=0 포함) 이면 안 쏨. 아니면 `dir = normalize(목표 − 자기위치)` → createBullet.
   - **AttackTimer = 0** (쐈든 못 쐈든). → 활성 후 61번째 업데이트에 첫 발, 이후 61 업데이트마다.
   - 화면 밖에서도 쏜다(탄은 첫 업데이트에 화면 밖 판정으로 곧 사라짐 — 3절).

**createBullet 0x1817058e0** → `OptimizedBulletObserverComponent.CreateBullet` 0x18188dc30 (ActorManager+0x60 의
관찰자). OptimizedBulletParam: Color B,G,R = 255×QFP[0x78](0.3)→76, 255×QFP[0x68](0.2)→50, 255×QFP[0xf0]→255,
**Size 10**, Sprite 0(Shooting), Target 0, AngularVelocity 0, Position = 적 위치, **Velocity = mul(dir, 탄속)**,
stageType 0. 성공 시 적 actor 에 SE 0x14 (`PlaySe_1816a24c0`).

**피격·사망**
- OnRecvEvent 0x181705dc0: 이벤트 21 → Active 일 때만 **AddDamage(1)** 0x181706210: SE 0xb, HP>0 이면 HP−1,
  DamageEffectTimer = 0.1 (점멸, 보기 전용). 이벤트 61 → Active = 1. 그 외 base. (점수 처리 없음.)
- damageUpdate 0x1817048a0: HP ≤ 0 → inactive. 아니면 점멸 타이머 감소.
- inactive 0x181705800 (IsDisappear 아닐 때만): Velo 0, 콜리전 flags |= 1(끔), RequestAnimation = 2(폭발),
  IsDisappear = 1, DisappearTime = 0.5, Active = 0.
- waitDisappear 0x181704690: DisappearTime −= dt, ≤0 → Disappear, IsDisappear = 0.
- Disappear 0x181705ec0: 콜리전 끔, SetActive(false), Anim 1, Velo 0, **Pos (0,0)**, HomingTarget 0,
  Resuable 아니면 flags |= 0x2000(제거). → 플레이어 총알 2발이면 폭발 0.5 s 후 제거.
- checkOffScreen 0x181704740 (IsDisappear 아닐 때): 뷰 = CalcCameraViewStageArea 0x1817dfd10 (H,W,X,Y).
  `X − 500 ≤ x < X + W + 500` 이 아니면 **즉시 Disappear(폭발 없이 제거)**. 가로만 본다.

**접촉 피해**: OnCollided 0x181705c40 (Active 일 때) / OnContacted 0x181705bb0 (param6 == 1 = 맵이 아닌 상대) →
tryAddDamageToPlayer 0x181705cc0: 상대 콜리전 layer == 1(플레이어) 이고 그 actor 가 있으면 **이벤트 21** 을
플레이어에게 보내고 적은 inactive(폭발). 플레이어가 무적이어도 적은 터진다. 총알(5)·적끼리(8) 는 무시.

미사용(6-1/6-2): CreatorReasuable 0x181703560 / Resume 0x181705ff0 / setResuable — ShootingEnemyBossEx.InitPost
(0x1816fcf6a) 에서만 호출.

---------------------------------------------------------------------------------------------------
## 3. OptimizedBulletObserver (actor 222) + OptimizedBullet (적 탄)

**Observer Creator 0x18188d110**: 슬롯0 → MaxCount(byte +0) = **32** (풀 최대 동시 탄 수), BulletList(+4) =
용량 MaxCount 리스트, ActorManager+0x60 = 자기 EntityRef(적이 찾는 곳). TargetInfos(+0x10, 0x40 × 8).
.cctor 0x18188e190 상수(DISSAPEAR 0.2, MARGIN 10, ROT 60, VALID 8)는 관찰자 쪽 이름뿐 — 탄 로직은 아래 OptimizedBullet 상수를 쓴다.

**CreateBullet 0x18188dc30**: 리스트에서 처음 만나는 비활성(flags&1==0) 칸을 덮어씀; 없으면 개수 < MaxCount 일 때
Add; 둘 다 아니면 경고 로그 후 false(탄 없음, SE 없음). 새 탄은 OptimizedBullet.Initialize 로 채움.

**OptimizedBullet** 구조(+): Flags u16 0 (1 Active, 2 Shooting, 4 Danmaku, 8 DanmakuEndless, 0x10 Disappear),
RandomSeed 8, Timer 0x10, Param 0x18 (ColorB 0x18, G 0x19, R 0x1a, Size 0x1b, Sprite 0x1c, Target 0x20,
AngVel 0x28, Pos 0x30, Velo 0x40). .cctor 0x18188cb30: SIZE_DEFAULT 10, MARGIN 10, ROT_SPEED 60,
**VALID_TIME 6.0**, **DISSAPEAR_TIME 0.1 (6553)**.

**Initialize 0x18188b750**: flags |= 1, &= ~0x10; **RandomSeed = Frame.RandomFP_181747bc0 (PCG32 1회, >>16)**;
Timer = 6.0; Param 복사; stageType 0 → flag 2.

**Observer.OnUpdate 0x18188d510**:
1. 플레이어 actor 인덱스 i < Frame.GetPlayerActorCount: TargetInfo[i] 의 Guard·Player 사각형을 RectFP 정적값
   (0x1831c2058+0xb8, writer 없음 = 전부 0) 으로 지우고, `PlayerComponent.IsAlive` 면
   PlayerColision = Collision.GetRect(플레이어 콜리전) + 콜리전 위치(+0x40,+0x48). 장비 actor type 0x1c(PlayerGuard)
   가 있으면 GuardColision = 그 콜리전 사각형(6-x 엔 없음).
2. 활성 탄마다 OptimizedBullet.OnUpdate(관찰자 actor, TargetInfos).

**OptimizedBullet.OnUpdate 0x18188b8a0**:
- Disappear 아님: `Timer −= dt`; Timer > 0 이면 updateHoming(Target 0 → 없음) → 새 위치 = updatePosition
  0x18188bf90 = **Pos + Velo (dt 곱 없음, 프레임당 px)** (AngVel≠0 이면 먼저 Velo 회전, 여기선 0).
  - checkOffScreen 0x18188c120: **`X − 10 ≤ x < X + W + 10` 가로만**. 밖이면 Disappear.
  - checkContact 0x18188c230 (상자 = 중심 기준 Size×Size = 10×10, `left = x − Size·0.5`, `bottom = y − Size·0.5`):
    i = 0..count−1 순서로 Guard 사각형(0 아님)과 겹치면 −1, Player 사각형과 겹치면 i 반환
    (겹침 = `l < X+W && X < l+S && b < Y+H && Y < b+S`, 엄격). 그다음 맵:
    MapComponent.IsContacted_18187ee50 → 사각형을 칩(÷chipSize) 범위로 바꿔 IsMovable_18187dea0 가 범위
    **양끝 포함** 모든 칩에 MapComponent.IsMovable(x,y) 검사; 하나라도 막히면 −2. 아무것도 없으면 −3.
  - −3 이면 Pos = 새 위치. ≥0 이면 addDamageProcess(Shooting 플래그 2) → tryAddDamageToPlayer 0x18188c950 =
    **그 플레이어 actor 에 이벤트 21** (보낸이 = 관찰자 actor). −3 이 아니면(플레이어·가드·맵) 위치 갱신 없이 Disappear.
  - Timer ≤ 0 (6 s, 이동 360 프레임) 이어도 Disappear.
- Disappear 진입: Timer = 0.1, flags |= 0x10. 그 뒤 매 프레임 Timer −= dt, ≤0 (7 프레임) 이면 flags &= ~1 → 칸 비움.
- RemoveAllBullet 0x18188df30: 살아 있는 탄의 Timer = RNG Next(FP 0, 0x3333) (탄당 RNG 1회) — 6-x 에서 호출처 미확인.

참고: 6-1/6-2 의 적 탄은 **ResuableShootingEnemyBulletComponent / ResuableShootingEnemyMissileComponent 가 아니다**.
Missile.Resume 은 ShootingEnemyBossComponent.CreateMissile(0x1816fa3e3) 에서만, 그 bullet 은 생성자가 없다.
(Missile 요약: 가속 6.0/s 최대 12, killPlayer 0x1816eb860 = 배리어 없으면 이벤트 43, 있으면 21 — 보스용.)

---------------------------------------------------------------------------------------------------
## 4. 맵 색블록: MapBlockReplacer (111) · MapBreakBlockRect (114)

런타임 맵: `word[map+0x1004]` = 폭, `word[map+0x1002]` = 높이, 칩 = `byte[map + 폭·y + x]` (index < 0x1000).
ModifyMapChip 0x18187db40(x, y, v): 범위 밖은 무시. IsBreakColor 0x181781a70 = 칩 속성 & 8 (geometry 의 30..38).
GetValidColorIndexArray 0x18187c6b0(frame, gunOnly): 플레이어 actor 인덱스 순으로, gunOnly 면 장비 actor type
0x6c(PlayerGun, hasGunByPlayerIndex 0x18187c8b0) 인 플레이어만 골라 색 인덱스 int[] 반환(원소 내용은 plane-obstacle-spec.md).

**MapBlockReplacer.Creator 0x18187c250**: 데이터 없음, 엔티티+컴포넌트만.
**OnStart 0x18187c400**: `arr = GetValidColorIndexArray(frame, true)`(총 든 플레이어 색), 빈 Dictionary, k = 0.
**x 바깥 0..폭−1, y 안쪽 0..높이−1** 순으로 훑으며 IsBreakColor 칩 c(=칩−0x1e)마다: 처음 보는 c 면 dict[c] = k++;
칩 = `arr[dict[c] % arr.length] + 0x1e`. (arr 이 비면 0 나눗셈 — 원작도 그대로 터짐.)
- 6-1: x=39..46, y=1..13 에 색 0..7 기둥(8열), x=55..59 y=4..13 에 색 2..6. 처음 보는 순서가 0..7 → 색 c → arr[c % n].
- 6-2: x=39..42 색 0, x=43..46 색 2 (y=1..13), (75,2) 색 4, (76,2) 색 6 → 순서 0,2,4,6 → arr[0], arr[1%n], arr[2%n], arr[3%n].

**MapBreakBlockRect** 필드(+): ColorIndex i0, Option i4 (0 None / 1 ReplaceValidPlayerColor / 2 ReplaceGunPlayerColor),
EntityRef 8, Rect 0x10 (H,W,X,Y). **ParseParameter 0x18187ccc0** (모두 int=raw>>16):
슬롯0 → Rect.X(칩 x), 1 → Rect.Y(칩 y), 2 → Rect.W, 3 → Rect.H, 4 → ColorIndex clamp(−1..8), 5 → Option.
**OnStart 0x18187ce60**: Option ∈ {1,2} 이면 `arr = GetValidColorIndexArray(frame, Option==2)`; arr 이 비지 않으면
ColorIndex < 0 → **프레임 RNG Next(0, arr.length)**, 아니면 ColorIndex % len 으로 고른 arr 원소가 ColorIndex.
그다음 i = 0..W−1, j = 0..H−1: `ModifyMapChip(X + i, Y − j, ColorIndex + 0x1e)` (Y 에서 위로 H칸).
(arr 이 비면 ColorIndex −1 그대로 → 칩 0x1d.) modifyMap 0x18187cf10 은 같은 루프(호출처 OnStart 꼬리뿐).
- 6-1 `[53,13,2,13,-1,2]`·`[60,13,2,13,-1,2]`: x 53–54 / 60–61, y 13→1 (13칸) 의 2열 벽 두 개, 각각 총 든
  플레이어 색 중 하나를 RNG 로(각 1회 소비). 원래 그 칸은 빈칸 — 5열 색 더미(x 55..59) 양옆 벽.
- 이 액터는 칠하기만 한다: 부수는 건 플레이어 총알(같은 색 + 속성 8 칩을 지움, 이미 아는 규칙). 이벤트 송신 없음, OnUpdate 없음.
- 6-2 에는 MapBreakBlockRect 없음.

---------------------------------------------------------------------------------------------------
## 5. 6-2 Thunder (actor 38, ThunderComponent)

4개 모두 `[3,1,0,0,0,0,0,0,0]` (48,696)·(48,24)·(2448,696)·(2448,24). ParseParameter 0x18172c410: 슬롯0 방향(>3 → 0),
슬롯1>0 → base 플래그1(Through), 슬롯2>0 → 플래그2, 3 → +2, 4/5 → 이동속도, 6 → 거리, 7 → +4|1, 8 → 사라짐 시간.
→ 3-2/10-4 와 **같은 설정**(dir 3 / Through 1 / 나머지 0 = 움직이지 않는 상시 빔, InitPost 0x18172c890 에서 이동 없음).
이미 있는 Thunder 이식(source-thunder-native.js 등) 그대로 쓰면 됨. 6-2 의 맵 0행·14행이 비어 있어 위·아래 빔이 천장/바닥 역할.
충돌(ThunderBase.OnCollided 0x18172b000, 빔 콜리전만): actor type 0x1b(Player — BattlePlanePlayer 도 createPlayer 로
같은 Player) 이고 플레이어 플래그 0x200 아님 → **이벤트 26**; type 0xad → 26; 그 외는 Through 라 무시(적 112 도 무시).
PlayerComponent.OnRecvEvent 0x1816c1080 에서 26 은 43 과 같은 분기(player-recvevent.local.txt) → 사망 경로.
BattlePlane 에서 그 분기가 HP 를 거치지 않는지는 **UNCONFIRMED**(26/43 공통 분기 내부 미추적).

---------------------------------------------------------------------------------------------------
## 6. RNG 소비 (프레임 PCG32, frame+0xc8 → +0xb8 상태)

- 시작 시: ShootingEnemy.Initialize 1회/기 (Next(0,100) 인라인 거부) — 6-1·6-2 각 6회.
  MapBreakBlockRect.OnStart 1회/개 (ColorIndex < 0 이고 arr 비지 않을 때) — 6-1 2회.
- 실행 중: 적 탄 생성마다 Frame.RandomFP 1회(성공한 CreateBullet 만), dir 2 일 때 Next(0,n) 1회(쏘기 전).
- OnStart 실행 순서(액터 생성 순 = MapBlockReplacer → Spawner1 → Spawner2 → MapBreakBlockRect×2 → Observer 로 추정)는
  **UNCONFIRMED** — RNG 순서와 "Replacer 가 Rect 칠을 다시 바꾸는가" 둘 다 이 순서에 달림(생성 순이면 안 바꿈).

---------------------------------------------------------------------------------------------------
## 7. UNCONFIRMED / 남은 확인

1. 같은 프레임 안 액터 업데이트 순서(스포너가 켠 적이 그 프레임에 움직이는지, 적이 만든 탄이 그 프레임 관찰자에서
   움직이는지). 첫 발 61 업데이트, 소환 61 업데이트 간격 같은 상대값은 확정.
2. OnStart 순서(6절).
3. MapComponent.IsMovable(x,y) 의 칩 판정(충돌 속성으로 추정 — 색블록도 막힘으로 추정). 이식의 기존 맵 고체 판정을 쓰되 검증 필요.
4. StageToWorldPoint 의 동차 곱셈이 mul(·,±1365) 와 비트 단위로 같다는 것은 linepathgear 쪽 근거(w=1, 이동 0)를 빌림.
5. 이벤트 26 을 받은 BattlePlane 이 바로 죽는지(5절).
6. GetValidColorIndexArray 원소 = 각 플레이어의 어떤 색 필드인지 → plane-obstacle-spec.md.
7. 플레이어 쪽 피격(이벤트 21)은 이미 아는 규칙(BattlePlane 무적 3 s 등) — 적/탄은 무적 여부와 상관없이 소멸한다.
