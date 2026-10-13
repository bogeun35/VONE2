# 09-08-02-throwball — result
status: partial
files: source-migration/source-throwball-devices.js, source-migration/source-throwball-devices.test.cjs, source-migration/throwball-device-report.json, codex-briefs/09-08-02-throwball.result.md
tests: 자체 20건 통과; full suite: 최종 관측 424건 통과, 실패 0. 다른 세션의 작업으로 실행 시점마다 전체 테스트 수가 늘었음.

what it is: CannonPlayer는 일반 플레이어를 만든 뒤 별도의 대포 장치를 장착하는 변형이다. 위에서 떨어지는 일반 공은 대포의 탄약이 되고, 플레이어가 발사한 탄환을 바구니에 넣으면 점수가 올라 모든 바구니의 목표를 채웠을 때 열쇠 활성화 이벤트가 나간다. 08-04에서는 떨어지는 공의 폭탄 확률이 25%다.

stage compiles alone: 아니오. st_w_08_02, st_w_08_04 모두 2..8인에서 명시적으로 컴파일 거부한다. 이 산출물은 복원된 파라미터/바구니 센서 판정/로컬 충돌 사각형/대포 쿨다운의 검증 단위와 실패 차단 인터페이스이며, 플레이 가능한 완성 모듈이 아니다. 등록하면 안 된다.

key findings:

- CannonPlayer creator는 일반 creator delegate 목록이 아닌 ActorFactoryComponent.createCannonPlayer `0x1816a49a0`이다. `0x1816a49ea`에서 createPlayer를 호출한 뒤 datas[14]/[15]를 별도 PlayerCannon.Creator `0x181895360`에 전달한다. 대포 actor146을 생성해 소유자에게 Equip(1) `0x1818956b2`로 장착한다. integration에 플레이어 중복 생성 방지와 미완료 owner/index 선택을 기록했다.
- 실제 두 스테이지의 모든 2..8인 선택 데이터에는 CannonPlayer 후보8개와 일반 Player0개가 있다. 인원별 플레이어 선택은 일반 createPlayer 팩토리의 규칙을 복원해야 하며, 후보8개를 곧바로 실제 플레이어8명이라고 해석하면 안 된다.
- 바구니 datas[0]는 56문자 FP 테이블이 아니라 28문자 signed int32 테이블이다. deserializer `0x180970857..868`은 문자 하위 바이트에서 0x21을 빼며 Find `0x181786950`은 인원 인덱스부터 역순으로 0이 아닌 값을 검색한다. Parse `0x181726f16`은 ushort로 저장한다. 두 스테이지의 2..8인 목표는 `[7] / [8] / [9] / [6,5] / [4,4,4] / [5,4,4] / [6,4,4]`다.
- 바구니 사각형은 `(w,h,x,y)=(36,42,-21,-49),(8,20,-10,-50)`이다(`0x1817277fc..884`). 전 성분에 scale을 곱하고 y에서 height×16을 뺀다(`0x181727095..0e8`). 16의 raw1048576은 literal resolver로 확인했다(`0x181727907`). 이 값은 native local 좌표이며 web anchor 변환까지 완료한 충돌 상자가 아니다.
- 바구니는 PlayerCannonBall actor147의 category5 추가 센서 접촉만 받아 점수를 증가시키고 제거 예약한다(`0x18172740d..532`). 떨어지는 ThrowBall actor148이 직접 들어가면 점수가 오르는 것으로 구현하면 틀린다. 모든 바구니를 채우면 event1이 Key actor17에 나간다(`0x181729695..6b3`).
- 컨트롤러 파라미터 기본값은 speed1, accel2, interval0.5, bombRate10(`0x181729015..02d`). 실제 두 스테이지는 앞 세 값이 같고 폭탄 확률은 08-02=0%, 08-04=25%다(`0x181729268..288`과 실제 stage data).
- 일반 ThrowBall은 PlayerCannon actor146과 충돌하면 탄약을 최대99까지 늘리고 제거 예약한다(`0x1817285b6..632`). 폭탄은 대포 소유자에게 event25를 보낸다(`0x1817284de..56d`); 즉사로 추정하지 않았다.
- 대포 phase2 쿨다운은 raw32768이며(`0x181895a62`) raw DeltaTime을 뺀다(`0x1818959dd..a03`). 60Hz raw1092로 30틱 뒤8이 남고 31틱에 phase0이 된다. JSON 왕복 후 같은 전이를 테스트했다.

unresolved:

- 대포의 FP 조준/파워 삼각함수 table 미복원. `0x1816465d0`은 static table+0x20에서 abs(raw angle)%0x6487e로 값을 조회하고 부호 복원한다. Math.sin/cos로 바꾸지 않았다. cos 호출은 `0x1816d3190`이다.
- createBall `0x181895d30`의 모든 static 속도/발사 위치 상수 및 owner 입력/OnPost 연동 미완료.
- PlayerCannonBall의 반사/중력/충돌/소멸(`0x181894750`, `0x181894ac0`, `0x181894b70`)과 ThrowBall의 가속/수집/폭발 전체 물리 미완료. 분석 일부를 리포트에 기록했으나 런타임 구현은 하지 않았다.
- createAreaInfo `0x181729b10`의 공 생성 영역 경계와 바구니 주변 배제 규칙 미복원.
- native 충돌 좌표→web 플레이어 anchor 변환, 추가 접촉과 기존 접촉 구별, 파티 인원별 CannonPlayer 후보/index 선택 미검증.
- 이 미확정 부분 때문에 세 타입 모두 compile에서 구체적 사유와 주소를 담아 throw한다. 옵션으로 우회하지 않는다. 보조 함수가 통과했다고 원작 일치나 게임플레이 완료를 주장하지 않는다.

지정된 새 파일 네 개만 작성했다. 기존 코드/다른 지시서 수정, 런타임 등록, 배포, 커밋, 푸시는 하지 않았다.
