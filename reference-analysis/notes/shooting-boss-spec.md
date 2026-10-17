# 사격 보스 명세 (6-4·15-3) — ShootingEnemyBoss / ShootingEnemyBossEx / 미사일 / PlayerGuard / ShootingSuperApple — 2026-10-17 (Claude)

저장형 Ghidra(`tools/ghidra/decompile.sh`)와 `tools/disasm.py` 로만 읽음. 원작 실행 없음.
출력: `source-migration/boss1.local.txt`(Boss·Base·상태 3종·BossParamSetter), `boss2.local.txt`(BossEx·ExAttackState·ExParamSetter·PlayerGuard·
ShootingSuperApple·BgmChanger·Missile·ResuableShootingEnemyBullet·SwitchTargetGroup), `boss3.local.txt`(Parameter 기본값·CalcAutoScrollSpeed·표 읽기),
`boss4/5.local.txt`(PlayerComponent 배리어·장비), 어셈블리 `boss-asm-{recv,baseupdate,behav,attack,exattack}.local.txt`. 모두 커밋 안 됨(같은 명령으로 다시 뽑힘).
표기: 인스턴스 오프셋 = quantum-field-offsets.json 값 − 0x10, 정적(static) 오프셋은 그대로. FP 16.16, `mul(a,b)=(a*b)>>16`(64비트, 내림),
`div(a,b)=(a<<16)/b`(0 쪽 버림), dt = 1092. 어셈블리로 다시 확인한 곳은 [asm]. 확인 못 한 것은 **UNCONFIRMED**.
앞선 명세: 적·탄 풀은 `shooting-enemy-spec.md`, 탄 풀의 판정 순서는 `danmaku-spec.md` §5, 비행기는 `plane-family.md` + `source-plane-runtime.js`.

---------------------------------------------------------------------------------------------------
## 0. 등장 액터·종류 번호·배치

종류 번호(source-factory-unique-name.js 순서 = Frame.GetFactoryParam 번호): Key 17, Player 27, PlayerGuard 28(0x1c), BattlePlanePlayer 107,
PlayerGun 108(0x6c), **ShootingEnemyBoss 109(0x6d)**, ShootingEnemy 112, Spawner 113, **ShootingEnemyBossEx 117(0x75)**, **ShootingSuperApple 131**,
ShootingEnemyBossParamSetter 138(이 두 라운드엔 없음), **ShootingEnemyBossExParamSetter 139**, ShootingEnemyBullet 140(Creator·Resume 가 없음 — 이 두 라운드에서 안 쓰임, 보스 탄은 풀),
**ShootingEnemyMissile 141(0x8d)**, SwitchTargetGroup 205, OptimizedBulletObserver 222, BgmChanger 225.

배치(installed-stage-decoded, 변형 1개). 인원에 따라 달라지는 것은 **ShootingSuperApple 개수뿐**(인원수만큼, 아래 8절). 나머지는 2~8인 동일
(BattlePlanePlayer·PlayerGun·PlayerGuard 는 8개씩 놓이지만 PlayerGun·PlayerGuard 는 슬롯0 번호의 플레이어가 있을 때만 생성).

| 라운드 | 액터 | 위치 | 비고 |
|---|---|---|---|
| 6-4 | BattlePlanePlayer 1~8 | x 180/84, y 216~552 | 슬롯7 = 0(왼쪽 보기 불가) |
| 6-4 | PlayerGun 슬롯0 = 0,2,3,4,6,7 / PlayerGuard 슬롯0 = 1,5 | | 총 [·,0.175,25,0,0], 방패 [1,3,1,0]·[5,3,1,0] |
| 6-4 | Spawner1 (1600,144) / Spawner2 (1600,576) | | 경로 (−800,0)(−500,±432)(−1000,±432), 3기, 1s, 오프셋50, Always, Nearest, 1, 1, 활성, 0 |
| 6-4 | ShootingEnemyBoss1 | (1488,359) | 아래 표 |
| 6-4 | Key1 (2644,264) 숨김 / Goal1 (2644,384) / OptimizedBulletObserver 32 / SwitchTargetGroup1 ["Key1","BgmChanger2"] | | |
| 15-3 | BattlePlanePlayer 1~8 | x 480/384 | 슬롯7 = 1(왼쪽 보기 가능 — 왼쪽 BossEx 를 쏘려고) |
| 15-3 | PlayerGun 0,2,4,5,7 / PlayerGuard 1,3,6 | | 방패 [1,3,1,1]·[3,3,1,1]·[6,3,1,1](뒤집기 켬) |
| 15-3 | Spawner1 (0,144) / Spawner2 (0,576) | | 경로 (600,0)(0,±432)(800,±432), 3기, 1s, 50, Always, Nearest, 공격속도 1.5, 탄속 2, 활성 |
| 15-3 | ShootingEnemyBoss1 (1488,359) + ShootingEnemyBossEx1 (−264,360) + ExPS1 | | |
| 15-3 | Key1 (2164,264) / Goal1 (2164,384) / Observer 32 / SwitchTargetGroup1 같음 | | |

보스 datas(슬롯 → 값, 숫자 아님 = "·"):

| 슬롯 | 의미 | 6-4 Boss | 15-3 Boss | 15-3 BossEx |
|---|---|---|---|---|
| 0~6 | 최대 HP 표(2..8인) | 120,160,260,330,340,380,420 | 100,170,240,260,280,300,320 | 100,170,270,270,310,310,350 |
| 7 | (안 읽음) | · | · | · |
| 8 | 코어 단계 HP 비율 % | 30 | 30 | 30 |
| 9 | 공격 속도 배율 | 1 | 1 | **0.1** |
| 10 | 탄속 배율 | 1 | 1 | 1 |
| 11 | 특수공격 주기 | 4 | 4 | 4(BossEx 는 안 씀) |
| 12 | 이동 속도(px/프레임, 정수) | 2 | 2 | 2 |
| 13 | 상하 이동 폭(px) | 120 | 120 | 45 |
| 14,15 | 등장 이동량(px) | −395, 0 | −395, 0 | 385, 0 |
| 16~22 | 코어 수 표(2..8인) | 1,1,2,2,2,3,3 | 같음 | 같음 |
| 24 | HP 막대를 머리 위에 | 0 | 1 | 1 |
| 25,26 | HP 막대 위치 | 0,460 | 0,285 | 70,285 |
| 27 | HP 막대 배율 | 9 | 6 | 6 |
| 28 | 죽으면 알릴 이름 | SwitchTargetGroup1 | 같음 | 같음 |
| 29 | 활성 스크롤 x(px) | 1200 | 800 | 800 |
| 30 | 쉬움 모드 게임오버 횟수 | 30 | 30 | 30 |

---------------------------------------------------------------------------------------------------
## 1. 보스 공통 몸체 ShootingEnemyBossBaseComponent (Boss·BossEx 둘 다 이 컴포넌트를 함께 가짐)

**필드(+)**: m_CoreCount b0, m_LastHittedCoreId b1(이번 프레임에 맞은 코어 비트), m_ToCorePhaseHPRate b2, m_ToSpecialAttackFreq b3,
m_EasyModeGameoverCount u16 4, m_HitPoint i8, m_HitPointMax i0xc, m_UIOverhead i0x10, m_CoreCollisionIdListPtr 0x14, m_HatchCollisionIdListPtr 0x18,
m_EntityRef 0x20, m_HitPointUI 0x28(보기 전용), m_PairBoss 0x30, m_ActiveScrollX 0x38, m_AttackSpeed 0x40, m_BulletVelocity 0x48,
m_DamageEffectTimer 0x50, m_MoveHeight 0x58, m_MoveSpeed 0x60, m_UIScale 0x68, m_EntryMoveOffset 0x70, m_MovePos 0x80, m_MovedInitPos 0x90,
m_UIPosition 0xa0, m_TargetName 0xb0(QStringUtf8_32), **m_BehaviourState 0xd0**, **m_MoveState 0xf0**.
상태 구조(BehaviourState·MoveState 같은 모양, 0x20): m_OnStart +0, m_WhileState +4, m_WhileStateAcccess +8, m_State +0xc, m_EntityRef +0x10, m_Timer +0x18.
→ Behaviour.State = +0xdc, Behaviour.Timer = +0xe8, Move.State = +0xfc, Move.Timer = +0x108.

