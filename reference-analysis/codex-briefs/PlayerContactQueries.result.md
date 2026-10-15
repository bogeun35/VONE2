# PlayerContactQueries — result
status: done (읽기 전용 host adapter 범위)
files: source-migration/source-player-contact-queries.js; source-migration/source-player-contact-queries.test.cjs; source-migration/player-contact-queries-report.json; codex-briefs/PlayerContactQueries.result.md; codex-briefs/작업중-PlayerContactQueries.md
tests: 전용23/23; 최종 전체1270/1270, 실패0 (동시 보조 작업 포함 시점)
what it is: 기존 PlayerDefault가 요구하는 contactIds/contactInfos/mapContact/contactProbe/iceMapAttributesAtRaw와 collisionById를 실제 Scene 캐시와 native collision dictionary/map chip 데이터에 연결하는 읽기 전용 adapter입니다. 캐시 생성·새 AABB 검사·빈캐시 fallback은 없습니다.
stage compiles alone: no; 조회 adapter만 제공. 실시간 physics/phase 및 나머지 PlayerDefault host hooks는 리드/다른 보조 담당.

## 핵심 native 계약
- ContactFace0x18177e46c..4f6:0Up,1Down,2Left,3Right. source-move-contact.NORMALS를 그대로 재사용하고 normalize하지 않습니다. raw65535와65536은 서로 다른 normal입니다.
- contactInfos는 raw ContactInfo 전체 순서(0x181690050; Player littleStep0x1816c5545..5604)를 반환합니다. wrong normal/zero normal/사라진 target도 삭제하지 않으며 원래 index가 유지됩니다.
- contactIds는 GetContactCollisionList0x181691a55..ad7: exact normal을 비교하고 GetCollisionById0x1817f6940가 현재 성공하는 target ID만 원래 순서로 반환. stale ID 제외, 중복 기록을 임의 dedup하지 않습니다.
- contactProbe는 IsContacted0x1816928df..959: exact normal이 한 개라도 맞으면 target lookup 전 contacted=true. 살아있는 matching target의 attribute BYTE를 모두 OR합니다. layer/static/inactive filter 없음. matching stale ID만 있어도 true/attribute0이며 map cache는 그때 읽지 않습니다.
- matching actor cache가 없으면 includeMap 분기0x181692964..995에서 확정 mapNormals cache와 exact normal을 비교(0x181692b70). requestMapNormals는 아직 접촉으로 보지 않습니다. map은 actor attribute에 어떤 bit도 더하지 않습니다. 조회에서 Map.IsContacted geometry를 재계산하지 않습니다.
- Player.checkIceFloor0x1816c4d31..db7는 Actor anchor를±12px 조정한 뒤48FP로 나누고 sar16합니다. 기존 PlayerDefault가 이미±12를 적용하므로 iceMapAttributesAtRaw는 받은 sample point에 다시 offset하지 않습니다. collision rect edge/camera 좌표가 아닙니다.
- cell 변환은 source-collision-map.cell 재사용. 첫 signed truncation 때문에 sample raw -1..-47은 cell0, -48은 cell-1입니다. raw<<16 overflow 영역은 core를 바꾸지 않고 거부합니다.
- 0x1816c4ddc..e25: x/y bounds 이후 linear=y*width+x<4096, chip byte<2면 null(기존 ice flag 보존). valid chip70의 attribute0은0을 반환(ice 해제 가능). chip>=79는 QTileMapChipAttrData.Get0x18178184a..88d에서0입니다.
- tileFlags는 chip0/1과 유효 attribute0 chip을 구분할 수 없습니다. 실제 live row-major chip grid와 기존 추출 tileAttributes 표를 필수로 받아 역추정하지 않습니다.

## 재사용한 core
source-move-contact의 cardinal face table, source-collision-map의 cell(), source-collision-broadphase.getCollisionById의 실제 primary/secondary dictionary lookup을 읽기 전용 재사용했습니다. inactive body를 누락시키는 active()/chunk filter를 lookup에 쓰지 않습니다.

source-collision-scene.refreshContacts/refreshMapContacts 및 Map.MoveMap은 테스트에서만 원래 캐시를 생성하는 데 사용했습니다. adapter가 이 함수들을 호출해 캐시를 생성하지는 않습니다. 기존 PlayerDefault가 source-collision-rect.getRect를 쓰는 littleStep도 그대로 활용하며 geometry core를 복제하지 않았습니다.

