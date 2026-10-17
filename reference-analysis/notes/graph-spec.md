# 13-2 그래프 퍼즐 원작 규칙 명세 (st_w_13_02)

정적 분석만 했다(게임 실행 없음). 출처: `source-migration/graph.local.txt` (Ghidra), 추가로 decompile 한
`graph2/graph3/graphview.local.txt`, `pstate.local.txt`, `key2.local.txt`, 그리고 `tools/disasm.py` 로 어셈블리를 맞춰 봤다.
FP 는 16.16 raw. 1 프레임 dt = 1092 raw (QFP.OneFrame). `QFP[x]` 는 `notes/qfp-table.md` 의 오프셋이다.
구조체 오프셋은 il2cpp − 16(quantum-field-offsets.json). **UNCONFIRMED** 는 확인 못 한 항목이다.

## 0. 액터와 enum

| 액터 (타입 id, creator-delegates) | 13-2 배치 (posX,posY / datas) |
|---|---|
| GraphController 188 | (696,576); d0 `+!!!`×7, d1 `+!!!+!!!%!!!%!!!%!!!%!!!%!!!`, d2 `0!!!`×7, d18..22 = 432,464,960,464,1 |
| BarGraphController 186 = 0xba | d0 "BarGraph1" (목표), d1 "BarGraph2" (조작) |
| CircleGraphController 184 = 0xb8 | d0 "CircleGraph1" (목표), d1 "CircleGraph2" (조작) |
| BarGraph 187 | BarGraph1 (432,408), BarGraph2 (960,408), d0 = 1 (배율) |
| CircleGraph 185 | CircleGraph1 (432,240), CircleGraph2 (960,240), d0 = 0.9 |
| Key 17 = 0x11 | (696,624), d2 = 1 → 처음엔 비활성 |
| Goal, Player×8 (y=720), DeadTimer | 그래프 코드는 DeadTimer 를 읽지 않는다 (7절) |

stageInitParamList 는 변형이 하나뿐이다(변형 1개 확인함). enum 은 선언 순서다(quantum-field-offsets).
- QEventType: 1 Activate, 19 Dead, 32 GraphClear, 33 GraphValues, 35 Inactivate, 49 SetActive.
- QPlayerState: 1 Default, 3 Dead, 12 **Graph**.
- QSeId: 13 Key, 24 Win.
- GraphJumpButtonState: 0 None, 1 Press, 2 Release.
- 입력 Button 은 raw `[up, down, cur]` 이고 IsDown = `raw0 < raw4` 이다(PlayerNativeInput 결과). Input 오프셋은 Jump +0x3c, Left +0x48, Right +0x6c.

RNG: 모든 뽑기는 프레임 공용 PCG32 하나에서 나온다. state 는 `[frame+0xc8]+0xb8`, inc 는 `+0xc0` (`Frame._globals`).
`FUN_181662090(rng, lo, hi)` = Next(lo, hi) (hi 는 포함 안 함). GraphController 에는 이 함수가 inline 으로 들어가 있다(아래).

## 1. GraphControllerComponent

필드: +0 m_CircleGraphCount, +1 m_CircleGraphMax, +2 m_ClearCount, +3 m_ClearMax, +4 m_FailureMax,
+5 m_Mode (0 = 원, 1 = 막대), +6 m_Phase, +8 m_Flags (bit0 정지, bit1 클리어 받음), +0x10 막대 컨트롤러 EntityRef,
+0x18 원 컨트롤러 EntityRef, +0x20 자기 EntityRef, +0x28 m_Timer, +0x30 m_UIPlayersScale, +0x38 m_UINumbersPos, +0x48 m_UIPlayersPos.