**상태 바꾸기 규칙(세 상태 기계 공통)**: `State = 새값; WhileStateAcccess = WhileState; OnStart = 1`. 각 OnUpdate 는 시작에 WhileState = 1, 끝에
`WhileState = 0; if (WhileStateAcccess == 0) OnStart = 0; WhileStateAcccess = 0`. → 어디서 바꾸든 **다음 업데이트에서 OnStart 분기가 한 번** 돈다.
타이머 카운트다운 공통형: `v = Timer − dt; v < 0 → Timer = 0 후 만료; 아니면 Timer = v, v > 0 이면 대기, v == 0 이면 만료` → T 초 = ceil(T/1092) 번째 감소에 만료
(0.2 s→13, 0.5 s→31, 1 s→61, 2 s→121, 4 s→241, 5 s→301, 6 s→361 프레임). timerUpdate(0x1816f4600) 는 `Timer = max(0,Timer−dt)`, `Timer < 1` 이면 만료 — 횟수 같음.

**기본값**(Initialize 0x1816f51f0 = Creator 인라인): HPmax 20, 비율 50, 주기 4, 공격속도 1.0, 탄속 1.0, 이동속도 2.0, 상하폭 120, 등장 (−400,0), 코어 1, UI배율 1, PairBoss 0.

**ParseParameter 0x1816f5240** (datas[i] = 리스트+0x20+i·8; 숫자 칸 t=1 이면 raw, int = raw>>16):
- 슬롯0..6 → `FUN_180201410(param,0)`(7칸을 int 로) 에서 **[인원−2] 를 바로** 고름(아래로 내려가며 찾지 않음; 2..8 밖이면 0) → HPmax = max(1, v),
  **m_HitPoint = HPmax**(슬롯28 처리 중 [asm 0x1816f57ba]).
- 8 → 비율 = int, 음수 0, 100 초과 100. 9 → 공격속도 = clamp(raw, 0x1999, 0x40000), 숫자 아니면 0x1999. 10 → 탄속 = clamp(raw, 0x1999, 0x50000).
- 11 → 주기 = int(≤0 → 0). 12 → 이동속도 = max(int,1)<<16. 13 → 상하폭 = int<<16(≤0 → 0). 14,15 → 등장 이동량 (int<<16, int<<16).
- 16..22 → 코어 수 = 표[인원−2], <1 → 1, >3 → 3. 24 → UIOverhead = (int==1). 25,26 → UI 위치. 27 → UI배율 raw(≤1.0 → 1.0).
- 28 → TargetName 문자열. 29 → ActiveScrollX = raw(숫자 아니면 0). 30 → EasyModeGameoverCount = (uint32 raw)>>16.
- 공격속도 raw: 1 → 65536, 0.1 → **6553**(fround(0.1)·65536 내림).

**정적 .cctor 0x1816f7550** (resolve 확인): CORE_EXPOSURE_TIME +8 = '6.0' 393216, CORE_EXPOSURE_EFFECT_TIME +0x10 = '0.5' 32768,
POST_UP_DOWN_MOVE_STOP_TIME +0x18 = '0.2' 13107, POST_HOME_POS_MOVE_TIME +0x20 = '0.5' 32768, DYING_MUL_MOVE_SPEED +0x28 = '1.2' 78643,
EFF_DAMAGE_BLINK_TIME +0x30 = '0.2' 13107, EFF_DEAD_TIME +0x38 = '5.0' 327680.

**InitCollision 0x1816f58a0(base, frame, actor, 코어[], 해치[], 몸통[])** [asm 0x1816f9339.. / 0x1816fcc99..]: 사각형 배열마다
`CollisionSceneComponent.CreateCollision` → Rect(H,W,X,Y) 복사, CollisionType 0, `Collision.initialize`, `setupCollision(actor, coll, sync 1)`,
**layer 8**, 밀어내기 없음. **코어 = flags|1(꺼짐) + 코어 목록**, **해치 = flags&~1(켜짐) + 해치 목록**, 몸통 = 켜짐, 목록 없음. 생성 순서 코어→해치→몸통.
사각형 값은 2·3·5절 표. 원점 = 보스 위치(배율 1).

**InitPost 0x1816f6050**: 두 상태 구조를 0 으로 + EntityRef. **OnStart 0x1816f6150**: MovedInitPos = actor.m_InitPos(+0x80) = 배치 좌표.
씬의 모든 액터를 훑어 자기 말고 종류 109 또는 117(`(type−0x6d)&0xfff7 == 0`)인 첫 액터 → m_PairBoss. (15-3: 둘이 서로를 짝으로 잡음, 6-4: 0.)

**OnUpdate 0x1816f64a0** [asm] (Boss/BossEx 컴포넌트 OnUpdate 가 가장 먼저 부름):
1. State < 1 이고 ActiveScrollX ≥ 0 이고 **Stage.m_ScrollPosition.x(+0x60) ≥ ActiveScrollX** → State 1(활성).
2. BehaviourState.OnUpdate.
3. **MovedInitPos.x += StageComponent.CalcAutoScrollSpeed 0x18170d680**(카메라와 같이 흐름 — 그래서 보스는 화면 기준으로 제자리).
   CalcAutoScrollSpeed: 스크롤 종류≠2 또는 지연>0 → 0; 스테이지 플래그 0x100 없고 플레이어 중 m_Flags&0x200(죽음) 있으면 0;
   아니면 min(맵폭칸·48 + endOffset − (scrollX + 뷰폭), 속도) — `source-stage-autoscroll.js` calculateStepRaw 와 같은 식.
4. HP < 1 이고 State < 7 → State 7.
5. IsLowHP 이고 State == 3 → State 4(코어 노출, 아래).
6. DamageEffectTimer > 0 이면: Timer −= dt(음수 → 0), **RNG 2회**: r1 = PCG32(4 미만 버림) % 12, r2 = PCG32 한 번 & 3;
   q = clamp((0x10000 − div(Timer, 0.2s))², 0, 1)(괄호 안이 음수면 0), m_OffsetDrawPos(+0xa0) = ((r1−6)<<16·(1−q)>>16, (r2−2)<<16·(1−q)>>16).
   **보기 전용 흔들림이지만 RNG 를 소비** — 맞은 뒤 13 프레임 동안 매 프레임 2회.
7. **actor.m_Pos(+0xb0) = MovedInitPos + MovePos**. 코어 적중 비트 0..2 지움.
→ 이번 프레임 위치는 지난 프레임 MoveState 결과. 같은 프레임 AttackState 의 총구 위치도 이 값.

**IsLowHP 0x1816f8d80**: `f = (비율<<16)/100`(내림), `u = f·HPmax`, `n = u>>16`, `(u & 0xffff) ≥ 0x8000 → n+1`; HP ≤ n.
값(2..8인): 6-4 = 36, 48, 78, 99, 102, 114, 126 / 15-3 Boss = 30, 51, 72, 78, 84, 90, 96 / BossEx = 30, 51, 81, 81, 93, 93, 105.

**BehaviourState.OnUpdate 0x1816f7a20** (Timer = +0xe8):
- 0 대기(활성 조건은 위 1번, 또는 이벤트 61).
- 1 → 2.
- 2 등장: OnStart 에서 Timer = 0.5 s, MoveState ← 1(집으로 가기). MoveState == 2(도착) 가 된 뒤부터 Timer 카운트, 만료 → 3.
- 3 전투: 할 일 없음(AttackState 가 일함). 위 5번 또는 AttackState(특수공격 끝) 이 4 로 바꿈.
- 4 코어 드러내기 연출: OnStart 에서 Timer = 0.5 s, **ExposeCore**. 만료 → 5.
- 5 코어 노출: OnStart 에서 Timer = 6.0 s. **IsLowHP 가 아닐 때만** 카운트, 만료 → 6. (낮은 HP 면 5 에 영원히 머묾 = 코어 계속 노출.)
- 6 코어 닫기: OnStart 에서 Timer = 0.5 s, **StoreCore**. 만료 → 3.
- 7 죽는 중: OnStart 에서 Timer = 5.0 s, `FrameEvents.Flash`. **매 프레임 RNG 2회**(각각 6 미만 버림, %10 → −5..4), 흔들림
  OffsetDrawPos = ((r−5)<<16 · (1−q)) >>16, q = clamp((1 − div(Timer,5s))²,0,1). 카운트 만료 → 8.
- 8: OnStart 에서 Timer = 0.5 s. 만료 → **짝 보스가 살아 있지 않으면(IsPairBossValid = 짝 액터가 있고 flags&0x2000 없음) NotifyTarget**,
  그리고 actor.m_Flags |= 0x2000(프레임 끝 제거) [asm 0x1816f7fd7..0x1816f801d].
- NotifyTarget 0x1816f73e0: TargetName 이 비지 않고 그 이름 액터가 있으면 이벤트 **61** 을 이름으로(`Frame.NotifyEvent 0x181749fa0`).
  → SwitchTargetGroup1 이 61 을 "Key1"·"BgmChanger2" 에 다시 보냄(source-switchtargetgroup-devices.js). Key1 은 슬롯2=1 숨김 열쇠 → 61 로 나타남.

