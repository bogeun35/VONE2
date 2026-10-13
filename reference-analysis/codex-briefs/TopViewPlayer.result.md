# TopViewPlayer — result
status: partial
files: source-migration/source-topviewplayer-devices.js, source-migration/source-topviewplayer-devices.test.cjs, source-migration/topviewplayer-device-report.json
tests: 전용32 passing; 전체857 passing / 0 failing. 9-4 실제2..8인 온/오프라인14선택, 원본 base map 구멍 및 스폰 검사.
what it is: TopViewPlayer는 일반 Player를 생성하고 Cardboard를 붙인 뒤 PlayerState9로 상하좌우 이동하는 장치 경로입니다. 원본 LUT 입력·접촉 attribute·구멍 감지·낙하3단계를 순수 함수로 복원했습니다.
stage compiles alone: no. nativeActorBridge 및 실제 Player/Cardboard/Actor/scene 계약이 필요합니다. 소유 파일 외 변경 없음.

key findings:
- createTopViewPlayer0x1816a4ac0 →createPlayer0x1816a3e40 + Cardboard.Creator0x1817ebcd0. Actor는27이 되지만 Player.originalActorType144와 requestedPlayerState9를 유지합니다. slot8은playerflag18(0x1816bdcc0). 9-4의 8개 스폰은 playerCount 필터가 아니라 actorScene flagbit2/currentPlayerActorCount로 인원수까지 생성합니다(0x1816a4000..014, setter0x181698f70).
- OnInitialize0x1816c9d20: state/func0,actorflag22. 첫 진입에서 playerflag17,bodycollisionflag7 및 headcollision추가,stageflags5/6. body28×32(-16,-29),head46×32(-16,-47)는 서로 다릅니다. head pushBack0이며 body priority-1/flag5.
- default0x1816ca0d0: flag19/cardboardCoveredFlags에 따른 입력 허용, Y→X contactprobe. matchedactor attribute OR의 bit0만 속도를 막고 mapcontact의 attribute는0입니다(0x1816927a0). 수평 contacted bool은 animation3을 결정합니다. camera end correction 후 Wind를 더하고 Wind를0으로 지웁니다.
- NormalInput0x181887860: stick LENGTH가13107 이상이면 rawstick을 그대로 사용합니다. component13107/13108은 FPSqrt 길이13106이므로 raw13109부터 전환합니다. 네 대각선은 실제 FPSinCos에서 추출한 비대칭 값이며 Math.sin/sqrt2를 쓰지 않습니다. table body4908336/hash5c165988...19b8a9.
- checkFall0x1816ca690: actorScale×baseScale의 (±7px,0/-2px) 네모서리chip>1,중앙chip69 attrbit4. 속성표는 metadata byte6006064,80bytes,field24217/hash7ba700ca...4301a08으로 추적했습니다. 첫 감지 tick은func1/state0으로 바꾸고 곧바로 return하므로 Wind/flash도 유지됩니다.
- fall0x1816caba0: phase0 shake.1/sound8/anim6/collisiondisable/sort-1900/playerflag9/wait.6. phase1 37fixedticks 후 native normalize×length/2 이동속도와flags2bit8. phase2 wait+=dt×6,scale-=dt×wait,R/G/B/A=scale,0에서requestedState4 및 stagefailbit10(단stagebit8이면fail생략). getFallOffset0x1816cb2a0는 Up→Down→Left→Right 우선,세로구멍 연속이면tile중앙 대신공유경계를 목표로 합니다.

통합 계약:
compile은 nativeActorBridge:true/framePlayerIndexList/gamePlayerInfo/actorSceneFlags를 요구합니다. 생성 actor와 Cardboard 및 모든 공통 Player 초기화는 호스트가 수행합니다. compile id는 실제 entity 바인딩 키이며 스폰 이름이 플레이어 인덱스를 결정하지 않습니다.
shared Player.updatePlayerState의 state9 분기에서 initializeTopView/updateTopView/finalizeTopView를 호출합니다(0x1816c0b46/0cd6/0977). ctx.map은 현재 native row-major chip배열,ctx.stage는 flags/mode,ctx.input은rawstick 및 Button[+0,+4]pair입니다. contactProbe는 contacted/attribute 둘 다 제공하며 camera X/Y 속도 보정도 필요합니다. 반환 actions를 즉시 원래 순서로 적용합니다.
DistanceConstraint에는 native actor-index 순서의 state byte/flags/현재위치·속도 및 실제 floating/contact facts를 제공합니다. Fallphase0의0x200 flag가 frozenConstraint.updateConstraint 전체skip/forceMoves유지를 유발하는 테스트를 추가했습니다. 일반 TopView를 임의로 floating=false로 고정하지 않으며 event24를 입력방향에서 만들지 않습니다. 모든 tension계산 뒤 mode2 transport는 현재 actor를 순서대로 변경합니다.
General Player.OnPost의 PushBackVec 추가, postPlayerState, CheckOutMap/event43(0x1816c0dd0)은 호스트 책임입니다. 본 모듈은 위치를 직접 적분하지 않습니다. beforeStep host transaction은 topViewSnapshot/applyTopViewUpdate(true)를 요구합니다.

unresolved: 실제 general Player/Cardboard/state/input/contact/camera/actions/Actor 적분과 공용runtime등록은 미완료입니다. 출하9-4와 다른 generalPlayer 파라미터는 명확히 거부합니다. 브라우저는 frozen source-distanceconstraint-math.js를 먼저 로드해야 합니다. 원본게임 실행/인간완주 검증은 없습니다. 조사한 TopView 분기의 숫자 상수는 모두확정했습니다.

재개/다음: 리드가 일반Player state9 어댑터와 Cardboard lifecycle부터 연결한 뒤 scene/input/constraint/post 순서를 연결합니다. 정적 재검증 명령: python -I tools/disasm.py 0x1816a4ac0 0x1816c9d20 0x1816ca0d0 0x1816ca690 0x1816caba0 0x1816cb2a0. 중간 잘못된 rawmap row-major 조회는 padded column-major로 바로잡았고 테스트에서2600bytes/1012holes를 확인했습니다. 스틱 threshold테스트도 실제 LUT 경계로 정정했습니다. 이전 동결 파일·공용 파일·Git·배포 수정 없음.

## 리드 대조 정정 (2026-10-14)

9-4의 실제 슬롯8=1은 Player bit18을 설정한다. Cardboard Creator는 이 비트에서 할당 전에 반환하므로, TopView compile의 `requiresCardboard`를 false로 정정했다. `cardboardCreationReason`은 `disable-equip-cardboard`로 보존한다. 이전 필수 의존성 서술은 이 근거로 대체한다. TopView 32 / Cardboard 13 / UpDownLift 20, 합계 65건 통과. 런타임 등록이나 스테이지 개방을 의미하지 않는다.
