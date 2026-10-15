# NativeEntityAllocator — result
status: partial (검증된 순수 allocator 코어 완료·동결; 실제 heap/component/factory 연결 대기)
files: source-migration/source-native-entity-allocator.js, source-native-entity-allocator.test.cjs, native-entity-allocator-report.json; 본 결과 및 작업중 선점 노트
tests: 전용23/23; 전체1653/1653 통과

what it is: 명시적인 네이티브 snapshot에서 EntityRef 생성·파괴 요청·commit·free-list 재사용을 재현하는 순수 allocator다. uint64 Ref는 JSON에서 10진 문자열로 보존하고, 실제 component pool의 제거는 기존 lifecycle-query를 읽기 전용 재사용한다.

stage compiles alone: 해당 없음. 실제 stage 직전 상태를 fresh라고 가정하지 않는다. fromSnapshot은 전체 entry/mask/counter/실제 pending 사전 순서를 요구하며, freshInitializedFrame은 확인된 FrameBase.Initialize 직후만 모델링한다.

key findings:
- Initialize0x18197739c..7593: nextUnused1/freeCount0/freeHead0, capacity=max(config,32), allocatedCapacity 별도보존. 16byte entry는 indexOrNext+0/rawVersion+4/flags+8/opaque+12, 초기0; reservedentry0.rawVersion=0x7fffffff(0x181977593). component mask는 별도512bit/64byte.
- Create0x181979090: freeHead가 있으면 pop/freeCount--; 없으면 nextUnused를쓰고증가,capacity와같으면정확히2배확장. rawVersion=((old+1)&7fffffff)|80000000(0x1819790e3..ef). EntityRef low32=index/high32=rawVersion, 예9223372041149743105. authoringindex로ID를만들지않는다.
- 기존NativeCreationOrder 요약에서 누락된중요사실: Destroy0x181977d10은flag2pending(0x181977de8)→componentbit오름차순 counter/singleton/OnRemoved·listener→mask불변검사→기존activeRef를pending사전에삽입→버전highbit제거및증가(0x181978167..17b). 따라서기존Ref는commit이전에도즉시무효다. 정상첫생성80000001→Destroy00000002→Commit그대로→재생성80000003.
- CommitDestroys0x181979230은실제pending사전의물리순회순서를따른다. 요청FIFO라고가정하지않고snapshot/insertPendingDictionary호스트가완전한실제순서를제공해야한다. 실제commit순서역순으로free-list재사용된다.
- commit은현재maskbit오름차순물리poolRemove0x18193cd10→mask0→entry.indexOrNext=oldfreeHead/flags0→freeHead=index/freeCount++(0x181979514/57e..5c3). version/opaque+12는보존한다. OnRemoved를commit때다시부르지않는다.
- removeFromExistingPool은명시적으로전달된기존pool만source-actor-lifecycle-query.poolRemove로제거한다. 테스트에서Destroy직후버전불일치로query에서빠지되물리slot은남고,commit뒤swap/remove version증가를검증했다. typedcomponent storage를새로만들지않았다.

unresolved / host contracts:
- 실제prestage snapshot/기존singleton/livecomponent는호스트필수. 실제stage의절대index나Ref를주장하지않는다.
- componentRemoving은실제counter/singletonref/OnRemoved·listener; insertPendingDictionary는실제pending사전삽입과순회순서; removeComponentPool은실제물리제거; clearPendingDictionary는실제collection정리. capacity확장은resizeDependentStorage로실제bitset/componentindex테이블재배치필수. 이름없는no-op이나materialization대체없음.
- 모듈은성공때만자체JSONdraft를commit한다. 외부counter/listener/pool/heap/queue까지호스트transaction이rollback해야한다. 비동기hook과commit도중pending순서변경은구체적으로거부하며전체nativeiterator재진입은호스트범위다.
- 순수allocatorprojection, completePhysicsFidelity=false. component materialization/OnAdded/ActorScene/OnExit/factory/runtime/bridge는추가하지않았다. int32capacityoverflow와발급되지않은lowversion DestroyRef는거부한다.
- 기존NativeCreationOrder/lifecycle-query/다른모듈읽기전용. 실제factory/runtime/bridge/play/Git변경및원작실행없음.

전용23개·전체1653개검사완료후파일을동결했다.
