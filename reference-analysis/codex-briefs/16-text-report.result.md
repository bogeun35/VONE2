# 16-text-report — result
status: partial
files: source-migration/text-device-report.json; codex-briefs/16-text-report.result.md (새 파일만 작성)
tests: 기존 Text 테스트 17건 통과; full suite: 244건 통과, 실패 0건. 별도 읽기 전용 검증으로 실제 온라인 변형 70개 조합 컴파일 및 JSON 상태 복원 확인.
what it is: 출하된 스테이지에 배치된 Text는 안내 문구를 표시한다. 충돌·위험·사망을 추가하지 않으며 수명과 소유자가 기본값인 경우 이벤트도 발생하지 않는다. 런타임에서 생성된 수명 있는 Text는 퇴장 요청과 소유자 통지를 처리하므로 컴포넌트 전체를 무조건 표시 전용이라고 단정하면 안 된다.
stage compiles alone: Text 모듈은 해당 World 10스테이지의 2..8인 온라인 변형 70/70 조합을 경고 없이 컴파일한다. 전체 라운드는 이 작업만으로 열리지 않으며, 런타임 등록과 각 스테이지의 다른 장치가 필요하다. 등록은 수행하지 않았다.
key findings:
- Text ordinal 79 등록: 0x18177706c / 0x181777070. 스테이지 Creator 0x18171b200은 엔티티 생성·컴포넌트 추가·ParseParameter를 호출한다.
- Initialize·InitPost·OnStart·OnUpdate는 모두 0x180476130의 ret 0이다. TextComponent에는 충돌 초기화 및 OnRecvEvent 선언이 없다.
- ParseParameter 0x18171b4e0은 슬롯 0..8만 읽으며, 수명·소유자·폭·정렬을 쓰지 않는다. 슬롯 6·7은 ActorComponent 속도 +0xf0에 기록된다(0x18171b8ce). 출하 Text의 속도와 createThreshold는 전부 0이다.
- OnPost는 수명 >0일 때 FP raw를 차감한다(0x18171bbe2). 만료 시 비트 13만 설정한다(0x18171bc06). 이벤트 62는 OnExit에서 소유자에게 전달한다(0x18171bb3b / 0x18171bb56).
- 뷰의 앞/뒤 정렬은 20000/-10000(0x1805ca288..0x1805ca292), 외곽선은 0.30000001192092896(0x182e86fa8), FP 변환은 1/65536(0x182e86e14)이다.
- 기존 헤더의 호출자 목록에는 RequestExit 헬퍼 0x180222e80, 0x1802265c0, 0x18022d0e0 및 조정용 점프 0x180209974가 빠져 있다. 헬퍼의 상위 호출자는 미추적이다.
unresolved:
- 사용자 지시의 “지정된 새 파일만 작성하고 기존 파일 … 수정하지 마세요”가 brief의 기존 모듈 수정 허용보다 우선하므로 기존 JS와 테스트는 수정하지 않았다. 보고서 작성과 검증은 끝났지만 아래 수정이 남아 있어 status는 partial이다.
- 기존 afterStep의 부동소수점 수명 계산은 원작과 다르다. 1초/60Hz 별도 검증에서 기존 코드 60틱, 원작 FP raw 계산 61틱이다. 기존 테스트는 0.25초 간격만 검사해 이 문제를 놓친다.
- 기존 afterStep은 만료 직후 이벤트를 보내지만 원작은 실제 OnExit 시 보낸다. 단계 분리와 회귀 테스트가 필요하다.
- 필수 displays()가 없고 labels()만 있다. 기존 인터페이스 테스트도 displays를 검사하지 않는다.
- 미검증 nonzero velocity/createThreshold는 현재 경고 후 허용한다. 공유 규칙에 맞춰 구체적 오류로 거부해야 한다.
- FP 소수값은 현재 그대로 보존되어 raw 정확도가 없다. 예: 0.7은 원작 raw 45875이다. 음수 정수 슬롯 역시 FP 절삭 후 산술 시프트가 필요하다.
- 네이티브는 짧거나 null인 슬롯 배열을 거부하지만 JS는 기본값으로 채우며, 잘못된 숫자 슬롯 타입은 네이티브 0 처리와 JS 예외가 다르다. 정책과 테스트를 명시적으로 정리해야 한다.
- 컴포넌트 제로 초기화와 엔티티 prototype 내부를 이 작업에서 독립적으로 증명하지 않았다. 번역 문자열·버튼 치환·글꼴·follow 렌더링 및 실제 화면 일치는 미검증이다.
- 다른 장치 등록, 전체 라운드 개방, 배포·커밋·푸시는 수행하지 않았다.
