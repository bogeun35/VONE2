# 07-03-02-damagerect-linepathlift — result
status: partial
files: source-migration/source-linepath-devices.js; source-migration/source-linepath-devices.test.cjs; source-migration/linepath-device-report.json; codex-briefs/07-03-02-damagerect-linepathlift.result.md
tests: 개별 파일 11건 통과; full suite: 406건 통과, 실패 0건 (node --test source-migration/*.test.cjs)
what it is: DamageRect는 사각 충돌 영역에서 플레이어에게 이벤트 43을 전달하는 장치이고, LinePathLift는 탑승 인원 또는 스위치 조건을 만족하면 설정된 꺾은선 경로를 따라 이동하는 발판이다. 이번 결과는 원작 파라미터 디코딩과 로더의 FP 변환 문제를 해결한 부분 구현이다. 실제 동작은 미완성이므로 대상 장치가 있으면 compile()이 명시적으로 실패한다.
stage compiles alone: 아니오. st_w_03_02의 2~8인 모두 LinePathLift·DamageRect 런타임 구현이 필요하다. 다른 스테이지 역시 이번 작업으로 열리지 않으며, 기존 런타임·등록·패키저는 수정하지 않았다.
key findings:
- **로더 변환 장애물 해결:** QStageFileConverter.convertActorCreateParam의 0x18055427c가 원본 float32를 읽고, 0x180554281가 convertFP를 호출하고, 0x180554291가 결과를 entry+0x18에 저장한다. convertFP 0x180554369/0x180554373 → Single 문자열 변환 → FP.FromString_UNSAFE의 double parse(0x18163fd41), float32 narrowing(0x18163fd46) → FP.FromFloat_UNSAFE의 mulss(0x18163fc6d), cvttss2si(0x18163fc7e)이다. 따라서 2.3335는 raw **152928**이며 반올림 152929가 아니다. 일반 포매터 전체를 이식한 것은 아니며, 분석 도우미는 이 작업에서 검증한 값만 허용한다.
- 03-02는 2/3인에서 pc=-3 액터, 4~8인에서 pc=4 액터를 선택한다. 속도 raw는 2~8인 순서로 262144/196608/152928/152928/152928/152928/152928이다. GetPlayerIndexCount 0x1818787e7과 speed store 0x1818789b4가 count-2 보정을 확정한다.
- LinePathLift 폭 기본값은 118(0x181878841), 높이는 18, y오프셋은 -9(0x181878a55/0x181878a63)이다. 03-03의 속도 증가 슬롯 -0.2는 raw -13107이며, 정수 슬롯의 sar16은 이 값에서 -1을 만든다.
- 경로는 datas[10..29]의 벡터 쌍이며 첫 (0,0)에서 끝난다(0x1817868e6..8f2). 03-02와 03-03은 각각 9개, 02-04는 1개 경로점이다.
- DamageRect의 음수 폭은 생성 X를 이동시키고 폭을 양수로 바꾼다(0x18180df69). OnStart는 충돌을 비활성화한다(0x18180e16c). 따라서 처음부터 단순 AABB 사망 영역으로 구현하면 원작 활성화 조건을 누락한다.
- DamageRect의 이벤트는 19가 아닌 **43**(0x18180e63c/0x18180e65a)이다. 03-02의 DamageRect 실제 개수는 2인 6개, 3~8인 4개다.
unresolved:
- DamageRect: CollisionScene의 충돌 flag bit0, IsCollidedByPushBackTarget(0x18180e291), 양방향 접촉 목록 및 중복 제거, PlayerComponent의 이벤트43 수신 동작이 런타임에 이식되지 않았다.
- LinePathLift: FP 제곱근(0x181640c40), StageToWorldPoint 거리 변환, 재귀 접촉 이동 허가(0x1816a15c0), 스위치가 만드는 fake path(0x1818798e0), 끝점/루프 상태 전이가 미이식이다. 재귀 허가 함수는 인접 액터와 맵 접촉을 조사하므로 단순히 발판과 탑승자를 같이 이동시키는 것으로 대체하지 않았다.
- 실제 이동 틱 수와 상태 전이 테스트는 작성할 검증된 구현이 없어 미완료다. 디코딩·JSON 직렬화·명시적 거부만 검증했다. supportedTypes는 요청한 두 타입을 선언하지만 완료된 런타임 지원을 뜻하지 않는다.
- 다른 세션 작업 파일이나 기존 파일은 수정하지 않았고, 등록·배포·커밋·푸시는 수행하지 않았다.