**ExposeCore 0x1816f8160 / StoreCore 0x1816f88c0** (코어·해치 목록이 3개씩일 때만; 플래그1 = 꺼짐):

| 코어 수 | ExposeCore: 해치0 해치1 해치2 / 코어0 코어1 코어2 | 애니(+2) | StoreCore |
|---|---|---|---|
| 1 | 끔 켬 켬 / 켬 끔 끔 | 2 | 해치 셋 켬, 코어 셋 끔, 애니 5 |
| 2 | 켬 끔 끔 / 끔 켬 켬 | 3 | 애니 6 |
| 3 | 끔 끔 끔 / 켬 켬 켬 | 4 | 애니 7 |

(끝의 FUN_1819a1a50 는 로그 출력 — 시뮬레이션 무관.)

**MoveState.OnUpdate 0x181700470** (목표는 MovePos 기준 상대 좌표; Timer = +0x108):
- 1 집으로: Move(등장 이동량) 도착 → 2. 3 위로: Move(등장.x, 등장.y − 상하폭) → 4. 5 아래로: Move(등장.y + 상하폭) → 6.
- 4·6 멈춤: OnStart 에서 Timer = (IsLowHP ? 0 : 0.2 s). 만료 → 7.
- 7 집으로 돌아와 멈춤: OnStart 에서 Timer = 0.2 s. Move(집) 도착한 프레임부터 카운트, 만료 → **RNG 1회(PCG32 그대로, 버림 없음) `(r&1)·2+3` → 3(위) 또는 5(아래)** [asm 0x1817007d9].
- 8 바깥으로: Move((0,0)) = 처음 배치 자리(화면 밖) 도착 → 9. 0·2·9: 아무것도 안 함.
- **Move 0x181700930**: d = 목표 − MovePos, len = FPSqrt((dx²>>16)+(dy²>>16)), dir = normalize(d)(0x1816463a0 — `N.normalizeRaw`),
  step = min(IsLowHP ? mul(1.2, 이동속도) : 이동속도, len) [asm 0x181700a91]; MovePos += mul(dir, step). **len ≤ 이동속도(배율 전 값)** 이면 MovePos = 목표, 도착(참) [asm 0x181700afe].
  속도는 **프레임당 px**(dt 곱 없음): 2 px/프레임, 낮은 HP 2.39999 px.

**OnRecvEvent 0x1816f6ba0** [asm] (Boss·BossEx 컴포넌트 OnRecvEvent 가 같은 몸체를 인라인):
- 61: State == 0 → State 1(활성). 그 외 이벤트(21·61 제외)는 ActorComponent.OnRecvEvent.
- **21(플레이어 총알)**: State < 3 또는 State ≥ 7 이면 무시. c = GetCollisionById(이벤트+0x80 = 총알이 맞은 **보스 쪽 충돌체 id**).
  - State 3: 그대로 피해.
  - State 4~6: 쉬움 모드(EasyModeGameoverCount ≠ 0 이고 frame 전역 CheckPointInfo.GameOverCount(+0xc8 → +0xf0) ≥ 그 값)가 아니면
    c 가 코어 목록에 있어야 함 — 아니면 `Frame.PlaySe(1)`(튕김 소리)만 하고 끝. 맞았으면 그 코어 비트를 +1 에 세움.
  - 피해: SE 0xb(음량 0.75), HP > 0 이면 HP −= 1, **그 뒤 HP > 0 이고 State 4~6 이면 한 번 더 −1**(코어 피해 2), DamageEffectTimer = 0.2 s.
  - 즉 평소(3)엔 **해치·몸통 어디를 맞혀도 1**, 코어 단계(4~6)엔 **코어만 2**(쉬움 모드면 어디든 2). 총알은 어느 경우든 소모(총알 쪽 규칙).
- AddDamage 0x1816f6f90 은 같은 규칙의 함수판(xref 로는 썽크 0x1802032f4 뿐, 직접 호출처 없음). Kill 0x1816f6f30(→7)·Activate 0x1816f6f60(0→1)도 호출처 못 찾음.

**접촉**: Boss/BossEx 컴포넌트 OnCollided 0x1816f9ac0 / 0x1816fd910 (OnContacted 도 같음): 상대 충돌체의 액터가 플레이어이고 m_PlayerState(+3) ≠ 3 이면
**이벤트 43(즉사)**. 코어·해치·몸통 모두 layer 8 이라 어느 칸이든 닿으면 즉사. **죽는 중(7·8)에도 충돌체가 그대로 있어 계속 즉사**(끄는 코드 없음).

---------------------------------------------------------------------------------------------------
## 2. ShootingEnemyBoss (109, ShootingEnemyBossComponent) — 오른쪽 보스

**필드(+)**: m_CreatedBulletListPtr 0(안 씀), m_CreatedMissileListPtr 4, m_EntityRef 8, **m_AttackState 0x10**(0x38: m_AttackCount +0, m_OnStart +4,
m_WhileState +8, m_WhileStateAcccess +0xc, m_State +0x10, m_EntityRef +0x18, m_GunTimer +0x20, m_GunTimer2 +0x28, m_Timer +0x30),
**m_Parameter 0x48**(ShootingEnemyBossParameter, 실제 배치는 이름순: ChooseNextAttackTime +0, DyingAttackGunFireRate +8, DyingAttackGunVelocity +0x10,
DyingAttackMissileFireRate +0x18, DyingAttackMissileVelocity +0x20, DyingAttackStopTime +0x28, DyingAttackTime +0x30, SpecialAttackBulletVelocity +0x38,
SpecialAttackFireRate +0x40, SpecialAttackStopTime +0x48, SpecialAttackTime +0x50, UsualAttackBulletVelocity +0x58, UsualAttackFireRate +0x60,
UsualAttackStopTime +0x68, UsualAttackTime +0x70).

**ShootingEnemyBossParameter.Initialize 0x181702470** (리터럴 resolve): 고르는 시간 1.0 / 보통: 탄속 3.0, 간격 0.35(22937), 시간 5(327680), 멈춤 0.5 /
특수: 탄속 1.0(쓰이지 않음, 아래), 간격 2.0, 시간 5.0, 멈춤 1.0 / 죽기직전: 총 탄속 4.0, 총 간격 0.3(19660), 미사일 속도 1.0(쓰이지 않음), 미사일 간격 1.0,
시간 5.0, 멈춤 1.0. 두 라운드 모두 ShootingEnemyBossParamSetter 가 없어 **기본값 그대로**.

**정적 .cctor 0x1816fa440**: TOP_GUN_POSITION +8 = (−199, −54), BOT_GUN_POSITION +0x18 = (−199, 54),
MISSILE_SPAWN_POSITIONS +0x28 (9개) = (−70,−280)(−120,−216)(−139,−144)(−139,−72)(−150,0)(−139,72)(−139,144)(−120,216)(−70,280),
MISSILE_PRIMARY_SPAWN_POSITIONS +0x30 = (−60,0)(−30,183)(−30,−184).
사각형 (H,W,X,Y): 코어 +0x38 = [70,69,−12,−35] [69,69,−12,−242] [70,69,−12,172]; 해치 +0x40 = [100,280,−170,−50] [73,99,−30,−244] [73,99,−30,171];
몸통 +0x48 = [62,240,−117,−105] [66,55,−7,−169] [61,130,62,−222] [61,240,−117,43] [66,55,−7,103] [61,130,62,159].
(왼쪽을 보는 배: 총구가 x −199. 가운데 큰 해치가 코어0 을, 위·아래 해치가 코어1·2 를 덮음.)

**Creator 0x1816f91b0**: 엔티티 + Base(기본값 → ParseParameter → InitCollision(코어 +0x38, 해치 +0x40, 몸통 +0x48) → InitPost) + 이 컴포넌트.
InitPost 0x1816f93d0(인라인): Parameter.Initialize, AttackState = 0(EntityRef 만), 미사일 목록(용량 18)에
**`ResuableShootingEnemyMissileComponent.Creator(frame, 부모 = 보스 엔티티, 속도 = Base.m_BulletVelocity, 배율 (1,1))` 18 개** [asm 0x1816f96bb].
**OnStart 0x1816f9830** = Base.OnStart. **OnUpdate 0x1816f9900**: Base.OnUpdate → Base.State < 7 일 때만 AttackState.OnUpdate → MoveState.OnUpdate.
OnPost 0x1816f9a10: 아무것도 안 함. OnExit: 미사일 목록·코어/해치 목록 해제.

