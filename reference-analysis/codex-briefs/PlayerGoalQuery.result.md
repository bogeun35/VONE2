# PlayerGoalQuery — result
status: done (검증된 read-only Goal overlap host hook)
files: source-migration/source-player-goal-query.js; source-migration/source-player-goal-query.test.cjs; source-migration/player-goal-query-report.json; codex-briefs/PlayerGoalQuery.result.md; codex-briefs/작업중-PlayerGoalQuery.md
tests: 전용18/18; 최종 전체1330/1330, 실패0 (동시 작업 포함 실행 시점)
what it is: frozen PlayerDefault의 bit22 및 동시 Press8+Press4 경로가 읽는 열린 Goal overlap을 원작과 같은 조회 순서로 제공하는 순수 host helper입니다. 기존 Goal/contact/Rect/Scene core를 변경하거나 Goal 동작을 복제하지 않았습니다.
stage compiles alone: no. actual manager/component/Actor/collision snapshots를 조회하는 helper이며 runtime 연결·전체 라운드 개방은 리드 담당.

## 가장 중요한 정정: Goal들을 순회하지 않음
Player.checkReverse0x1816c40a2..41bd는 Frame.GetGoal0x181748590을 한 번 호출합니다. 이 함수는 ActorManager.m_Goal(raw+0x48; metadata field offset88-16)을 읽어 Frame.GetComponent<GoalComponent>에 전달합니다. slot0x1831d0948/token0xc002f0bf/MethodSpec96351과 method generic typeGoalComponent를 실제 metadata에서 대조했습니다.

Goal.Creator0x18185f728가 각 완성된 Goal Actor EntityRef로 manager의 단일 field를 덮어씁니다. 복수Goal에서는 마지막으로 완료된 Creator의 참조가 선택됩니다. closed/먼 Goal이 선택되어 있어도 앞의 열린 Goal을 찾지 않으며, 선택 ref가 사라져도 다른 Goal로 fallback하지 않습니다. authored order나 typed entity-query 순서를 임의로 적용하지 않습니다. 이 경로에는 Goal typed query iterator 자체가 없습니다.

## 정확한 조회/겹침 계약
1. 실제 managerGoalRef → GoalComponent lookup. None/없는 component면false.
2. Goal.flags(raw0 ushort)의 bit0이 꺼져 있으면false. 별도 state enum/default open bool을 만들지 않음.
3. GoalComponent에 저장된 m_EntityRef(raw8)로 Actor lookup. manager lookup key로 대신하지 않음. Actor가 없으면false.
4. Actor.GetCollision(index0),0x1816a0200. 실제 holder 배열이 비면false, index0의 collision lookup이 null이면false. 두 번째 collider/다른 Goal을 탐색하지 않음.
5. Collision.IsCollided0x181691ef0을 current position/zero offsets/ignoreInactive=false로 수행. 동일 collision EntityRef 또는 어느 쪽이든 inactivebit0이면false. layer matrix, static flag, Actor active/visible flag는 추가 filter가 아님.
6. 실제 baseRectRaw/current scaleRaw/pivotRaw로 기존 Rect.getRect를 호출하고 Collision position을 사용한 기존 Scene.isCollided로 비교. stale rectRaw, pre-position/scale, authored Actor position으로 대체하지 않음.

네 endpoint 비교0x18169223e/24b/258/265는 모두JGE로 reject하므로 경계만 닿으면false,1raw 침투는true입니다. interior zero-size rect는 원작 strict 비교 결과를 보존하며 별도 area>0 조건을 추가하지 않습니다. 실제 Goal rectangle0만 검증했고 active Goal circle/negative scaled rectangle은 거부합니다. Player shape0/1과 Goal0은 같은 native GetRect fallback 경로입니다.

