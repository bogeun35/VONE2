# BallKeyBox 결과
상태: partial — 실제10-3 장치 코어 검증 완료, BoundBall/Key/물리·장면 통합 대기. 리드 검토용 동결.
담당: 보조 세션3
전용 21/21, 전체 1437/1437 통과 (2026-10-15).

기존구현/선점없음을재확인하고원자적으로선점했습니다. BallKeyBox ordinal62/creator0x1816b0cf0/delegate0x181776fa7입니다. 실제10-3전2~8인은하나씩이며위치X144,Y671(2~4인)/719(5~8인),slot0=0입니다. 슬롯0은내구도가아니라실제플레이어수에곱해factoryInitPosX에더하는FP오프셋입니다. y는그대로이며damageCount는사용되지않습니다.

프리팹1867과자손1114/1414는EntityPrototype/EntityView/BallKeyBoxView및view구성만있고serializedBallKeyBoxcomponent는없습니다. noinstancector/genericdefault24bytecopy근거로componentdamageCount/flags/isDisappear/time초기0을확정했습니다. 기존동결추출기를읽기만하여임시메모리에서본인프리팹만조회했고다른파일은쓰지않았습니다.

## 초기화·이동
body는index0/type0/layer5/pushBackTarget3/syncPos이며rect44×56(-22,-56)입니다. trigger는index1/type0/layer5/pushBackTarget0/syncPos,rect8×10(-4,-60)입니다. 실제collisionID/fullflags/baseScale적용·등록은공통host이며module의colliders는정의계획입니다. solids[]로단순AABB물리를대체하지않았습니다.

사라지지않을때collision0의exactDown(0,+1)actor/mapcached접촉이있으면VeloY를0으로만듭니다(음수여도0). 없으면Frame.Gravity raw를더하고dt는곱하지않습니다. 실제Actorposition/velocity/baseScale/flags/EntityRef와cache가없으면거부합니다. Actor.Update2가반환actorChanges를native순서로적용해야합니다.

## 공 충돌과 키 생성
OnCollided는자기collision의index(+4)가0이면무시합니다. componentisDisappear(+4)검사가아니며,trigger1에서상대Actor와abs(X차이)<=5×m_BaseScale이면진행합니다. 별도상대ActorType/layerfilter나Y거리조건은없습니다.

상대Actor에event39(Position=현재boxPos)를동기로보내고int32반환값이0이면아무것도깨지지않습니다. nonzero이면boxVelo0 → boxPosY−26×baseScale위치에KeyComponent.Creator0x18186b5c0 → Actor.m_RequestAnimationId2/componentisDisappear1/time10922순서입니다. byte+2를proc나collisiontype으로부르지않도록최종이름을정리했습니다.

관련BoundBall의실제receiver39도읽었습니다. 공X를eventX로맞추고Y는유지하며Velo=(0,3),아직사라지는상태가아니면inactive를호출하고항상1을반환합니다. 이receiver와BoundBallPitcher는별도소유의존성이므로구현하지않았습니다. hostdispatcher는실제receiver를실행해야하며단순returntrue로라운드를열면안됩니다.

KeyCreator는host가실제entity/ActorScene/ActorManager.m_Key등록과generation을처리해야합니다. 반환events/keyPositions는감사목록이므로다시dispatch하거나키를두번만들면안됩니다. event39sender는module의sourcejoinID가아니라제공된실제Actor.entityId입니다.

## 소멸·오류 처리
DISAPPEAR_TIME은native문자열0.1666666666666667→raw10922입니다. 1092raw에서10틱후2raw가남고11틱후−1090으로Actorbit13삭제요청/componentisDisappearclear입니다. 실제ActorSceneexit가제거합니다.

OnCollided에는이미사라지는중인지확인하는guard나자기collider비활성화가없습니다. 따라서임의one-shotlatch를넣지않았고반복수락충돌은추가Key생성/타이머reset을합니다. 정상공receiverinactive/물리cache가미래접촉을제어합니다.

afterStep는hostwhole-frame동기transaction을요구합니다. 공receiver·Key생성·eventpool·world상태까지host가rollback해야하며moduleclone만으로외부부작용을복원할수없습니다. 실제host누락/async응답은거부합니다. 단위테스트의진단callback을실제playable근거로사용하지않았습니다.

## 파일·검증·남은 연결
신규고유파일: source-migration/source-ballkeybox-devices.js/.test.cjs,ballkeybox-device-report.json,ballkeybox-native.local.txt;이결과노트와작업중-BallKeyBox.md입니다. 주소/상수/정정이력/host계약은JSONreport에기록했습니다.
모든명령cwd=C:\Users\user\projects\VONE2\reference-analysis.
전용 node --test source-migration/source-ballkeybox-devices.test.cjs
전체 node --test source-migration/*.test.cjs

전인원compile과장치코어는완료했습니다. BoundBallPitcher/BoundBall·실제Keyfactory·공통물리/씬·렌더및원작병행검수는남아있으며partial/completePhysicsFidelity=false입니다. 이전모듈/runtime/play/deploy/HANDOFF/Git은변경하지않았고원작게임은실행하지않았습니다. 결과동결후리드인수인계입니다.
