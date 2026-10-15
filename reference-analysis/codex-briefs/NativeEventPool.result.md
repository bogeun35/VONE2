# NativeEventPool — result
status: done (정적 풀 core 완료, 호스트 연결 필요, 신규 소유 파일 동결)
files: source-migration/source-native-event-pool.js, source-native-event-pool.test.cjs, native-event-pool-report.json, 이 결과 노트, 작업중-NativeEventPool.md

tests: 전용21/21 통과. 전체 `node --test source-migration/*.test.cjs` 1,291/1,291 통과. DLL 정적 바이트만 분석했으며 원작 실행/네이티브 대조 실행은 하지 않았습니다.

what it is: 원작 QEventParamManager의 실제 **8슬롯** 정적 풀과 Actor.GetEventParam/NotifyEvent 수명주기를 복원했습니다. 이제 빈 슬롯 수를 임의1로 가정하지 않고 실제 8개 InUse에서 계산할 수 있습니다. 기존 JumpNotify/lifecycle/bridge에는 아직 연결하지 않았습니다.

stage compiles alone: stage renderer나 물리 모듈이 아닌 공통 이벤트 자원 helper입니다. singleton lifetime의 하나의 풀을 호스트가 모든 관련 이벤트 전달에 공유해야 합니다. `supportedTypes=[]`, `completePhysicsFidelity=false`입니다.

## ScreenBoundary 좁은 감사 항목 (먼저 재확인 완료)

기존 PlayerScreenBoundary API와 파일을 바꾸지 않습니다. header의 missing collision skip은 **접촉 목록에서 조회하는 이웃 collision**을 뜻합니다(0x1816c6489/648c→65ad). 반면 depth<64 현재 Actor의 primary collision0는 GetCollision(0x1816c6404) 결과를 null 검사 없이 GetContactCollisionList로 넘깁니다(0x1816c6412/6415). callee wrapper0x181691b80→0x181691880에서 native collision의 +8을 직접 읽습니다(0x1816919a5). 따라서 current collision0 누락은 skip 근거가 없으며 기존 helper의 throw가 맞습니다. depth>=64일 때만 lookup 전 자신의 X를 반환합니다. 설명의 대상이 다르며 동작 완화가 필요하지 않습니다.

## 네이티브 풀 근거

- cctor0x1817808b2의 `mov edx,8` 뒤 배열 할당0x180319260, s_EventParams staticref 저장0x1817808d1. 배열길이를 순회하며 QEventParam 인스턴스를 각 슬롯에 저장0x181780977..a23. ctor0x180476130은 bare ret이고 managed allocation의 초기 필드는0입니다.
- Initialize0x181780ac0는 **InUse만false**(0x181780b58). payload 초기화/객체 교체가 아닙니다.
- QEventParam.Reset0x181780810은 모든 payload를0으로 만들지만 **InUse는 건드리지 않습니다**. Manager.Get은 이 reset을 inline한 뒤 InUse=true를 설정합니다(0x181780bdc..c49).
- Get은 index0부터 첫 free를 찾고 동일 객체를 돌려줍니다. 여덟 슬롯 모두 busy면 null(0x181780c52). 확장·대기열·추가 할당은 없습니다.
- Return0x181780c70은 null이면 no-op, 그 외 InUse만false(0x181780c75). payload는 남고 pool membership 검사도 없습니다.
- Actor.GetEventParam0x18169dc37..4a는 Manager.Get 후 EventType과 **source Actor.entityRef**를 NotifiedActor에 기록합니다. full이면 진단 로그 후 null 반환(0x18169dc59..7e).
- Actor.NotifyEvent는 registry Invoke가 **동기 반환한 뒤에만** InUse를 해제(0x18169ec02..22). 수신기 예외에서는 이 명령에 도달하지 않으므로 **finally 해제가 아닙니다**. null event는 진단 후0(0x18169ec34..57), null target은 Invoke에서0(0x18177b7ec..802) 후 nonnull event를 해제합니다.

