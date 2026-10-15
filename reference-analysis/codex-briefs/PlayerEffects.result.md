# PlayerEffects — result
status: done (일반 Player 효과 core 완료, 호스트 연결 필요, 신규 소유 파일 동결)
files: source-migration/source-player-effects.js, source-player-effects.test.cjs, player-effects-report.json, 이 결과 노트, 작업중-PlayerEffects.md

tests: 전용25/25 통과, 전체 `node --test source-migration/*.test.cjs` 1,362/1,362 통과. 실제3-2·10-4의 2..8인 오프라인/온라인28개 선택과 frozen Default, Camera, Pool, Motion, Lifecycle 기존 core를 읽기 전용으로 대조·재사용했습니다. 원작은 실행하지 않았습니다.

what it is: frozen Default가 내보내는 accepted SetAnim/Look/PlaySe/NotifyEvent38·43을 실제 canonical Actor 필드와 동기 이벤트 풀에 연결하는 helper입니다. 오디오는 트랜잭션 큐에 기록하고 commit 이후 외부 표시·재생 대상으로 전달합니다. 장치 receiver를 임의 no-op으로 처리하지 않습니다.

stage compiles alone: 일반 state1 효과용 host 보조 모듈이며, 전체 stage 실행/완전 물리 복원을 뜻하지 않습니다. 실제3-2 점프 효과, 10-4 noinput Default 효과를 확인했고, 미확정 반전 호스트는 테스트에서 가짜 구현으로 대체하지 않았습니다. `supportedTypes=[]`, `completePhysicsFidelity=false`입니다.

## 필드 및 순서

- SetAnim0x1816beac0: 같은 ID/stop=false는 생략. current!=0·stop=false일 때 walk2는1/3에서만, push3은1/2에서만 허용하며 current0/stop=true는 게이트 우회(0x1816beb0a..5d). Player.currentAnimationId=요청ID(0x1816beb5d). **Player bit14**가 켜지면 Actor 요청ID1/2/4→10/12/11(0x1816beb7c..bb0). **Actor.requestAnimationId native+2**만 기록(0x1816bebca)하며 playing ID를 즉시 바꾸지 않습니다. 기존 ActorMotion.update1이 verified일 때 request를 소비합니다.
- LookLeft0x18169de75..9a / LookRight0x18169df25..4a: **Actor bit14**를 검사하고 **Actor bit10**을 set/clear합니다. Player bit14와 혼동하면 안 됩니다. gate=false이면 원작 함수 자체가 변경 없이 반환하며 추정 fallback 방향은 넣지 않습니다.
- Actor.PlaySe0x1816a2260: 현재 Actor anchor를 Camera.StageToWorld로 변환(0x1816a2306), CameraViewArea 네 방향에 **2FP raw131072**를 더한 범위와 비교(0x1816a2334..23aa)합니다. 경계 포함,1raw 벗어나면 cull. 상대 좌표=(ActorWorld-Camera.position), Actor.baseScale로 FP 나눈 뒤 signed64 `(value<<15)>>16` 절반(0x1816a23be..2433)입니다.
- FrameEvents.PlaySe0x18174bd50: **실제 Verified=true일 때만** event7을 생성(0x18174bda4..bdc5). EventPlaySe metadata로 Volume(+60), Pitch(+68), IsDisableCheckBlankTime(+70)를 확인했습니다. frozen effect의 **param9Raw=volume**, **startRaw=pitch**입니다. native jump는 SeId12·pitch1·volume1 또는.5(0x1816c6107..611d). 현재 Frame.Number/entity/FP position을 큐에 넣습니다.
- Landing NotifyEvent38(0x1816c37af/c0): source=self, 추가 payload 없음. 풀 소진으로 GetEventParam=null이면 genericNotifyEvent null0 경로입니다.
- Post outmap NotifyEvent43(0x1816c0eef..f0d): **CauseDead=1**(+6c)이며 source=self. 이 분기는 lease=null이면 예외로 가므로 generic null0으로 완화하지 않습니다.
- NotifyEvent는 기존8슬롯 Pool을 사용하고 동기 registry 반환 뒤 해제합니다. 예외 시 busy 상태가 유지됩니다. 43으로 life/requestedState가 바뀌는 실제 수신은 호스트 registry가 수행해야 합니다. 기존 Lifecycle.playerDeath 계획을 적용하는 연계 테스트를 포함했습니다.

## 리드 연결 시그니처

```js
host.applyPlayerEffect = SourcePlayerEffects.createHost({
  invokeOnRecvEvent: (world, targetActor, qEventParam) =>
    invokeExactNativeRegistry(world, targetActor, qEventParam) // sync int32
});
```

world에는 현재 `{camera,verified,frameNumber,pendingFrameEvents:[],eventPool}`가 필요합니다. eventPool은 native static lifetime에 공유하는 실제8슬롯 풀입니다. qEventParam은 Pool의 **PascalCase canonical payload**이므로 bridge의 alias/registry 계약과 연결하세요. 중첩 event를 별도 가짜 객체/무료 카운터로 대체하지 않습니다.

**SetAnim 중복 적용 주의:** frozen Default는 이미 Player.currentAnimationId와 flatActor.animationId를 최종 스냅샷에 기록합니다. `applyPlayerEffect`는 accepted record의 actorAnimationId를 canonical **requestAnimationId**로 이어주기만 합니다. 과거 effect ID로 최종 Player.currentAnimationId를 덮거나 SetAnim 게이트를 다시 실행하지 않습니다. 별도 `nativeSetAnim`은 native 호출 직전 스냅샷용 검증 primitive이며 accepted-history 재생용이 아닙니다.

효과 배열 순서를 보존하세요. SetPosForce/MoveContactActor/notifyJumpUpward는 기존 immediate host에서 이미 실행된 항목이므로 이 helper로 다시 실행하지 않습니다. 물리 속도·가속도는 SetAnim/Look/PlaySe가 변경하지 않습니다. physicalaudio는 pendingFrameEvents를 트랜잭션 commit한 뒤 재생하며 callback 중 직접 오디오/네트워크를 내보내지 않습니다.

## 한계와 거부

지원 범위는 native cached PlayerActorType27인 일반 Actor27/state1입니다. 다른 state/unknown effect/immediate effect, 모르는 카메라 분기, 누락한 Verified/Frame.Number/receiver는 거부합니다. Player38의 다른 cached type24/MultiInput 경로와 장치별 receiver는 호스트 요구사항입니다.

frozen Default는 effect를 즉시 스트리밍하지 않고 final snapshot+accepted history로 반환합니다. 이 helper는 과거 Player animation/state를 rewind하지 않습니다. **중간 상태를 관찰하는 custom receiver까지 정확히 지원하려면 실제 interleaved native phase host가 필요합니다.** 일반 Player27의 38 경로와 마지막 Post43 범위를 넘어 이 한계를 숨기지 않습니다.

기존 bridge/default/pool/contact/lifecycle/Motion/play/runtime/Git은 수정하지 않았고, 신규 다섯 소유 파일만 작성·동결했습니다.
