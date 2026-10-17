# NativeActorCodec — result
status: done / frozen (lossless codec, runtime 동기화 미연결)
files: source-migration/source-native-actor-codec.js, source-native-actor-codec.test.cjs, native-actor-codec-report.json; 본 결과와 작업중 노트만 생성
tests: 전용18/18; 전체2220/2220 통과
what it is: Actor ID20,size336 raw payload와 기존 canonical Actor/ActorInitialization/NativeActorAdd projection 사이의 lossless decode/patch helper다. 원본 raw baseline을 복사해 선택된 필드만 변경하며 확인되지 않은 padding과 미선택 필드를0으로 재생성하지 않는다.
stage compiles alone: 아니오. raw/projection 동기화·factory/bridge 연결과 원자적 저장은 리드 소유다.

## 리드 호출 계약: 한 시점에 한 authority
```js
const C = require('./source-native-actor-codec.js');
const originalRaw = PoolStorage.readSlot(actualPool, actualSlot).payloadHex;
const actor = C.toProjection(originalRaw, {
  collisionHolders: actualHeapCollisionHolders
});
// 기존 canonical Actor helper를 actor에 적용하는 한 transaction.
// actor/owner/player/collision flag 공간을 섞지 않는다.
const changedRaw = C.patchProjection(originalRaw, actor);
const written = PoolStorage.setBytes(actualPool, actualAllocator,
  actualEntityRef, changedRaw, verifiedStorageProfile);
```

저장 경계에서는 raw bytes가 authority이고 한 logic transaction 중에는 canonical Actor가 authority다. **같은 originalRaw baseline**에 한 번 patch하고 저장한다. raw와 projection을 동시에 독립적으로 수정하지 말 것. stale-baseline/concurrent write 검사는 리드가 맡는다. helper는 live alias나 자동 상태 동기화를 만들지 않는다.

## API와 손실 없는 값 표현
- decode(rawHex336): 모든 mapped field를 반환한다. signed64 FP가 JS safe 범위면 Number, 아니면 정확한 canonical10진 문자열이다. JSON 왕복 가능하며 raw 극값(-2^63,2^63-1)도 보존한다.
- patch(rawHex336,partialCanonicalChanges): 새 raw hex를 반환한다. partial vector는 {xRaw} 또는 {yRaw}만 바꿀 수 있다. 알 수 없는 key/alias/잘못된 width/unsafe Number는 거부한다. 입력 raw는 변경하지 않는다.
- toProjection(rawHex336,sidecar): 기존 숫자 기반 canonical Actor를 반환한다. 실제 collisionHolders sidecar를 명시해야 하며 handle에서 리스트를 추정하지 않는다. unsafe FP는 lossless decode는 되지만 기존 simulation이 처리할 수 없으므로 이 변환에서 거부한다.
- patchProjection(rawHex336,projection,{fields?}): 기본값은 모든 mapped field를 요구한다. fields로 명시한 필드만 패치할 수도 있다. collisionHolders/player 등 sidecar는 raw에 쓰지 않는다.
- patchFlags(rawHex336,{setMask,clearMask}): Actor uint32 flag word만 변경하고 나머지 unknown bits를 보존한다. set/clear 중복 bit는 거부한다.
- normalizeAliases(legacyPatch): 명시적으로 alias를 canonical field로 변환한다. 같은 target이 두 번 들어오면 값이 같아도 중복 authority로 거부한다. patch 자체는 canonical 이름만 받는다.

## 실제 layout / 폭 / signedness
메타데이터 ActorComponent type4490의 boxed fieldOffset에서16을 뺐다. 실제 fieldOffset table VA0x1830f9df0 및 각 field entry VA, metadata field record/runtime type bytes를 report에 저장하고 원본과 독립 검증했다. 등록 ID20/size336은0x18072ab26/ab48이다.

