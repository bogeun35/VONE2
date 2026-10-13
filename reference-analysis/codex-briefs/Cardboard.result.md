# Cardboard — result
status: partial (전체장치), done (요청한 출하9-4 생성 경로의 근거·순수gate)
files: source-migration/source-cardboard-devices.js, source-migration/source-cardboard-devices.test.cjs, source-migration/cardboard-device-report.json
tests: 전용13 passing; 전체880 passing / 0 failing. 9-4 실제2..8 온/오프라인14선택.
what it is: **출하9-4에는 Cardboard가 붙지 않습니다.** TopViewPlayer가 Creator를 호출하지만, slot8=1로 먼저 켠 DisableEquipCardboard(playerflagbit18) 때문에 생성 함수가 할당 전에 반환합니다. 이 gate를 복원하고 기존 동결 TopViewPlayer의 잘못된 필수 의존성 표기를 비파괴 정정하는 companion helper를 작성했습니다.
stage compiles alone: no. Cardboard는9-4의 차단 의존성이 아니며 일반Player/TopView/scene/input/camera/DistanceConstraint 연결이 남아 있습니다.

핵심 정정:
이전 TopViewPlayer.result.md의 필수Cardboard 설명과 source-topviewplayer-devices.js의 requiresCardboard:true는 실제9-4에서 잘못된 메타데이터입니다. 기존 파일은 동결 지시대로 수정하지 않았습니다. 리드는 필수 의존성을 제거하거나 새 correctTopViewRequirement(compiled,nativePlayerSnapshots)로 복사본을 정정해야 합니다.

key findings:
- createTopViewPlayer0x1816a4b05 일반Player 생성 →Initialize0x1816bd520/parseParameter0x1816bd754 →slot8nonzero로flag18(0x1816bdcc0) →Cardboard.Creator호출0x1816a4b30.
- Creator0x1817ebcd0: Player없으면return0x1817ebd95,Playerflags0x40000이면return0x1817ebdb0/7→0x1817ebece. FactoryParam1540x1817ebdcb/Entitycreate0x1817ebe24/Collision0x1817ebe63/InitPost0x1817ebe74/AddActor0x1817ebec4보다 앞입니다.
- 별도 Player.IsDisableEquipCardboard0x1816bcf60가flag18을 확정합니다. IsForTopView0x1816bcf30는flag17로 별개입니다. Equip0x1816bcf90는flag19,coveredFlags는Player+1byte입니다. TopView inputgate0x1816ca190은equipbit19와coveredbyte를 검사하며 disablebit18 자체는 이동을 막지 않습니다.
- 9-4의8개 authoredTopView모두datas8={t:1,f:1},authoredCardboard0개입니다. 생성이건너뛰어지므로 Cardboardcollision/coveredpatch/display/event/remove도 생성되지 않습니다. 기존Player의equip/covered값은 임의로0으로 바꾸지 않습니다.

통합 계약:
creationDecision은 nativePlayerflags uint32 또는명시null만 받습니다. disabled/null이면 createAttached가 cardboard:null/actions:[]와 변하지않은Player복사본을 반환합니다. enabled실행은 현재범위밖이므로 명시거부합니다.
compile은 actualnativeCreatedPlayers의 id/playerIndex/flags를 받고 이미일어난 실제Playerfactorylimit 결과만 검증합니다. TopView기존compiled와 동일순서id를 correctTopViewRequirement에 넣으면 requiresCardboard:false인새복사본을 받습니다.
supportedTypes는의도적으로[]입니다. 미구현일반Cardboardactor를 완료장치로등록하지마세요.9-4 companion의emptycardboards상태만JSON/solids/display/tick무효과검증을지원하며 activeCardboards는거부합니다.

unresolved: 일반 authored/non-disabled attachedCardboard의equip/remove/timer/coverage/collision/render는요청범위9-4에서 도달하지않으므로 구현하지않았습니다. 일반Player/공유runtime도수정하지않았습니다. TopView동결메타데이터정정은리드통합책임입니다.

후속정확주소(다른장치과업에서범위를넓힐때만): equip0x1817ec600,pushBack0x1817ec7f0,remove검사0x1817ec8e0,move0x1817eca30,remove0x1817ecb70/remove20x1817ecde0,coverage0x1817ecf00,startEquip0x1817ed470,cctor0x1817ed5e0,Player visibility0x1816cb750. 명령: python -I tools/disasm.py 0x1817ec600 0x1817ec8e0 0x1817eca30 0x1817ecb70 0x1817ecde0 0x1817ecf00 0x1817ed470 0x1817ed5e0.
Gear/ColorBox/TopViewPlayer/Broadphase/공유ActorLifecycle은읽기만했으며 기존파일/Git/play/배포수정및원본실행없음.

## 리드 대조 정정 (2026-10-14)

9-4의 실제 슬롯8=1은 Player bit18을 설정한다. Cardboard Creator는 이 비트에서 할당 전에 반환하므로, TopView compile의 `requiresCardboard`를 false로 정정했다. `cardboardCreationReason`은 `disable-equip-cardboard`로 보존한다. 이전 필수 의존성 서술은 이 근거로 대체한다. TopView 32 / Cardboard 13 / UpDownLift 20, 합계 65건 통과. 런타임 등록이나 스테이지 개방을 의미하지 않는다.
