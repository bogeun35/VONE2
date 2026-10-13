# 04-11-02-floatingthorn-poleladder — result
status: partial
files: source-migration/source-pole-devices.js; source-migration/source-pole-devices.test.cjs; source-migration/pole-device-report.json; codex-briefs/04-11-02-floatingthorn-poleladder.result.md
tests: 개별 10건 통과; full suite: 269건 통과, 실패 0건
what it is: FloatingThorn은 시간에 따라 상하로 흔들리며 충돌 상대에 이벤트43을 보낸다. PoleLadder는 오른쪽으로 이동하는 봉이며 플레이어를 전용 상태10으로 전환하고 봉 옆에 고정한다. 봉 컴포넌트의 이동·위치 제약만 구현했고 가시는 정확한 원본 사인 조회표가 없어 명시적으로 컴파일을 거부한다.
stage compiles alone: 아니오. st_w_11_02는 2..8인 모두 FloatingThorn 때문에 예외를 던진다. 봉만 분리하면 모든 인원에서 컴파일되지만 플레이어 상태10의 런타임 구현과 센서/렌더러 연결이 필요하다. st_w_07_04도 가시가 남으며 기존 다른 모듈의 등록 상태는 이번 작업에서 변경하지 않았다.
key findings:
- 두 FloatingThorn Creator는 별도 actor type이 아니다. ordinal126의 정적 생성은 0x181849990이고, 동적 오버로드0x181849ae0도 factory type0x7e=126을 요청한다. 동적 생성은 작은 충돌표와 Disappear를 사용한다.
- 가시는 이벤트19가 아닌43을 category1/8 상대에 보낸다(0x18184a1bf..0x18184a1fd).
- 원본 사인은 raw각도 modulo0x6487e의 LUT 조회다(0x181646630..0x181646663). 기존 source-enemy-devices.js의 Math.sin 재계산은 원본 일치 근거로 사용할 수 없어 복사하지 않았다.
- 봉의 슬롯0은 signed FP 인원별 높이표, 슬롯1은 속도3/틱, 슬롯2는 이동거리4775다(0x1816da690..0x1816da713). 실제 선택 높이는 480/480/480/480/540/505/515이며1592번째 틱에 정지한다(0x1816da8f1..0x1816da936).
- 봉 OnPost는 접촉 판정 없이 상태3..5를 제외한 전 플레이어에 상태10을 요청한다. 상태10에서는 x=poleX-12, 왼쪽 보기이면 +52, Y는 봉 구간으로 제한한다(0x1816dabfa..0x1816dad95).
unresolved: 원본 사인 LUT, 가시 이벤트43의 수신 처리와 생명주기, 플레이어 상태10의 속도/충돌표/검색 임계값/PCG 흔들림을 아직 이식하지 못했다. 정확한 미해결 주소와 후속 연결 계약은 JSON 보고서 및 integration export에 기록했다. 따라서 완료 또는 스테이지 개방으로 취급하면 안 된다. 기존 파일 수정, 등록, 배포, 커밋, 푸시는 하지 않았다.
