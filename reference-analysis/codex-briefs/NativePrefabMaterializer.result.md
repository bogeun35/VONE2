# NativePrefabMaterializer — result
status: done / frozen (독립 helper, runtime 미연결)
files: source-migration/source-native-prefab-materializer.js, source-native-prefab-materializer.test.cjs, native-prefab-materializer-report.json; 본 결과와 작업중 노트만 생성
tests: 전용29/29; 전체1965/1965 통과

what it is: 표준 설치본의 14개 prefab Components=[View]에 한정한 순수 snapshot 변환 helper다. 실제 host가 제공한 NativeEntityAllocator snapshot과 기존 typed View pool을 받아 root를 생성하고 같은 root에 정확한 View GUID와 bit18을 쓴다. zero allocator나 빈 pool을 기본값으로 만들지 않는다.
stage compiles alone: 아니오. Key/Player 생성 전에 사용 가능한 materialization 부분만 제공하며 Actor 추가/초기화, device creator, stage factory 연결은 리드 범위다.

## 리드 호출 API
```js
const M = require('./source-native-prefab-materializer.js');
// snapshot: 아래 명세의 실제 allocator + View pool 상태.
// verifiedProfile: M.requiredProfile 각 항목을 실제 host에서 확인한 assertion.
const key = M.createFromPrefab(snapshot,
  {prototypeGuid: '843619264496456878'}, verifiedProfile);
// key.state를 원자적으로 채택한 뒤 기존 Actor/Key 생성 작업을 진행.
const player = M.createFromPrefab(key.state,
  {prototypeGuid: '2433998748904079550'}, verifiedProfile);
```
위 두 호출 사이에 host가 다른 작업을 했다면 반드시 그 작업이 반영된 최신 snapshot을 사용해야 한다. requiredProfile은 검증할 항목의 template이며 실제 DB가 로드되었다는 증거를 생성하지 않는다.

snapshot은 {schemaVersion:1, allocator, viewPool}. allocator는 기존 NativeEntityAllocator의 전체 schemaVersion1이다. viewPool은 {componentId:18,elementSize:8,flags:0,blockSize,blockCount,version,slots,entityToSlot}. blockSize/blockCount/version과 reverse map은 실제 host 값이다. slots는 물리 순서의 [null,{ref,currentGuid},...]이며 ref/GUID는 uint64 10진 문자열이다. entityToSlot은 allocatedCapacity 길이의 ushort 배열(0=없음)이다. pending destroy의 물리 slot은 commit 전까지 기존 ref로 유지할 수 있으며 pendingCommitOrder와 대조한다.

createFromPrefab은 {state,entity,prefab,setResult:2,added:true,slot,trace}를 반환한다. trace 순서는 createRoot→writeView→setMask→prototypeListeners(count0)→prototypeCallback(false). 입력은 성공/실패 모두 변경하지 않는다. 반환 이후의 Actor/Key/Player 구성은 포함하지 않는다.

## 핵심 native 의미
- ID18,size8,flags0은 Setup0x1819372ba → Add<View>0x180730710 근거다. 표준 global View OnAdded/Frame+70[18]/Frame+80은 null이며 prototype listener도 없다. 이전 NativeMaterialization 감사 결과를 읽기 전용으로 사용했다.
- Set<View>0x18078a6f0은 capacity/version 검사(0x18078a73e/0x18078a762) 후 GetBufferEntry0x18193cb60을 호출하고 GUID를 쓴다(0x18078a7cf). 기존 mask가 있으면 값은 이미 교체된 상태로1을 반환하며 OnAdded는 호출하지 않는다. 신규이면 mask를 세팅하고2, invalid ref면0을 반환한다(0x18078a8bb..8c9).
- setView(snapshot,entityRef,currentGuid,verifiedProfile)는 이 신규/교체/invalid 분기를 제공한다. View_Prototype.AddToEntity의 bool은 setResult===2다(0x1819f8159..8161). 교체는 물리 slot/order/count/version과 다른 mask bits를 보존한다.
- GetBufferEntry는 ushort entity→slot map을 사용한다(0x18193cb80). 새 slot에는 현재 EntityRef를 쓰고 reverse map을 갱신한다(0x18193cc07/cc0f). count는 sentinel0을 포함하며 append가 version을 증가시키지 않는다. 기존 세대가 다른 slot/mask 불일치는 조용히 재사용하지 않고 거부한다.
- 회수된 free-list root의 기존 version 증가와 nextUnused 분기, opaqueC, pending 목록, unrelated pool order를 유지한다. 14개 각각에 대해 nonfresh 입력의 root 재사용과 정확 GUID를 검증했다.

## 명시 거부 / host 경계
- allocator doubling과 typed pool 물리 공간 소진은 거부한다. native block/heap 성장0x18193d050의 heap topology는 이번 범위에서 구현하지 않았다. 단순 capacity 증가나 무근거 resize hook을 만들지 않았다. 이 분기를 지원하려면 upstream에서 native storage 성장 구현이 필요하다.
- 실제 activeDB loaded/unmodified 및 표준 설치 DLL/metadata/resources/profile 확인은 host가 제공한다. custom callback/systems/다른 prepared components/14개 밖 prefab/반올림 또는 Number GUID/forged low-version ref/singleton pool/불일치 generation-map-mask는 정확히 거부한다.
- 테스트 snapshot은 preexisting live/pending/free 상태를 가진 합성 regression fixture이며 실제 원작 Frame을 캡처했다고 주장하지 않는다.

원작 실행·Git·Factory/SceneNames/driver/runtime 및 기존 allocator/materialization 파일 수정 없음. 작업을 동결했다.
