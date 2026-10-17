# NativePoolGrowth — result
status: done / frozen (독립 정적 감사·oracle; production 성장 구현 아님)
files: source-migration/native-pool-growth-report.json, native-pool-growth.test.cjs, native-pool-growth-audit.local.py; 본 결과와 작업중 노트만 생성
tests: 전용26/26; 전체2061/2061 통과
what it is: 표준 config와 fresh Frame 초기화, allocator doubling, ComponentDataBuffer.UseNextBlock의 정확한 논리 값·순서·메모리 효과를 정적으로 추적했다. 논리 projection과 실제 heap fidelity의 경계를 분리했다.
stage compiles alone: 아니오. Factory/runtime/기존 helper 연결·수정은 하지 않았다.

## 리드가 바로 알아야 할 경계
**fresh View는 count1, descriptor capacity4, active blockCount0이다. 첫 View 추가부터 block 할당이 필요하다.** NativePrefabMaterializer29의 blockCount>=1 검증 및 성장 거부 범위에는 이 untouched fresh 상태가 들어가지 않는다. 기존 파일은 동결 상태로 읽기만 했으므로, 리드가 스키마와 최초 할당 처리를 명시적으로 확장해야 한다. descriptor capacity4를 물리 block4개로 간주하거나 가짜 heap 주소를 넣지 말 것.

## 근거 있는 fresh logical seed
이 값은 **표준 설치 config를 선택하고, 수정 없는 registry를 초기화한 뒤 FrameBase.Initialize 직후, 후속 시스템/스테이지 생성 전**에만 생성할 수 있다. 스테이지 생성 직전 snapshot이 fresh라고 주장하지 않는다.

- 실제 resources.assets SimulationConfigAsset6169(Guid5)와 debug6170을 strict 전체 바이트 소비로 읽었다. 둘 다 Entities.DefaultEntityCapacity=1024, DefaultComponentBlockCapacity=128, ComponentTypeConfiguration=[]다. config 조회0x18197ae40은 첫 Name 일치 override 또는 default를 선택해 max(1,value)를 반환한다. ctor0x18197b080도1024/128 기본값이다.
- 표준 registry는 reserved1 + builtin19 + generated game 등록167 = 총187 type slot이다. metadata usage와 unique type 목록을 저장했다.
- allocator: capacity=allocatedCapacity=1024, nextUnused1, freeHead/freeCount0, pending=[]; zero16-byte entries1024개(0번 rawVersion만0x7fffffff), zero64-byte masks1024개, culling128bytes. 초기화0x18197739a..7593.
- 전체 component header는187*72=13464bytes, packed ushort sparse는187*1024*2=382976bytes다. 실제 pool은 ID1..186에 초기화되며0은 reserved다.
- View ID18/flags0/stride8: count1, pendingRemoval0, version0, singletonSparse0, blocksListCapacity4, blocksListCount0, blockCapacity128, blockDataOffset1024, blockByteSize2048. descriptor list64bytes는 모두0이며 physical block은 아직 없다. sparseCapacity1024 및1024개 ushort0, 전체 sparse matrix의 View row offset은36864bytes다. ComponentDataBuffer.Create0x18193c4f0과 Frame inline 초기화0x1819776df..7891이 일치한다.

## typed pool 성장
GetBufferEntry0x18193cb60은 count >= activeBlockCount*blockCapacity일 때 UseNextBlock0x18193d050을 한 번 호출한다. blocksListCount와 descriptor capacity는 별개다.

1. active count와 list capacity가 같으면 descriptor 배열을2배로 Expand한다. 초기4→8은64→128bytes이며 이전64bytes 복사, 새 tail0, 이전 배열 free다(0x18193d097..d0d3; Expand0x181646970).
2. active block 수는 항상1만 증가한다(0x18193d0e4/d0e7). 선택한 descriptor의 refs pointer가0이면 alignment8로 blockByteSize를 alloc/clear하고 data pointer를 base+blockDataOffset에 놓는다(0x18193d150..d1ab). 기존 descriptor가 살아 있으면 해당 block 전체를 clear하며 다시 alloc하지 않는다(0x18193d0fb..d12e).
3. 첫 View는 block0에2048bytes 할당/clear 후 slot1을 사용한다. EntityRef는 block 상대8bytes, View.Current는 상대1032bytes에 쓴다. sparse[entityIndex]=1, count2, activeBlocks1, listCapacity4, version0. 이 숫자는 **상대 offset**이며 heap 주소가 아니다.
4. slot128에서 block1을 활성화한다. slot512에서 descriptor4→8과 block4 활성화가 함께 발생한다. append는 buffer version을 증가시키지 않는다.