**파라미터** (Initialize 0x1818602f0, Creator 0x181860160 에도 같은 코드가 있다)
- 기본값: `word[+3] = 0x30a` 이므로 ClearMax 10, FailureMax 3. UIPlayersScale = QFP[0xf0] = 1.0.
- ParseParameter 0x181860360: 표 세 개를 FUN_180970770 으로 읽고(datas 0,1,2) QPlayerCountParamUtility.Find 로 인원수에 맞는 값을 고른다.
  - d0 > 0 이면 ClearMax 로 쓴다.
  - d1 이 1 이상이면 CircleGraphMax, 아니면 ClearMax/2.
  - d2 > 0 이면 FailureMax.
  - FP 슬롯: datas[18] → +0x38, [19] → +0x40 (UINumbersPos). [20] → +0x48, [21] → +0x50 (UIPlayersPos). [22] 는 QFP[0] 보다 클 때만 +0x30.
    배열 길이 검사는 `< 0x13 .. < 0x17` 이고 원소 주소는 +0xb0..+0xd0 이다. **슬롯 번호는 19..23 이 아니라 18..22 다.**
- 13-2 를 풀면 (인원 2..8):

  | 항목 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
  |---|---|---|---|---|---|---|---|
  | ClearMax | 10 | 10 | 10 | 10 | 10 | 10 | 10 |
  | CircleGraphMax | 10 | 10 | 4 | 4 | 4 | 4 | 4 |
  | FailureMax | 15 | 15 | 15 | 15 | 15 | 15 | 15 |

  문자 `+` = 10, `%` = 4, `0` = 15. UINumbersPos = (432,464), UIPlayersPos = (960,464), UIPlayersScale = 1.

**OnStart 0x181860660**
1. prepareGraph 0x181860750:
   - `FindActor(type 0xb8)` 로 원 컨트롤러를 찾는다. 그 컨트롤러의 m_Parent(+0x20) 에 GC EntityRef 를 넣고 GC+0x18 에 그 EntityRef 를 저장한다.
   - 이어서 `FindActor(0xba)` 로 막대 컨트롤러를 같은 방식으로 처리해 +0x10 에 저장하고 **m_Mode = 1** 로 둔다.
   - 따라서 13-2 의 **첫 판은 항상 막대**이다.
2. `Frame.ChangeAllPlayerState(12)` (0x1818606c5): 모든 플레이어의 RequestedPlayerState(+4) 를 Graph 로 바꾼다.
3. `GameOverCount ([globals]+0xf0) >= FailureMax` 이면 같은 엔티티의 GraphDebugComponent 의 flags(+4) bit0 을 켠다 (0x1818606da `jl` 로 건너뜀). 이게 힌트 표시다(8절).

**OnPost 0x1818608f0**: GraphDebug.ResetPlayerInputs 를 부른다. `flags&1` 이 0 이면 updatePhase 를 돌리고 CheckPlayerInputs 를 부른다. 이 두 디버그 함수는 숨겨진 UI 용이라 판정에는 영향이 없다.

**updatePhase 0x1818609f0** (어셈블리로 확인함)
- phase 0: startGraph 0x181860c90 를 부른 **뒤** flags bit1 을 끄고 (0x181860c6a) phase 를 1 로 올린다.
- phase 1: flags bit1 이 켜질 때까지 기다린다. 켜지면:
  - `PlaySe(SeId 24 Win, entity 0, pos 0, vol 1, pitch 1)` (0x181860bf2)
  - m_Timer = QFP[0x98] = 39321 (0.6 s)
  - phase 2 로 간다.
- phase 2: `m_Timer -= dt`. 0 보다 크면 그대로 반환한다. 0 이하가 되면 (dt 1092 기준 37번째 프레임):
  - ClearCount++ 한다.
  - ClearCount ≥ ClearMax 이면 phase 3 으로 간다.
  - 아니면 decideNextGraph 를 부르고 phase 0 으로 간다. 그래서 다음 판 startGraph 는 **다음 프레임**에 돈다.
- phase 3 (클리어 완료):
  - `Frame.NotifyEvent(타입 0x11, Activate)` (by-type overload 0x181749b80, 0x181860aac) 로 모든 Key 에 Activate 를 보낸다.
    KeyComponent.OnRecvEvent 0x18186cf90 는 (flags&4)==0 이면 setActive(true) 하고 SE 13 을 낸다.
  - `ChangeAllPlayerState(1 Default)` 로 플레이어를 기본 상태로 되돌린다.
  - `GraphController_NotifyToPlayers(entity, type 0)` 을 보낸다(뷰 전용).
  - flags |= 1 (정지)하고 phase 를 4 로 올린다.

