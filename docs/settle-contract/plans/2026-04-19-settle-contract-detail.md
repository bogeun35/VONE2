
# 정산계약 상세 페이지

## 배경
- 리스트에서 "상세보기" 클릭 시 표시될 단일 탭 상세 페이지
- 기획문서 `docs/common/detail-policy.md` 의 reference 구현체

## 변경 사항
- 메타바 (sticky, 3 pair) · 탭 5개(콘텐츠 3 + 링크 2) · 탭별 푸터
- 8 섹션: 계약서 기본 / 정산 생성 / 계약서 상세 / 수수료 / 첨부자료 / 계약 해지 / 시스템 / 대행업체 / 거래처
- 폼: 3 pair / row · 2 pair 포함 span3 · 전체 full row span5
- 설명 텍스트는 `help-tip` 툴팁으로
- 라디오 vs 드롭다운 선택 규칙 정책화

## 참고
- docs/common/detail-policy.md (살아있는 문서)
