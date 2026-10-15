# PlayerNativeInput — result
status: done (NormalInput button producer/helper 범위)
files: source-migration/source-player-native-input.js; source-migration/source-player-native-input.test.cjs; source-migration/player-native-input-report.json; codex-briefs/PlayerNativeInput.result.md; codex-briefs/작업중-PlayerNativeInput.md
tests: 전용22/22; 전체1189/1189, 실패0 (동시 보조 작업 포함 실행 시점)
what it is: 원작 Button 생성/갱신과 Frame.SetPlayerInput의 timestamp 변환을 복원하여 PlayerDefault가 바로 소비할 세 signed int32 워드를 생성합니다. 장치 boolean을 임의 counter로 바꾸지 않으며 실제 deterministic frame 번호를 필수 입력으로 받습니다.
stage compiles alone: no. 입력 producer 공통 helper이며 실제 장치 해석·session tick/packet 공급·Player runtime 연결은 host 담당.

## 실제 필드 및 갱신식
Quantum.Button metadata fields는 _frameUp/_frameDown/_frameCurrent입니다. value struct raw offsets0/4/8, size12byte. a/b/t는 각각 마지막 release frame / press frame / 현재 simulation frame. Frame160-byte Input은12 Buttons와 LeftStick FPVector2로 구성됩니다. 이 helper는 Buttons만 소유합니다.

Button.IsDown0x181933e30: signed b>a.
Button.WasPressed0x181933e40: b==t && b>0.
Button.WasReleased0x181933e60: a==t && a>b.

Button.Update0x181933e80은 현재 frame N을 t에 씁니다. off일 때 기존 b>a인 경우만 a=N. on일 때 a>b 또는 a==b==0이면 b=N. 나머지는 transition timestamp를 보존합니다. 따라서 held 시간이 길어져도 b를 매번 증가시키지 않습니다.

op_Implicit(bool)0x181933ed0은 true->[0,1,1], false->[1,0,1]입니다. 이 값은 poll된 raw Input 표현이지 persistent global Button의 초기값이 아닙니다. 신규 Frame ctor는0x18173a68f..6c9에서0x7e8byte Globals를 Alloc→Clear하고 포인터를+0xc8에 저장합니다. Context._allocator+0xd8의 실제 metadata type Allocator의 Alloc slot5/Clear slot7과 native vtable0x188/0x1a8을 대조했습니다. 새 Globals의8개 input slots는 zero부터 시작합니다.

## Frame 및 온라인/오프라인 경로
- Frame.SetPlayerInput0x181739350은 global input+0x1c0+160*playerSlot에 위 update를12회 inline합니다. incoming Button은 signed b>a만 사용하며 incoming t는 쓰지 않습니다. timestamp N은[r14+0x1c]에서 읽는 실제 DeterministicFrame.Number(class offset28)입니다.
- QuantumGame.OnSimulate0x181765970..a35는 session player 수의 supplied deterministic inputs를 순서대로 SetPlayerInput에 전달한 후 systems를 실행합니다. 이 timestamp 변환 경로에는 온라인/오프라인 차등 분기가 없습니다. 장치 poll callback.Frame이나 render frame은 producer 시계가 아닙니다.
- GameInputManager.pollInput0x18052c140은 CallbackPollInput.Player+0x24를 Session._localPlayerIndices+0xf8에서 찾습니다. 발견한 목록 위치가 m_PlayerInputInfos의 index입니다. 예를 들어 localPlayerIndices=[6,2]면 global slot6은 local input0을 사용합니다. 일치가 없으면 callback을 쓰지 않습니다.
- m_IsDisableQuantumInput+0x59가 켜져 있으면 clear된160byte Input을 제출합니다. 아니면 해석된 ActionInputInfo.IsPressed를 bool Button 생성자로 변환합니다. callback.IsInputSet=true 및 raw input Flags=1은0x18052c805..810에서 확인했습니다.
- helper는 온라인 session의 peer prediction/repeat/drop 정책을 구현하지 않습니다. remote Input도 host가 실제 session에서 전달하면 같은 Frame timestamp update를 적용합니다. 누락을 임의 release로 바꾸지 않습니다.
- Frame.GetGamePlayerInput0x18174a640은 Stage operating-menu byte가 해당 player를 막으면 null을 반환합니다. 저장소 갱신 자체를 멈추지는 않습니다.