## host API
```js
const queries = SourcePlayerContactQueries.createHost({
  lookupMode: 'storage',
  getWorld: () => currentPipelineState, // 실제 .storage
  getMapData: () => ({
    width: currentMap.width,
    height: currentMap.height,
    grid: currentMap.grid,             // 현재 row-major chip BYTE grid
    tileAttributes: extractedTileAttributes // [{id,flags}, ...]
  })
});
// 기존 다른 host hooks와 합쳐 PlayerDefault에 전달
```

lookupMode는 반드시 명시합니다.
- storage: 실제 pipeline state.storage를 기존 Broadphase.getCollisionById로 조회. Player.Update 시점 등 callback 밖에서 사용.
- scene: getWorld().collisions가 완전한 resolved lookup rows인 경우만. active-only chunk를 complete lookup이라고 넘기면 안 됩니다.
- scene+storage: Scene callback 안의 current chunk overlay와 실제 storage를 함께 제공. dictionary에 현재 존재하는 ID인지 먼저 확인하고, 있으면 current chunk row 또는 stored nonchunk row를 반환합니다. inactive chunk 밖 target도 찾으며 removed ID를 stale chunk에서 되살리지 않습니다.

getWorld는 매 조회 시 호출되므로 동기 native host 작업 이후 새 world로 교체되어도 현재 cache를 읽습니다. owner는 전달된 cloned collision의 id를 기준으로 현재 원본 cache를 찾아 읽습니다. contactInfos/IDs/lookup snapshot 반환값은 분리되어 소비자가 수정해도 world를 바꾸지 않습니다.

반환 hooks:
- contactIds(collision,face) -> ordered IDs
- contactInfos(collision) -> unfiltered [{collisionId,normalRaw:{xRaw,yRaw}}]
- mapContact(collision,face) -> committed-map-cache boolean
- contactProbe(collision,face) -> {contacted:boolean,attribute:byte}
- collisionById(id) -> detached current native collision snapshot or null
- iceMapAttributesAtRaw(sampleXRaw,sampleYRaw) -> attribute byte or null

JSON world 복원 후 provider를 새로 bind하면 같은 캐시 순서를 유지합니다. closure 자체는 network state가 아니며 serialize하지 않습니다. Browser global은 SourcePlayerContactQueries; core globals SourceMoveContact/SourceCollisionMap/SourceCollisionBroadphase가 필요합니다.

## 검증
전용23개에 unfiltered 순서/잘못된·근사normal/stale ID/attribute OR/inactive target/committed-vs-request map cache, 실제 MoveContact 추가·Scene refresh·Map.MoveMap에서 생성된 cache, dictionary 제거·chunk overlay, JSON 복원·read-only 출력, native cell 경계 및4096/chip0/1/70/79/255, missing dependency 거부를 포함했습니다.

기존 PlayerDefault.checkIce가 Actor±12 sample을 한 번만 적용하고 invalid chip은 ice를 보존하는 점, littleStep이 wrong-normal 항목을 포함한 원래 index를 소비하는 점을 직접 검증했습니다. 실제 source-geometry의3-2 width62/10-4 width68(height10) 원본 map을 offline/online ×2..8에 대해 모든 셀 조회했습니다. 이는 원본 추출 map fixture 검증이며 dynamic MapRect/기타 actor 변경이 이미 적용됐다는 주장은 아닙니다.

원본 DLL bytes의 GetCollisionById/map-cache fallback call, attribute OR, chip<2, attr>=79,4096 guard도 독립 대조했습니다. 원작 게임 실행 없음.

unresolved:
- 실제 live chip grid/attribute 표 없이는 ice 조회 불가. tileFlags/AABB로 대신하지 않음.
- source scene 모드의 complete lookup 또는 storage/overlay 일관성, 캐시 생성·삭제·phase 시점은 host 책임.
- playerByEntity, Goal overlap, screen boundary, warp/transport, NotifyJump recursion은 다른 helper/host 계약. 여기서 대체하지 않음.
- raw FP shift overflow/linear signed32 overflow는 거부. singleton/field schema 완성은 별도 감사 작업.
- 일반 runtime 등록/전체 라운드 개방/게임 완료/배포·Git 작업 없음. 기존 map/scene/rect/default/runtime/play/network와 다른 보조 파일은 수정하지 않았습니다.

correction: 초기 synthetic test가 chip69를 attribute0이라고 놓았으나 실제 표는16입니다. 실제 attribute0 chip70으로 fixture를 정정했고 production lookup은 변경하지 않았습니다.
