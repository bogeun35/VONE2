# StageGameStatus — result
status: done (검증 범위 구현, 대규모 동률 정렬·외부 UI/registry는 필수 host)
files: source-migration/source-stage-game-status.js, source-migration/source-stage-game-status.test.cjs, source-migration/stage-game-status-report.json, codex-briefs/StageGameStatus.result.md, codex-briefs/작업중-StageGameStatus.md
tests: 전용69/69, 전체1919/1919 통과. 원작 DLL bytes의 call 순서·시간 상한 immediate·type slot·정렬 delegate metadata를 읽기 전용으로 검증.

what it is: Camera 후단의 sortActors → checkGameStatus → Notice 조건부 polling/update → verified 플레이 시간 누적을 제공한다. captured entry gate를 받아 inactive/paused에도 Notice·시간이 진행하고, suspend면 Notice까지 건너뛰되 verified 시간은 진행한다. Actor/Collision/Post/Camera 전체 driver를 대체하지 않는다.

stage compiles alone: 아니오. 실제3-2/10-4의2..8인·offline/online primitive Stage/Player 설정28건으로 정렬·Clear·시간을 확인했다. Scene roster/EntityRefs·컴포넌트 조회는 명시적 host fixture이며 전체 native gameboot나10-4 실제 shuffle identity 검증을 주장하지 않는다.

key findings:
- sortActors0x18170b960: Stage flag5 gate. 일반은 Scene Player list에서 dead flag9/상태5 제외, Actor.Pos.Y **오름차순**. TopView flag6은 전체 Scene dictionary의 physical state2 엔트리에서 Actor bit22만 선별해 Y **내림차순**. TopView는 dead/Clear/inactive를 별도 제외하지 않는다.
- 원작 List.Sort는 **3개 항목에서 동률 순서를 바꿀 수 있다**. IntroSort0x181197a20의3개 특수 SwapIfGreater(lo,mid)→(lo,hi)→(mid,hi),4..16개 strict-less insertion을 구현. 16개 초과 동률은 `sortEqualYInfos` host 필수이며 stable sort로 추정하지 않는다. 비교 lambda0x18170e010/e050 및 metadata slot1831cd4e0/d4d8 확인.
- 정렬은 event54.SortingOrder=0,-10,-20…을 동기 registry에 전달(0x18170c0e9/c699). 고정 NativeEventPool 재사용, 정상 반환 후만 release. 공유 static SortInfoList와 재진입·예외 시 잔여 상태를 보존한다.
- checkGameStatus0x18170c840는 **Clear 집계만 수행**. 비어 있지 않은 Scene list의 전체 길이가 분모이며, 기존 Player.state5마다1+WarpGun 재귀 인원을 합산해 >=분모면 ResetDarkness → Stage bit11 → sound15. 누락된 ref/Player도 분모에는 남는다. verified 여부·Player dead flags를 여기서 검사하지 않는다.
- WarpGun 인원0x18170cc20: equip0→ActorType70→WarpGun.target(native+20)→ActorType27→Player→재귀+1. target의 Clear 여부·Scene 멤버십 재검사나 전역 중복 제거 없음. cyclic chain은 명시적 거부.
- 일반 사망 retry는 이 메서드가 아닌 기존 Player.OnUpdate_Dead0x1816c2d89..ddf가 만든다. Stage bit8이 없으면 CountGameOver→bit9 clear/bit10 set. 기존 Terminal 모듈을 재사용한 테스트에서 **한 명 사망·다른 한 명 생존**이어도 이미 retry 요청임을 검증. 중복 구현 안 함.
- IsRequestedAny0x181709d50는 bit10/11/12(mask7168). GetStageResult0x18170dbb0 우선순위는 Clear11→Retry10→Return12. 기존 요청이면 status 즉시 종료.
- ResetDarkness0x18170da70는 Stage bit4를 **외부 호출 전** clear, 조건부 Map invisible owner/flag0 clear → Camera bit5 clear → event18.IsDarkness=false. bit11은 이 이벤트 **후** 설정되므로 이벤트 재진입 시 nested/outer Clear sound가 둘 다 발생할 수 있다. 임의 lock을 넣지 않았다.
- 시간 상한은 **QGameDefine.PLAY_TIME_MAX, signed64 FP raw5662310400 =86400초**. static+18과 type slot1831c3b18이 QGameDefine.cctor0x181780799..7b1 및 tail0x18170b6b2에서 동일함을 확인. verified일 때 Stage+58을 DeltaTime 호출 전 읽고 signed64 wrap add→store→signed >=상한 clamp(0x18170b68b..b6fb). 하한 clamp 없음.

API: `createGlobals`, `sortActors`, `sortInfos`, `compare`, `isRequestedAny`, `getStageResult`, `calcWarpGunPlayerCount`, `resetDarkness`, `checkGameStatus`, `advancePlayTime`, `finishFrame`. Browser global `SourceStageGameStatus`. Stage 시간 필드는 `playTimeRaw`, 보통 안전한 integer이며 int64 overflow 극단값은 정확한 decimal string도 허용한다.

주요 host 계약:
- Scene: `getActorScene`, `getScenePlayerRefs(frame,scene)->완전한 live EntityRef 배열`, TopView의 `getActorDictionary(frame,scene)->{entries:[{state,entityRef}],usedCount}`. physical 순서 필수.
- `getActor/getPlayer(frame,ref)`, `getEquip(frame,player,0)`(없음=명시적0), `getWarpGun(frame,ref)->{targetRef}`. 임의 인덱스/이름으로 실제 정체성을 생성하지 않는다.
- `invokeOnRecvEvent(frame,actor,event)->int32`, `getMap/getCamera/notifyEvent`, `playSe(frame,{EntityRef:0,SeId:15,Position:0,Volume:65536,Pitch:65536,IsDisableCheckBlankTime:false})`.
- `getStageNotice`, nonzero phase의 `pollingNoticeCommands/updateNoticePhase`, verified 시 `getDeltaTime`. 도달한 필수 host 누락·비동기는 throw. Notice polling이 phase0으로 바꿔도 updatePhase는 계속 호출한다.
- `finishFrame(...,{suspendedAtEntry,phaseEligibleAtEntry})`: 이전 frame 진입 시 capture한 bool 둘 다 필수. 현재 flags로 재계산하지 않는다.

unresolved: >16 동률의 정확한 CLR introsort 순열은 host 필요. 실제 registry·Scene 자료구조·equipment·RNG·UI Notice·sound/global event dispatch는 필수 host 소유. 공유 scratch Actor pointer의 JSON 복사 후 재연결은 자동 처리하지 않음. 전체 gameboot/driver 통합·실플레이 일치 검수 아님.

동결: 기존 StagePreparation/Camera/bridge/factory/runtime/play/HANDOFF/Git 수정 없음. 위 신규 파일만 작성.
