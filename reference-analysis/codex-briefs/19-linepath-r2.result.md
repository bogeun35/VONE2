# 19-linepath-r2 — result

status: done

files: source-migration/source-linepath-devices.js, source-migration/source-linepath-devices.test.cjs, source-migration/linepath-device-report.json 수정; codex-briefs/19-linepath-r2.result.md 생성.

tests: 개별 19건 통과; 전체 `node --test source-migration/*.test.cjs` 475건 통과, 실패 0건. JSON 보고서 파싱 및 허용 파일 diff 공백 검사 통과.

what it is: 3-2의 선로 리프트는 필요한 인원이 모두 올라탄 뒤 선로를 따라 이동하고 마지막 점에서 정지한다. 피해 사각형은 초기 밀어내기 대상과의 겹침이 해소되면 활성화되며, 접촉한 플레이어 entity에 이벤트 43(QuakeDead)을 보낸다. 불사 플레이어는 이 장치의 비강제 이벤트를 무시한다.

stage compiles alone: 이 모듈의 `compile(선택된 st_w_03_02 액터, count)`는 2~8인 모두 성공한다. 기존 전체 source-stage-runtime은 미등록이므로 새 스테이지가 실행 가능해진 것은 아니다. Claude의 등록, 원본 충돌 contact 조회 어댑터, 17번 공통 재귀 이동 허용 검사·운반 연결, Player 이벤트 43 라우팅이 필요하다. 공통 런타임·큐·HANDOFF·다른 작업 파일은 수정하지 않았고 등록·배포·커밋·푸시는 수행하지 않았다.

key findings:

- FPSqrt는 설치된 resources.assets의 TextAsset이다. `0x18165af8a`가 읽는 literal slot `0x1831b9a40`의 문자열이 FPSqrt이며, loader `0x18165afd5..0x18165b074`가 int32 배열에 복사한다. 실제 리소스 해시와 출하 선로에 필요한 19개 항목을 기록했다. 부동소수점 sqrt 근사로 대체하지 않았다.
- 카메라 변환은 chipSize=48에서 raw ±1365를 사용한다(`0x1817df592/5bc`). 3-2의 선로 길이 raw는 `[1091997,409497,492155,341248,409497,395847,409497,458637,341248]`이다. 전원 탑승을 만족한 대기 틱부터 마지막 점 도달까지 2인 1000틱, 3인 1332틱, 4~8인 1711틱이다. 속도 raw 262144/196608/152928은 기존 발견을 유지했다.
- 탑승 조건을 만족한 틱은 시작 플래그만 설정하고, 다음 틱부터 이동한다(`0x181878dc8..ddc`). 탑승자가 이후 내려가도 mode0의 이동을 중단하지 않는다. 거리 누적은 native 허용 검사 성공 때만 수행한다(`0x181879195/1ac`). 구간 초과분은 버리고 마지막 점에서 정지한다(`0x1818792f7..39e`).
- 운반은 수평 변위를 전달하지 않는다. `MoveLift`는 abs(deltaY)>=4 raw일 때만 `(0,deltaY)`를 `MoveContactActor 0x1816a0b70`에 전달한다(`0x18187a1dd..221`). 음수 선로 Y의 허용 검사에는 전체 변위 대신 원본 static `(0,-65536)`을 사용한다(`0x18187914a..15d`, static `0x182e88680`).
- collider flag bit0은 **비활성**이다. `SetCollisionActive(true)`는 bit0을 지우고 false는 설정한다(`0x1816a014d/15f`). DamageRect의 매 Update는 비활성 상태에서 `IsCollidedByPushBackTarget(mask3)`가 false일 때 활성화한다(`0x18180e291/2e1`). 단순 플레이어 AABB 검사로 추측하지 않았다.
- 이벤트 43은 contact collider owner entity에만 전달된다(`0x18180e61e..65a`). 첫 패스의 동일 entity 복수 collider 이벤트는 보존하고, 역방향 플레이어 검사에서는 첫 패스 수신자를 제외한다. 역방향 검사만 Player flag0x200을 제외한다(`0x18180e952`).
- Player 이벤트 43은 life>0이고 비강제이면 불사 flag0x100을 먼저 검사한다(`0x1816c14a2..14ca`; `IsImmortal 0x1816bcd20`). DamageRect의 force 필드는 0이다: pooled param 초기화 `0x181780c31`, GetEventParam type/sender 저장 `0x18169dc43/4a`, 장치는 force를 변경하지 않는다. 보통 플레이어는 life=0/requestState=3으로 사망하지만(`0x1816c16a0/16dd`), 활성 공유 HP의 DealDamage 반환값이 true이면 피격·무적 처리로 생존한다(`0x1816c15be/15ea`). force=1일 때만 IsInvincible를 검사하며 true 분기는 오히려 사망으로 간다(`0x1816c14df..1500`). 순수 `playerEvent43Outcome` 함수와 회귀 테스트에 이 분기를 반영했다.

런타임 호출 계약은 보고서 `runtimeCallContract`에 기록했다. 특히 `ctx.getRideCount(id,1,6)`, `ctx.isEnableMoveContactActor(id,vectorRaw)`, `ctx.moveLinePathLiftContactActors(id,{xRaw:0,yRaw})`를 17번 결과와 연결하면 된다. DamageRect는 별도로 native 밀어내기 조회·활성화·양방향 contact 목록을 제공해야 한다. 필수 호출이 없으면 조용히 진행하지 않고 구체적인 오류를 던진다.

unresolved:

- 3-2에서 사용하지 않는 외부 시작 fake-path 및 nonzero loop mode는 여전히 명시적으로 거부한다. 따라서 3-3은 컴파일 거부 상태다. 2-4 mode0는 컴파일되지만 해당 스테이지 전체 운행 검증은 이 결과의 범위에 포함하지 않았다.
- 확보한 19개 FPSqrt 항목 밖의 새 선로나 chipSize는 미확보 index에서 거부한다.
- 원본 공통 충돌 그래프, 역방향 contact 생성, 공유 HP 내부 계산·Player 사망 후 전체 상태 전환 및 실제 플레이 비교는 host/후속 통합 검증 범위다. 필요한 함수를 분리했으며 병렬 작업을 기다리지 않았다.

기존 올바른 발견은 유지했고, 비활성 bit0 해석·FPSqrt 확보·일반 FP 변환 거부 제거·이벤트 43 수신 규칙 등 변경된 발견은 보고서 `corrections`에 남겼다. R1 검증 결과도 `round1VerificationHistory`로 보존했다.