## PlayerDefault enum 매핑
GetGamePlayerInputButton0x18174a7e0의 실제 jump table0x18174a8c8을 복원했습니다.

| enum | field | Input raw offset |
|---|---|---|
| 0 | Decision | 36 |
| 1 | Cancel | 24 |
| 2 | Menu1 | 84 |
| 3 | Menu2 | 96 |
| 4 | Up | 132 |
| 5 | Down | 48 |
| 6 | Left | 72 |
| 7 | Right | 108 |
| 8 | Jump | 60 |
| 9 | Shot | 120 |
| 10 | Action1 | 0 |
| 11 | Action2 | 12 |

Left/Right 동시는 둘 다 on으로 보존합니다. PlayerDefault가 Left 우선순위를 판단하며 producer에서 방향을 임의 상쇄하지 않습니다.

## API/JSON 계약
- create({freshZeroedGlobals:true}): 실제 신규 zero Globals일 때만. 기존 snapshot은 create({players:[8개 {buttons:[12개 [a,b,t]]}]})로 주입. 무인자 초기화는 거부.
- packetFromPressed([12개 boolean]): enum0..11 순서의 이미 해석된 native IsPressed. 부울은0x181933ed0 생성 규칙으로 변환. screen key/event mapping 자체는 host 책임.
- pollLocal({requestedPlayer,localPlayerIndices,pressedByLocalIndex,disableQuantumInput}): native local-index routing을 적용. nonlocal이면 isInputSet:false이며 기존 callback을 변경하지 않는 계획. local이면 raw flags1과 input 반환. disabled면 zero packet 제출.
- applyPlayerInput(state,slot,actualSimulationFrameNumber,packet): selected global slot의 Buttons를 갱신. applySimulationInputs(state,N,packets)는 실제 session player 수1..8개 Input을 슬롯순으로 처리. 배열 밖 슬롯은 건드리지 않으며 missing packet은 거부합니다.
- getButtons(state,slot,actualStageOperatingMenuByte): menu 차단이면 null, 아니면 enum 순12개 three-word 배열. 기존 PlayerDefault.input(p,stage,buttons,id,kind)에 그대로 전달 가능합니다.
- updateButton/words/buttonTest/fromBoolean/zeroPacket을 pure primitive로도 제공. state는 primitive JSON만 사용. browser UMD global=SourcePlayerNativeInput. 진행 중 render counter나 device 객체 저장 없음.

## 검증과 경계
22개 전용 테스트: 누름/유지/놓음/재누름, simultaneous4/6/7/8/9,8인 independent state, JSON복원/rollback snapshot, explicit local/global index routing, disabled/local vs suppliedremote, menu read suppression, zero/negative/int32 max, 같은 simulation frame의 press/release, nonzero equality, sparse/missing arrays refusal, browser UMD 및 기존 PlayerDefault 직접 소비 검증.

원본 DLL bytes로 OnSimulate→SetPlayerInput call, Number+0x1c load, Button.Update 세 저장 명령, enum4/6/7/8/9 jump targets를 독립 대조했습니다. 원작 게임은 실행하지 않았습니다.

같은 frame의 press→release는 a=b=t가 되어 on=false인데 WasPressed가 여전히true일 수 있습니다. frame0/negative frame에서도 원작 signed 비교의 결과를 그대로 보존합니다. normal production frame이 항상1부터 시작한다고 추측하거나 monotonic/rollover 보정 규칙을 추가하지 않았습니다.

unresolved:
- 실제 DeterministicFrame.Number의 scheduler/초기 frame 번호는 native session host가 공급해야 합니다. helper가 frame 증가나 시작1을 만들어내지 않습니다.
- keyboard/gamepad/Steam/physical-screen input의 sampling/merge/restriction은 미구현. 해석된 논리 IsPressed가 필수입니다.
- network byte serialization/confirmed-predicted/repeated/missing packet policy, rollback scheduler는 미구현. 원격 입력의 시계나 release를 추측하지 않습니다.
- LeftStick FPVector2 및 command/RPC payload는 host 소유. Input packet helper는 전체160byte binary serializer가 아닙니다.
- Half/Majority/Multi input modes 제외. PlayerDefault/runtime/play/network와 다른 보조 파일, 기존 StageAutoScroll/ActorLifecycle/Git은 수정하지 않았습니다. 전체 라운드 개방을 주장하지 않습니다.