**startGraph 0x181860c90**: m_Mode 에 따라 이벤트를 보낸다.
- 0 (원): 원 컨트롤러에 Activate(1), 막대 컨트롤러에 Inactivate(35).
- 1 (막대): 막대 컨트롤러에 Activate, 원 컨트롤러에 Inactivate.
- 둘 다 `Frame.NotifyEvent(EntityRef, param)` 0x18174a110 로 보낸다. 동기 처리로 보이지만 **UNCONFIRMED** 다.
  컨트롤러 쪽은 Activate 를 받아도 플래그만 세우고, 실제 동작은 다음 OnPost 에서 한다.
- notifyClear 와 notifyValues 는 NotifyEvents.Invoke_OnRecvEvent 를 직접 부르므로 동기 처리가 확실하다.

**decideNextGraph 0x181860dc0** (판이 끝날 때마다 한 번. 뽑기는 inline Next(0,100) 이다:
`do u = pcg32() while (u < 96); r = u % 100`)
```
if mode==0:  if barCtrl!=0: { if circleCount<circleMax: { r=Next(0,100); if r>=50: goto end }  mode=1 }
elif mode==1: if circleCtrl!=0 && circleCount<circleMax: { r=Next(0,100); if r<50: mode=0 }
end: if mode==0: circleCount++
```
- 원 판의 개수는 CircleGraphMax 에서 막힌다. 그 뒤로는 뽑기 없이 막대만 나온다.
- 13-2 는 판 10개 중 첫 판이 막대이고 나머지 9판은 각각 50:50 이다. 단 4..8인은 원 판이 최대 4번이다.

**OnRecvEvent 0x181860f70**
- 33 GraphValues: GraphDebug 가 있으면 Value 의 하위 3바이트를 m_GoalValues 에 복사한다(힌트 숫자).
- 32 GraphClear: flags |= 2.
- 19 Dead: NotifyToPlayers(entity, 0) 을 보내고 flags |= 1 로 **GC 를 영구 정지**한다.
- 그 밖의 이벤트는 ActorComponent.OnRecvEvent 로 넘긴다.

**실패 처리**: 그래프 쪽에는 실패 판정이 전혀 없다. 맞을 때까지 같은 목표가 유지된다. 실패는 DeadTimer 시간 초과 하나뿐이다(7절).
FailureMax 는 힌트를 켜는 기준값으로만 쓰인다.

## 2. 점프 버튼 상태기계 (두 컨트롤러가 똑같이 쓴다)

상수는 CircleGraphControllerComponent..cctor 0x1817f2560 이 정한다. statics 는 `_DAT_18316e8e8`:
- MAX_VALUE = 0x4000000 (1024.0)
- JUMP_BUTTON_RELEASE_TIME = QFP[0x90] = 32768 (0.5 s)
- JUMP_BUTTON_PERSISTENCE_TIME = QFP[0x60] = 9830 (0.15 s)

`m_JumpButtonInfos` 는 +0x90 에서 시작하고 8칸 × 16바이트다 ({state u8 @0, timer FP @8}).
칸 번호는 **플레이어 인덱스**다 (0x1816b7b3e `mov edx, esi`, esi = list 원소).
매 프레임 controll 이 `Frame.GetPlayerIndexList` 순서로 돈다. `inp = Frame.GetGamePlayerInput(p)` (0x18174a640) 가 null 이면 그 플레이어는 통째로 건너뛴다.
```
if (inp.Left.IsDown) L++; else if (inp.Right.IsDown) R++;      // 0x1816b7ad8..aed (Left 우선)
held = inp.Jump.IsDown; s = &JumpButtonInfos[p]
switch s.state:
 0: if held { s.timer=0; s.state=1; J++ }
 1: if held { s.timer+=dt; J++ }
    elif s.timer < 32768 { s.timer=9830; s.state=2; J++ }      // 31프레임 이하로 누른 탭
    else s.state=0                                             // 길게 누르고 떼면 즉시 꺼짐
 2: if held { s.timer=0; s.state=1; J++ }
    else { s.timer-=dt; if s.timer>0 J++ else s.state=0 }      // 뗀 프레임 + 9프레임 유지
```
- 누르고 있는 동안은 계속 J 에 들어간다. 짧게 톡 친 경우에는 0.15 s 동안 더 들어간다.
- 리셋(state 0, timer 0)은 resetJumpButtonInfos 0x1816b77c0 / 0x1817f0ed0 가 한다. 시점은 phase 0 진입 때와 move 가 끝났을 때다.