**AttackState.OnUpdate 0x1816f37e0** (괄호 = 기본값으로 계산한 프레임; 공격속도 1, 탄속 배율 1):
- 0: Base.State 가 3..7 이면 → 8.
- 1 보통공격 준비: OnStart: Timer = 보통 멈춤(0.5 s), MoveState ← 1. MoveState == 2 가 된 뒤 카운트(31), 만료 → 2.
- 2 **보통공격(가위 사격)**: OnStart: Timer = 보통 시간(5 s), MoveState ← 3(상하 이동 시작), GunTimer = GunTimer2 = 0.
  매 프레임 `GunTimer −= dt; GunTimer < 1` 이면:
  - u = clamp(0x10000 − div(Timer, 보통시간), 0, 0x10000) (Timer 는 **이번 프레임 감소 전** 값), θ = (mul(u, −120<<16) · 0x477)>>16 (라디안, 0 → −120°).
  - v = rotate((0, −1), θ) (0x18163cac0, danmaku-spec §4 식) = (sinθ, −cosθ).
  - **위 총구(Pos + (−199,−54)) 에 방향 (v.x, −v.y), 아래 총구(Pos + (−199,54)) 에 (v.x, v.y)** 로 CreateBullet, 속도 = mul(보통 탄속 3.0, Base 탄속) [asm 0x1816f3b73..0x1816f3c17].
    u=0 이면 위는 아래로(0,+1), 아래는 위로(0,−1) 쏘고, u=0.75 에 둘 다 정면 왼쪽, u=1 에 위는 왼쪽위(−0.87,−0.5)·아래는 왼쪽아래로 벌어짐.
  - GunTimer = div(보통 간격, 공격속도)(22937 → **22 프레임마다**), `Frame.PlaySe(0x14)`.
  그다음 Timer 카운트(301), 만료 → 8. (한 번에 14쌍 = 28발.)
- 3 특수공격 준비: OnStart: Timer = 특수 멈춤(1.0 s), MoveState ← 8(화면 밖 처음 자리로). MoveState == 9 가 된 뒤 카운트(61), 만료 → 4.
- 4 **특수공격(미사일 일제사격)**: OnStart: Timer = 특수 시간(5 s), GunTimer = 0. `GunTimer −= dt; < 1` 이면 GunTimer = div(특수 간격 2.0, 공격속도)
  (**121 프레임마다**), MISSILE_SPAWN_POSITIONS 9곳 차례로 `CreateMissile(Pos + 위치, 방향 (−1,0))`, `FrameEvents.PlaySe(0x14)`.
  카운트(301) 만료 → 8, 그리고 **Base.State 가 3 이면 4(코어 노출 시작)**.
- 6 죽기직전 준비: OnStart: Timer = 죽기 멈춤(1.0 s), MoveState ← 1. 도착 뒤 카운트(61) → 7.
- 7 **죽기직전 공격**: OnStart: Timer = 죽기 시간(5 s), MoveState ← 3, GunTimer = GunTimer2 = 0.
  - 총: `GunTimer < 1` 이면 θ = (FPMath.Sin 0x1816465d0(Timer·2) · 0xdf3e)>>16 (±0.872 rad ≈ ±50°, Timer 감소 전 값), v = rotate((−1,0), θ) = (−cosθ, −sinθ),
    위 총구 (v.x, −v.y)·아래 총구 (v.x, v.y), 속도 mul(4.0, 탄속) [asm 0x1816f4168..0x1816f422a]; GunTimer = div(0.3, 공격속도)(**19 프레임**); SE 0x14.
  - 미사일: `GunTimer2 −= dt; < 1` 이면 — 쉬움 모드가 아니면 **RNG Next(0,3)**(0x181662090) 으로 PRIMARY 3곳 중 하나, `CreateMissile(Pos + 그곳, (−1,0))`,
    SE 0x14 — 그리고 (쉬움 모드여도) GunTimer2 = div(1.0, 공격속도)(**61 프레임**).
  - Timer 카운트(301) 만료 → 8.
- 8 다음 공격 고르기: OnStart: Timer = 1.0 s, MoveState ← 1. MoveState == 2 가 아니면 대기. **IsLowHP 가 아니고 Base.State 가 4~6(코어 노출 중)이면 대기**.
  timerUpdate(61) 만료 시: 주기 f = m_ToSpecialAttackFreq; `f < 2` 이거나 `AttackCount % f == f−1` 이면 → 3(특수), 아니면 IsLowHP ? 6 : 1. 그리고 AttackCount++.
  → 주기 4: 공격 0,1,2 보통(또는 죽기직전), 3 특수, 4,5,6 보통, 7 특수 …
- 5: 없음.

**CreateBullet 0x1816f9fa0** [asm]: 속도 = (dir·speed)>>16 (5번째 인자), OptimizedBulletParam = {B 76, G 50, R 255, **Size 10**, Sprite 0, Target 0, AngVel 0, Pos, Velo},
`OptimizedBulletObserverComponent.CreateBullet 0x18188dc30(ActorManager+0x60 관찰자, stageType 0)` — **ShootingEnemy 탄과 똑같은 풀 탄**(32칸 공유).
성공한 탄마다 OptimizedBullet.Initialize 가 Frame.RandomFP 1회. 풀이 차면 생성도 RNG 도 없음.
**CreateMissile 0x1816fa180** [asm 0x1816fa358..0x1816fa3e3]: 미사일 목록 0..17 에서 액터 flags&4(꺼져 있음)인 첫 것을 `Resume(pos, dir)` 하고 끝; 없으면 경고 로그만.
**넘겨 준 5번째 인자(속도 = 특수/죽기 미사일 속도 × 탄속)는 읽지 않는다**(함수가 스택 인자를 안 읽음) — 미사일 속도는 생성 때 받은 Base 탄속(1.0).

---------------------------------------------------------------------------------------------------
## 3. 미사일 ResuableShootingEnemyMissile (141)

필드(+): m_IsDisappear i0, m_EntityRef 8, m_Parent 0x10, m_DisappearTime 0x18, m_Velocity 0x20(처음 속도 스칼라).
정적 .cctor 0x1816ebf50: COLLISION_RECT +8 = (H 48, W 192, X −192, Y −24), MISSILE_VELOCITY_ACCEL +0x28 = '6.0', MISSILE_VELOCITY_MAX +0x30 = '12.0',
DISSAPEAR_TIME +0x38 = '0.2', MARGIN +0x40 = '180'.

- **Creator 0x1816eae70**: GetFactoryParam(141) 엔티티, 배율 (1,1), 부모·속도 저장, InitCollision 0x1816eb050(`CreateCollision(rect, 4번째 인자 1, sync 1)`,
  **layer 5**, 맵과 닿음 판정 있음), InitPost(정렬 −1200, flags|0x80), AddActor (0,0), 곧바로 Disappear(숨김). RNG 없음.
- **Resume 0x1816ebd60**: SetPosForce(pos), **Velo = normalize(dir)·m_Velocity**, SetActive(true), 충돌 켬, 애니 1. (IsDisappear 는 안 건드림.)
- **OnUpdate 0x1816eb1a0**: IsDisappear 면 DisappearTime −= dt, <1 → Disappear, IsDisappear = 0. 아니면 checkOffScreen: **x < 뷰X − 180 이면 Disappear**
  (왼쪽만, 폭발 없음). Velo ≠ 0 이면 `s = FPSqrt(|v|²) + mul(dt, 6.0)`(+6552/프레임), s = min(s, 12.0), Velo = normalize(Velo)·s.
  위치는 액터 이동(OnUpdate2: Pos += Velo, 프레임당 px)으로. 속도 1.0 → 1.09998(72088) → 78638 → 85188 … **111 프레임째 12.0** 도달.
- **OnCollided 0x1816eb6f0**: killPlayer(상대) 다음, 상대 액터 종류가 **0x1c(PlayerGuard) 면 SE 3 + inactive**(방패가 막음).
- **OnContacted 0x1816eb630**: 맵(param6 = 0) → inactive. 액터(param6 = 1) → killPlayer.
- **killPlayer 0x1816eb860** [asm]: 상대가 플레이어 p 일 때만. p.m_BattlePlaneHitPoint == 2 이고 m_BattlePlaneState > 0(막 맞아 깜빡이는 중) → 이벤트 없이 inactive.
  아니면 `IsBarrierDeployed_BattlePlane(p)`(Flags2&0x20 이고 HP > 2 이고 죽음 비트 없음) 이 거짓이면: p.m_PlayerState == 3 이면 아무것도 안 함(미사일도 안 사라짐),
  아니면 **이벤트 43(즉사)** + inactive. 배리어면 **이벤트 21**(+0x80 = 상대 충돌체 id, 즉 1 피해) + inactive.
  → 일반 비행기는 무적 시간이어도 미사일에 죽는다. 플레이어 총알(layer 5)·적(8)과는 서로 영향 없음(쏘아 떨어뜨릴 수 없음).
