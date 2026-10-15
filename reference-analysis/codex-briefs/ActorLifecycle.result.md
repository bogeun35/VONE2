# ActorLifecycle — result
status: done (검증된 범위의 독립 helper); 전체 Actor/Player 시뮬레이션은 partial
files: source-migration/source-actor-lifecycle.js; source-migration/source-actor-lifecycle.test.cjs; source-migration/actor-lifecycle-report.json; codex-briefs/ActorLifecycle.result.md; codex-briefs/작업중-ActorLifecycle.md
tests: 자체21/21; 전체925/925 (최종 metadata 대조 테스트 추가 전), 이후 자체21개 재검증
what it is: 실제 generic MethodSpec으로 ActorUpdater/NotifyEvents 등록 표를 복원하고 Actor pause/hide/active 소유권 및 검증한 lifecycle 순서를 제공하는 공통 helper입니다. Player19/26/43은 상태 전환 요청과 SharedHP 이벤트 순서를 반환합니다. 원작은 실행하지 않았습니다.
stage compiles alone: no; host가 실제 typed entity query, Actor motion/collision, component callback을 제공해야 합니다.

## 핵심 근거
- initUpdater0x1817782a0: update/post171쌍, exit47; initEvents0x18177a7a0: event112개. 모든 등록 callsite/MethodInfo slot/token/MethodSpec/component/wrapper VA를 JSON에 보존했습니다. 실제 일반 callback metadata와 bare ret0x180476130도 기록/대조했습니다.
- metadataRegistration0x182ca8eb0, generic pointer table0x182a83370, CodeRegistration ref0x18286d068/count93708. MethodSpec111085 및 generic inst7428 정적 분석. 등록 표는 actor ordinal 정렬이 아닙니다. Dictionary enumerator0x180eadc10은 entry순서, duplicate TryInsert behavior2는 throw합니다.
- 실제 group index: DistanceConstraint24, TouchEnergy55, Gear76, LinePathGear77, Player97, BlackoutController150, SearchLight154, Blackout155. 기존 Blackout→Controller 안내와 다른 Controller→SearchLight→Blackout 순서이며 기존 파일은 수정하지 않았습니다.
- Update0x18177a1a0/Post0x18177a3e0는 scene type bitset을 검사합니다. typed Update는 OnStart 후 startedbit1, pausebit4 검사 후 Actor.Update1→component.Update→Actor.Update2. Post는 pause 검사 후 Actor.Post1→component.Post→Actor.Post2. OnStart는 pause보다 먼저이며 callback 내 pause 발생 후 현재 Actor의 Update2를 다시 차단하지 않습니다. 다음 Actor에는 동기 이벤트 결과가 반영됩니다.
- 직접 검증한 phase wrapper는 TouchEnergy/Gear/LinePathGear/Player/Controller/SearchLight/Blackout7종입니다. 전체 등록 표를 실행 가능성으로 과장하지 않고 나머지 타입은 거부합니다. noop component callback을 호출하지 않아도 공통 Actor Update/Post는 필요합니다.
- Actor.setPause0x18169f020: 최초 source lock, 잘못된 source 해제 무시, sourceNONE 강제 해제; pausebit4/animationbit6. setVisible0x18169ee20: hiddenbit3/displaybit5 및 SetCollisionActive 호출. setActive0x18169ec70: inactivebit2 및 visible/pause 중첩. animation/display owner가 다른 경우 primary 변경은 성공하고 secondary 실패가 되돌리지 않습니다.
- Blackout0x1817cfb39/Controller0x1817d0d0e는 event53만 무시합니다. 직접 pausebit4 또는 SetActive로 paused가 되면 wrapper에서 중단합니다. SearchLight는 event override 등록이 없어 Actor fallback53을 따릅니다. Pause는 solid collision을 끄지 않습니다. scene raw+0x24 bit0는 모든 타입의 전체 phase를 막습니다.
- Player26 FlashDead0x1816c16e3: life>0, cause!=1이면 immortalbit8 제외. life0/requestedState3 및 ForcePlaySe11+Flash. SharedHP/Invincible guard 없음. Player19는 같은 guard이며 추가 Flash/Shake 없음.
- Player43 QuakeDead0x1816c14a2: cause1은 immortal을 우회하며 invincibleTimer>0이면 오히려 SharedHP 우회 직접사망입니다. 나머지는 기존 Gear의 resolveGearPlayerEvent43를 읽기 전용 재사용합니다. SharedHP 소진 시 기존 affectedActors에 event43Cause0을 순서대로 보낸 뒤 현재 수신자를 갱신해야 합니다.
- Player.IsDead0x1816bfff0는 Player flags bit9입니다. life0/requestedState3은 아직 IsDead가 아닙니다. InitializeDead0x1816c2ad0/0x1816c2b16에서 bit9가 세워지며 requested state 소비0x1816c0bba에서 current state 복사 후 request0. 이 전체 전환은 host에 맡깁니다.
- Player55는 Actor visible 처리가 성공할 때 equipment2개에 공개 SetVisible 이벤트를 전달(0x1816c1972..1a78). hide에서 KeyReturn은 없음. Warp63/64는 notifyKeyReturn0x1816bf9c0을 먼저 호출하며 event47을 모든 Key type17에 broadcast합니다. InitializeDead에도 KeyReturn 호출 없음.
- Exit0x18177a620는 등록된 custom exit 후 공통 Actor.OnExit0x18169df80을 항상 실행합니다. 공통 exit는 collision 제거 및 holder allocation free/clear이며 Player key/dead 처리를 추측하지 않습니다.

