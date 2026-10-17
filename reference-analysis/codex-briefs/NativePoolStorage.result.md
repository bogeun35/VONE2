# NativePoolStorage — result
status: done / frozen (독립 실행 helper, runtime 미연결)
files: source-migration/source-native-pool-storage.js, source-native-pool-storage.test.cjs, native-pool-storage-report.json; 본 결과와 작업중 노트만 생성
tests: 전용19/19; 전체2163/2163 통과
what it is: 실제 prestate의 물리 refs/payload bytes, descriptor occupancy와 sparse map을 유지하는 주소 없는 typed pool 저장소다. fresh descriptor 초기값, 최초 block 할당, block/descriptor 성장과 dormant block clear를 실행 가능한 JSON 상태 전이 및 순서 있는 effect 계획으로 제공한다.
stage compiles alone: 아니오. 리드가 기존 Materializer/ActorAdd/allocator의 어댑터와 factory를 연결해야 한다.

## API
```js
const P = require('./source-native-pool-storage.js');
// profile: P.requiredProfile 항목을 host가 실제로 확인한 assertion.
const initial = P.freshPool({
  componentId: 18, sparseCapacity: actualLogicalEntityCapacity,
  blockSize: actualViewBlockSize,
  initialization: 'verified-post-FrameBase.Initialize'
}, verifiedProfile);
const written = P.setBytes(initial.pool, actualAllocatorSnapshot,
  actualEntityRefDecimalString, exactViewPayloadHex, verifiedProfile);
// written.pool + written.effects를 검토/원자적으로 채택.
// caller가 이후 native mask 분기 및 OnAdded를 처리.
```

- freshPool은 {pool,effects,addressFree:true}를 반환한다. 초기 effect는64-byte descriptor list alloc/clear이며 pool은 count1/listCapacity4/activeBlocks0이다. 즉시 post-Initialize임을 확인한 때만 호출한다. 기본 allocator나 스테이지 fresh 상태를 만들지 않는다.
- setBytes(pool,allocator,entityRef,fullStridePayloadHex,profile)는 {pool,slot,appended,effects,addressFree:true}를 반환한다. 입력은 성공/실패 모두 변경하지 않는다. refs는 정확 uint64 10진 문자열, payload는 정확 길이 lowercase hex다. View GUID는8-byte little endian으로 caller가 넣으며 Actor는336-byte 전체 raw payload를 제공해야 한다.
- fromSnapshot/validate/validateAgainstAllocator와 readSlot을 제공한다. readSlot은 ref/payloadHex와 논리 blockIndex, refOffsetBytes, payloadOffsetBytes를 반환한다. 상대 offset은 heap 주소가 아니다.

## pool schema와 실행 의미
pool은 schemaVersion1, componentId18 또는20, elementSize8 또는336, flags0, blockSize, blockCount(활성 수), blockListCapacity(descriptor 전체 수), count(sentinel 포함), version, pendingRemoval, sparseCapacity, descriptors, entityToSlot이다.

각 descriptor는 null(미할당) 또는 {refs:[uint64 decimal strings]×blockSize,dataHex:전체 blockSize*elementSize bytes}다. dormant descriptor까지 전부 입력받으며 실제 오래된 refs/data를 보존한다. entityToSlot은 sparseCapacity 길이의 ushort map이고0은 absent다. **sparseCapacity는 allocator의 logical capacity와 일치**하며 allocatedCapacity와 같다고 가정하지 않는다. 활성 slot의 ref/map 및 live 또는 pending generation을 검증한다.

- View18/stride8 근거는0x1819372ba/0x180730848, Actor20/stride336은0x18072ab26/0x18072ab48이다.
- 표준 blockSize128 첫 View block은2048bytes(alignment8), Actor block은44032bytes다. refs 영역1024bytes 뒤에 typed data가 온다. 첫 View slot1 payload 상대 offset1032, 첫 Actor slot1은1360이다.
- UseNextBlock0x18193d050에 맞춰 descriptor가 가득 찼을 때만 list capacity를2배로 늘린다. effect는 alloc-clear→기존 descriptor copy→old list free 순서다. active block 수는1만 증가한다.
- 다음 descriptor가 null이면 block alloc/clear, dormant descriptor가 있으면 기존 block 전체 clear다. refs와 payload 모두 clear되며 새 slot 부분만 쓴다. 첫 할당/slot128/slot512/dormant reuse를 frozen Python oracle와 대조했다.
- 새 map slot은 count 증가→EntityRef 쓰기→sparse 쓰기→payload 쓰기 순서다(0x18193cbe6/cc07/cc0f, outer Set payload write). 기존 slot은 payload만 바꾸고 물리 순서/ref/count/version/pendingRemoval을 보존한다.