- inactive 0x1816eba50: Velo 0, 충돌 끔, 애니 2, IsDisappear 1, DisappearTime 0.2 s(13 프레임). **Disappear 0x1816ebc10** [asm]: 부모(보스)가 있으면 충돌 끔·SetActive(false)·
  Velo 0·Pos (0,0) (재사용 대기), **부모가 없어졌으면 flags|0x2000 (제거)**.
- 풀 크기: 특수공격 1회 = 3번 × 9발 = 27발 > 18. 첫 일제사격(화면 기준 x ≈ 1338~1418)은 가속하며 왼쪽 끝 −180 을 넘는 데 약 177~183 프레임이라
  242 프레임 뒤 3번째 일제사격 때는 보통 돌아와 있음. 남은 미사일(맵·방패에 맞아 0.2 s 폭발 중 포함)로 빈칸이 모자라면 그 자리는 그냥 안 쏨(RNG 영향 없음).

---------------------------------------------------------------------------------------------------
## 4. ShootingEnemyBossEx (117, ShootingEnemyBossExComponent) — 15-3 왼쪽 보스

**필드(+)**: m_CreatedBulletListPtr 0(안 씀), m_CreatedEnemyListPtr 4, **m_GuardPlayersPtr 8, m_GunPlayersPtr 0xc**, m_EntityRef 0x10,
**m_AttackState 0x18**(0x40: m_AttackCount +0(안 씀), m_IsTop +4, m_OnStart +8, m_WhileState +0xc, m_WhileStateAcccess +0x10, m_State +0x14, m_EntityRef +0x18,
m_Target +0x20, m_GunTimer +0x28, m_GunTimer2 +0x30, m_Timer +0x38), **m_Parameter 0x58**(ShootingEnemyBossExParameter: DyingAttackEnemySpawnRate +0,
DyingAttackEnemyVelocity +8, DyingAttackGunFireRate +0x10, DyingAttackGunVelocity +0x18, DyingAttackStopTime +0x20, DyingAttackTime +0x28,
SpecialAttackEnemyVelocity +0x30, SpecialAttackSpawnRate +0x38, UsualAttackBulletVelocity +0x40, UsualAttackFireRate +0x48, UsualAttackStopTime +0x50, UsualAttackTime +0x58).

**ExParameter.Initialize 0x181700070**: 보통 탄속 2.5, 간격 0.5, 시간 2.0, 멈춤 2.0 / 특수 적 속도 2.0, 소환 간격 0.4 / 죽기 총 탄속 3.5, 총 간격 0.5,
적 속도 2.5, 적 간격 1.0, 시간 2.0, 멈춤 2.0. (15-3 ExPS1 이 넣는 값과 **완전히 같음** — 6절.)

**정적 .cctor 0x1816fe320**: TOP_GUN +8 = (155, −192), BOT_GUN +0x18 = (155, 192), ENEMY_SPAWN_POSITIONS +0x28 = (110,−93)(110,93).
코어 +0x30 = [70,69,−1,−35] [69,69,−1,−209] [70,69,−1,138]; 해치 +0x38 = [73,120,−8,−36] [74,120,−8,−211] [73,120,−8,137];
몸통 +0x40 = [99,231,−73,−137] [49,200,−77,−259] [210,139,−142,−210] [100,231,−73,36] [49,200,−77,209] [210,139,−142,0]. (오른쪽을 보는 배.)

**Creator 0x1816fcb10**: Base(기본값 → ParseParameter → InitCollision(+0x30,+0x38,+0x40) → InitPost) + 컴포넌트: ExParameter.Initialize, ExAttackState.Initialize
(EntityRef, 나머지 0), 적 목록(용량 8)에 **`ShootingEnemyComponent.CreatorReasuable 0x181703560` 8기** — 각자 Resuable = 1, Initialize(**RNG Next(0,100) 1회씩 → 생성 때 8회**),
InitCollision(48×48, layer 8), InitPost, AddActor (0,0), Disappear(숨김; 재사용이라 제거 안 함).
쉬움 모드면 HP = 올림(HPmax · QFP[0xa8](43690=2/3)) (Boss 에는 이 감소 없음).
**OnStart 0x1816fd1b0**: Base.OnStart, 두 목록(용량 8) 만들고, 플레이어 actor 인덱스 0..n−1 순서로 장비0(GetEquip(0)) 종류가 0x1c 면 **GuardPlayers**,
0x6c(PlayerGun) 면 **GunPlayers** 에 그 플레이어 엔티티를 넣음(시작 때 한 번만; 이후 생사 무관). 15-3 2인: Gun = [P0], Guard = [P1].
OnUpdate 0x1816fd750: Base.OnUpdate → State < 7 이면 ExAttackState.OnUpdate → MoveState.OnUpdate. OnRecvEvent·OnCollided = 1절과 같음.

**ExAttackState.OnUpdate 0x1816fb120** (공격속도 0.1 → raw 6553 이라 간격이 10배):
- 0: Base.State 3..7 → 1.
- 1 고르기/멈춤: OnStart: Timer = (IsLowHP ? 죽기 멈춤 : 보통 멈춤)(2 s), MoveState ← 1. (IsLowHP 아니고 Base 4~6) 이거나 MoveState ≠ 2 이면 대기.
  카운트(121) 만료 시: **짝이 없으면(IsPairBossValid 거짓) RNG 1회 — PCG32(4 미만 버림), `r % 6 == 0` 이면 → 3(특수)** [asm 0x1816fb3f2..0x1816fb40b]
  (= Next(0,6) == 0 과 같은 소비). 그 밖에는 IsLowHP ? 6 : 2.
  (짝이 살아 있으면 RNG 없음, 특수는 아래 동기화로만.)
- 2 보통(유도탄): OnStart: Timer = 보통 시간(2 s), MoveState ← 3, GunTimer = GunTimer2 = 0. `GunTimer < 1` 이면:
  Target = GetRandomGunPlayer(**GunPlayers 가 비면 0·RNG 없음, 아니면 RNG Next(0,개수)**); 총구 = IsTop ? Pos+TOP : Pos+BOT(처음은 아래) [asm 0x1816fb5ae];
  dir = Target 액터가 있으면 normalize(Target.Pos − 총구), 없으면 (1,0) [asm 0x1816fb5d0..0x1816fb67c]; **CreateHomingBullet(Target, 총구, dir, mul(2.5, 탄속))**; IsTop 뒤집기;
  GunTimer = div(0.5, 0.1) = **327710(301 프레임)** — 공격 시간이 121 프레임이라 **한 번에 1발만**; SE 0x14. 카운트 만료 → 1.
- 3 특수 준비: OnStart: MoveState ← 1. MoveState == 2 → 4.
- 4 특수(유도 적 소환): OnStart: Timer = **4.0 s(인라인 0x40000 [asm 0x1816fb7d8])**, MoveState ← 8(왼쪽 화면 밖 처음 자리), GunTimer = 0.
  MoveState == 9 일 때만: `GunTimer < 1` 이면 pos = GetRandomOutsidePosition(RNG 3회, 아래), dir = (pos.x > 0 ? +1 : −1, 0) [asm 0x1816fb89d](**절대 좌표와 0 비교** —
  15-3 전투 중엔 뷰X ≈ 1072 라 양쪽 다 +1), Target = GetRandomGuardPlayer(Next(0,개수) 또는 0), **CreateHomingEnemy(Target, pos, dir, mul(2.0, 탄속))**,
  GunTimer = div(0.4, 0.1) = 262164(241 프레임), SE 0x14. 그리고 짝이 없을 때만 Timer 카운트(241) → 만료 시 1(OnStart), Base 3→4(코어 노출), MoveState ← 1.
- 6 죽기직전: OnStart: MoveState ← 3, Timer = 죽기 시간(2 s), GunTimer = GunTimer2 = 0.
  총: 2와 같되 속도 mul(3.5, 탄속), GunTimer = div(0.5, 0.1)(301 프레임). 적: `GunTimer2 < 1` 이면 idx = **Frame.Random(2)**(= Next(0,2)),
  Target = GetRandomGuardPlayer, CreateHomingEnemy(Target, Pos + ENEMY_SPAWN[idx], (1,0), mul(2.5, 탄속)), SE 0x14; GunTimer2 = div(1.0, 0.1) = 655420(601 프레임).
  timerUpdate 만료 → 1.
- **짝 동기화**(OnUpdate 맨 끝, 짝이 살아 있을 때 매 프레임): 짝 Boss 의 AttackState.State(+0x20) 를 보고
  - Ex 가 1·2·6 이고 Boss 가 **3** → Ex 3. / Ex 가 3·4 이고 Boss 가 **8** → Base 3→4(코어 노출), MoveState ← 1, Ex 1.
  → Boss 가 미사일을 쏘러 나갈 때 Ex 도 유도 적을 부르러 나가고, Boss 특수가 끝날 때 같이 끝나며 둘 다 코어를 연다.