## 통합 API
- registry/updates/exits: JSON 근거 표. report JSON 및 기존 Gear module을 함께 포함해야 합니다 (CommonJS helper).
- actorState: 실제 flags 및 activeOwner/visibleOwner/pauseOwner/displayOwner/animationOwner의 null 또는 entity string을 요구; JSON 안전 복사.
- runPhase(state,'Update'|'Post',host): state.sceneFlags/presentOrdinals/actors; host.queries는 실제 component 이름별 실제 native query 순서의 entity ID 배열. host.dispatch는 동기로 native callback을 구현하며 host.exitActors는 scene cleanup을 수행합니다. 검증된7종만 실행, missing query/callback 거부.
- runExit(actor,dispatch): custom→common exit.
- commonEvent/receiveControl: bool event49/51/52/53/55와 int54. sourceId=null은 EntityRef.NONE. collision/equipment 이벤트는 반환 calls를 순서대로 처리. 별도 custom receiver는 요구하며 임의 common fallback 거부.
- playerDeath: event19/26/43 cause0/1의 patch/events/effects plan. current Player state나 deadbit를 즉시 쓰지 않음. invincible positive cause1 직접사망 이외43은 Gear SharedHP plan 재사용.
- playerIsDead: Player flagsbit9; warpKeyReturn: event63/64 이전 broadcast47+Actor fallback call plan.

unresolved:
- stage authored order는 native typed query 순서를 보장하지 않습니다. host 실제 순서 필수.
- Actor common motion/warp/jump/collision와 component 실동작은 helper가 구현하지 않습니다. dispatch 성공이 물리 fidelity 증명은 아닙니다.
- Player 전체 state machine, invincibleProc/Default의 관련 없는 이벤트, InitializeDead game-player-info mutation은 미구현입니다. transition 주소/순서만 증거 보존.
- CollisionActive는 call plan이며 기존 collision helper에 연결해야 합니다.
- 검증한7종 외 phase wrapper, 임의 custom event receiver는 명시적 거부.
- SharedHP child events를 동기로 처리한 뒤 current patch를 적용해야 합니다.

기존 LinePathGear/SwitchTargetGroup, 공용 runtime/collision/play/queue/HANDOFF/Git은 수정하지 않았습니다. 등록/통합/커밋은 리드 담당입니다.

## Followup 완료 (2026-10-14)
status: done (실제3-2/10-4의 phase/query 범위)
files 추가: source-migration/source-actor-lifecycle-query.js
현재 tests: 자체34/34; 전체993/993. 위 first pass의7종 제한/21개 테스트는 당시 확정 결과이며 이번 후속에서15종/34개로 확장했습니다. 기존 exports/flags/owner JSON 계약과 host.queries 배열 계약은 유지합니다.

실제 stage variant/population 선택을 offline/online ×2..8인 총28개로 기록했습니다. 3-2는 Player/Key/Goal/LinePathLift/Thorn/DamageRect/Thunder/Rect, 10-4는 Player/Key/Goal/Thunder/Rect/WeightedLiftEx/Bridge/Switch/Thorn입니다. 실제 creator는 Thorn→NormalThornComponent, WeightedLiftEx→ExtraWeightedLiftComponent, Switch→NormalSwitchComponent입니다. Player의 공장 특수 경로는 이 creator delegate 표에 없으므로 creator를 만들어 넣지 않았습니다. Goal/Rect는 updater 등록이 없으므로 해당 typed phase를 만들지 않습니다.

추가 검증8종: Key, LinePathLift, Thorn, DamageRect, Thunder, WeightedLiftEx, Bridge, Switch. 예시 native wrapper: LinePathLift Update0x1806e9510/Post0x180697aa0, Key0x1806e76f0/0x180696520, WeightedLiftEx0x1806e2a40/Post0x180692a90. 각 wrapper의 startbit/pausegate/Actor.Update1 inlining/common Update2/Post1/Post2 callsite를 report.followup.wrapperEvidence에 보존하고 실제 DLL byte로 common call target을 독립 대조했습니다. Key.OnStart의 prepareAttachTarget0x18186bf80, Update의 updatePhase0x18186c340→excludeTargetProc0x18186c960; NormalSwitch는 underlying Switch.OnStart0x181714890/OnUpdate0x1817149f0, ExtraWeightedLift는 WeightedLift.OnUpdate0x181737be0, NormalThorn은 Thorn.OnUpdate0x181720fb0를 호출합니다. Helper dispatch는 실제 일반 metadata의 바깥 callback 이름/VA를 유지합니다.

