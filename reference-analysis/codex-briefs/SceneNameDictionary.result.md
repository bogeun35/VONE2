# SceneNameDictionary — result
status: partial (193 이하 fixed-capacity 정상 Add/Remove/물리 descriptor 완료; resize 명시 거부)
files: source-migration/source-scene-name-dictionary.js, source-migration/source-scene-name-dictionary.test.cjs, source-migration/scene-name-dictionary-report.json, codex-briefs/SceneNameDictionary.result.md, codex-briefs/작업중-SceneNameDictionary.md
tests: 전용52/52, 전체2140/2140 통과. DLL bytes/global metadata의 호출·prime array·stride·allocator 인터페이스·타입 메서드 목록 대조. 원작 실행 없음.

what it is: QString32→EntityRef 이름 사전의 hash bucket chain, occupied physical slots, usedCount/freeCount, freeHead LIFO를 원작 규칙으로 변경하는 독립 helper다. 동일한 world-owned descriptor를 frozen SceneActivation에 바로 공급한다. JS Map/논리 이름 삽입 순서로 대체하지 않았다.

stage compiles alone: 아니오. 실제3-2/10-4 2..8인·offline/online 조건부 성공 등록 이름28건과 삭제·재삽입을 검증했다. Factory 정렬/인원 조건/UniqueName helper를 재사용했고, 전체 creator 성공·숨은 등록/삭제 없음·EntityRef 결과는 명시 fixture다. 실제 allocator/prototype/RNG identity/전체 gameboot 검증은 아니다.

key findings:
- **Scene 요청128 → 실제 capacity193**. Scene.Initialize1816a5b0e→Allocate18001cbe0→18000fa30→GetNextPrimeGreaterThanOrEqual18197edc0. sparse prime table은 `[3,7,17,29,53,97,193,389,...]`, 단순 next prime/power2가 아니다. cctor18197f4e0의 FieldRef342(slot1831a1448)→field41356/dataIndex323976의30개 정수 전부 확인.
- header36바이트, keyOffset16/valueOffset48/entryStride56. CalculateStrides18197f680·Allocate18000fb17..99 근거. IFrameHeap 슬롯0/1은 AllocateAndClear/Ptr이므로 초기 bucket/freeHead/count/entry가0인 근거도 확인했다.
- hash는 frozen NativeQString 사용. **bucket=(hash>>>0)%capacity**이며 signed remainder/abs/bit31 제거가 아니다(Find180033880@392c..34). `Aa`/`BB` hash70405는 bucket153에서 공존; `한글` hash-1662274657은 bucket97.
- TryAdd180024500은 중복 먼저 검사하고 false, mutation 없음. public Add180951f60은 false면 **ArgumentException**. get_Item missing branch180033b03는 **KeyNotFoundException**. 두 예외 타입은 metadata token으로 확인.
- 삽입1807fb690: freeHead 있으면 pop·freeCount 감소(7fb76a..76f), 없으면 usedCount index append·증가(7fb7b3..7c5). 새 노드를 bucket head에 연결, state2/key32/EntityRef 복사. 문자열 padding까지32바이트 복사하지만 hash/equality는 count 안의 bytes만 사용한다.
- 삭제1807fc010: bucket/predecessor unlink→slot.next=old freeHead→state1→freeCount++→freeHead=제거 슬롯(7fc189..1d8). **usedCount 감소·dense swap 없음**, hash/key/value는 남는다. 마지막 삭제 슬롯부터 재사용한다. Count180951c0d..10=usedCount-freeCount.
- QDictionary`2/QDictionaryInternal 메서드 목록에는 **Clear가 없다**. remove-all도 usedCount/free list를 보존한다. Scene.Initialize는 새 header를 할당하며 임의 in-place clear는 만들지 않았다.

API: `create({headerRef,requestedCapacity:128})`, `normalizeCapacity`, `validate`, `tryAdd/add/remove`, `containsKey/getValue/findSlotIndex/getCount`, `physicalSnapshot`, `resize/clear`(명시 거부). Browser global `SourceSceneNameDictionary`. key는 NativeQString `{bytes:[32]}`, value는 실제 complete EntityRef다.

표현·연결 계약:
- create는 실제 할당된 header의 식별자를 host로 받는다. 실제 native heap 주소나 EntityRef를 생성하지 않는다.
- descriptor는 기존 `SceneNameDictionaryPhysicalV1` schema와 slots의 physicalIndex/state/valueEntityRef를 유지하고 hashCode/key/next/buckets/freeHead/freeCount/capacity/layout 정보를 추가한다.
- **link는 native heap handle이 아닌 normalized physical index/null**이다. index0도 유효한 슬롯이며 null이 native0 link에 대응한다. 이를 원작 raw heap offset이라고 주장하지 않는다.
- `physicalSnapshot(d)`는 clone 없이 같은 객체를 반환한다. SceneActivation callback 도중 Add/Remove는 같은 descriptor를 mutate하므로 미래 슬롯 재사용·append가 관찰된다. 새 Scene.Initialize 할당은 별도 headerRef/객체를 만들어야 한다.
- native header에 별도 dictionary version counter는 없다. world transaction adoption에서도 같은 captured header의 객체 identity를 보존해야 한다. 실제 heap Free/재할당 lifetime은 외부 host 경계다.

검증된 실제 이름 스트림: 3-2 성공 개수2..8인 `[14,13,14,15,16,17,18]`,10-4 `[20,21,22,23,24,25,26]`. `A1_Key/A2_Goal` 등록 후 Key 삭제·`A3_Key` 재삽입이 같은 physical slot을 재사용한다. 이는 명시된 정상 성공 prefix 조건의 검증이지 원작 전체 실행 로그가 아니다.

unresolved:
- full append의 **resize1807f9920은 변경 전 throw**.193→389, 새 buffer/copy/reverse rehash/free/metadata 갱신 정적 관측은 report에 기록했지만 실제 handle 교체·할당 실패/commit·기존 pointer 수명은 구현 범위 밖이다. full 상태에서도 duplicate false나 deleted slot 재사용은 정상 지원한다. constructor도 normalized capacity193 초과를 거부한다.
- `clear()`는 미검증 in-place reset을 거부한다. remove-all 또는 실제 새 Scene.Initialize 할당을 구분해 써야 한다.
- Scene.AddActor의 duplicate OnExit/Destroy, 이름 생성, registry/player list, logical projection 동기화·transaction 정책은 상위 host 소유다.

다음 통합 경계: 실제 Scene.Initialize에서 physical descriptor 생성 → 검증된 성공 Add/실제 Remove에 이 helper 적용 → **동일 descriptor**를 SceneActivation host에 공급. 기존 logical SceneNames projection의 배열 순서를 복사하는 방식은 사용하지 않는다. Resize/재초기화 lifetime이 필요해지는 지점에서 현재 명시 거부를 유지한다.

동결: 기존 NativeQString/SceneNames/SceneActivation/Factory/UniqueName/runtime/play/HANDOFF/Git 수정 없음. 신규5파일만 작성.