**CreateHomingBullet 0x1816fde50**: CreateBullet 과 같은 색·Size 10, **Sprite 1(Shooting_2)**, **Target = 대상 플레이어 엔티티**, 속도 = dir·speed, stageType 0 — 같은 풀.
**CreateHomingEnemy 0x1816fe030**: 적 목록 0..7 에서 flags&4 인 첫 적에 `ShootingEnemy.Resume 0x181705ff0(pos, dir, speed)`(Resuable 이면 Initialize 다시 —
**RNG Next(0,100) 1회**, HP 2, Timer 0, 새 경로 목록(빈 것) — SetPosForce, Velo = normalize(dir)·speed, SetActive, 충돌 켬, 애니 1),
그다음 **HP = 1, HomingTarget(+0x30) = Target, Active = 1**. 빈 칸 없으면 로그만(RNG 없음).

**GetRandomOutsidePosition 0x1816fc320**: 뷰 = CalcCameraViewStageArea {H,W,X,Y}. r1 = PCG32 그대로, r2 = PCG32 그대로,
x = X + W/2 + (r1&1 ? +1 : −1)·(W/2 + 70) (= 뷰 왼쪽 70 px 밖 또는 오른쪽 70 px 밖), k = Next(0, (H/2 − 140)>>16)(H 720 이면 Next(0,220)),
y = Y + H/2 + (r2&1 ? +k : −k). RNG 순서: r1 → r2 → Next.

**유도 적의 움직임**(ShootingEnemy.moveUpdate 0x181705080 의 HomingTarget 분기, 재사용 적만 탐): Active 이고 HomingTarget 액터가 있으면
- Timer < VALID_TIME(16 s) 동안: Timer += dt; s = |Velo|; d = normalize(Velo); t = normalize(Target.Pos − Pos); ang = FPMath.Acos 0x181640760(d·t)(범위 밖이면 FP.MinValue → 조향 없음);
  maxTurn = mul(dt, mul(60<<16, 0x477)) = 1142(≈1°/프레임); wobble = mul(dt, mul(FPMath.Sin(Random·3 + Timer·4), 0x3243f))(±π/60 rad/프레임, Timer 는 더한 뒤 값);
  ang > maxTurn 이고 대상 m_PlayerState ≠ 3 이면 wobble += (cross < 0 ? −1 : +1)·maxTurn (cross = d.x·t.y − t.x·d.y, 각 곱 >>16);
  Velo = rotate(d, wobble)·s. 위치는 액터 이동(Pos += Velo).
- Timer ≥ 16 s → inactive(폭발). 961번 유도 뒤 962번째 업데이트에 폭발.
- 재사용 적은 shootAttackUpdate 조건(Resuable == 0)에 걸려 **쏘지 않음**. HomingTarget 이 0(방패 플레이어 없음)이면 경로가 비어 MovingFinished → 처음 Velo 로 직진.
- 플레이어 몸(layer 1)에 닿으면 이벤트 21 + 폭발(tryAddDamageToPlayer). **방패(layer 2)는 무시** — 막지 못함. 플레이어 총알 1발(HP 1)에 폭발.
  화면 x ±500 밖이면 폭발 없이 Disappear(재사용이라 숨김만).

**유도탄의 움직임**(OptimizedBullet.updateHoming 0x18188bb20 [asm], updatePosition 바로 앞): Target ≠ 0 일 때만.
대상 PlayerComponent 가 IsAlive 가 아니면 AngVel = 0 하고 끝(직진). 아니면 d = normalize(Velo), t = normalize(대상.Pos − Pos),
idx = d·t + 0x10000, 각(도) = mul(FPAcos표[idx], 0x394bb8)(idx 가 0..0x20000 밖이면 0x8000000000000000 × 0x394bb8 이 64비트에서 0 → 회전 0), maxTurn = mul(dt, 60<<16) = 65520(≈1°),
turn = min(maxTurn, 각), θ = mul(turn·부호(cross), 0x477)(라디안), Velo = rotate(Velo, θ), AngVel = 0. 6 s 수명·화면 밖·판정은 보통 탄과 같음.

---------------------------------------------------------------------------------------------------
## 5. 판정 사각형 요약 (보스 위치 기준, 배율 1, x 오른쪽+, y 아래+)

| 보스 | 코어0/1/2 x 범위 · y 범위 | 해치0/1/2 | 몸통 |
|---|---|---|---|
| Boss | [−12,57) · [−35,35) / [−242,−173) / [172,242) | [−170,110)×[−50,50) / [−30,69)×[−244,−171) / [−30,69)×[171,244) | 6개(2절) |
| BossEx | [−1,68) · [−35,35) / [−209,−140) / [138,208) | [−8,112)×[−36,37) / [−8,112)×[−211,−137) / [−8,112)×[137,210) | 6개(4절) |

코어 수 1: 가운데 해치가 열리고 코어0. 2: 위·아래 해치가 열리고 코어1·2. 3: 해치 전부 열리고 코어 셋.

---------------------------------------------------------------------------------------------------
## 6. ShootingEnemyBossExParamSetter (139)

필드(+): m_PairBossValid i0, m_ParameterSetted i4, m_SetTiming i8, m_EntityRef 0x10, m_Target 0x18, m_Parameter 0x20(ExParameter 와 같은 배치).
**ParseParameter 0x1816fef70**: 슬롯0 → SetTiming(int). 1 보통 탄속, 2 보통 간격, 5 특수 적 속도, 6 특수 소환 간격, 7 죽기 총 탄속, 8 죽기 총 간격,
9 죽기 적 속도, 10 죽기 적 간격 → clamp(raw, 0x1999, 0x80000)(숫자 아니면 0x1999); 3 보통 시간, 4 보통 멈춤, 11 죽기 시간, 12 죽기 멈춤 → clamp(raw, 0, 0x80000).
**OnStart 0x1816ff320**: 씬을 훑어 종류 117 액터 → Target(끊지 않아 마지막 것, 15-3 은 하나); PairBossValid = (그 BossEx 의 짝이 살아 있음); SetTiming == 0 이면 12값을 BossEx +0x58.. 에 복사, Setted = 1.
**OnUpdate 0x1816ff840**: Target 있고 미설정이고 SetTiming == 1 이고 시작 때 짝이 있었는데 지금 짝이 없으면 복사, Setted = 1(짝이 죽으면 강해지는 장치).
15-3 ExPS1 `[0, 2.5, 0.5, 2, 2, 2, 0.4, 3.5, 0.5, 2.5, 1, 2, 2]` = SetTiming 0, 값이 기본값과 **같음 → 효과 없음**(복사는 일어남, RNG 없음).

---------------------------------------------------------------------------------------------------
## 7. PlayerGuard (28, PlayerGuardComponent) — 방패

필드(+): m_Type b0(0 Vertical, 1 VerticalLong, 2 Horizontal, 3 HorizontalLong), m_Direction b1(0 위, 1 아래, 2 왼쪽, 3 오른쪽), m_ColorIndex b2, m_PlayerIndex b3,
m_EnableFlip i4, m_EntityRef 8, m_Player 0x10, m_OffsetPos 0x18. 체력·내구도 필드 없음(**안 부서짐**).
정적 .cctor 0x1816ccc80 [asm]: CollisionTable +8 (H,W,X,Y) = [60,6,−3,−30] [84,6,−3,−42] [6,48,−24,−3] [6,64,−32,−3];
OffsetTable +0x10 (방향별) = (0,−56) (0,10) (−28,−24) (30,−24); OfflineTypeTable +0x18 = {2, 2, 0, 0}(방향 → 종류, [2]·[3] 은 안 씀 = 0);
UP_OFFSET_Y +0x20 = −7.

- **Creator 0x1816cc2d0**: 슬롯0(플레이어 actor 인덱스)의 플레이어가 있을 때만 생성. ParseParameter → InitCollision → actor flags|0x80.
- **ParseParameter 0x1816cc490**: 슬롯1 → Direction, 슬롯2 == 1 → 길게, 슬롯3 == 1 → EnableFlip. m_Player = 그 플레이어 엔티티, 색·번호 복사.
  Type = OfflineTypeTable[Direction], 길게면 0→1, 2→3. **플레이어의 장비 칸0(m_EquipActors +0x30) = 방패 엔티티**.
  6-4·15-3 모두 방향 3·길게 → **VerticalLong 6×84**, 오프셋 (30,−24).
