# 11-1·11-3 탄막(Danmaku) 구현 사양 — 2026-10-17 (Claude, 정적 분석만)

원작 실행 없음. Ghidra 출력: `source-migration/danmaku.local.txt`(전 클래스), `danmaku2..4.local.txt`(회전·atan·RandomFP·
표 디코더·sin/cos·총알 뷰). 커밋 안 됨 — `tools/ghidra/decompile.sh` 로 다시 뽑을 수 있음. 중요한 분기는 어셈블리로 재확인
(표시: [asm]). 필드 이름은 `quantum-field-offsets.json`(인스턴스 오프셋 = il2cpp − 16). FP 곱 = `(a*b)>>16`(64비트, 산술 시프트=내림),
나눗셈 `(a<<16)/b` = 0 쪽 버림(idiv). dt = Frame vtable+0x248 = 1092 raw(60 Hz).
풀(OptimizedBulletObserver) 자체 분석은 `notes/shooting-enemy-spec.md` 담당 — 여기선 탄막이 쓰는 부분만.

## 0. 구성·순서

액터 타입: DanmakuObserver 200, Emitter 201(0xc9), Modifier 202(0xca), Locator 203(0xcb), OptimizedBulletObserver 222,
DanmakuThunder 223, Key 17, Player 27(TopViewPlayer 144 가 만듦), PlayerGuard 28(0x1c).
ActorManager 슬롯: +0x28 = DanmakuObserver 엔티티(Creator 0x181813ce0·InitPost 0x181814e50 이 씀), +0x30 = EndlessDanmakuObserver,
+0x60 = OptimizedBulletObserver.

연결(이름으로): Observer 페이즈 → Emitter 이름(최대 4개) → Emitter 슬롯15 = Modifier 이름 → Modifier 슬롯6 = Locator 이름.
Locator 가 실제로 쏘고, 총알은 Locator 위치에서 나온다(Emitter/Modifier 의 좌표는 안 쓰임).

