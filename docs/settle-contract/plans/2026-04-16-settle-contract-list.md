
# 정산계약 관리 페이지 신규

## 배경
- LNB #4 `settle-contract-list` 실제 페이지 구현
- 이체관리와 동일한 패턴, 정산계약 도메인 필드에 맞춤

## 변경 사항
- 조건/기간/키워드 필터 (계약서 타입 멀티, 계약상태 `유효` 기본 등)
- AG Grid 다중 컬럼 + VoneTableFilter
- 헤더 우클릭 컨텍스트 메뉴 (Pin/Auto Size/Reset) 공통 컴포넌트 부착
- 잠금 토글 · 링크 셀 · 담당자(계약담당자/성약담당자) 분리

## 참고
- docs/common/policy.md §5 (링크/액션 셀)
- docs/common/table-policy.md (예정)
