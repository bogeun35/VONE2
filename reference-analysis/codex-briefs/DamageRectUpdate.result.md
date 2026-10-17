# DamageRectUpdate — result
status: done / 동결
files: source-migration/source-damage-rect-update.js/.test.cjs, damage-rect-update-report.json; 이 result 및 작업중 claim.
tests: 전용36/36; 전체2199/2199 통과(동시 보조 파일 포함). 원작 실행 없음.

what it is: DamageRect9의 실제 OnUpdate/checkDamage와 OnRecvEvent4를 독립 callback helper로 복원했다. 기존 충돌 저장소/query/owner 제어/8-slot event pool/카메라/Player death plan을 재사용한다. 충돌 캐시는 입력으로 받고 새 AABB, 렌더 좌표 판정, cooldown을 만들지 않는다.
stage compiles alone: 아니오. creator/OnStart/Frame scheduling 및 전체 stage 연결은 lead 소유다. 실제3-2 원본 파라미터+명시 allocator/cache/PlayerList fixture이며 원작 stage boot/충돌 녹화 결과가 아니다.

## 주요 주소와 동작

- OnUpdate0x18180e190: Actor hidden bit3 @e208이 활성화 시도만 막는다. pause bit4는 바깥 Lifecycle의 gate다. primary collision이 inactive bit0이면 기존 PushBackTargetQuery(mask3) @e291을 호출하고 막히지 않았을 때 self-owner SetCollisionActive @e2e1을 시도한다. owner mismatch로 거절돼도 진행한다. 마지막에는 항상 checkDamage @e31c를 실행한다. missing collision0은 checkDamage @e526에서 실제 null dereference 경계이므로 명시 오류다.
- checkDamage0x18180e330 첫 순회: DamageRect collision0 접촉 count를 capture @e555하고 각 live record/bounds를 읽는다. 현재 GetCollisionById @e611이 성공하고 target collisionType1 @e61e이면 event43을 보낸다. Player 존재/dead/life/활성/layer/normal/geometry gate가 없다. 같은 EntityRef의 collider가 여러 개면 각각 보낸다. Notify @e65a가 동기 반환한 뒤 target collider.EntityRef를 다시 읽어 공유 목록에 append @e66f/e676한다.
- 두 번째 순회: 첫 순회 후 실제 ActorScene.PlayerList raw+30 @e738을 가져와 count capture @e775. 공유 첫순회 목록의 EntityRef는 제외한다. Player없음→Player.flags bit9 @e952→Actor없음→collision0없음 순으로 제외하고 Player 접촉 캐시를 순서대로 읽는다. target collider.EntityRef가 DamageRect.component.EntityRef와 같으면 @eaa0, 첫 일치에서43 @eae3 한 번. target type/active/layer/normal은 검사하지 않는다. DamageRect의 secondary collider도 같은 EntityRef면 일치한다. 역방향으로 보낸 ref는 제외 목록에 추가하지 않으므로 중복 PlayerList entry는 각각 통지한다.
- 캐시를 갱신하지 않는다. typed Actor.Update 단계의 기존 committed cache이며 그 뒤 현재 프레임 Collision.Update가 온다. 같은 캐시이면 다음 프레임에도 다시 통지하고, Player receiver가 life0/immortal 여부 등을 처리한다.

## 재진입·이벤트 계약