## 재사용 및 실제 데이터
- source-goal-contact.onCollided로 Goal이 열리는 테스트에서 기존 flags bit0 변화를 그대로 읽었습니다. Query가 sound/flags/Player 상태를 바꾸지 않습니다.
- source-collision-rect.getRect와 source-collision-scene.isCollided 재사용. 기존 physics의 임의 AABB 대체물을 만들지 않음.
- source-native-collision-factory.createGoal의 baseH32/W48/X-24/Y-32, extension height 및 layer12/holder 순서를 그대로 사용했습니다.
- source-player-collision-init으로 실제3-2/10-4의2..8 Player collider shape를 생성하여 Goal query와 연결했습니다.
- 실제 offline/online2..8 총28개 선택마다 Goal은1개, slot0 offset0. Goal anchor는3-2(2880,192),10-4(3120,444). 이 데이터로 factory collider를 배치한 열림/닫힘 및40px 접촉/1raw 침투 경계를 검사했습니다. 전체 runtime pose history 재현이나 gameplay 검증 주장은 아닙니다.

## 새 host 연결 계약
```js
const goalQuery = SourcePlayerGoalQuery.createHost({
  getManagerGoalRef: () => liveActorManager.goalEntityId,
  goalByEntity: ref => actualGoalComponentOrNull(ref),
  actorByEntity: ref => actualActorOrNull(ref),
  collisionById: id => actualCollisionOrNull(id)
});
const defaultHost = {...otherDefaultHooks, ...goalQuery};
```

getManagerGoalRef는 실제 manager field를 공급해야 하며 stage의 첫/마지막 Goal을 추측하는 코드로 만들지 마세요. Goal snapshot={flags:실제ushort,entityId:Goal.m_EntityRef}; Actor snapshot은 native 순서 collisionHolders:[{collisionId,...}]를 포함해야 합니다. collisions는 entityId/flags/collisionType/xRaw/yRaw/baseRectRaw/scaleRaw/pivotRaw 필수입니다. 기존 collisionById core/Queries hook을 읽기 전용으로 연결할 수 있습니다.

openGoalOverlap(player,actor,playerCollision)는 frozen PlayerDefault signature입니다. player/actor argument의 위치를 사용하지 않고 전달된 실제 Player collision과 조회된 Goal collision을 검사합니다. 소비자 PlayerDefault가 이미 bit22와 Press8/Press4를 검사하므로 query 내부에 버튼 상태를 다시 만들지 않습니다. native input producer와 기존 contact adapter를 함께 사용한 Default.step integration test로 이 호출 gate를 확인했습니다.

모든 lookup 함수는 명시 snapshot 또는null을 반환해야 합니다. undefined/missing flags/holder order/geometry는 의존성 오류로 throw. EntityRef key는 canonical string 또는safe integer를 지원하고 coercion하지 않습니다. JSON 복원 후 live provider를 다시 bind하면 되며 adapter closure 자체는 serialize하지 않습니다. Browser global=SourcePlayerGoalQuery.

## 검증과 미해결
전용18개: Goalbit/조회순서, 없음/누락,복수Goal 선택, component EntityRef와 lookup key 구분, collision0만 검사,4방향 접촉/1raw penetration, same entity/inactive, scale/pivot/current position,zero-size native결과,미검증shape 거부,기존Goal opening/factory/native Player shape,JSON/read-only,Default press gate,UMD.

원본 DLL bytes로 GetGoal/GetCollision/IsCollided call targets, manager ref load/store, openbit test,4개 strict boundaryJGE를 독립 대조했습니다. 원작 게임 실행 없음.

unresolved: 실제 manager lifecycle 참조/Goalflags/native lookup은 host 필수. 복수Goal의 실제 생성순서를 authored 배열로 대체하지 않음. Goal circle/negative rectangle 미검증 branch 거부. Goal open/OnCollided/Actor lifecycle/Player reverse mutation 및 shared runtime 등록은 기존 모듈/리드 소유. 기존 GoalContact/Scene/Rect/Lifecycle/Default/Queries/runtime/play/공통문서/Git은 수정하지 않았습니다.
