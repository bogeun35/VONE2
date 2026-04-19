
# 기획문서 매니저 (이슈 관리)

## 배경
- 각 페이지별 기획문서(plan)를 한 곳에서 이슈 형태로 보고 관리
- 지라처럼 이슈번호 / 상태 / 담당자 / 태그 부여

## 목표
- 헤더 "기획문서" 버튼 → 모달 → 이슈 리스트 (이슈일자 내림차순)
- 행 클릭 → 해당 페이지 탭 열고 doc-sidebar 로 plan 로드
- **편집**: 제목 / 태그 / 이슈번호 / 상태 / 담당자 — 이슈번호는 **보호**(날아가지 않음)
- **복구**: 상태 `보류` 로 변경 = 소프트 삭제. 기본 숨김 + 필터 토글로 노출

## 데이터
- `docs/plans-index.json` 중앙 인덱스
- 각 plan md 는 `docs/<slug>/plans/<file>.md` frontmatter
- 편집 변경은 localStorage overlay (`vone:plans:overrides`) 로 우선 저장 → 필요 시 GitHub 커밋 유도

## 상태 값 (A안)
- 초안 / 진행중 / 완료 / 보류

## TODO
- 인덱스 JSON 자동 갱신 (CI) — MVP 이후
- 담당자 enum 관리 (공통 코드)
- 이슈번호 자동 발번 (VONE-###)