## callback와 기존 helper 어댑터 경계
**appended는 storage map에 새 slot을 만들었는지이며 native Set의 mask 기반 반환값이 아니다.** 이 helper는 entity mask를 변경하거나 OnAdded를 호출하지 않는다. allocator는 storage ref의 현 세대/pending 일관성 확인에만 사용한다. 전체 world mask 일관성과 native Set/Add의 duplicate 분기는 caller가 처리한다.

View caller는 실제 표준 profile에 한해 이미 증명한 null callbacks를 적용한다. Actor caller는 implicit zero336 payload를 쓴 다음 mask→global/frame OnAdded 경계를 거친 뒤 wrapper의 Actor.EntityRef(+20) 쓰기를 실행해야 한다. Actor.Initialize/QString/QList/CollisionHolder heap 및 이름·스케일 초기화는 별도 기존 helper 범위다. 이 모듈은 Actor projection을 raw336 bytes로 임의 직렬화하지 않는다.

기존 helpers의 slots 기반 projection과 본 raw descriptor/dataHex schema는 같지 않다. 기존 파일은 읽기 전용으로 유지했다. 리드가 명시적인 projection↔raw adapter를 제공해야 하며 raw Actor serializer를 이미 구현했다고 주장하지 않는다.

## 전체 registry sparse relocation
```js
const grown = P.growEntityStorage({
  schemaVersion: 1,
  allocator: actualAllocatorSnapshot,
  cullingHex: exactOldCullingHex,
  sparseRows: all187ActualUshortRows
}, newCapacity, verifiedProfile);
```

newCapacity>allocatedCapacity인 fresh-backing 성장만 지원한다. 모든187개 sparse 행(각 old logical capacity 길이), 전체 allocator와 정확한 culling bytes가 필수다. 결과는 {state,rebind,effects,addressFree:true}. 186개 binding은 componentId/sparseCapacity/rowIndex/rowByteOffset을 갖는다.

새 culling alloc/clear→old copy→entries alloc-clear/copy/free→masks alloc-clear/copy/free→capacity 갱신→전체 sparse alloc/clear→ID1..186 각 행 copy/rebind→old culling/sparse free 순서를 재현한다. 새 backing이므로 새 tail은0이며 old logical capacity만 복사한다. 기존 allocated unused tail은 복사하지 않는다. allocator의 nextUnused/free/pending/version/opaque 값과 기존 culling bits를 보존한다.

caller는 반환된 allocator/culling/전체 행렬을 **모든** typed pool map/capacity와 함께 원자적으로 교체한다. View/Actor 테스트에서는 기존 descriptors/version/payload를 그대로 두고 entityToSlot=grown.state.sparseRows[id], sparseCapacity=newCapacity로 재연결한 뒤 validateAgainstAllocator를 통과시켰다. View만 map 길이를 늘리는 근사는 제공하지 않는다.

## 거부·fidelity 경계
- 실제 heap alloc/copy/free 호출을 실행하지 않는다. effect는 순서 있는 logical 계획이며 heap 성공·주소·identity·checksum·relocation·failure/rollback 일치를 보장하지 않는다. 실제 heap이 필요한 caller는 authoritative allocator topology로 effect를 수행해야 한다.
- retained-backing regrowth(new<=allocated), shrink, singleton, 다른 component, stale input ref, 손상된 descriptor/map/generation, raw payload 길이/형식 오류를 거부한다.
- fresh blockSize1은 native 한 번의 UseNextBlock으로 append block이 준비되지 않아 거부한다. ushort append wrap(기존 count65536)도 거부하며 추가 repair loop나 임의 clamp를 만들지 않는다.
- 전체 sparse raw 행의 폭/행 수/예약0행은 검증하지만 caller가 실제 모든 component의 내용을 제공해야 한다. 이름에서 기존 sparse/mask/payload를 합성하지 않는다.

원작 미실행. 기존 Allocator/Materializer/ActorAdd/Factory/runtime/Git 및 감사 파일 수정 없음. 작업을 동결했다.