### Typed query의 재현 규칙
- 실제 generic MethodSpec에서 ComponentFilter`2.NextUnsafe0x180cd69c0(LinePathLift) 및0x180cf5e40(동일 generic shape)을 확인했습니다. engine 이름도 quantum.core.dll 실제 module token/pointer로 확인했으며 원작 실행 없음.
- filter ctor0x180cd61b7..623e: Actor/T 두 buffer의 raw count+4에서1을 뺀 물리 count를 비교합니다. T가 더 작으면T, 동률은Actor buffer. entity ordinal/ID/authored 순서로 sort하지 않습니다.
- ComponentDataBuffer.GetBufferEntry0x18193cb60: slot0은 sentinel, 신규 component는 rawcount+4 위치에 append; 기존 entity index의 slot은 유지합니다. append에 version 증가가 없습니다. native generation/ref와 underlying component들 생성은 host에서 실제 순서로 공급해야 합니다.
- Remove0x18193cd10: tail EntityRef/data를 제거된 hole에 옮기고 entity→slot을 갱신한 뒤 raw version+0x10을 증가(0x18193cf29). 다음 추가는 현재 tail에 append. 따라서 삭제 후 생성순서/ID순서와 달라집니다.
- ComponentBlockIterator ctor0x1819347b0: version과 count-1 snapshot, block0/offset1. NextBlock0x181934860은 block을 순서대로 전달합니다. ValidateIterator0x1819347d0는 version 불일치 시 예외를 던집니다. 검사는 새 block 획득 시이며 마지막 exhaustion 조회에도 발생합니다. 이미 받은 block 안의 다음 entity마다 version을 재검사하는 것은 아닙니다.
- Typed Next0x180cd69c0는 매 entity의 현재 generation과 component mask를 다시 읽습니다. RemoveComponentIndexUnchecked0x181977a70는 즉시 component bit를 제거(0x181977b56)하고 physical 제거는 CommitRemoves0x1819796b0→0x18193cd10(0x181979946)에 미룹니다. 이 사이 later entity는 live mask로 skip되며 query version은 아직 유지됩니다.
- pending Destroy bit만으로 NextUnsafe는 skip하지 않습니다. Destroy0x181977d10의 component-remove signal 부작용은 host에서 실제로 적용해야 합니다. CommitDestroys0x181979230은 pools를 compact(0x181979514)하고 masks를 지웁니다(0x181979581..58c).
- CommitDestroys는 frame free-list head+0x28에 해제 entity index를 넣습니다(0x1819795a9..5b8). Create0x181979090은 head를 pop(0x1819790cc..de)하고 generation을 증가(0x1819790e3..ef). index 재활용이 component pool의 예전 위치 복귀를 뜻하지는 않습니다. helper는 allocator를 추정하지 않고 실제 index/generation을 요구합니다.
- 생성된 component는 현재 query의 count snapshot 밖이므로 현재 group에서는 추가로 순회하지 않습니다. 다음 group에서 query를 새로 만들면 보입니다. 같은 group의 중간 pause는 다음 Actor의 pause gate에 반영됩니다.
- query.isView=true일 때만 현재 culling bit를 FrameBase.IsCulled0x181977980으로 검사합니다. isView=false에서는 culled를 이유로 skip하지 않습니다.

### 후속 통합 계약
source-actor-lifecycle-query.js의 createPool({blockSize,version,slots:[null,...refs]})은 실제 blockSize/version/EntityRef {actorId,index,generation}를 요구합니다. poolAppend/poolRemove는 일반 dense pool의 append/swap 규칙만 수행하며 singleton이나 전체 Frame allocator를 흉내 내지 않습니다. entity current mask/generation 변경은 host 담당입니다.

createTypedQuery({actorPool,componentPool,component,entities,isView})는 lazy iterable입니다. entities[index]={generation,components:[actual component names],culled:boolean when view}. JSON pool/entity 데이터는 안전하게 복원할 수 있고 진행 중 iterator는 매 group 새로 만듭니다.

runPhase의 선택적 host.queryFactory(row,state,phase)에 이 iterable을 반환하세요. queryFactory는 각 등록 group에 도달했을 때 호출되어 앞선 callback의 생성/삭제를 반영합니다. 미리 모든 group query를 만들어 두지 마세요. 기존 host.queries 배열은 이미 native로 확정/필터된 순서를 공급하는 기존 계약 그대로 유지합니다.

후속 한계: 이 작업은 실제 stage type coverage와 phase/query 호출 순서 복원입니다. initial creator side effects의 모든 추가 entity/component 생성, native buffer blockSize 초기값, singleton buffers, 전체 component callback 물리는 host에서 실제 데이터를 공급해야 합니다. 임의 authored order/추정 allocator fallback은 없습니다.15종 외 wrapper/event receiver 및 사망 상태머신 전체로 확대하지 않았습니다. 기존 타 모듈/runtime/Git 수정 없음.
