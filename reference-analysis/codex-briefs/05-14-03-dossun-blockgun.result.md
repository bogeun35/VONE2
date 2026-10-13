# 05-14-03-dossun-blockgun — result
status: partial
files: source-migration/source-dossun-devices.js, source-migration/source-dossun-devices.test.cjs, source-migration/dossun-device-report.json, codex-briefs/05-14-03-dossun-blockgun.result.md
tests: 전용 11건 통과; full suite: 245건 통과, 실패 0건
what it is: Dossun은 센서에 따라 가속 낙하하고 착지 후 대기한 뒤 원위치로 복귀하는 장치다. PlayerBlockGun은 플레이어 장비로, 다른 플레이어를 맞히면 PlayerBlockComponent를 붙이는 탄환을 발사한다. 이번 산출물은 파라미터 해석과 Dossun phase 단독 계산까지이며 실제 장치 compile은 구체적인 오류로 거부한다.
stage compiles alone: 아니오. st_w_14_03은 2..8인 모두 거부한다. Dossun 센서/충돌 연결, 동적 탄환 lifecycle, PlayerBlockComponent가 필요하다. st_w_14_01은 이들 외 BreakableRect/Text도 필요하다.
key findings:
- 0x18181cd2b..ce62: Dossun datas[1..4]는 가속/대기/복귀/복귀 중 재발동 flag. 실제 스테이지는 1/1/2/0, 위치 (1032,192).
- 0x18181d535 및 0x18181d458: 가속과 복귀는 매 업데이트 단위이며 dt를 곱하지 않는다. 대기만 FP DeltaTime을 빼며 1초는 raw1092 기준 61틱이다.
- 0x18181cc70/90/a9: 기본 QFP는 5/1/2.5. 초안의 잘못된 기본값은 필드 이름 교차 확인 후 수정했고 report corrections에 기록했다.
- 0x181893426/437: Equip/SetHoldGun을 호출하는 장비. 0x18189367e: input9 edge로 발사하며 이미 탄환이 있으면 발사하지 않는다.
- 0x181892b25..bc0: 다른 index의 플레이어에게 탄환이 맞으면 PlayerBlockComponent.Creator 0x181891200를 호출한다. 현재 이 컴포넌트 이식 모듈은 없다.
unresolved: Dossun Map.Move 기반 센서와 native 충돌 구조 필드 해석 및 런타임 연결이 미완성이다. event19 사망 전송은 확인했지만 모든 접촉 사망인지 지형 압착에 국한되는지는 단정하지 않았다. 장비 input, bullet 생성/충돌/소멸, PlayerBlockComponent 의존성과 실제 플레이 검증이 남아 있다. supportedTypes 목록만으로 등록하면 안 된다. 기존 파일 수정, 등록, 배포, 커밋, 푸시는 하지 않았다.
