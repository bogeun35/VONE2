# UpDownLift 결과
status: partial — 네이티브 장치 코어 구현·검증 완료, 호스트 충돌·Actor·렌더 통합 대기
담당: 보조 세션3 (01a13559-c00c-7060-b3b1-0466fccc7349)

전용20/20 통과. 첫 전체run822/822 통과. 다른 세션의 파일이 추가된 최신 전체run은854개 중853통과/1실패이며, 실패는 source-topviewplayer-devices.test.cjs:18의 analog threshold 테스트입니다. actual velocity(0,0), expected(13107,0). 해당 파일은 소유 범위 밖이므로 수정하지 않았습니다. UpDownLift 전용은 최종 변경 후에도20/20입니다.

## 장치와 출하 데이터
5-4는 전 인원2..8 모두 UpDownLift1 하나, 위치(1414,312), slots0..2=(-140,0,1)입니다. creator ordinal40/delegate0x1817763b0, UpDownLiftComponent.Creator0x181732300이며 기존 WeightedLift 모듈이 처리하는 타입과 다릅니다. supportedTypes와 선점 파일을 확인한 뒤 작업중-UpDownLift.md를 원자적으로 생성했습니다.

높이는 slot0+actualPlayerCount×slot1이며 FP 곱 shift 없이 정수 count를 곱합니다 (0x181732588..5a3). 속도는 slot2 (0x1817325a7..5bb). 각각 abs(raw)>=4일 때만 override하며 음수값도 그대로 유지합니다. 초기 높이−70/속도1은 cctor0x181732b23/b39 및 Initialize0x181732484/49a에서 읽었습니다. 출하 높이−140은 사인 진폭이므로 actorcenter Y는172..452를 왕복하고 초기에는 위로 움직입니다. 선형 ping-pong이나 종점에서의 임의 wait가 아닙니다.

## 실제 생성과 초기 충돌
prefab GameObject2545는 Transform3259, EntityPrototype7377, EntityView7578, UpDownLiftView7531입니다. 자손2167에는 SortingGroup,2114에는 SpriteRenderer만 있습니다. serialized UpDownLift component가 없고 Quantum metadata에 instance .ctor도 없습니다. generic helper0x18020b640 → default factory0x180688c10 → RuntimeType.CreateInstanceDefaultCtor0x1814dc9b0 → zero-init boxed value112bytes 복사입니다. 타이머/flags/offset 초기0은 이 실제 경로의 값입니다.

충돌 rect는 height18,width118,x−59,y−9 (cctor0x181732b64..bcf). nominal sprite size120×20에서2픽셀 줄이고1픽셀 inset한 결과입니다. CreateCollision의 byte2는 pushBackTarget이며 Collision.initialize+3에 저장합니다. type0은 Actor.CreateCollision0x18169f586, layer5는 UpDownLift0x18173267a의+1 store입니다. flags bit2만 추가(0x181732687)하므로 module의 collisionFlagsSet=4는 OR mask입니다. 전체flags/priority/attribute는 Actor.setupCollision 및 호스트 metadata가 제공합니다.

## 시간·반전·막힘
OnUpdate0x1817326b0:
- 기본주기327680(5초), timer += (speed×dt)>>16. timer>interval이면 한 번만 interval을 뺍니다. equality는 유지하고 음수timer도 임의 modulo하지 않습니다.
- ratio=(timer<<16)/interval(0쪽절삭), ratio×2, radians=(ratio×205887)>>16. exact native FPSin0x1816465d0에 넣고 height를 곱합니다. full LUT411775개를 설치된 숫자 자산과 전부 대조했고 SHA256도 일치합니다. Math.sin 근사 없음.
- candidate delta=(0,targetOffsetY-currentOffsetY)를 IsEnableMoveContactActor0x1816a15c0에 넣습니다 (call0x181732943). 실패하면 flagbit0을 설정하고 offset/Actor.Pos는 바꾸지 않습니다.
- 다음 blocked tick은 oldTimer로 rollback합니다. limit가 abs<4이면 half=2.5, t=timer−(timer>half?half:0), limit=half−2t, 음수이면 interval+half를 더합니다 (0x181732761..7c5). unscaled delta로 pushTimer를 누적하다 limit 이상이면 timer에 limit를 더하고 push timers를 reset합니다. 이후 정상 speed advance를 수행합니다. 임의 즉시 방향 flip이나 고정wait로 바꾸지 않았습니다.
- 성공 시 offsetY를 기록하고 Actor.m_Pos(+0xb0)=m_InitPos(+0x80)+offset을 씁니다 (0x18173297d..9e2). MoveContactActor0x1816a0b70는 기본 옵션으로 호출합니다 (0x1817329f0). Up-face 탑승자를 재귀 수송하며 하강 중에도 face는 Up입니다.