- **InitCollision 0x1816cc6d0**: `CreateCollision(CollisionTable[Type], 밀어내기 0, sync 1)`, **layer 2**.
- **OnStart 0x1816cc840 / OnPost 0x1816cc8b0 = syncPlayerPos 0x1816cc920**(OnUpdate 없음): 플레이어 숨김(flags&8)이면 같이 숨김. 아니면 정렬 순서 맞춤;
  EnableFlip 이고 Type < 2 면 Direction = (플레이어 IsLookingRight(actor flags&0x400 == 0) ? 3 : 2); off = OffsetTable[Direction] (위쪽이면 y += −7,
  플레이어 flags&0x1000(뒤집힘) 이면 y 부호 반대), off = (mul(Scale.x·BaseScale, off.x), mul(Scale.y·BaseScale, off.y)) — 실제 식은
  `((Scale·BaseScale)>>16 · off)>>16`; **방패 Pos = 플레이어 Pos + off**, 방패 Scale = 플레이어 Scale, 충돌체 배율 = Scale·BaseScale. 사각형은 돌지 않는다.
  → 오른쪽 보기: x ∈ [p.x+27, p.x+33), y ∈ [p.y−66, p.y+18). 15-3(뒤집기)에서 왼쪽 보기: 오프셋 (−28,−24) → x ∈ [p.x−31, p.x−25).
- **막는 것**
  - 풀 탄(보스 탄·적 탄·유도탄): 관찰자가 플레이어 i 가 IsAlive 일 때만 TargetInfo[i].Guard = 방패 충돌체 GetRect + 충돌체 위치(+0x40/+0x48).
    checkContact 0x18188c230 은 **i 순서로 "i 의 방패 → i 의 몸"** 을 번갈아 봄: 방패와 겹치면 −1(피해 없이 사라짐), 몸과 겹치면 i(이벤트 21).
  - 미사일: 3절(OnCollided 에서 종류 0x1c 면 SE 3 + 폭발).
  - 아군 총알: ResuablePlayerGunBullet.OnCollided 가 상대 종류 9/0x1c/0x1e 면 inactive(방패에 막혀 사라짐). 그리고 tryAddDamage 0x1816e9050:
    방패 낀 플레이어 몸(layer 1)에 맞은 아군 총알은 `vx(PreVelo.x, 0 이면 Velo.x) == 0` 이거나 `(vx ≥ 0) ≠ 그 플레이어 IsLookingRight` 면 **피해 없음**
    (앞에서 온 총알), 뒤에서 온 것만 이벤트 21.
  - 막지 못하는 것: 유도 적(4절), 보스 몸 접촉(이벤트 43), Thunder 등.
- 방패 플레이어는 총이 없다(BossEx 가 유도 적의 표적으로 고름). 2인 6-4: P0 총, P1 방패.

---------------------------------------------------------------------------------------------------
## 8. ShootingSuperApple (131) — 여러 번 실패한 팀용 배리어 사과

필드(+): m_Phase b0(안 씀), m_EasyModeCount u16 2, m_Flags u16 4(bit0 = 먹힘), m_ValidGameOverCount u16 6, m_EntityRef 8, m_Timer 0x10.
정적 .cctor 0x181708840: COLLISION_RECT +8 = (48, 48, −24, −24).

- **Creator 0x1817080b0**: 슬롯0 → ValidGameOverCount, 슬롯1 → EasyModeCount. InitCollision(밀어내기 0, sync 1, **layer 4**), 액터 배율 (1.5, 1.5).
  **GameOverCount(frame 전역 +0xc8→+0xf0) < ValidGameOverCount 이면 flags|0x2000 — 바로 제거**. InitPost 0x1817083d0 도 같은 검사.
  → 처음 도전(GameOverCount 0)에는 사과가 **없다**. 5번 실패 뒤부터 슬롯0=5 사과, 15번 뒤부터 슬롯0=15 사과.
- 배치: 인원마다 1개. 2인 = Apple1(5)·Apple8(15), 3인 +Apple7(15), 4인 +Apple3(5), 5인 +Apple5(15), 6인 +Apple2(5), 7인 +Apple6(15), 8인 +Apple4(5).
  6-4 x 648/744, 15-3 x 864/960, y 240~480. 스테이지 좌표 고정(스크롤 따라 화면에서 왼쪽으로 흘러감).
- **OnCollided 0x181708570**: 아직 안 먹혔고 상대 충돌체 layer 1 이고 그 플레이어 m_PlayerState == 7(배틀 비행기)이고 배리어(Flags2&0x20) 없으면:
  easy = EasyModeCount ≠ 0 && EasyModeCount ≤ GameOverCount(25); **`PlayerComponent.EquipBarrier_BattlePlane 0x1816c24a0(p, easy)`**
  (Flags2 |= 0x20, easy 면 |0x200 아니면 &~0x200, **HP(+5) = easy ? 5 : 3**); SE 0xf(easy 면 음 높이 0x11999); RequestDisappear(애니 1, flags|1, Timer 0.75 s).
- OnUpdate 0x181708490: 먹혔으면 Timer −= dt, <1 → flags|0x2000. RNG 없음.
- 배리어 효과: 최대 HP 3/5(GetHitPointMax_BattlePlane 0x1816c25d0 — 회복이 이 값까지), **HP > 2 동안 미사일이 즉사 대신 1 피해**(3절).
  (`source-plane-runtime.js` 의 createLife 는 lifeMax 2 고정 — 플레이어별 최대치가 필요.)

---------------------------------------------------------------------------------------------------
## 9. BgmChanger (225)·SwitchTargetGroup·열쇠

BgmChanger(ParseParameter 0x1817cdf70: 0 음악 번호, 1 조건 0 스크롤/1 이벤트61, 2 스크롤 px, 3 페이드, 4 무음 시간; OnUpdate 0x1817ce090)는
FrameEvents.PlayBgm 과 자기 타이머만 — **시뮬레이션에 영향 없음**(RNG·다른 액터 변경 없음). 6-4: BgmChanger1 = 스크롤 900 에서 음악 7, BgmChanger2 = 이벤트 61 에 음악 4.
SwitchTargetGroup1 은 60/61 만 받아 목록 이름들(Key1, BgmChanger2)에 다시 보냄 — 기존 `source-switchtargetgroup-devices.js`. Key1 은 61 로 나타남(source-key-lifecycle.js).

---------------------------------------------------------------------------------------------------
## 10. 한 프레임 순서와 RNG 순서

갱신 순서(프로젝트 규칙: `actor-lifecycle-report.json` updater 등록 순, 엔티티마다 OnUpdate1 → OnUpdate → OnUpdate2(Pos += Velo); 보스 쪽에서 따로 확인 안 함 → **UNCONFIRMED**):
`#21 ShootingSuperApple → #28 Key → #97 ShootingEnemy(유도 적 포함) → #100 ShootingEnemyMissile → #101 Spawner → #103 ShootingEnemyBoss → #106 ShootingEnemyBossEx
→ #108 ExParamSetter → #116 Player(배틀 비행기) → #131 PlayerGunBullet → #163 OptimizedBulletObserver(탄 이동·방패/몸/맵 판정) → #167 PlayerGuard(OnUpdate 없음)
→ #169 PlayerGun → #217 BgmChanger` → Collision(보스 몸·미사일·유도 적·사과의 OnCollided, 아군 총알의 보스 적중 이벤트 21) → 스테이지 자동 스크롤 →
Post(PlayerGuard.OnPost 위치 맞춤, PlayerGun.OnPost …).
결과:
- 보스가 이번 프레임 만든 풀 탄은 같은 프레임 #163 에서 첫 이동·판정. 보스가 이번 프레임 Resume 한 미사일·유도 적은 다음 프레임부터 움직임(#100·#97 이 먼저 지나감).
- 아군 총알이 보스를 맞힌 HP 변화는 다음 프레임 Base.OnUpdate 에서 상태(7·4)로 반영.
- Base.OnUpdate 가 읽는 스크롤 위치는 지난 프레임까지의 값(스크롤은 Collision 뒤에 움직임).

