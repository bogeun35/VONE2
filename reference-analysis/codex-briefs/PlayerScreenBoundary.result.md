# PlayerScreenBoundary — result
status: done (순수 계산 보조 모듈 완료, 신규 소유 파일 동결; runtime 호스트 연결 필요)
files: source-migration/source-player-screen-boundary.js, source-player-screen-boundary.test.cjs, player-screen-boundary-report.json, 이 결과 노트, 작업중-PlayerScreenBoundary.md

tests: 전용 30/30 통과, 전체 `node --test source-migration/*.test.cjs` 1,155/1,155 통과. 원작 실행 없이 DLL 정적 바이트와 실제 스테이지/기존 Camera helper로 검증. 네이티브 실행 대조는 하지 않았습니다.

what it is: PlayerDefault가 매 정상 Update 마지막에 요구하던 화면 끝 X 속도 보정입니다. 자신과 위쪽으로 연결된 layer1 액터의 이동 방향 기준점을 구한 뒤, 그 값에 vx를 더해 현재 카메라 경계를 넘는 경우 vx를0으로 반환합니다. 몸이나 귀의 크기, 콜라이더 폭을 경계 여백으로 쓰지 않습니다.

stage compiles alone: 실제 3-2·10-4 각각 2..8인 오프라인/온라인의 28개 선택을 기존 Camera.compile/create와 함께 검증했습니다. 두 스테이지 초기 화면은 raw `{x:0,y:0,width:55924032,height:31457280}`이며 기본 Player X 속도 ±196608은 초기 기준점들에서 유지됩니다. 스테이지 전체 실행이나 완전 물리 복원을 뜻하지 않습니다.

## 주소와 동작

- `calcScreenEndWalkVeloX` 0x1816c61b0. Player.cachedActorType ushort==19는 첫 분기(0x1816c6202..6207)에서 입력 vx를 그대로 돌려주며 Camera/Scene조차 조회하지 않습니다. 이 값은 Player.Initialize가 Actor.type에서 복사합니다(0x1816bd5d3/5d7). 실제 대상 Player.type27과 다릅니다.
- Frame.GetCamera→CalcCameraViewStageArea(0x1816c621b/622b). 화면은 기존 `SourceCameraNative.stageAreaRaw`를 그대로 재사용합니다. native의 양쪽 모서리 FP 변환 및 두 번 나눗셈 결과를 유지하며 이상적인 16:9 부동소수점 계산으로 바꾸지 않습니다.
- `getUpperPlayerEdgeX` 0x1816c6300. Actor.posX로 시작(0x1816c63b0). depth>=64이면 자기 기준점을 즉시 반환(0x1816c63b7..65d5)하여 그 노드의 자식은 보지 않습니다. depth64의 위치는 포함, depth65는 제외됩니다.
- Actor.GetCollision(0)→cached UP face0 목록(0x1816c6404/6415). 중력 반전 여부와 관계없이 UP입니다. 누락된 collision, layer!=1, 누락된 Actor를 건너뜁니다(0x1816c6489..64b1). 별도 Player 컴포넌트 검사는 없습니다.
- vx>=0은 자신·이웃·재귀 결과의 max(0x1816c64e4..6542), vx<0은 min(0x1816c6550..65a9)입니다. 순환 그래프도 native depth64 상한으로 처리합니다. 동일 쿼리의 불변 그래프에서는 Actor object identity/depth별 memo로 결과를 재사용합니다.
- predicted=edge+vx(0x1816c6279), 오른쪽=x+width(0x1816c62a1..62a6). 오른쪽 strict `>` 또는 왼쪽 strict `<`일 때 전체 vx가0(0x1816c62ae/62c9..62ef)입니다. 경계와 같으면 유지합니다. 남은 거리로 부분 클램프하지 않으며 dt를 곱하지 않습니다.
- 이 Player 함수에는 스크롤 모드 분기가 없습니다. 기존 helper가 확정한 정지0/일반1/자동2의 **현재 view**를 모두 지원하고 카메라 update는 따로 수행합니다. 이미 화면 밖이더라도 안쪽으로 움직이는 방향은 허용됩니다.

## 바로 연결할 호스트 시그니처

```js
const boundary = SourcePlayerScreenBoundary.createHost({
  getCamera: () => currentNativeCameraSnapshot,
  getScene: () => ({
    getCollision: (actor, index) => nativeCollision0, // index=0
    contactIds: (collision, face) => nativeOrderedUpIds, // face=0
    collisionById: id => nativeCollisionOrNull,
    actorByEntity: id => nativeActorOrNull
  }),
  getPlayerActorType: (player, actor) => actualCachedNativePlayerActorType
});
ctx.screenEndWalkVelocityX = boundary;
```

호출 결과는 frozen PlayerDefault가 요구하는 `(player,actor,vxRaw)=>vxRaw`입니다. 직접 API는 `screenEndWalkVelocityX(player,actor,vxRaw,{camera,scene})`이며 player에 `{playerActorType:uint16}`가 있어야 합니다. `evaluate`는 edge/predicted/left/right/blocked 근거도 반환합니다.

중요: PlayerDefault의 현재 컴파일 스냅샷에는 cached playerActorType이 없으므로 provider로 실제 값을 전달해야 합니다. Actor.actorType을 사용할 때는 Initialize 당시 저장된 값과 여전히 같다는 호스트 근거가 있어야 합니다. 화면 X나 렌더링 박스의 좌상단 대신 native Actor.xRaw를 사용합니다.

Camera와 Scene은 forceX 및 wind 적용 뒤, 즉시 반전/귀 이동 및 접촉 갱신까지 반영된 **현재 phase** 스냅샷이어야 합니다. callbacks는 한 쿼리 중 불변이며 동일 Actor는 안정된 object identity로 반환해야 합니다. Camera를 이 훅 안에서 update하거나 cached 접촉 대신 AABB 겹침/가짜 빈 목록을 만들면 안 됩니다. default endphase의 forceX+wind가 이 보정을 통해0이 되는 통합 테스트를 포함했습니다.

unresolved: 실제 runtime/play 연결, 정확한 Scene host 조회는 리드 영역입니다. 기존 Camera 미구현 unlimit/unreturn low flags1/2와 알 수 없는 모드는 명시 거부합니다. 안전 정수로 표현되지 않는 raw도 거부합니다. 일반 Boolean→Button 카운터 변환은 담당하지 않았습니다.

신규 다섯 소유 파일만 작성했습니다. frozen PlayerDefault/Camera, 공용 runtime/play/HANDOFF/Git과 원작 실행 파일은 변경·실행하지 않았습니다. 이 결과로 PlayerScreenBoundary 파일을 동결합니다.