## 3. BarGraphControllerComponent

필드:
- +0..2 m_GoalValues (u8 [왼, 오, 점프]), +3 m_Phase, +4..6 m_Values (u8), +8 m_Flags
- +0x10 조작 그래프, +0x18 자기, +0x20 m_Parent (GC), +0x28 목표 그래프
- +0x30 GoalLevels, +0x48 Levels, +0x60 Speeds, +0x78 TargetLevels (모두 FP×3)

ParseParameter 0x1816b6b40: d0 → +0x130 TargetGraphName, d1 → +0x110 ControllGraphName.
OnStart 0x1816b6cc0: 두 이름을 Scene.FindActor 로 찾아 +0x28 / +0x10 에 넣고 flags |= 1 (정지 상태로 시작).
막대 그래프의 SetActive 는 건드리지 않으므로 처음엔 활성이다.

OnPost 0x1816b6e80 는 `flags&1` 이면 바로 반환한다. 아니면 updatePhase 0x1816b6e90 (inline 사본) 를 돈다.
- **phase 0**: `flags&2` 일 때 아래를 하고 phase 1 로 간다.
  1. setGraphActive(true): 목표·조작 그래프 모두에 SetActive(49, IsActive=1).
  2. decideGoal(first=1).
  3. setTargetGraph: 목표 BarGraph 의 levels[1..3] = TargetLevels>>16.
  4. setControllGraph: 조작 그래프 = Levels>>16, 이 시점엔 0,0,0.
  5. resetJumpButtonInfos.
- **phase 1** (매 프레임):
  - 먼저 checkMatch 0x1816b7940 를 한다: `Values[i]==Goal[i]` 가 3개 모두 **정확히 같으면** 클리어(허용오차 없음).
    - notifyClear 0x1816b7e30 가 GraphClear(32) 를 Parent 로 동기 전송한다.
    - flags &= ~2, phase 2 로 간다.
  - 맞지 않으면 controll 0x1816b7970 을 돈다(2절):
    - Values = [L,R,J] (0x1816b7d1c..24 로 확인), Levels = [L,R,J]<<16
    - 조작 BarGraph levels[1..3] = L,R,J
  - 같은 프레임 안에서 판정이 controll 보다 **먼저**다. 그래서 입력이 맞은 다음 프레임에 클리어된다. 한 프레임만 맞아도 된다(유지 시간 없음).
- **phase 2**: Activate 를 기다린다(flags&2). 오면:
  - decideGoal(first=0) 을 한다. 이때 TargetLevels 는 이전 값 그대로 둔다.
  - calcSpeeds 0x1816b7ec0: `Speeds[i] = (Goal[i]-Target[i]) * QFP[0x128](3.0) >> 16`.
  - phase 3 으로 간다.
- **phase 3**: move 0x1816b8100 를 매 프레임 돈다.
  ```
  v = Target[i] + (dt*Speeds[i] >> 16)
  speed<0: v = (Goal<v) ? v : Goal
  speed>0: v = (v<Goal) ? v : Goal
  speed==0: v 그대로
  ```
  - 3개가 모두 Goal 에 닿으면 true 를 돌려준다. 매 프레임 setTargetGraph 로 화면에 반영한다.
  - 레벨 차가 d 이면 한 스텝이 3276·d 이므로 21 프레임 걸린다.
  - true 가 되면 resetJumpButtonInfos 하고 phase 1 로 간다. 이 이동 중엔 조작 그래프를 갱신하지 않는다.