RNG(프레임 PCG32 하나, 모든 소비자 공유) — 한 프레임 안의 보스 쪽 순서:
1. Boss(#103) Base: Behaviour 7 이면 2회(%10) → 피격 흔들림이면 2회(%12, &3).
2. Boss AttackState: 풀 탄 성공마다 RandomFP 1회(위 총구 먼저), 죽기직전 미사일이면 Next(0,3).
3. Boss MoveState 7 만료 시 1회(&1).
4. BossEx(#106) Base: 1과 같음. ExAttackState: 1(짝 없음) Next 류 1회 / 2·6 Next(0,총 개수) → 풀 탄 RandomFP / 4 r1·r2·Next(0,n) → Next(0,방패 개수)
   → Resume 의 Next(0,100) / 6(적) Random(2) → Next(0,방패 개수) → Next(0,100). (개수 0 이면 그 Next 없음, 빈 칸 없으면 Resume 의 Next 없음.)
5. BossEx MoveState 7.
생성 때: BossEx Creator 의 재사용 적 8기 Initialize = Next(0,100) × 8(생성 순서상 Spawner 의 OnStart 3+3 보다 먼저로 보임 — **UNCONFIRMED**). Boss·미사일·방패·사과는 생성/시작에 RNG 없음.

---------------------------------------------------------------------------------------------------
## 11. 기존 런타임에 끼우기

- 보스 탄(보통·죽기직전) = `source-shooting-runtime.js` createBullet 그대로(stage 0, 10×10, 6 s, 풀 32 공유, 맞으면 그 플레이어에 이벤트 21).
- BossEx 유도탄 = 같은 createBullet + `target`(플레이어 엔티티) 추가, bulletUpdate 에서 이동 전에 updateHoming(4절). Sprite 1 은 보기 전용.
- 방패 = bulletUpdate 의 플레이어 판정을 "플레이어 i 마다 방패 i(있고 i 가 살아 있으면) → 몸 i" 로 바꾸기; 방패에 걸리면 피해 없이 페이드.
- 미사일 = 새 풀(보스당 18), 3절. 맵 접촉은 기존 지형 판정, 플레이어 접촉은 몸 사각형 겹침(192×48 은 Pos 기준 x−192..x).
- 유도 적 = 기존 enemy 객체에 `reusable, homingTarget, randomRaw, velo` 와 4절 이동을 추가(경로 없음, 쏘지 않음, 화면 ±500, 16 s).
- 보스 몸 접촉 = 이벤트 43 → 기존 플레이어 사망 경로(체력 무관). 미사일 = 43 또는 21. 탄·유도 적 = 21 → `source-plane-runtime.js` lifeDamage.
- 아군 총알의 보스 적중 = gunStep 의 `damage:[{target, from}]` 에 맞은 보스 충돌체(코어/해치/몸통 구분)가 필요 — 1절 피해 규칙에 씀.
- 사과 = EquipBarrier(플레이어 lifeMax 3/5) — plane runtime 의 고정 2 를 플레이어별로.
- 클리어 = 마지막 보스의 Behaviour 8 만료 → 이벤트 61 → SwitchTargetGroup1 → Key1 등장 → 기존 열쇠/골.
- 보스 x 는 매 프레임 CalcAutoScrollSpeed 를 더함 — `source-stage-autoscroll.js` calculateStepRaw 를 같은 프레임 Actor.Update 시점 입력으로 불러 쓰면 됨.

---------------------------------------------------------------------------------------------------
## 12. 검증값 (위 해석대로 손으로/작은 스크립트로 계산; 스크립트는 scratchpad, 원작 미실행)

k = Base.OnUpdate 가 스크롤 조건을 처음 만족한 업데이트(6-4: 스크롤 ≥ 1200 px, 15-3: ≥ 800 px). 1.5 px/프레임(98304) 이 1번 업데이트부터 업데이트 끝마다 쌓인다면
**6-4 k = 801, 15-3 k = 535**(절대값 **UNCONFIRMED**, 아래 상대값은 해석상 확정). 스크롤 끝: 6-4 1552 px(1035번째 걸음 1 px), 15-3 1072 px(715번째) — 뷰폭 1280 가정.
- Boss 등장: k 에 State 0→1→2, k+1 첫 Move, normalize(−395,0) = (−65537, 0) 이라 걸음 −131074 raw, **k+198 에 198번째 Move 로 도착**(스냅), k+229 State 3,
  AttackState 8. k+230 고르기 시작, **k+291 첫 선택(보통)**, k+323 AttackState 2, **k+324 첫 탄 한 쌍**(u = 0: 위 총구 Velo (0, +196608), 아래 (0, −196608)).
  둘째 쌍 k+346 (u 4805: 위 (−30051, 194295)), 이후 22 프레임마다 u = 9610, 14415, 19220, 24024, 28829, 33634, 38439, 43244, 48048, 52853, 57658, 62463 → 14쌍, k+624 AttackState 8.
- 상하: k+324 MoveState 3 → k+383 위 120 px 도착(60번) → k+396 까지 멈춤(13) → k+456 집 도착 → k+468 RNG 로 위/아래. 낮은 HP: 위 120 px 51번.
- 보통 한 사이클(고르기 프레임 C 기준): C+32 AttackState 2, C+33 첫 쌍, C+333 끝. 특수(4번째 선택 C): C+198 바깥 도착(198번), C+259 AttackState 4,
  **일제사격 C+260, C+381, C+502**(9발씩), C+560 끝 + 코어 노출(Base 4), C+591 Base 5, C+758 집 도착, C+952 Base 6, C+983 Base 3, **C+1043 다음 선택**.
- BossEx 등장(15-3): 385 px = 193번(k+193), k+224 State 3·Ex 1, k+346 Ex 2, **k+347 첫 유도탄**(아래 총구 Pos+(155,192), 표적 = GunPlayers[Next(0,n)], 속도 163840),
  다음 탄은 301 프레임 뒤라 보통 2 s(121) 동안 1발. Ex 상하 45 px = 23번.
- 낮은 HP 문턱(2인): 6-4 HP 120 → ≤ 36 에서 코어 단계(평소 1씩만 맞히면 84발로 36, 그 뒤 코어 2씩 18발; 특수 뒤 코어 노출 때 맞히면 그만큼 줄어듦),
  15-3 Boss 100 → ≤ 30, BossEx 100 → ≤ 30.
- 죽음: 이벤트로 HP 0 이 된 업데이트 N → N+1 State 7(그 프레임부터 공격·이동 멈춤), N+2 Flash·흔들림 시작(301 프레임, 매 프레임 RNG 2회),
  N+302 State 8, **N+333 이벤트 61(Key1 등장) + 제거**. 15-3 에서 먼저 죽은 쪽은 61 을 안 보내고 사라짐.
- 미사일 속도: 65536 → 72088 → 78638 → 85188 …, 111 프레임째 786432(12 px). 미사일 18발 풀, 특수 1회 27발 요청.
  (2026-10-17 구현 대조: 왼쪽으로 나는 미사일은 normalize 가 (−65538,0) 이고 FPVector2×FP 가 음수를 내림해 셋째 값이 85191 — 첫 두 값·상한 도달은 같음.)
- 시간→프레임: 0.2 s 13, 0.5 s 31, 1 s 61, 2 s 121, 4 s 241, 5 s 301, 6 s 361; 총 간격 0.35→22, 0.3→19, 2.0→121, 1.0→61; BossEx(공격속도 0.1) 0.5→301, 0.4→241, 1.0→601.

---------------------------------------------------------------------------------------------------
## 13. UNCONFIRMED / 남은 확인

1. 프레임 안 액터 갱신 순서(10절, 등록 순 규칙을 빌림)와 그에 따른 k 의 절대값(스테이지 시작 프레임·스크롤 시작 프레임·Collision 뒤 스크롤).
2. 보스가 더한 CalcAutoScrollSpeed 와 그 프레임 스테이지가 실제로 움직인 양이 다를 수 있는 경우(같은 프레임 #163 에서 플레이어가 죽어 0x200 이 서면 스테이지는 0,
   보스는 이미 더함) — 원작도 그런지 미확인. 뷰폭 1280·뷰높이 720 은 기존 런타임 값.
3. 관찰자가 읽는 방패 충돌체 위치(+0x40)가 지난 프레임 OnPost 위치인지(1프레임 늦음) — 플레이어 몸 사각형과 같은 문제(danmaku-spec §9).
4. 미사일 충돌 4번째 인자(=1)가 "맵 밀어내기 대상"이라는 해석, 192×48 이 실제로 x−192..x 인지(그림과 비교 안 함). 미사일 vs 플레이어 몸의 층 행렬.
5. 사과 충돌체가 액터 배율 1.5 를 따르는지(72×72), 아군 총알(layer 5)이 플레이어(1)·방패(2)와 실제로 부딪히는지(층 행렬).
6. 생성 시점 RNG 순서(BossEx 8회 vs Spawner OnStart 6회, 다른 액터 종류의 생성 RNG).
7. 이벤트 43 을 받은 배틀 비행기의 처리(즉사로 봄 — plane-family 의 사망 경로), 26/43 공통 분기 내부(shooting-enemy-spec 7-5와 같음).
8. NotifyTarget 의 이름 검색(vtable +0x298)이 "이름 액터가 있나"인지 — 있으면 61 을 이름으로 보냄으로 해석.
9. Frame+0xc8 전역의 CheckPointInfo.GameOverCount(+0xf0) 가 "같은 라운드 재시도 횟수"인지(쉬움 모드·사과 등장 조건) — 필드 이름으로만 판단.
10. AddDamage 0x1816f6f90 과 ShootingEnemyBossParamSetter(138) 는 호출처/배치가 이 두 라운드에 없어 읽기만 함.