- QUtility.get_EntityList0x1817871c0은 static 공유 List의 version++/size0 @181787225/228이다. checkDamage 종료에서도 version++/size0 @18180eb01/eb05. append는 List.Add version++ @18000afd4. 지역 Set으로 바꾸면 안 된다.
- world.entityListScratch={items:실제 logical EntityRef[],version:uint32}를 명시 전달하며 모든 DamageRect 및 동기 재진입이 같은 객체를 공유해야 한다. 내부 receiver가 다른 DamageRect의 checkDamage를 실행하면 바깥 제외 목록도 clear된다. 바깥 Notify 반환 후 append가 진행돼 앞서 통지했던 Player가 역방향 순회에서 재통지될 수 있다. 이 동작과 nested event lease slot0→slot1을 검증했다.
- 기존 NativeEventPool.GetEventParam(sourceActor,43): EventType43, NotifiedActor=source Actor.entityId, reset CauseDead0/나머지 기본값이다. 강제 사망 payload를 만들지 않는다. Frame.NotifyEvent0x18174a110는 실제 target Actor generation lookup→동기 receiver→같은 leased object 반환 순서다. target Actor가 없어도 lease를 반환한다.
- pool 고갈 시 native Frame.NotifyEvent(null)는 진단 후0반환이며 첫 순회의 ref append는 그대로 진행한다. nullEventDiagnostic host가 필요하다. receiver 예외는 native처럼 lease InUse와 현재 scratch를 남기고 final clear에 도달하지 않는다. in-place API와 world transaction API를 구별했다.
- planPlayerEvent43는 기존 Lifecycle.playerDeath CauseDead0 plan만 재사용한다. life<=0/flags bit8 immortal 무시, CauseDead0에는 invincible timer gate 없음. SharedHP/patch/중첩 통지/audio/shake를 실제 순서로 적용하는 receiver host가 필수이며 helper가 일부 effect만 실행하지 않는다.

## receiver와 API

- OnRecvEvent0x18180ebf0: event4는 Camera.CalcCameraViewStageArea @ec98를 읽고 Actor.PosX + component.Rect.X + component.Rect.Width >= Camera stage area.X @ecc2..ecdb를 반환한다. 카메라 LEFT edge다. equality 포함, collision scale/Actor Y/visibility를 적용하지 않는다. 그 외 event는 base Actor.OnRecvEvent @ec61 host로 그대로 전달한다.
- onUpdate(world,actualActor9,host), checkDamage(...), receive(world,actualActor9,nativeQEventParam,host)는 in-place/native 동기 callback이다.
- createHost({actorByEntity,playerByEntity,invokeOnRecvEvent,nullEventDiagnostic,commonActorReceive,getWorld?,cameraStageArea?})는 기존 Broadphase 실제 storage+overlay lookup, PushBackTargetQuery, Motion.setCollisionActive, Camera.stageAreaRaw를 연결한다. Actor/Player lookup은 독립 typed generation 검증이 필수다. ScenePlayerRefs를 actors.filter로 만들어 넣지 않는다.
- update(inputWorld,entityRef,hostOptions)는 전체 JSON draft transaction으로 성공 때만 {world,trace}를 반환한다. static scratch/pool과 외부 host effect도 caller transaction에 포함해야 한다. trace의 notify43은 이미 동기 실행한 기록이며 재전송 queue가 아니다.

## 실제 fixture 및 한계

- 3-2 authored 배열의 DamageRect는8개이며 population2에서1/2/3/4/6/7 총6개,3~4명에서1/2/3/4,5~6명에서1/3/4/5,7~8명에서8/3/4/5를 선택한다. offline/online2..8 모두 원본 selector/slots/좌표/rect를 사용했다. width 대부분3145728, DamageRect4는17301504; DamageRect1 anchor(141557760,32768000). 각 device의 캐시 event source/payload를 확인했다.
- 기존 LinePath activation helper의 actorPaused 인자명은 실제 hidden bit3 검사와 구별해야 한다. 기존 flat damageContactEvents는 이미 resolve한 불변 목록의 간단한 계산이며 공유 List 재진입/라이브 QList 변경을 표현하지 않는다. 기존 파일은 수정하지 않았다.
- Native EntityList managed backing-array capacity/growth/OOM/heap은 구현하지 않았다. items는 logical projection이고 captured QList header에 대응하는 배열 identity를 유지하며 내용을 live 변경한다. 실제 pool/Actor/Player/cache 초기 snapshot은 host state다.
- 일반 Player receiver 전체·비Player type1 receiver·base Actor receiver의 실제 effect 적용, stage/runtime 연결 및 충돌 cache 생성은 외부 경계다. 기존 LinePath decoder/CollisionFactory/bridge/factory/runtime/공용문서/Git/배포 변경 없음.