- OnRecvEvent 0x1816b85b0:
  - Activate(1): phase 0 이면 flags 를 `(f&~1)|2` 로, phase 2 이면 `f|2` 로 바꾼다. 다른 phase 에서는 무시한다.
  - Inactivate(35): phase=0, flags 를 `(f&~2)|1` 로, setGraphActive(false) 한다.
  - Dead(19): flags |= 1.

**decideGoal 0x1816b70f0** (n = Frame.GetPlayerActorCount 0x1817494b0, G = m_GoalValues)
```
loop forever { a=Next(0,n+1); b=max(n-a,0); c=Next(0,n+1);          // 뽑는 순서: a 다음 c, 시도마다 2번
               if ((a!=G[0] || b!=G[1]) && c!=G[2]) break }
G=[a,b,c]; GoalLevels=[a,b,c]<<16; notifyValues; if first: TargetLevels=GoalLevels; Levels=[0,0,0]
```
- 왼쪽+오른쪽 = n 이므로 **모든 플레이어가 왼쪽 아니면 오른쪽을 누르고 있어야** 한다. 그중 c 명은 점프도 켜져 있어야 한다.
- 첫 판은 G=0,0,0 이라 c 가 1 이상이 된다.
- 새 목표는 a 와 c 가 이전 목표와 반드시 다르다. 그래서 Values 에 남아 있는 이전 값(= 이전 목표)과 바로 일치하는 일이 없다. Values 는 리셋되지 않는다.

notifyValues 0x1816b8500: GraphValues(33) 를 Parent 로 보낸다. Value = `g2<<16 | g1<<8 | g0`.

## 4. CircleGraphControllerComponent

필드 배치는 막대와 같다. 차이점:
- 이름: +0x30 GoalPercents, +0x48 Percents, +0x78 TargetPercents.
- **값 순서가 반대**다: Values/Goal 의 [0] = 점프, [1] = 오른쪽, [2] = 왼쪽 (controll 0x1817f1918..20: +6 = L, +5 = R, +4 = J).

Creator 0x1817ef3b0 는 d0/d1 을 막대와 같은 방식으로 읽는다.
OnStart 0x1817ef480 는 두 원 그래프를 찾아 각각에 SetActive(49) 를 보낸다. 이때 param 이 0 으로 초기화돼 있어 IsActive = 0 이므로 **처음엔 숨김**이다. 그 뒤 flags |= 1.
OnPost 0x1817ef690 → updatePhase 0x1817ef710. phase 0..3 과 OnRecvEvent 0x1817f2420 은 막대와 완전히 같다.
- phase 1 의 판정은 checkMatch 0x1817f1080 이다.
- controll 은 Percents 를 만든다.
  ```
  tot=J+R+L; if tot<1: Percents=[0,0,0]
  else Percents=[⌊J·2^26/tot⌋, ⌊R·2^26/tot⌋, ⌊L·2^26/tot⌋]
  ```
  이건 1024 만점 FP 다. 결과는 조작 CircleGraph 의 SetPercents 0x1817ee600 (m_Percents +0x10/+0x18/+0x20) 로 넘긴다.
- calcSpeeds 0x1817f1c80 의 배율은 QFP[0x118] = 2.0 이다(이동 약 0.5 s). move 0x1817f1f00 는 막대와 같은 식이다.
- notifyValues 0x1817f2370 의 Value = `g0<<16 | g1<<8 | g2` 이다. 그래서 힌트 바이트는 두 그래프 모두 [왼, 오, 점프] 순서가 된다.