## allocator doubling과 의존 저장소
Create0x181979090은 freeHead0이고 nextUnused==capacity일 때만2배로 ResizeEntityCapacity0x1819781c0을 부른다. 새 capacity가 allocated backing보다 클 때의 순서는 다음과 같다.

- 새 culling 영역 alloc/clear→기존 culling bytes 복사.
- entries(16bytes/entity), masks(64bytes/entity) Expand: 새 영역 alloc/clear→기존 logical capacity만큼 복사→이전 영역 free.
- logical/allocated capacity 갱신.
- N*newCapacity*2bytes sparse 전체 alloc/clear. ID1..N-1 각각 old row에서 oldCapacity ushort를 새 row stride로 복사하고 buffer.sparse pointer/sparseCapacity를 재연결(ChangeEntityCapacity0x18193c900).
- 기존 culling/sparse 영역 free. component의 physical slot 순서·payload·version·block 수는 entity capacity 성장만으로 바뀌지 않는다.

표준1024→2048: culling256bytes, entries32768bytes, masks131072bytes, sparse765952bytes. View sparse row 상대 offset은36864→73728이다. **View map 하나의 길이만 늘리면 부족하며 모든 component의 sparse 행을 재배치해야 한다.**

newCapacity<=allocatedCapacity인 backing 유지 재확장 경로0x1819785da는 별도 temp/repack 분기다. ChangeEntityCapacity는 oldCapacity 값 복사와 pointer/capacity 쓰기만 하며 row별 새 tail을 전부 clear하지 않는다. 이전 shrink/packed backing의 실제 바이트를 알아야 하므로 blanket zero-extension을 거부했다. allocator oracle도 이 분기를 정확히 거부한다.

## 최소 host 계약과 oracle
논리 결과만 재현하는 host는 실제 prestate entries/masks/culling/free/pending, 전체 type registry와 sparse 행, View count/version/stride, block size, active count와 descriptor capacity, dormant descriptor occupancy와 block ref/payload bytes를 제공해야 한다. 주소 없이 논리 block index와 상대 offset, alloc/copy/clear/free event 순서로 성공한 성장의 값·순서를 정확히 재현할 수 있다.

실제 heap 주소·checksum·relocation·allocation 실패/rollback까지 맞추려면 실제 allocator context/page/free-list/heap bytes와 pointer topology가 필요하다. 이 감사는 그 값을 합성하지 않는다. heap identity를 주장하지 않는 logical projection에 가짜 주소가 필요한 것은 아니다.

owned local script는 --audit(설치 config/PE/metadata 근거 재생성; bundled Python3.12 + UnityPy), --oracle JSON(kind=pool 또는 allocator; 주소 없는 값/효과 계획)을 제공한다. 원작 함수를 로드하거나 호출하지 않는다. tests는 첫 할당/블록 경계/descriptor 확장/기존 block clear/모든 sparse 행 재배치/ushort 경계 등을 별도 JS 기대값과 원본 bytes로 검사한다.

## 거부한 경계 / 정정
- config clamp가1을 허용하지만 fresh blockSize1은 UseNextBlock 한 번 뒤에도 append slot1의 block1이 준비되지 않는다. 임의 추가 루프로 “수정”하지 않고 oracle에서 거부했다.
- old count65536의 ushort 변환은0으로 wrap하므로 지원 범위에서 거부한다. 마지막 안전 append slot65535까지만 계획한다.
- TypeTreeGenerator가 Physics.Layers를 Array<string> 구조이면서 parent type을string으로 잘못 표기했다. 최초 partial decode는 폐기했다. 해당 parent만vector로 정정해 strict whole-object 소비를 강제하고, 독립 test는 실제32개 layer string과32개 matrix int를 수동 파싱한 뒤 Entities offset을 확인한다.
- 실제 활성 config 선택/host mutation/원작 Frame snapshot을 확보한 것은 아니다. 조건부 초기 seed와 실제 스테이지 상태를 혼동하지 않는다.

기존 allocator/materializer/typed helpers/factory/runtime/Git 수정 및 원작 실행 없음. 감사 결과를 동결했다.