| raw offset | 값 | 폭/표현 |
|---|---|---|
| 0/1/2 | jumpEventType/playingAnimationId/requestAnimationId | uint8 |
| 3 | padding | 원본1 byte 항상 보존 |
| 4/6 | sortingOrder / actorType | signed16 / uint16 |
| 8/0xc | collisionHolderListHandle / Actor.flags | signed32 Ptr.Offset / uint32 |
| 0x10/0x18/0x20/0x28/0x30/0x38/0x40 | disableAnimation/disableDisplay/entity/inactiveCollision/inactive/invisible/pause refs | uint64 raw;0=null, 나머지는10진문자열 |
| 0x48/0x50/0x58 | angle/baseScale/weight | signed64 FP.RawValue |
| 0x60/0x70/0x80/0x90/0xa0 | Accel/CollisionVelo/InitPos/JumpVelo/OffsetDrawPos | FPVector2; X signed64,Y signed64(+8) |
| 0xb0/0xc0/0xd0 | Pos/PrePos/PreVelo | 각 독립 FPVector2 |
| 0xe0/0xe8 | scaleXRaw/scaleYRaw | m_Scale.X/Y signed64 |
| 0xf0/0x100/0x110/0x120 | Velo/WarpPos/WarpVelo/Wind | 각 독립 FPVector2 |
| 0x130..0x14f | nameQStringBytes | 전체32 bytes; ushort count+30 bytes |

335 bytes는 필드로 설명되고 offset3만 padding이다. patch는 항상 입력336 bytes에서 시작하므로 padding 및 미선택 필드는 보존된다. projection만으로 새 zero raw를 만들어 덮어쓰지 않는다. **검증된 native Add의 default payload에 한해서만** caller가 명시적으로 zero336 baseline을 제공할 수 있다.

Ptr type8195.Offset는 signed32, EntityRef8317.Raw는 uint64, FP12977.RawValue는 signed64, FPVector2.X/Y는0/8, QString4427.ByteCount는ushort다. EntityRef의 모든 bit를 보존하며 codec 자체는 live allocator/generation을 검증하지 않는다. 실제 holder handle은 입력 signed32 값을 그대로 쓸 뿐 heap 주소/할당을 합성하거나 dereference하지 않는다.

QString은 unused tail까지 전체32 bytes를 보존한다. decode/patch는 corrupt count나 malformed UTF8도 바이트 왕복이 가능하다. toProjection은 inline capacity30을 넘는 count를 거부하지만 UTF8을 text로 바꾸지 않는다. 텍스트 의미·fallback은 기존 QString helper 범위다.

## alias와 bit 공간
- Velo/WorldVelo/worldVelocityRaw → velocityRaw(+0xf0).
- Accel/MoveVelo/moveVelocityRaw → accelerationRaw(+0x60).
- Pos→positionRaw(+0xb0), PrePos→prePositionRaw(+0xc0), PreVelo→preVelocityRaw(+0xd0).
- Scale은 scaleXRaw/scaleYRaw만 authority다. bridge의 flat xRaw/yRaw는 파생 view이며 raw field로 받지 않는다.
- Actor.flags는 Actor+0xc의32-bit 공간이다. Player.flags(+0x20 within Player), Collision/equipment/event flags와 별개다. actorType도 Player의 cached playerActorType/ordinals와 혼용하지 않는다.

## Add → EntityRef → Initialize 검증
Native Add wrapper0x1801f9d5e의 EntityRef 쓰기는 Set/OnAdded 이후다. 테스트는 첫 zero Actor raw를 PoolStorage에 저장한 순간 entityId=null임을 확인한 뒤 wrapper ref를 패치하고 NativeActorAdd.addActor 결과와 일치시켰다.

이후 NativeActorAdd.initializeAddedActor가 fixture host로부터 받은 **입력 handle**을 그대로 codec에 전달해 EntityRef+20, ushort type+6, QString+130, BaseScale+50, Scale+e0/e8, Weight+58, holder+8, Actor flags bit14를 대조했다(0x18169cc8e..cddc). 저장소에 다시 쓴 뒤 canonical projection이 원래 결과와 일치하고 pool count/version은 유지된다. fixture handle은 synthetic test 입력이며 실제 원작 heap을 캡처하거나 codec이 할당했다고 주장하지 않는다.

별도로 임의336-byte fixture24개 전체 왕복, signed/uint64 극값, QString tail/불량 UTF8, padding 보존, 별개 Pos/Pre/Velo/Accel 범위, 기존 Motion.update1 적용 후 patch를 검증했다.

## 남은 경계
실제 heap/list 생성과 유효성, 안전한 Number 범위를 벗어난 FP의 simulation 처리, callback/mask 적용, runtime 동기화와 stale baseline 충돌 검사는 이 helper 범위 밖이다. 알려지지 않은 값에 기본값을 합성하지 않고 거부하거나 입력 raw를 보존한다.

원작 실행·기존 PoolStorage/ActorAdd/Factory/Bridge/HANDOFF/Git 수정 없음. 결과를 동결했다.
