# NativeSchemaAudit 결과
상태: 감사 완료·동결. 구현 변경이나 새 runtime adapter는 없습니다.
담당: 보조 세션3
전용 8/8, 최종 전체 1207/1207 통과 (2026-10-15).

이번 결과는 frozen helper 사이의 연결 계약 감사입니다. 전체 물리 일치나 실제 플레이 검증을 뜻하지 않습니다. 위험은 adapter가 해당 필드를 무분별하게 복사할 때 발생하며, 현재 리드 adapter가 모두 잘못됐다는 판정은 아닙니다.

## 명시 매핑표
| 실제 네이티브 필드 | raw offset | helper 이름과 연결 규칙 |
|---|---:|---|
| Actor.m_Velo | +0xf0 | Capture.worldVelocityRaw → Default/Motion/WarpJump.velocityRaw. native update당 raw 속도이며 dt를 다시 곱하지 않음 |
| Actor.m_Accel | +0x60 | Capture.moveVelocityRaw → Motion.accelerationRaw. legacy 이름과 달리 두 번째 속도가 아님 |
| Actor.m_JumpVelo | +0x90 | jumpVelocityRaw. 예약 점프이며 일반 velocity와 분리 |
| Actor.m_WarpPos / WarpVelo | +0x100 / +0x110 | warpPositionRaw / warpVelocityRaw. event66이 예약하고 warpProc가 나중에 소비 |
| Actor.m_Pos / PrePos / InitPos | +0xb0 / +0xc0 / +0x80 | Default/CollisionInit/ScreenBoundary의 xRaw/yRaw와 Motion의 positionRaw/prePositionRaw는 명시적으로 변환. anchor raw픽셀이며 rect top-left가 아님 |
| Actor.m_Scale / BaseScale | +0xe0 / +0x50 | body XY와 stage 기본 scale을 구분. CollisionInit이 stage scale을 적용한 descriptor에 다시 곱하지 않음 |
| Actor / Player / Collision flags | +0xc / +0x20 / +0x6 | 서로 다른 bit 공간. 같은 숫자 bit라도 의미가 다르므로 교차 복사 금지 |
| Player.PlayerState / Index / PlayerIndex / PlayerActorType | +3 / +8 / +0xe / +0x18 | Default.playerState ↔ Capture.state. query30은 signed PlayerIndex+1. stage 생성 actorIndex와 다름. ScreenBoundary는 실제 cached PlayerActorType을 요구 |
| Actor / Player / Collision EntityRef | +0x20 / +0x28 / +0x18 | 같은 실제 entity에 대한 host key. Collision.Id(+0x14), player slot, dense component slot과 혼동 금지. generation 검증 유지 |
| Collision ExpectedPos / ExpectedScale / Pos / PrePos / PreScale / Scale | +0x20 / +0x30 / +0x40 / +0x50 / +0x60 / +0x70 | birth·dynamic update·warp에서 갱신하는 필드가 각각 다름. current를 pre/expected에 무조건 덮어쓰지 않음 |
| Stage.ScrollParam.ScrollType | +0x91 | WarpJump.stageByte91 ↔ 현재 live scrollType. variant는 초기값이며 ChangeScrollType 이후 현재값 사용 |
| DeterministicFrame.Number / Verified | 관리 class +0x1c / +0x18 | 입력 simulation timestamp와 update verified boolean은 별개. 관리 class에는 boxed struct의 −16 규칙을 적용하지 않음 |

Button은 signed int32 [up,down,current] 3-word입니다. NativeInput과 Default의 on/press/release 조건이 일치함을 검증했습니다. 렌더 tick·poll 횟수·FP delta로 timestamp를 대체하거나 remote packet 누락을 가짜 false packet으로 바꾸면 안 됩니다.

## 확인한 위험과 최소 수정안
1. `source-player-capture.js`의 event66 `moveVelocityRaw` 및 header의 MoveVelo 표현은 실제 +0x60 m_Accel과 다른 이름입니다. 리드가 `accelerationRaw`로 명시 매핑하고, 추후 허용된 수정에서 header/호환 alias를 정리하는 것이 최소안입니다. frozen 파일은 수정하지 않았습니다.
2. `source-player-default.js`의 평탄 actor 좌표를 `source-actor-motion.js`에 직접 넘기면 vector/history/acceleration/holder가 빠집니다. 하나의 실제 Actor 저장소와 schema view를 연결하고 누락된 history를 임의 0으로 채우지 않아야 합니다.
3. `source-player-collision-init.js` bootstrap의 Player snapshot만으로 cached PlayerActorType·실제 PlayerIndex·EntityRef가 모두 준비되지는 않습니다. 실제 초기화/등록 값을 host가 결합해야 합니다. ScreenBoundary의 cached type19 bypass를 ActorType27 기본값으로 대체하면 안 됩니다.
4. collider `isEnableSyncPos`와 Actor holder `syncPos`를 연결하되 collision ID와 entity identity는 분리해야 합니다. expected/current/pre position 및 scale을 모두 보존해야 합니다.
5. `source-player-screen-boundary.js` header는 missing collision/Actor skip이라고 쓰지만 `upperEdgeX`는 collision0 부재를 throw합니다. fail-closed를 완화하지 말고 리드가 해당 native 분기 확인 후 설명/계약만 먼저 맞추는 것이 안전합니다. 이번 감사는 runtime bug라고 단정하지 않았습니다.
6. frozen WarpGun의 `directionRaw`가 가리키는 native +0xe0은 metadata상 Actor.m_Scale입니다. 단위 facing vector로 normalize하면 안 됩니다. Look/invertY는 별도 flags이며 리드가 scale-vector 의미를 문서화하거나 호환 이름을 두어야 합니다.

Actor flags bit3 hidden/bit4 pause/bit17 warp visibility/bit19 jump/bit20 warp correction skip/bit25 warp frame과 Player bit9 dead/bit10 capture/bit23 reverse, Collision bit0 inactive/bit1 callback/bit6 moved를 구분해야 합니다. PlayerDefault에서 같은 bit23을 Actor ice와 Player reverse로 각각 사용하는 것도 이 별도 공간 때문에 가능합니다.

## 검증 및 보존
8개 최소 테스트는 실제 field offsets, Capture→Motion alias 요구, collider expected/current/pre 보존 및 stage scale 중복 방지, NativeInput→Default timestamp, recycled entity generation, cached PlayerActorType, live ScrollType을 확인합니다. 새 runtime adapter를 구현하지 않았습니다.

첫 전체 실행은 동시 생성 중인 다른 소유 NativeActorBridge 테스트 6개가 실패했습니다. 즉시 단독 재검증에서 통과했고, 최종 전체 재실행은 1207/1207 통과했습니다. 다른 소유 파일은 건드리지 않았습니다.

신규 소유 파일: source-migration/native-schema-audit-report.json, source-native-schema-audit.test.cjs; codex-briefs/NativeSchemaAudit.result.md 및 작업중-NativeSchemaAudit.md. 정확한 native 주소·최소 수정안은 JSON report에 보존했습니다.
모든 명령 cwd=C:\Users\user\projects\VONE2\reference-analysis.
전용: node --test source-migration/source-native-schema-audit.test.cjs
전체: node --test source-migration/*.test.cjs

감사 결과 동결. 기존 구현·공용 runtime/play/HANDOFF/Git/배포는 수정하지 않았고 원작 게임도 실행하지 않았습니다.