**decideGoal 0x1817efa20** (어셈블리 0x1817efb32..0x1817efccc 로 확인함)
```
n=GetPlayerActorCount; maxSum = (n>=5)? n : 3n; c=0   // c 는 시도 사이에 유지된다 (edi)
for k in 0..31:
  a = Next(0,n)                                  // 0..n-1
  b = (a==0)? Next(1,n) : Next(0,n-a+1)
  cl = min(maxSum-a-b, n)
  if cl>0: lo,ex = (a==0)?(1,b) : (b==0)?(1,a) : (0,0)
           do c=Next(lo,cl+1) while ex!=0 && c==ex     // g__getRandom_50_0 0x1817f2620 를 inline 한 것
  if ((a!=G[2] || b!=G[1]) && c!=G[0] && !checkExclusionPatten(n,[a,b,c])) break
if a==b==c==0: a=b=c=1 (로그)         // a==0 이면 b≥1 이라 실제로는 도달 못 함
G=[c,b,a]; tot=a+b+c; GoalPercents=[⌊c·2^26/tot⌋, ⌊b·2^26/tot⌋, ⌊a·2^26/tot⌋]
notifyValues; if first: TargetPercents=GoalPercents; Percents=[0,0,0]
```
- 32번을 모두 실패하면 마지막 후보를 그대로 쓴다(이전 목표나 제외 패턴일 수 있음).
- 5인 이상이면 보통 a+b+c ≤ n 이다. **예외(2026-10-17 디컴파일 재확인)**: a+b = n 이면 cl = 0 이라 c 를 새로 뽑지 않고
  이전 시도의 c 가 남는다(첫 시도면 0). 그래서 5인 L4 R1 J2 같은 목표도 나온다(점프는 왼/오와 겹쳐 누르면 됨).
  4인 이하면 c 는 n 까지 가능하다(왼/오를 누르면서 점프를 겹칠 수 있음).

**checkExclusionPatten 0x1817f0180**
- 후보 [a,b,c] 가 아래 패턴의 순환 회전(k=0..2) 중 하나와 같으면 제외한다(`g__check_51_0` 0x1817f2690).
- 패턴은 RuntimeHelpers.InitializeArray 의 PhotonQuantumCode `<PrivateImplementationDetails>` 정적 데이터에서 읽었다.
  FieldInfo 슬롯 → fieldRef → field default value 순으로 따라갔다.
  - n=6: {1,2,2} (슬롯 0x1831757b0)
  - n=7: {1,2,2}, {1,3,3} (0x1831757c8), {4,1,1} (0x1831756f0), {5,1,1} (0x1831757a8)
  - n=8: {1,2,2}, {1,3,3}, {3,2,2} (0x1831756e0), {4,1,1}, {5,1,1}
  - n≤5: 제외 없음.
  - 분기: 0x1817f0261 `lea ecx,[rdi-6]` → n=6 0x1817f0a96, n=7 0x1817f06fb, n=8 은 그대로 진행. 패턴 슬롯 로드 주소는 어셈블리로 확인했다.
  - 패턴마다 두 값이 같아서, 회전만 봐도 결과적으로 모든 순열을 제외하는 셈이다.

**checkMatch 0x1817f1080** (Percents 와 GoalPercents 를 비교)
- n < 7: 모든 i 에 대해 `|P[i]-G[i]| ≤ 4` raw 이면 맞음. 비율이 같아야 맞는 것이다. (2,2,4) 와 (1,1,2) 처럼 비율이 같으면 인원수가 달라도 맞는다.
- n ≥ 7:
  - 먼저 `g_i = (G[i]<<16)/MAX` 를 구한다. 이 중 하나라도 0.25 / 0.5 / 0.75 (QFP[0x70]/[0x90]/[0xb8]) 이면 위의 엄격 비교(≤4)를 쓴다.
  - 그 외에는 허용오차 `MAX*QFP[0x30]>>16 = 2012160` raw (1024 기준 약 30.7, 약 3%) 안이면 맞음이다.

## 5. BarGraph / CircleGraph (표시 전용)

