# PlayerJumpNotify — result
status: done (공통 계산·일반 수신기 완료, 호스트 registry 연결 필요, 신규 소유 파일 동결)
files: source-migration/source-player-jump-notify.js, source-player-jump-notify.test.cjs, player-jump-notify-report.json, 이 결과 노트, 작업중-PlayerJumpNotify.md

tests: 전용38/38 통과. 전체 `node --test source-migration/*.test.cjs` 1,247/1,247 통과. 실제3-2·10-4 각각2..8인 오프라인/온라인28개 선택, 70단계 체인, 중복·합류 경로, pause/receiver gate, 4raw 경계, 기존 Contact/ActorMotion 연결을 검증했습니다. DLL 정적 분석만 수행했고 원작은 실행하지 않았습니다.

what it is: PlayerDefault의 머리 위 점프 전달과 Contact가 요구하는 Actor.NotifyJump를 같은 이벤트37 전달 계약으로 연결합니다. 일반 Player의 이벤트37 수신은 강제 점프 플래그가 아닌 generic Actor의 jump 요청 기록으로 이어지고, 실제 속도 반영은 후속 Actor Post jumpProc에서 일어납니다.

stage compiles alone: helper 단독으로 스테이지를 실행하지 않습니다. 실제 선택 데이터의 Player flags와 frozen Default compile을 검증했으며, 현재 native collision graph/Actor registry/event pool과 phase별 호출을 리드가 연결해야 합니다. `supportedTypes=[]`, `completePhysicsFidelity=false`입니다.

## 핵심 발견 및 주소

1. Player.notifyJumpUpward(0x1816c59a0)는 reversebit23이면 즉시 반환(0x1816c5a69). UP recursiveMax(mask=-1) 결과가 양수면 raw jumpVelo를 그 깊이로 signed idiv(0x1816c5a8d..5ab3)합니다. 직접 UP 목록의 각 대상에는 amount를 velocity와 increment 둘 다로 전달합니다(0x1816c5ae7/5c3b..56).
2. RecursiveMax(0x181695110)는 exact normal과 layer mask를 만족하는 ContactInfo의 최대 간선 깊이입니다. **64단계 제한이 없습니다.** 화면 경계의 별도 재귀 제한과 혼동하면 안 됩니다. 순환은 원작에서도 종료 근거가 없으므로 명시 거부합니다.
3. direct UP 목록은 GetContactCount(false,-1)의 새 목록입니다. lookup 가능한 Collision.id를 첫 등장 순서로 **목록 안에서만 중복 제거**(0x181694f17..59)합니다. 서로 다른 경로가 합쳐지면 같은 Actor에 다시 전달됩니다. 전역 visited로 제거하지 않습니다.
4. Actor.NotifyJump(0x1816a1e50)는 대상 Actor가 있으면 **source Actor**의 GetEventParam으로 sourceEntity를 채우고(0x1816a1f36, 0x18169dc43..4a), reset된 Velo.X=0에 Velo.Y를 기록하여 동기 NotifyEvent(0x1816a1f44/54)합니다. InUse는 NotifyEvent가 반환하기 전 해제(0x18169ec1e)됩니다.
5. 수신 후 현재 target.flags bit15를 검사(0x1816a1f59). 켜져 있으면 UP 자식에 `newSource=receiver`, `childV=parentV+increment`로 재귀(0x1816a20de..2116)합니다. increment는 그대로 유지하며 dt나 FP곱을 사용하지 않습니다. 수신기가 이벤트를 거절했더라도 bit15가 켜져 있으면 계속 전파됩니다.
6. **decimal37=0x25는 Player.OnRecvEvent_Default의 forced jump 분기(0x24/0x1b)가 아닙니다.** Default가0을 반환하고 wrapper(0x1816c112c..1139)가 generic Actor.OnRecvEvent로 보냅니다(0x1816c124f).
7. generic Actor 수신(0x18169e8d7..941)은 Actor bit19와 jumpEventType==0 또는37일 때 RequestJump합니다. handled 결과는 거절해도1입니다. 이 경로에는 pausebit4 검사가 없습니다. Player forceJumpXY/flags4·5, 현재 velocity/acceleration은 바꾸지 않습니다.
8. RequestJump(0x1816a21b0): 양쪽 절댓값<4raw이면 **기존 jumpX를 유지**하고 jumpY만 -334234(0x1816a2220). 어느 한쪽>=4이면 요청 XY 전체 교체(0x1816a222d). Actor bit19를 설정합니다.
9. 후속 jumpProc(0x18169e6c0)는 요청의 어느 성분>=4이면 실제 velocity 전체를 요청으로 교체하고 요청을0으로 만듭니다. collision0의 downface1(includeMap=true) 접촉이 없으면 **Frame.GetGravity**를 velocityY에 더하고, 접촉이 있거나 collision이 없으면 양수Y만0으로 합니다(0x18169e785..826). Acceleration과 bit19는 그대로입니다.

