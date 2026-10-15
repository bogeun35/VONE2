# SceneActivation — result
status: done (물리 순회·host 계약 완료; 실제 physical dictionary 공급은 필수)
files: source-migration/source-scene-activation.js, source-migration/source-scene-activation.test.cjs, source-migration/scene-activation-report.json, codex-briefs/SceneActivation.result.md, codex-briefs/작업중-SceneActivation.md
tests: 전용48/48, 전체2027/2027 통과. 설치 DLL bytes로 Scene flags/usedCount/state2/owner 전달·event49·Add/Remove state 쓰기를 대조. 원작 실행 없음.

what it is: Scene.SetActive0x1816a74f0의 실제 occupied physical slot 순회와 활성 요청 전달을 제공한다. 검증된 물리 descriptor를 한 번 resolve하고, live usedCount와 슬롯을 순회하며 Actor 공통 활성화 host를 호출한다. 논리 이름 목록에서 물리 순서를 만들어내지 않는다.

stage compiles alone: 아니오. frozen StagePreparation.prepare5에 직접 연결 가능한 createStageHost와48건의 명시적 host 테스트를 제공한다. 실제3-2/10-4 2..8인14건은 원본 설정+공급한 물리 roster를 사용한 활성화 검증이며, 실제 allocator/등록 physical prefix/10-4 shuffle 정체성·전체 gameboot 완료 주장이 아니다.

key findings:
- Scene.SetActive는 **같은 상태여도 매번 순회**한다. Scene ushort flags native+24 bit0(inactive)을 먼저 쓰고(0x1816a7592..75b2), Frame null/이름 dictionary resolve는 그 뒤다. Scene owner gate/verified gate 없음. Stage.SetActive의 별도 변경 gate를 여기에 복사하면 틀린다.
- Scene+28 dictionary를 한 번 resolve(0x1816a7619), captured header의 **현재** usedCount(+0c)를 읽어 physical index 증가(0x1816a7716/7725). entry.state(+8)==2만 검사(778b), valueOffset으로 EntityRef 읽고 Frame.GetActor(77ba), null만 skip 후 Actor.SetActive(77f2).
- Actor type/active/pause/player 필터·정렬·중복 제거 없음. slot에 같은 EntityRef가 두 번 있으면 두 번 호출. owner와 active는 진입 때 capture한 값을 모든 Actor에 그대로 전달(77e0..77ef).
- 콜백 중 미래 슬롯 삭제/재사용/append와 usedCount 축소·성장은 관찰한다. 이미 지난 index로 돌아가지 않는다. Scene dictionary 참조가 교체되어도 외부 호출은 old captured header를 계속 순회하며, 재진입 호출만 새 header를 resolve한다. 재진입이 바꾼 Scene flag를 outer가 다시 덮지 않으므로 혼합 Actor 상태도 발생 가능.
- Actor.SetActive0x18169ed70는 event49를 항상 취득(edd1), NotifiedActor=owner(edde), IsActive=active(ede5) 후 NotifyEvent(ee03). module은 공통 동작을 복제하지 않고 필수 setActorActive host 사용. 테스트 host는 기존 NativeEventPool/ActorLifecycle/ActorMotion을 재사용해 owner 거부·권한 있는 복원·owner0 override·collision 상태를 검증한다.
- 삽입 근거: AddActor73b1→generic180024500→insert1807fb690. freeHead가 있으면 free slot을 pop(7fb76a..76f), 없으면 usedCount index에 append하고 증가(7fb7b3..7c5), state2(7fb825). 초기 Scene dictionary 요청 capacity128(1816a5b0e).
- 삭제 근거: exitActors1816a6f60→remove1807fc010. 성공 시 state1(7fc1ce), 제거 슬롯을 freeHead에 연결(1c7..1d8), usedCount를 dense compact하지 않는다. 이후 삽입은 이 free slot을 LIFO 재사용한다. **따라서 logical actorNames.entries 순서가 physical 순서라는 일반 가정은 불가**. resize/rehash 구현은 추측하지 않았다.

물리 snapshot 계약:
```js
{
  schema: 'SceneNameDictionaryPhysicalV1',
  completePhysicalSnapshotVerified: true,
  headerRef: '실제 captured header의 안정된 식별자',
  usedCount: 2,
  slots: [
    { physicalIndex: 0, state: 2, valueEntityRef: '실제 index/version ref' },
    { physicalIndex: 1, state: 1 }
  ]
}
```
`validatePhysicalSnapshot`은 순서/완전한 prefix/state2 ref/표식 등을 검사하고 같은 객체를 반환한다. state2 외 payload는 무시한다. 표식은 실제 native 근거를 공급한다는 host의 명시적 계약이며, 임의 JS 배열의 물리 출처까지 독립 증명해 주지는 않는다. 호출 중 같은 header의 변경은 같은 descriptor의 usedCount/slots에 반영해야 한다. logical SceneNames projection은 명시적으로 거부한다.

API: `setActive(scene,frame,active,owner,host)`, `validatePhysicalSnapshot`, `createStageHost(nativeHost)`, browser global `SourceSceneActivation`. host는 `getNameDictionaryPhysical(frame,scene)`, `getActor(frame,fullEntityRef)->Actor|null`, `setActorActive(frame,actor,active,owner)` 세 가지가 필수이며 도달한 누락/비동기는 throw. actor host 반환값 false를 순회 중단 사유로 해석하지 않는다.

prepare5 연결: `createStageHost(nativeHost).setActorSceneActive`는 StagePreparation의4인수 hook과 일치한다. Stage flag 쓰기→Scene bit 쓰기/Actor 활성화→Map 호출이 Game owner로 실행되는 테스트 통과. NativeStageDriver의 외부 hook은 앞에 world 인수를 추가하므로, 리드는 그 **현재 transaction world**에 맞춰 세 native host를 resolve하는 wrapper를 연결해야 한다. old world closure를 보존하지 않도록 한다.

unresolved: 실제 physical name dictionary 공급/검증 또는 정확한 mutation stream 재구성은 리드 통합 경계. hash buckets/heap handles/resize/clear 수명 전체는 미구현이며 대체 hash table을 만들지 않았다. 미검증 custom Actor registry/equipment는 실제 host 필요. captured header deallocation은 추측하지 않고 descriptor 무효화 시 거부. 전체 boot/플레이 일치·transaction 정책 검증 아님.

다음 통합 경계: 논리 actorNames와 별도로 world-owned physical descriptor를 유지하고, 검증된 성공 Add/Remove/resize 결과로 갱신 → actual full EntityRef lookup/공통 Actor 활성화 host 연결 → prepare5 adapter 사용. 물리 근거가 없으면 계속 명시 거부.

동결: 기존 SceneNames/ActorLifecycle/StagePreparation/bridge/factory/runtime/play/HANDOFF/Git 수정 없음. 신규5파일만 작성.
