# ColorBox — result
status: partial
files: source-migration/source-colorbox-devices.js, source-migration/source-colorbox-devices.test.cjs, source-migration/colorbox-device-report.json
tests: 전용30 passing; 전체782 passing / 0 failing. 실제4개 스테이지 × 2..8인 × 온/오프라인56선택 검증.
what it is: 지정 플레이어가 접촉한 상자 줄을 밀 수 있는 ColorBox입니다. 해당 플레이어 인덱스를 실제 Frame 목록으로 결정하며 점프 옵션, 외부 힘, 포획·해제 이벤트까지 순수 helper로 복원했습니다.
stage compiles alone: no. st_w_02_04, st_w_03_04, st_w_12_02, st_w_15_02의 ColorBox 데이터는 explicit native bridge에서 컴파일하지만 전체 장치·Actor 물리·scene 연결이 필요합니다.

key findings:
- Parse0x181802e80: width/height 각각4를 뺀 rect입니다. height,width,X,Y 순서이며 X=-trunc(width/2),Y=-height. slot2는 현재 플레이어 목록의 ordinal modulo, slot3은 비음수 제외 ordinal, slot4점프, slots5/6 모자 위치, slot7 양수 모자 배율(default1). Frame.GetPlayerIndexList0x181749240 및 GetPlayerColorIndex0x1817465c0의 playerRef=index+1 매핑을 요구합니다.
- cctor0x1818040ff MARGIN4; Initialize0x181802e60 hatScale1. actor flags15/16, weight100(0x18180325f/266,0x181803392). 충돌 attribute2, layer2/점프5, pushBackTarget3, syncPos true(0x181803280). OnStart y-=0.75(0x18180340a).
- recursivePush0x1818038d0는 표시 색상이 아니라 playerIndex를 비교합니다. 접촉된 actor에 대해 같은 ColorBox component로 재귀 호출합니다. 방향0/2 velocity>65raw, 방향1/3 velocity<65raw라는 비대칭 경계를 그대로 보존했습니다. 좌측 판정이 우선입니다.
- update0x181803430: jumpInput8, 최초 jumpVelo/count1/sound12, held count1..13에서 FP((1-count/14)*13107) 추가. 위 접촉은 점프 허용과 forceX를 제한하며 ground는 count1+negativevy만 유지합니다. airborne gravity, forceY1회, forceX 지속/groundclear를 보존했습니다.
- event0x181803da0:30 playerIndex+1 반환,16 caught(flag1)+속도0/return1,27 force,36/37 기존vx 방향 forceX,65 hide+pause,66 unpause+warpPos+velo/actorflag17. 나머지는 공통 Actor 이벤트로 넘깁니다.

통합 계약:
compile options에 nativeActorBridge:true, framePlayerIndexList 및 gamePlayerInfo:[{playerRef,colorIndex}]를 공급합니다. 생성된 id는 native entity 바인딩 키이며 unnamed colorbox:N을 실제 actor에 매핑해야 합니다. collisionDescriptors와 initialPositionRaw를 native 생명주기에 연결합니다.
update(box,actor,ctx)는 위치를 적분하지 않고 native velocity snapshot과 sound를 반환합니다. ctx는 collision0/ordered contactIDs/collisionById/actor/player/playerByIndex/IsContacted/press/on/GetJumpVelo/GetGravity를 제공해야 합니다. 원래 native 순서와 캐시를 유지합니다.
onEvent는 동기적으로 호출하고 반환된 pause/visible/Actor delegate를 즉시 실행해야 합니다. query returnValue도 전달합니다. beforeStep은 eligible actor snapshot/publish용이며 Actor action을 지연할 event65/66/unknown은 명시적으로 거부합니다. pause와 lifecycle을 순수 helper 효과 목록으로 대체하지 않습니다.

unresolved: 공유 runtime registration과 실제 Actor/scene/input/gravity 연결은 미완료입니다. cyclic same-face graph는 native 무한 재귀 대신 명시적으로 거부합니다. safe integer 범위 밖 raw도 거부합니다. DummyColorBox/ForceColorBox는 미지원입니다. 조사한 ColorBox 분기에 미확정 상수는 없습니다.

다음 작업: 리드가 실제 Actor.Create/OnStart와 shared Collision pipeline에 descriptor를 등록하고 ordered phase에서 update/onEvent를 연결합니다. 위치는 공유 Actor 적분/동기화에 맡기고 callback/visibility/pause/warp/query를 연결해야 합니다. 추가 분석 주소: python -I tools/disasm.py 0x181802c40 0x181803430 0x1818038d0 0x181803ca0 0x181803da0. 이전 Gear/Broadphase와 공용 파일/Git/play/배포를 수정하지 않았습니다.