## 호스트 통합 계약
`compile(actors,count)`는 옵션 없이 실제5-4 2..8인 성공합니다. `beforeStep`에는 native cached contactWorld가 필수이며, 기존 SourceMoveContact를 읽기만 하여 preflight/transport를 실행합니다. supportId/AABB 추정 접촉이나 fake callback으로 이동을 승인하지 않습니다. unknown actor callback 및 누락 cache는 specific error이며 상태를 원자적으로 유지합니다.

출력 contactWorld는 수송된 탑승자 및 sync 결과입니다. pendingActorPositions는 실제 native Actor.m_Pos 쓰기를 호스트에 전달하는 목록이며, native에 별도 NextPos 필드가 있다는 뜻이 아닙니다. root body 이동/충돌 sync/접촉 rebuild는 리드의 Actor/collision pipeline에서 올바른 순서로 적용해야 합니다. module은 MoveContact helper에 root 이동을 중복시키지 않습니다. shared Map/rect/inertia/pipeline을 수정하지 않았습니다.

UpDownLift는 자체 OnRecvEvent override, local pause 검사, outgoing event가 없습니다. common Actor lifecycle이53을 처리해 pausedLiftIds를 제공합니다. unresolved53은 거부하고 incomingevents는 actorEvents로 전달합니다. 렌더도 리드 담당이며 solids는118×18 collision box, displays는 actorcenter입니다. completePhysicsFidelity=false와 partial을 유지합니다. core compile/빈cache 진단 테스트를 실제 playable이라고 주장하지 않습니다.

## 정정 이력
첫 분석에서 prefab 자식 부재를 가정했으나 SortingGroup/SpriteRenderer 자손 두 개를 확인했고, 이들에도 serialized device가 없음을 검증했습니다. 음수timer의 절삭과 이어지는 산술shift 때문에 ±1092에서 offset은−191520/+191660으로 비대칭이므로 테스트 기대값을 native순서에 맞췄습니다. LUT zero는 JS −0 대신 native0으로 정규화했습니다.

첫 draft의 collision byte 명칭(type5/layer2)은 field-offset을 확인해 layer5/type0/pushBackTarget2로 수정했습니다. flags4는 전체값이 아닌 추가mask입니다. Actor의+0x80/+0xb0도 각각 InitPos/Pos로 확인해 초기 NextPos 표현을 수정했습니다. 최종 module/report/test가 같은 계약을 사용합니다.

## 파일과 재현
신규 고유 파일: source-migration/source-updownlift-devices.js, source-updownlift-devices.test.cjs, source-updownlift-math.js, updownlift-device-report.json, extract-updownlift-native-data.local.py, updownlift-prototype-evidence.json; codex-briefs/UpDownLift.result.md 및 작업중-UpDownLift.md.

extractor는 bundled Python3.12.14와 기존 cp312 UnityPy/TypeTreeGenerator를 -I -B로 사용합니다. 원작 파일을 정적으로 읽고 본인 fixture/math만 저장합니다. pip/공유 라이브러리/게임 실행 없음.
모든 명령 cwd는 C:\Users\user\projects\VONE2\reference-analysis:
- bundled Python3.12 `-I -B source-migration/extract-updownlift-native-data.local.py`
- `node --test source-migration/source-updownlift-devices.test.cjs`
- `node --test source-migration/*.test.cjs`

SearchLight/DistanceConstraint 동결, 기존 Lift/move-contact/공용 runtime/play/Git/배포 미변경. 다음 작업은 리드의 native contact cache adapter→Actor.Pos write→collision sync/pipeline/inertia/lifecycle/render 통합과 실제 원작 병행 검수입니다.