## 검증된 수명주기

중첩 callback은 부모 이벤트를 busy로 유지하므로 자식이 다음 free 슬롯을 사용합니다. 깊이8까지 동시에 점유하고9번째 Get은 null입니다. 반면 NotifyJump처럼 수신 완료 뒤 재귀하는 흐름은 부모 슬롯을 이미 해제했으므로 index0을 순차 재사용할 수 있습니다. 중첩 여부 없이 단순히 “재귀니까 한 슬롯”이라고 가정하면 안 됩니다.

반환한 event 참조를 보관하면 다음 Get이 같은 객체의 EventType/NotifiedActor 등을 바꾸므로 이전 참조에서도 새 값이 보입니다. 테스트는 객체 identity 및 이 alias까지 확인합니다. callback 예외 후 busy 유지, Initialize의 payload 보존, Reset의 InUse 보존도 검증했습니다.

## 호스트 API

```js
const pool = SourceNativeEventPool.create(); // static manager당 한 번:8슬롯
const event = SourceNativeEventPool.getEventParam(pool, sourceActor, eventType);
// null이면 원작과 같은 소진 분기: 무제한 할당으로 대체하지 않음
if (event !== null) {
  event.Velo.yRaw = nativeAmountRaw;
  const result = SourceNativeEventPool.notifyEvent(targetActor, event,
    (target, param) => invokeExactNativeReceiverRegistry(target, param));
}
const actualFreeCount = SourceNativeEventPool.freeCount(pool);
```

payload는 원작 `QEventParam`의 PascalCase 필드(EventType, InUse, NotifiedActor, Position, Velo, …)를 보존합니다. bridge에서 sourceId/velocityRaw 등으로 번역할 때 수명주기와 객체 참조를 유지해야 합니다. reset의 NotifiedActor=0은 zero EntityRef이며 실제 source.entityId는 host의 검증된 opaque 참조입니다.

`initialize(pool)`은 명시적으로 모든 InUse만 해제합니다. `.text`와 `il2cpp`를 스캔했지만 Initialize로 가는 직접 E8 호출은 발견하지 못했으며 자동 호출 시점은 확정하지 않았습니다. 따라서 매 프레임/매 액터마다 initialize하거나 callback 도중 강제로 풀을 비우면 안 됩니다.

**기존 JumpNotify 연결 주의:** 기존 `world.eventPoolFreeCount`는 풀 객체가 아니라 가용량 미러입니다. 실제 올바른 phase에서 freeCount(pool)를 기준으로 하고 GetEventParam/NotifyEvent의 실제 점유 경로를 호스트가 연결해야 합니다. 미러 카운터 감소와 actual pool 할당을 중복 계산하지 마세요. frozen JumpNotify의 실패 경로 synthetic counter finally 복구는 네이티브 실제 슬롯 해제 동작을 뜻하지 않습니다. 실패한 pipeline clone은 폐기하고 실제 pool busy 상태 규칙을 적용해야 합니다. 기존 코드는 이 작업에서 수정하지 않았습니다.

unresolved: runtime/bridge/registry 연결 및 Initialize 자동 호출 시점은 호스트 요구사항입니다. 진단 로그 자체는 재현하지 않았고 반환/소진/lease 상태를 복원했습니다. native inline struct의 내부 포인터 alias까지 제공하는 메모리 에뮬레이터는 아닙니다. callback은 int32를 동기 반환해야 하며 Promise/불명 반환은 해제 전 거부합니다.

신규 다섯 소유 파일만 작성했습니다. ScreenBoundary는 이 노트의 감사 설명과 읽기 전용 테스트만 추가했으며 기존 API/파일을 변경하지 않았습니다. 기존 lifecycle/bridge/jump/runtime/play/Git과 원작 실행 파일은 변경·실행하지 않았습니다. 신규 NativeEventPool 소유 파일을 동결합니다.
