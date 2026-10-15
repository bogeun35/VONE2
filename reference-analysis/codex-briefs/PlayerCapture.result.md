# PlayerCapture 결과
상태: partial — Player receiver30/65/66 코어 완료, 중첩 dispatcher·키/장비·warp 통합 대기
담당: 보조 세션3 (01a13559-c00c-7060-b3b1-0466fccc7349)
전용12/12, 전체1010/1010 통과 (2026-10-14).

신규 source-player-capture.js는 순수 plan과 동기 execute를 제공합니다. Player.OnRecvEvent0x1816c1080의 receiver분기만복원하며, 공통ActorLifecycle/일반Player/runtime을수정하지않았습니다. state1의Default0x1816c6600도확인했고30/65/66은defaultreturn0이어서outer분기까지이어집니다.

캡처65는 SetVisible(false) → SetPause(true) → actorflag24를byte74로set/clear → byte79==0일때notifyKeyReturn → byte78!=0일때playerflag10set입니다. byte78zero는이미설정된flag10을지우지않습니다. 숨김55/pause53의owner는captor가아니라 Player.m_EntityRef 자체입니다. notifyKeyReturn은event47을actorType17에broadcast하며현재key소유여부확인/반환은Keyhandler에맡깁니다. payloadbyte74/78/79는명시적으로요구하며생략된값을0으로추정하지않습니다.

해제66은 자기ownerunpause53 → Actor.WarpPos/WarpVelo기록 → actorflag17set → WorldVelo/MoveVelo/JumpVelozero → actorflag24set → playerflag10clear입니다. 현재Pos·visibility·collisionVelocity·wind를직접바꾸지않습니다. Playerstate/requestedstate를직접요청하거나장비/키ref를삭제하지도않습니다. 실제warp와visibility복원은laterActorwarpProc에연결해야합니다. ColorBox와같다고가정하지않았습니다.

이벤트30응답은 signed Player.m_PlayerIndex(+0xe)+1이며 Player.m_Index(+8)와다릅니다. helper입력은실제playerIndex여야합니다. receiver에는selfcapture검사가없습니다. WarpGun의자기자신제외와워프후보거부/restore는caller/query층책임이며, query둘다막히면66을보내지않습니다.

plan은검토가능한JSONoperations와returnValue를만들고 execute는그순서대로nesteddispatch와write/flag를수행합니다. nestedpause가변경한flag를outerflag24write가보존하도록현재state를읽습니다. 입력state는clone하여직접변경하지않습니다. host.transaction/dispatch는동기적이어야하고외부world/eventpool/key/equipment/collision의부작용까지rollback해야합니다. helper의clone만으로그외부효과를되돌릴수없습니다. 테스트의진단dispatcher를실제playable이라고주장하지않습니다.

파일: source-migration/source-player-capture.js, source-player-capture.test.cjs, player-capture-report.json, player-capture-events.native.local.txt; codex-briefs/PlayerCapture.result.md 및작업중-PlayerCapture.md. 주소/offset/순서/host계약은JSONreport에기록했습니다.

모든명령cwd=C:\Users\user\projects\VONE2\reference-analysis.
전용 node --test source-migration/source-player-capture.test.cjs
전체 node --test source-migration/*.test.cjs

다음은리드/보조2의nested53/55·Key47·equipment·warp lifecycle연결입니다. 본인완료기존파일과공용파일/Git/배포동결, 원작실행없음.
