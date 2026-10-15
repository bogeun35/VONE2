# KeyLifecycle — result
status: partial (검증된 네이티브 진단 헬퍼 완료·동결; 공용 호스트 연결 대기)
files: source-migration/source-key-lifecycle.js, source-key-lifecycle.test.cjs, key-lifecycle-report.json; 본 결과 및 작업중 선점 노트
tests: 전용36/36; 전체1565/1565 통과

what it is: Key의 부착 준비·phase 이동·반환·활성화·맵 밖 복귀를 정적 네이티브 근거에 따라 재현하는 동기 진단 헬퍼다. 기존 source-key-contact.js와 같은 actor.key 객체를 사용하며 접촉 코어를 복제하거나 수정하지 않았다.

stage compiles alone: 실제3-2/10-4의 각2~8인 Key는 compileActor 가능. 이는 스테이지 실행 연결이 아니며, 동적 BallKeyBox Key는 파라미터 해석 없는 zero() 컴포넌트 경로를 사용한다.

key findings:
- 실제Key prefab1855/EntityPrototype7166에는 직렬화Key simulation component가 없다. 정적키는ParseParameter를 거쳐 GhostY=50/PlayerY=0,phase0; 동적 Creator0x18186b5c0은 Parse를 호출하지 않아 두 오프셋도0/phase0이다. InitPost0x18186be90은 inactive일 때만 setActive(false), phase는 바꾸지 않는다.
- 정적 Creator는 InitPost 뒤ActorManager.m_Key(+50)에 기록(0x18186b59c). 동적은 InitCollision→InitPost→Scene.AddActor(position)→managerprimary기록(0x18186b6d0/b6e1/b72c/b74e). OnStart는 공용Scene의 실제스케줄에 맡긴다.
- OnStart→prepareAttachTarget0x18186bf80: 유효이름→FindActor→대상collision0→대상의 BASE사각형을 복사한 추가 충돌체(push0,sync,true),layer11 생성(0x18186c1ba/c1cb). 대상Actor의 collisionHolders에 추가되며 Key 자체 충돌체가 아니다. Key-target 위치차를저장하고 target flipbit10이면X를 반전한 뒤 actualattachref/layer/전송비트를설정한다.
- OnUpdate0x18186c2c0은 updatePhase0x18186c340 뒤 excludeTargetProc0x18186c960. 기존contact코어의같은key객체를사용해 phase끝전송비트1clear→쿨다운감소→실제latecontact순서를연결한다. 16384 쿨다운은1092raw로16틱.
- 목표점은 대상collision0의 GetRect와Actor방향비트10/21,Player/Ghost/이름부착오프셋으로계산. currentPos+=delta*6553>>16,제곱거리<6553에서만snap(0x18186c7d5..c90e). dt곱이나 player위치순간복사 없음. Ghost역중력은Player와달리rectheight를추가하지않는다.
- phase2는 setActive(false)→부착대상에event40(sender=Key)→동기receiver후현재phasebyte증가(0x18186c77d/c7c4/c7c9). phase3도대상을계속따른다. phase1은 attachref가null일때초기위치로수렴하며 stale nonnullref는초기위치로대체하지않는다.
- event47은sender==현재attachref일때만 returnToInitPos(0x18186d051). 반환은attach/layer/전송비트를지우고phase0만1로바꾼다(0x18186d240). 위치·속도·제외쿨다운·primaryref를즉시바꾸지않는다.
- OnPost0x18186ca30은flagbit5때만 Y>Map.TileHeight(UInt16+1002)*48FP+655를검사,밖이면진단후반환을예약한다. 경계같음은내부다. KeyComponent.OnExit오버라이드는메타데이터에없으므로전용종료cleanup을만들지않았다. primaryref는각Creator가덮어쓰며이헬퍼가반환/종료때지우지않는다.

unresolved:
- completePhysicsFidelity=false. 공용pause/death gate, Actor이동/충돌갱신, Scene시작/OnPost순서, 실제entitygeneration/이름검색/UTF8validity, owner기반SetVisible/SetCollisionActive, 이벤트풀/중첩receiver/소리와실제factory는호스트필수.
- lowlevel함수는네이티브순서로실제객체를변경하므로호스트전체프레임transaction이actor/collider/holder/manager/이벤트부작용도rollback해야한다. 비동기host콜백은거부한다.
- compileActor는실제빈값/56개!로된0population오프셋만지원. 다른packed배열과지연생성은구체적throw. 전체파라미터파서나factory대체를주장하지않는다.
- Key전용OnExit부재외공용Scene제거의primarycleanup범위는별도근거필요. 임의정리금지.
- 기존contact/bridge/factory/runtime/play/타모듈변경, Git동작,원작실행없음. 리드가명시host를연결한뒤스테이지검증필요.

전용36개와전체1565개검사를마쳤으며결과를동결했다.