둘 다 InitCollision / OnCollided 가 없다. 그래서 **충돌이 없고 아무도 그 위에 서지 않는다.** 플레이어는 맵 바닥(y=720)에 선다.
- BarGraphComponent
  - +0 m_BarLevelMax = Frame.GetPlayerIndexCount (Creator 0x1816b5940 / Initialize 0x1816b5ab0)
  - +1..3 m_Levels (u8, 막대 0 = 왼쪽, 1 = 오른쪽, 2 = 점프)
  - +0x10 m_UIScale (d0 가 0 이 아니면 그 값, 아니면 1.0, 0x1816b5b50)
  - +0x18 m_UIPos (FPVector2, create-info+0x28 에서 복사)
- CircleGraphComponent
  - +0x10..0x20 m_Percents[3] (1024 만점)
  - +0x28 m_UIScale (d0 = 0.9 → fp_raw)
  - +0x30 m_UIPos
- 뷰 쪽
  - BarGraphView.OnUpdate_Verified 0x18059f3d0:
    - 액터 flags&4 (비활성) 이면 숨긴다.
    - 아니면 위치 = StageToScreenPos(m_UIPos), 배율은 (s,s,1).
    - UIBarGraph.SetLevels 0x1805e36c0 로 막대마다 `i < level` 인 칸만 켠다.
  - SetLevelMax 0x1805e32c0: 막대 전체 높이는 480(UI 단위)이다. 칸 높이 = 480 / max(6, levelMax) 이고 칸 i 의 y = i·높이다.
    즉 2..6인은 80, 7인은 68.57, 8인은 60 이다. levelMax 가 칸 배열 길이보다 크면 배열 길이로 나눈다.
  - CircleGraphView 0x18059fe70: 값 = raw/65536/1024 → UICircleGraph.SetPercents 0x1804a1950.
    - 조각 k 의 fillAmount = p_k.
    - 조각 1 은 −360·p0°, 조각 2 는 −360·(p0+p1)° 만큼 Z 회전한다. 즉 시계 방향 파이이고 순서는 [점프, 오른쪽, 왼쪽] 이다.
- **UNCONFIRMED**:
  - 칸·파이의 픽셀 폭/반지름, 색, 칸 배열 길이, 파이 시작 각도는 프리팹에 있어 DLL 에서 알 수 없다.
  - m_UIPos 가 저작 posX/posY 와 같은지(create-info+0x28 의 의미)는 확인하지 못했다.

## 6. 플레이어 상태 12 (Graph)

PlayerComponent.updatePlayerState 0x1816c07c0 가 진입 시 OnInitialize_Graph 0x1816c7a70 (0x1816c0bb5) 를, 매 프레임 OnUpdate_Graph 0x1816c7b30 (0x1816c0d20) 를 부른다.
- Initialize: +0x14 bit1 (IsGraphMode 0x1816bd190) 을 켠다.
- OnFinalize_Graph 0x1816c7ad0: bit1 을 끄고 +0x98 과 +0xa0 을 0 으로 만든다.
- OnUpdate_Graph (어셈블리로 비교 방향 확인함):
  - **걷지 않는다.** 입력은 X 속도를 건드리지 않는다. X 는 calcGravity 의 X 성분만 더해진다.
  - Left(6) IsOnInput → LookLeft. Right(7) → LookRight. 이때 애니 2 를 쓰고, flags&0x4000 이면 0xc 를 쓴다. 둘 다 아니면 애니 2 를 1 로 되돌린다.
  - 첫 업데이트에서 +0xa0 이 0 이면 `refY = posY − QFP[0x1b8](48)` 로 정한다.
  - Jump 를 누르고 있을 때:
    - 애니 4 (0xb). 단 애니 2 중이면 그대로 둔다.
    - IsPressInput(8) 이면 velY = QFP[0x250] = −3 (위로).
    - posY > refY 이면, velY > −1.5 일 때 velY −= 0.25 (QFP[0x70]).
    - 그렇지 않으면, velY < 1.5 일 때 velY += 0.25.
    - 결과적으로 원래 자리보다 48 위에서 둥실 떠 있다. 가속은 프레임당이고 dt 를 쓰지 않는다.
  - Jump 를 누르지 않을 때:
    - 공중이면 calcGravity 로 떨어진다.
    - 땅이면 velY = 0, m_Flags(+0x20) |= 1, 애니 4 를 1 로 되돌린다.