한 프레임 순서(프로젝트 규칙 CODEX-HANDOFF:121 "updater 등록 순" + Stage.onUpdate 순서 적용, Danmaku 쪽에서 별도 확인은 안 함 →
**UNCONFIRMED**): DanmakuThunder.OnUpdate(등록#26) → Key(#28) → Player(#116) → Observer(#156) → Emitter(#158) → Locator.OnUpdate(#160)
→ OptimizedBulletObserver(#163, 총알 이동·피격) → Collision.Update(여기서 Thunder.OnCollided) → Post.
같은 타입 안에서는 생성 순서(타입 우선순위 정렬 0x180554390 후 순서).

## 1. DanmakuObserver (0x181813e50 ParseParameter)

필드: m_CurrentPhase +0(sbyte), m_CurrentState +1, m_HitPoint +2, m_HitPointMax +3, m_ReminingTimeInt +4, m_WarmUpTimeInt +5,
m_PhaseTimer +0x10, m_ReminingTime +0x18, m_Scale +0x20, m_WarmUpTime +0x28, m_Pos +0x30, m_TargetName +0x40,
m_PhaseArray +0x60 (DanmakuPhaseParameter 4개 × 0xd8: m_Time +0x10, TargetParam1..4 +0x18/+0x48/+0x78/+0xa8, 각 0x30 =
{m_TargetType +0, m_EntityRef +8, m_TargetName +0x10}).

슬롯(datas[i] = list+0x20+i*8):
- 0: 정수 인원표(28자) → `FUN_180970770` 디코드 → `QPlayerCountParamUtility.Find 0x181786950(Frame.GetPlayerIndexCount)` →
  m_HitPoint = m_HitPointMax ([asm] 0x181813f35 Find → 0x181813f3a/3e 가 +2/+3 에 씀). **공유 HP** (플레이어 전원 공통).
- 1+5k (k=0..3): 페이즈 k 의 m_Time(FP 초) → +0x70+k*0xd8. 2+5k..5+5k: 그 페이즈에 켤 Emitter 이름 4개(빈 문자열 = 없음).
- 21..27: 안 읽음. 28,29: UI 위치 = (UI_POSX 0 + s28, UI_POSY 416 + s29) → m_Pos. 30: m_Scale = s30×UI_BASE_SCALE(10). (UI 전용)
- 31: m_TargetName = 클리어 때 알릴 액터 이름("Key1").

정적(.cctor 0x181816040, resolve 확인): WARM_UP_TIME +0 = FromString "5.0" = 327680, INDICATE_KEY_TIME +8 = "3.0" = 196608,
UI_BASE_SCALE +0x10 = 10, UI_POSX +0x18 = 0, UI_POSY +0x20 = 416.

OnStart 0x181814ed0: 4페이즈 × 4 TargetParam 마다 `DanmakuTargetParameter.Initialize 0x181696c10`(이름으로 FindActor, 타입 0xc9 면
TargetType=0·EntityRef 저장, 아니면 EntityRef=0+에러 로그, 빈 이름은 건너뜀). 이어 m_ReminingTime = calcReminingTime, Int = 올림.

OnUpdate 0x181815110: prev = state; checkGameOver → updatePhase → updateConter(prev).

updatePhase 0x1818151b0 (한 프레임에 case 하나):
- 0 준비: timer += dt; timer ≥ WARM_UP(5 s) → state 1, timer = 0. (327680/1092 → 301번째 프레임)
- 1: phase[cur].m_Time < 1 raw → state 3. 아니면 그 페이즈 4개 타깃 SetEnable(true) → state 2.
- 2: `DanmakuPhaseParameter.Update 0x181696940(progress = calcPhaseProgress, dead = 0)` (= 켜진 Emitter→Modifier.ParameterUpdate),
  그 다음 timer += dt; m_Time ≤ timer → state 3.  (progress 는 증가 **전** timer 로 계산)
- 3: **4페이즈 전부의** 16개 타깃 SetEnable(false); cur++; state = cur>3 ? 4 : 1; timer = 0.
- 4: timer += dt; timer ≥ INDICATE_KEY_TIME(3 s) → notifyTarget 0x181815b10 + `Frame.PlaySe(0x18)` → state 5.
- 5(클리어 완료)·6(게임오버): 아무것도 안 함.
→ 시간이 0 인 페이즈는 state1→3→(다음)1… 로 프레임마다 하나씩 넘어감. 15 s 페이즈 = state2 프레임 901개(901×1092 ≥ 983040).

notifyTarget: 이름 m_TargetName 액터 전부에 이벤트 **0x3d = 61(SwitchOn)** (`Frame.NotifyEvent 0x181749fa0`). Key 는 61 을 받으면
setActive(true)(SE 없음; source-key-lifecycle.js receive). Key1 은 슬롯2=1 이라 처음엔 숨김.

calcPhaseProgress 0x181815de0: state∈1..3 이고 cur<4 일 때 m_Time<1 → 1.0; 아니면 clamp((timer<<16)/m_Time, 0, 65536). 그 외 0.
calcReminingTime 0x181815be0: state>3 또는 cur>3 → 0; 아니면 phase[cur].time − timer + Σ phase[j>cur].time. Int = 올림(음수→0).

checkGameOver 0x181815770 (매 프레임, state 무관):
1. 플레이어 중 하나라도 PlayerComponent.m_Flags(+0x20) & 0x200(사망 비트) → state 6, 끝.
2. 아니고 m_HitPoint == 0 → 전원에게 이벤트 **0x13 = 19(Dead)** (killPlayer 0x181815ee0, NotifyEvents.Invoke_OnRecvEvent),
   `FrameEvents.Flash`, `Frame.RequestShake` → state 6.
state 6 에서는 페이즈가 멈출 뿐 Emitter 는 켜진 채라 **계속 쏜다**(끄는 코드 없음). 재시작은 일반 사망 흐름(Danmaku 코드 밖).

SubHitPoint 0x181815f70(amount, force): force 아니고 state>3 이면 무시; HP = max(0, HP−amount). 총알은 인라인(state<4 일 때만),
Thunder 는 force 판(상태 검사 없음, §6).

updateConter 0x1818158f0 (소리만): state<4 에서 state0 이면 m_WarmUpTime = max(0, 5−timer)·Int=올림, 아니면 ReminingTime 갱신.
(prev==0 && state≠0) 또는 (새 Int<6 && 값이 바뀜) 이면 SE: 새 Int==0 이거나 시작 순간이면 0x17, 아니면 0x13.

## 2. DanmakuEmitter (ParseParameter 0x18180f380)

필드: m_TargetType +0(1=Modifier, 2=Locator), m_Enable +4(Creator/Initialize 0), m_EntityRef +8, m_TargetEntityRef +0x10,
m_TargetName +0x18, m_DanmakuParameter +0x38. DanmakuParameter(0x60바이트, 상대): ColorB +0, ColorG +1, ColorR +2, BulletCount +3(sbyte),
RotateMode +8(0 None,1 Swing,2 Rotation,3 Player), RandomDiffusion +0xc, Angle +0x10, AngularVelocity +0x18, DiffusionAngle +0x20,
FireRate +0x28, FireStopTime +0x30, FireTime +0x38, RotateValue +0x48, Size +0x50, Velocity +0x58.

| 슬롯 | 필드 | 변환 |
|---|---|---|
| 0 | Velocity (px/s) | FP |
| 1 | AngularVelocity (총알이 휘는 각속도, 도/s) | FP |
| 2 | Size | FP |
| 3,4,5 | ColorR, ColorG, ColorB | 정수부 바이트 |
| 6 | FireRate (발사 간격 s) | FP |
| 7 | FireTime | FP |
| 8 | FireStopTime | FP |
| 9 | BulletCount | 정수부 바이트 |
| 10 | Angle (기준 방향, 도) | FP |
| 11 | DiffusionAngle (퍼짐 각, 도) | FP |
| 12 | RandomDiffusion = (정수부 == 1) | |
| 13 | RotateMode (정수부) | |
| 14 | RotateValue | FP |
| 15 | 대상 이름(Modifier) | 문자열 |

OnStart 0x18180f7b0: initializeTargetEntity 0x18180fad0(이름 → 타입 0xca→1, 0xcb→2, 그 외 EntityRef=0+로그); 대상이 Modifier 면
자기 DanmakuParameter 0x60바이트를 Modifier 의 m_DanmakuParameter(+0x80) **와** m_OriginDanmakuParameter(+0xe0) 둘 다에 복사.
OnUpdate 0x18180f8c0: m_Enable && 대상 있음 → 타입1: `Modifier.OnDanmakuUpdate 0x181812e80` / 타입2: Locator.OnDanmakuUpdate(자기 파라미터).
ParameterUpdate 0x18180fa30: m_Enable && 타입1 → Modifier.ParameterUpdate.
SetEnable 0x18180fe00: m_Enable = v; 타입1 → Modifier.SetEnable 0x181813520 [asm] (m_Enable(+8)=v; 대상 Locator 면 **v 와 무관하게**
`Locator.Reset 0x181810970` 으로 jmp); 타입2 → Locator.Reset.

## 3. DanmakuModifier (ParseParameter 0x1818123d0)

필드: m_TargetType +0(2=Locator), m_ModifierMode +4(0 None, 1 PhaseProgress, 2 PhaseProgressWave), m_Enable +8, m_TargetEntityRef +0x18,
Mul: AngularVelocity +0x20, BulletCount +0x28, FireRate +0x30, FireRateDead +0x38, FireTime +0x40, SizeDead +0x48, Velocity +0x50,
VelocityDead +0x58; m_TargetName +0x60; 현재 파라미터 +0x80, 원본 +0xe0.
슬롯: 0 = 모드(정수부); 1 MulVelocity, 2 MulAngularVelocity, 3 MulFireRate, 4 MulBulletCount, 5 MulFireTime, 6 = Locator 이름,
7 MulVelocityDead, 8 MulFireRateDead, 9 MulSizeDead. 1~5·7~9 는 56자 FP 인원표(`FUN_18096f720`: 길이가 7×8 아니면 전부 0) →
인원수−2 에서 아래로 0 아닌 첫 값(인라인 Find, 0x18181259x..).

ParameterUpdate 0x181813040 [asm] (o = 원본 +0xe0.., c = 현재 +0x80..):
p = 모드1: progress / 모드2: 0x8000 − (cos((progress·0x3243f>>16)·6) <<15 >>16) / 그 외: 65536.
- p ≤ 0: c.Vel=o.Vel, c.AngVel=o.AngVel, c.FireRate=o.FireRate, c.Count=o.Count, c.FireTime=o.FireTime
- 0<p<1: c.X = ((((o.X·Mul)>>16) − o.X)·p >>16) + o.X  (Vel, AngVel, FireTime)
  c.FireRate = (((o<<16)/MulFireRate − o)·p >>16) + o   (배율이 크면 간격이 짧아짐)
  Count: u = ((n·MulCount − n·65536)·p >>16) + n·65536; c.Count = (u>>16) + (u&0xffff ? 1 : 0) (올림)
- p ≥ 1: Vel=MulVel·o>>16, AngVel=MulAng·o>>16, FireRate=(o<<16)/MulFireRate, Count=올림(n·MulCount), FireTime=o·MulFireTime>>16.
- dead>0 일 때만 VelocityDead/FireRateDead/SizeDead 와 FireStopTime(+0xb0)/Size(+0xd0) 갱신 — 11-x 는 Observer 가 dead=0 을 넘기므로
  **안 함**(Size·FireStopTime 은 원본 그대로).
OnDanmakuUpdate 0x181812e80: 대상 있음 && 타입2 → `Locator.OnDanmakuUpdate(locator, frame, Locator액터, &현재파라미터(+0x80))`.
m_Enable 은 아무 데서도 검사 안 함. Modifier 자체 OnUpdate 없음.

## 4. DanmakuLocator — 발사 핵심

필드: m_PrevTargetPlayerIndex +0, m_TargetPlayerIndex +1, m_Enable +4, m_IsEndless +8, RW{Enable +0x30, FireRateTimer +0x38,
FireTimer +0x40}, RO{DeltaTime +0x48, Time +0x50, PlayerPos +0x58, Position +0x68}. 슬롯 없음(Creator 0x181810670 은 파싱 안 함).
정적(.cctor 0x1818115c0): COLLISION_SIZE_MARGIN +8 = 0x5555, R_P_1 +0x20 = "31940.66241" raw 2093263232, R_P_2 +0x28 = "60951.66833"
raw 3994528512, R_P_3 +0x30 = "44813.59834" raw 2936903936, R_P_4 +0x38 = "27352.63246" raw 1792582144.

OnStart 0x181810760: m_Enable = 1; m_IsEndless = (ActorManager+0x30 엔티티에 EndlessDanmakuObserver 있음) → 11-x 는 0.
Reset 0x181810970: Time = 0(엔드리스면 그쪽 m_UtilRandom×10), RW = {0,0,0}, TargetPlayerIndex = −1.
OnUpdate 0x1818107e0: m_Enable 이고 Observer.state ∈ {4,5} 면 `OptimizedBulletObserver.RemoveAllBullet` + m_Enable = 0
(클리어 때 탄 전부 삭제; 게임오버 6 에서는 안 지움).

OnDanmakuUpdate 0x181810a20 (Emitter 가 켜진 프레임마다):
1. TargetPlayerIndex==−1 && RotateMode==3 → 다음 플레이어로 순환(Prev+1, ≥인원이면 0). 11-x 는 모드3 없음.
2. PlayerPos = 대상 플레이어 액터 위치(+0xb0) 또는 0. **Time += dt**, DeltaTime = dt, Position = Locator 액터 위치(+0xb0).
3. `DanmakuUpdateImpl 0x181810d10`(P, RO, RW, 콜백 onBulletCreated 0x181811300) — 참이면 SE 0x14.

DanmakuUpdateImpl [asm 0x181810d10..112a]:
```
if P.FireStopTime > 0: RW.FireTimer += dt
if RW.Enable == 0:
    if RW.FireTimer < P.FireStopTime: return false
    RW.Enable = 1; RW.FireRateTimer = 0; RW.FireTimer = 0; return false
RW.FireRateTimer += dt
fired = false
if RW.FireRateTimer >= P.FireRate:
    A = P.Angle·0x477>>16; c0 = cos(A), s0 = sin(A)       // 0x1816d3190 / 0x1816465d0
    D = P.DiffusionAngle·0x477>>16                          // 360° → 411480
    base = BaseRotation(P, RO)
    if D == 0:                       // BulletCount 무시, 1발
        emit(rotate((c0,s0), base))
    else:
        step = D; if Count > 1: n = (P.DiffusionAngle < 360(QFP+0x220)) ? Count−1 : Count; step = D / n (idiv)
        half = (D<<15)>>16
        for i in 0..Count−1:
            off = RandomDiffusion ? (CreateRandom((i<<16) + RO.Time)·D)>>16 : i·step
            emit(rotate((c0,s0), off − half + base))
        fired = Count >= 1
    RW.FireRateTimer = 0            // 빼기가 아니라 0
if P.FireStopTime >= 1 && RW.FireTimer >= P.FireTime: RW.Enable = 0; RW.FireTimer = 0
return fired
emit(dir): vel = (dir.x·P.Velocity>>16, dir.y·P.Velocity>>16); 콜백에 DanmakuBulletParameter
           {ColorB/G/R, AngularVelocity = P.AngularVelocity, Size = P.Size, Position = RO.Position, Velocity = vel}
```
11-x 는 FireStopTime=0 → 첫 호출에서 RW.Enable 만 켜고, 그 뒤 FireRate 마다 끝없이 연사(FireTime 은 안 쓰임).
rotate 0x18163cac0: θ → |θ| % 0x6487e 로 FPSinCos 표(하위32 sin, 상위32 cos), sin 부호 = θ 부호;
x' = (x·cos>>16) − (y·sin>>16), y' = (x·sin>>16) + (y·cos>>16).

BaseRotation 0x181811200:
- 모드1 Swing: (RotateValue·0x477>>16)·(((sin((Time·0x3243f>>16)·0x3333>>16) + 65536)·0x8000)>>16) >>16
- 모드2 Rotation: ((RotateValue·Time)>>16)·0x3243f >>16  (rad; RotateValue = 반바퀴/초 단위. 0.25 → 45°/s)
- 모드3 Player: PlayerPos≠0 이면 atan2(Player−Position) (FUN_1816407f0 atan 표 + ±π/2·π 분기), 아니면 0. 그 외 0.
CreateRandom 0x181811140: s = sin((R3·x>>16) + (R2·x>>16) + (R1·x>>16)); r = ((s·R4)>>16) % 65536 (C# 부호 있는 나머지); |r|.
결정적(PCG 안 씀).

createBullet 0x181811380 [asm] (onBulletCreated → s_Interpolator 의 frame/locator):
k = (QFP+0xf0 <<16)/QFP+0x1c8 = 65536·65536/3932160 = **1092**(1/60);
OptimizedBulletParam = {B,G,R, Size바이트 = ((10(QFP+0x170)·P.Size>>16)·0x5555) >>32, SpriteType 2(Danmaku), Target 0,
AngularVelocity = k·angVel>>16 (도/프레임), Position, Velocity = (vel·k)>>16 (px/프레임)};
`OptimizedBulletObserverComponent.CreateBullet 0x18188dc30(풀, frame, &param, stageType = m_IsEndless?2:1)`.
Size 바이트: 1→3, 1.5→4, 3.5→11, 4→13 (판정 정사각형 한 변 px). 그림은 약 3배(뷰 0x18058eb60: 크기/10 ÷ 0x5555; 스프라이트 원본 px **UNCONFIRMED**).

## 5. 총알 (OptimizedBullet, 탄막에 필요한 부분)

풀: 크기 = OptimizedBulletObserver 슬롯0 (11-1: 64, 11-3: 70). CreateBullet: 앞에서부터 첫 비활성(flags bit0=0) 칸 재사용,
없으면 개수<최대일 때 뒤에 추가, 가득 차면 에러 로그 후 **생성 안 됨**.
Initialize 0x18188b750: flags |= Active(1), Dissapear(0x10) 해제, stageType1 → DanmakuStage 비트 4; m_RandomSeed = `Frame.RandomFP
0x181747bc0` (**프레임 PCG32 를 한 번 전진** — 공용 난수열에 영향), Timer = VALID_TIME 6.0(0x60000).
정적(.cctor 0x18188cb30): SIZE_DEFAULT 10, MARGIN 10(0xa0000), VALID_TIME 6.0, DISSAPEAR_TIME 0x1999(0.1 s).

매 프레임(풀 OnUpdate 0x18188d510 → OptimizedBullet.OnUpdate 0x18188b8a0):
- 풀이 먼저 플레이어마다 대상 사각형을 채움: 기본값으로 지운 뒤 `PlayerComponent.IsAlive 0x1816bff90`(flags&0x200==0 && state≠5) 이면
  m_PlayerColision = `PlayerComponent.GetCollision(index 0)` [asm 0x18188d700 r8d=0] 의 GetRect + 충돌체 위치(+0x40,+0x48).
  TopViewPlayer 충돌체0 = 몸통 H28×W32 at (−16,−29) (source-topviewplayer-devices.js). 장착물이 PlayerGuard(28) 면 m_GuardColision.
- 사라지는 중(0x10): Timer −= dt, ≤0 이면 Active 해제. 끝(판정 없음).
- 아니면 Timer −= dt; Timer ≤ 0 → 사라짐 시작(Timer=0.1, 0x10).
  updatePosition 0x18188bf90: AngularVelocity≠0 이면 속도를 θ = angVel·0x477>>16 (도/프레임→rad)만큼 회전(위 rotate 와 같은 식),
  새 위치 = 위치 + 속도.
  checkOffScreen 0x18188c120 [asm]: **X 만** 검사 — 카메라 영역(CalcCameraViewStageArea 0x1817dfd10, {h,w,x,y}) x−10 ≤ px < x+w+10
  아니면 화면 밖 → 사라짐 시작(위치는 갱신 안 함).
  checkContact 0x18188c230: 판정 = 한 변 s(Size바이트) 정사각형, 왼쪽아래 = (px−s/2, py−s/2). 플레이어 i 순서로
  Guard 사각형과 겹치면 −1, Player 사각형과 겹치면 i (겹침: L < x+w && x < L+s && B < y+h && y < B+s, 엄격 부등호);
  없으면 MapComponent.IsContacted 0x18187ee50(같은 사각형) → 벽이면 −2, 아니면 −3.
  −3 이면 위치 저장. 그 외는 (i≥0 이면 addDamageProcess) 후 사라짐 시작(위치는 이전 값 유지).
- addDamageProcess 0x18188c620, DanmakuStage(비트4): Observer.state < 4 일 때만 HP = max(0,HP−1), 그 플레이어 m_IsFlashing(+0x1c)=1,
  m_FlashTimer(+0x60)=0x5555(0.333 s), SE 0xb. **무적 시간 없음** — 맞는 총알마다 1. 이벤트는 안 보냄
  (이벤트21 DamageByBullet 은 Shooting 비트2 경로, 엔드리스는 이벤트19).
- Y 방향 화면 밖은 안 지움 → 벽(−2) 또는 6초 시간초과로만 사라짐.

## 6. DanmakuThunder (Creator 0x181816460, ParseParameter 0x1818167c0)

ThunderBase(+ DanmakuThunder) 로 만든 레이저 벽. 슬롯0 = 방향(정수부, >3 이면 0: 0 위 −y, 1 아래 +y, 2 왼쪽 −x, 3 오른쪽 +x),
슬롯1 > 0 → ThunderBase.m_Flags bit0(Through: 탐침 층 2, 아니면 3). m_Alpha = 1.0. 충돌체는 ThunderBase.InitCollision 인라인과 같음
(빔: CollisionTable[dir] 폭 4·길이 2400, priority 127, layer 7 / 탐침 32×32) → **기존 `source-thunder-native.js` 의 createCollisions 재사용**.
OnUpdate 0x1818168e0: m_Timers[0..7](플레이어별 쿨다운) 중 >0 인 것 −= dt; Actor flags(+0xc)&8(일시정지) 아니면
getLengthToMap → Length = LengthToMap → modifyCollison (= 기존 모듈 `update`). 빔은 맵에서만 멈춤(액터로 짧아지지 않음 — 아래).
OnCollided 0x181816b20 (자체 콜백, 등록 0x18177c5ac; ThunderBase 콜백 안 부름): 상대 액터 타입 27(Player) 이면 idx =
PlayerComponent.m_Index(+8); m_Timers[idx] ≤ 0 이면: HP = max(0,HP−1) **state 검사 없음**[asm 0x181816cf5..d19], m_IsFlashing=1,
m_FlashTimer=0x8000(0.5 s), SE 0xb, m_Timers[idx] = 0x8000(0.5 s). 즉 빔에 닿아 있으면 플레이어마다 0.5초에 1씩 깎음.
죽이지 않는다(이벤트 없음). 자기 충돌체 번호를 안 보지만 탐침은 getLengthToMap 후 비활성(ShootBlock 비트 없으면).
상태 검사가 없으므로 준비(state0) 중에도, 클리어(state5) 뒤에도 깎이며, checkGameOver 는 항상 돌아서 클리어 뒤라도 HP 0 → 전원 사망.
OnRecvEvent 0x181816dd0: 53(SetPause) → Base pause 비트3 + SetEnableAnimation; 그 외 ActorComponent.OnRecvEvent.
11-1·11-3 배치(같음): T1 (1392,1032) 왼쪽, T2 (600,1008) 위, T3 (624,216) 오른쪽, T4 (1416,240) 아래, 모두 Through → 경기장 둘레를
바람개비 모양으로 두르는 4줄 레이저.

## 7. 스테이지 값 (installed-stage-decoded, 변형 1개뿐)

HP 표: 11-1 = [2,2,3,3,3,4,4], 11-3 = [2,2,3,3,4,4,5] (2..8명). 페이즈: 11-1 = 15 s {E_P_1_1} → 15 s {E_P_2_1, E_P_2_2};
11-3 = 15 s {E_P_1_1, E_P_1_2} → 25 s {E_P_2_1, E_P_2_2}; 3·4페이즈 0 s. 클리어 대상 "Key1". UI 28/29/30 = 0, 60, 0.65.
Locator1·2 = (1008,624) 경기장 중앙. Key1 (1008,864) 숨김, Goal (1008,984).

Emitter (FP raw: 120=7864320, 170=11141120, 0.8=52428, 0.3=19660, 0.35=22937, 0.6=39321, 0.25=16384, −0.33=−21626, 0.1=6553):

| 라운드 | 이름 | V | 각속 | Size(판정px) | RGB | Rate | 발수 | Angle | 퍼짐 | 랜덤 | 회전(모드2) | Modifier → Locator |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 11-1 | E_P_1_1 | 120 | 0 | 1.5(4) | 255,140,140 | 0.8 | 5 | 0 | 360 | 0 | 0.25 | M_P_1_1 → L1 |
| 11-1 | E_P_2_1 | 120 | 0 | 1.5(4) | 255,140,140 | 0.3 | 2 | 0 | 360 | 0 | −0.33 | M_P_2_1 → L1 |
| 11-1 | E_P_2_2 | 170 | 0 | 4(13) | 31,143,255 | 1 | 1 | 0 | 360 | **1** | 0.1 | M_P_2_2 → L2 |
| 11-3 | E_P_1_1 | 120 | −10 | 1.5(4) | 31,143,255 | 0.8 | 3 | 0 | 360 | 0 | 0.25 | M_P_1_1 → L1 |
| 11-3 | E_P_1_2 | 120 | 10 | 1.5(4) | 255,140,140 | 0.8 | 3 | 90 | 360 | 0 | −0.25 | M_P_1_2 → L2 |
| 11-3 | E_P_2_1 | 120 | −25 | 1(3) | 255,140,140 | 0.35 | 2 | 0 | 360 | **1** | −0.33 | M_P_2_1 → L1 |
| 11-3 | E_P_2_2 | 170 | 35 | 3.5(11) | 31,143,255 | 0.6 | 4 | 0 | 360 | 0 | 0.1 | M_P_2_2 → L2 |

모든 Emitter: FireTime 1, FireStopTime 0, RotateMode 2. Modifier 는 전부 모드1(PhaseProgress), 인원과 무관하게 같은 값:
M_P_1_1·M_P_1_2: MulFireRate 2.0(131072), 나머지 1.0 → 간격 0.8 → 0.4 로 줄어듦. M_P_2_1: MulAngularVelocity·MulFireRate 1.2
(raw 78643, 0x13333) → 11-1 은 각속 0 이라 간격만 0.3→0.25, 11-3 은 각속 −25→−30, 0.35→0.2916. M_P_2_2: 전부 1.0(변화 없음).
*Dead 표 3개는 전부 0(안 쓰임). 360° 퍼짐 → n = 발수, step = 411480/n (5→82296, 4→102870, 3→137160, 2→205740), half = 205740.
Angle 90 → 102870. 속도 120 → 프레임당 (dir·120>>16 → ·1092>>16) ≈ 2 px.

## 8. 검증용 값 (§0 순서 가정 하의 정수 시뮬; 순서가 다르면 1프레임씩 밀림)

11-1, 인원 무관: 준비 끝 = 301번째 프레임(state→1), 302 = 켜는 프레임(Locator Reset, 같은 프레임 Emitter 가 RW.Enable 켬).
E_P_1_1 첫 발사 = 켠 뒤 47프레임째(Time 52416, 그 순간 FireRate 51088, base 41167), 이어 93, 138, 182 …, 페이즈 0 동안 25회,
마지막 877프레임째(FireRate 26919). 페이즈 0 끝 = state2 901번째 프레임, 다음 프레임 state3(끄기 + Reset), 그 다음 state1(페이즈1 켜기).
마지막 페이즈 끝 → 3·4 페이즈 각 2프레임(1→3) → state4 → 181프레임 뒤 Key 에 이벤트61 + SE 0x18 → state5. state4 첫 프레임에 Locator 가 탄 전부 삭제.

## 9. UNCONFIRMED / 범위 밖

- 프레임 내 업데이트 순서(§0)와, 풀이 읽는 플레이어 충돌체 위치(+0x40/+0x48)가 그 프레임 이동을 반영했는지(1프레임 지연 가능).
- Thunder 빔(layer 7)과 TopViewPlayer 충돌체 0/1 중 무엇이 닿는지(층 행렬) — HP 는 플레이어당 쿨다운이라 영향 없지만 닿는 범위가 다름.
- OnCollided 가 겹쳐 있는 동안 매 프레임 불리는지(쿨다운 구조상 그렇게 보임, 콜백 디스패처는 기존 충돌 모듈 소관).
- Locator 같은 일반 액터의 실제 위치가 stage posX/posY 그대로인지(생성 오프셋 없음 가정).
- 총알 스프라이트 원본 크기(뷰 전용). Observer UI(HP 게이지·카운트다운) 그리기는 DanmakuObserverView 0x180593c40, 미분석.
- ResuableDanmakuBulletComponent(0x1816e7xxx)·EndlessDanmakuObserver 는 이 두 라운드에서 안 쓰임(Locator 는 OptimizedBullet 만 생성,
  m_IsEndless=0). 모드3(Player 조준)·Swing·FireStopTime>0·dead>0 경로는 식만 적었고 11-x 데이터로는 안 탐.