## 통합 계약

Mutable pipeline world는 `{actors,collisions,eventPoolFreeCount}`입니다. **eventPoolFreeCount는 실제 현재 빈 네이티브 이벤트 풀 슬롯 수**를 전달해야 합니다. 임의1을 넣으라는 뜻이 아닙니다. 각 동기 수신 동안1을 점유하고 반환 직후 돌려준 다음 재귀하므로 일반 비중첩 재귀는 한 슬롯을 재사용할 수 있습니다(0x181780b80/c03..49, 0x18169ec1e). 슬롯이 없거나 증거가 빠지면 throw합니다.

Actor는 `{entityId,flags,jumpEventType,jumpReceiver,jumpVelocityRaw,velocityRaw,accelerationRaw,player?}`이며, collision은 기존 Contact와 같은 `{id,entityId,layer,contacts:[{id,normal:{x,y}}]}`입니다. raw normal 형식도 지원합니다. contacts는 추정 AABB가 아닌 현재 native ContactInfo이며 map 접촉은 UP Actor 목록에 포함하지 않습니다.

- **Contact:** `SourcePlayerContact.onContact(world,event,JumpNotify.createContactHost(registryHost))`. Contact에서 이미 `targetDepth+1`로 나눈 amount가 오므로 이 어댑터는 다시 나누지 않습니다.
- **Default.applyImmediate:** `JumpNotify.applyDefaultAction(world,sourceActor,ownerCollision,action,registryHost)`. frozen Default가 만든 `{type:'notifyJumpUpward',eventId:37,velocityRaw}`를 즉시 처리하며 owner depth로 한 번 나눕니다. sourceActor.player는 현재 Default clone의 player와 같은 객체여야 하고 collision/actor도 현재 phase world에 연결되어 있어야 합니다.
- **수신기:** 증명된 일반 Player state1은 `jumpReceiver:'player-default'`, generic base Actor는 `'actor-base'`. 나머지는 `registryHost.dispatchEvent37(world,source,target,event)`가 **동기**로 정확한 component registry 수신기를 실행해야 합니다. 불명 장치를 actor-base로 간주하지 않습니다.
- **ActorMotion Post:** `jumpProc:(world,actor)=>JumpNotify.jumpProc(world,actor,{getCollision,isContacted,getGravity})`. 기존 Motion.post1의 warp-first 및 bit19 gate는 유지합니다. paused Actor의 Post 호출 여부는 외부 네이티브 phase 규칙이 결정합니다. 수신이 pause에 차단되지 않는다는 사실을 Post까지 무조건 호출하라는 뜻으로 확대하면 안 됩니다.

이벤트 객체는 호출 범위의 payload입니다. 반환 후 저장하거나 audit deliveries를 다시 실행하지 않습니다. custom receiver가 flags/contact를 바꾸면 현재 값으로 이어서 전파합니다. 원작 pool 포인터 aliasing/중첩 registry 이벤트 자원은 호스트가 관리해야 합니다.

unresolved: 일반 device-specific receiver registry, 실제 native pool 저장·포인터 identity, runtime/play wiring은 호스트 요구사항입니다. 다른 이벤트/다른 Player state/순환 그래프/불명 수신기/부족한 풀/raw는 거부합니다. 실패 전에 일부 mutable world가 바뀔 수 있으므로 호출 파이프라인 clone을 폐기해야 합니다. 원작이 callback으로 순환을 끊을 가능성까지 복원했다고 주장하지 않습니다. 일반 Boolean→Button 입력 변환은 수행하지 않았습니다.

기존 Contact/Default/Lifecycle/Motion 파일, 공용 runtime/play/HANDOFF/Git은 변경하지 않았습니다. 신규 다섯 소유 파일만 작성하고 동결합니다.