- 그래프 판정은 PlayerComponent 를 거치지 않고 **원시 Button IsDown 을 직접 읽는다**(2절).
  호버 여부나 땅에 있는지는 판정에 상관없다. 같은 Jump 버튼이 '그래프 점프 버튼' 겸 호버 입력이다.
- 판정은 플레이어 인덱스 목록 전체를 센다. 그래서 죽은 플레이어의 입력도 들어간다. 다만 실제로 죽는 건 DeadTimer 뿐이고 그때는 이미 정지 상태다.

## 7. DeadTimer

그래프 쪽 코드는 TimerComponent 나 DeadTimer 파라미터를 **전혀 읽지 않는다** (graph.local.txt 에 Timer 참조 0건).
시간 초과 때 DeadTimer 는 Dead(19) 를 모든 액터에 방송한다(source-switchtimer-devices.js). 그러면:
- GC: NotifyToPlayers(0) 를 보내고 flags|=1 로 정지한다. 이후 판도 Key 활성화도 없다.
- 막대·원 컨트롤러: flags|=1 로 정지한다.
- 플레이어: 기존 PlayerComponent.OnRecvEvent 경로로 죽는다(Dead 상태가 되면 OnFinalize_Graph).

DeadTimer 자체의 초 계산(d0 105, d6..12 인원별 덮어쓰기, d15..18 보너스)은 기존 SwitchTimer/DeadTimer 모듈 담당이다.

## 8. UI (뷰 전용, 시뮬레이션에 영향 없음)

- GraphControllerView.OnUpdate_Verified 0x1805a0ce0:
  - UIPlayersPos 에 UIPlayersScale 배율로 **남은 판 수** `ClearMax − ClearCount` 를 SpriteNumber 로 띄운다.
  - 남은 판이 1 미만이면 숨긴다.
  - onNotifyToPlayers 0x1805a0f40 (type 0) 는 이 UI 의 애니메이터를 재생한다.
- GraphDebug.Update 0x1805a1ad0 (힌트):
  - GraphDebugComponent flags bit0 일 때만 UINumbersPos 에 m_GoalValues 3개(왼, 오, 점프 인원)를 숫자로 띄운다.
  - 플레이어 UI(UIPlayersPos+(0,84)) 는 항상 숨긴다(vtable+0x238 에 0 전달). **UNCONFIRMED**: vtable+0x238 이 표시 on/off 인지.
- **UNCONFIRMED**: GraphDebugComponent 가 GC Creator 0x181860160 에서 추가하는 두 번째 컴포넌트(제네릭 0x1831799e8) 인지. GetGraphDebug 0x181860100 가 같은 엔티티에서 읽는 것까지는 확인했다.

## 9. 구현 메모와 남은 UNCONFIRMED

- 판 하나의 흐름:
  1. GC phase 0 → Activate
  2. 컨트롤러 phase 0 (처음이거나 그래프가 바뀐 판: 목표를 즉시 표시) 또는 phase 2→3 (같은 그래프가 이어진 판: 목표가 움직임. 막대 21 프레임, 원 약 0.5 s 이고 원은 스텝이 floor 라 차이마다 다름)
  3. phase 1 에서 판정
  4. GraphClear
  5. GC Win SE 와 0.6 s(37 프레임)
  6. ClearCount++
  7. 다음 판 결정. 10판이면 Key 를 켜고 플레이어를 Default 로 되돌린다.
- 같은 프레임 안에서 GC 와 컨트롤러의 OnPost 순서는 네이티브 업데이트 순서(호스트 / source-actor-lifecycle)를 따라야 한다. 차이는 1 프레임 지연뿐이다. **UNCONFIRMED**: 13-2 의 실제 OnPost 순서.
- Frame.DeltaTime (vtable+0x248) 은 1092 로 가정했다(다른 모듈과 같음).
- 플레이어 속도 단위와 Y 아래 방향 부호는 기존 Player 이식의 관례를 따른다(점프 −3 이 위쪽).
