---
version: 0.1.0
lastUpdated: 2026-04-19
status: 살아있는 문서(growing)
reference: 정산계약 상세(settle-contract-detail) — `#page-settle-contract-detail`
---

# 상세(Detail) 페이지 공통 구성 정책

> 이 문서는 VONE2 의 **조회·편집 상세 페이지** 타입의 공통 구조·레이아웃·인터랙션 규약을 정의한다.
> 목록 페이지에서 한 건을 열어 편집/조회하는 모든 페이지(정산계약 상세, 정산서 상세, 거래처 상세 등)는 이 규약을 따른다.
> 리스트 페이지는 [`policy.md`](policy.md) 와 [`table-policy.md`](table-policy.md) 참조.

---

## 1. 페이지 골격

```
┌───────────────────────────────────────────────┐
│ 페이지 헤더 (breadcrumb + title + 기획문서 btn) │  ← flex-shrink: 0
├───────────────────────────────────────────────┤
│ 메타 바 (sticky, key identifier 필드)          │  ← flex-shrink: 0
├───────────────────────────────────────────────┤
│ 탭 네비게이션 (기본정보 / … / 링크탭)           │  ← flex-shrink: 0
├───────────────────────────────────────────────┤
│                                               │
│ 탭 패널 (scrollable)                           │  ← flex: 1, overflow-y: auto
│                                               │
├───────────────────────────────────────────────┤
│ 푸터 액션 (항상 고정)                           │  ← flex-shrink: 0
└───────────────────────────────────────────────┘
```

CSS 기본:
- `.page` — `display: flex; flex-direction: column; overflow: hidden`
- 메타 바 / 탭 / 푸터 = `flex-shrink: 0`
- 탭 패널 = `flex: 1; min-height: 0; overflow-y: auto`

---

## 2. 메타 바 (Sticky)

- **역할**: 탭을 바꿔도 "이 계약이 맞나" 식별할 수 있도록 핵심 PK / 이름 을 항상 노출
- **위치**: 페이지 헤더 바로 아래, 탭 네비게이션 위
- **레이아웃**: `grid-template-columns: 100px 1fr 100px 1fr` (라벨/값 × 2pair)
- **필수 필드**: 해당 도메인의 **PK IDX** + 식별명(예: 계약명, 정산서명). 추가로 한 쌍 더 둘 수 있음.
- **조회 버튼**: PK IDX 입력 + `조회` (primary) 로 수동 로드 지원. Enter 로도 동작.
- **sticky**: `position: sticky; top: 0; z-index: 5;` — 스크롤해도 페이지 내부 최상단 고정

## 3. 탭 네비게이션

- **구성**: 콘텐츠 탭 (N개) + **링크 탭** (0..n)
- **콘텐츠 탭**: 클릭 시 해당 패널 표시 (`data-tab="xxx"`, 패널은 `data-panel="xxx"`)
- **링크 탭**: 클릭 시 **다른 페이지로 이동** — `data-link="xxx"` + `↗` 아이콘으로 구분
  - 예: 정산계약 상세의 "거래처 ↗" / "정산서 ↗"
  - 클릭 핸들러에서 `TabManager.open` 으로 대상 탭 열기 + `context` 로 연관 키 전달
- **활성 스타일**: 하단 `2px solid #2563eb` + `font-weight: 600`
- **링크 탭**: hover 시 파랑, 기본 회색

## 4. 탭 패널 — 섹션 / 폼 레이아웃

### 4.1 섹션 (`.detail-section`)
- 각 섹션은 흰 배경 + `border: 1px solid #e8e8e8; border-radius: 4px` 박스
- 섹션 제목: `.detail-section-title` — 좌측 3px 파란 bar + 12px bold
- 섹션 제목 끝에 `<span class="help-tip" data-tip="...">?</span>` 로 전체 가이드 툴팁 부착
- **아코디언 자동 적용**: 섹션 제목 클릭 시 `.collapsed` 토글되어 본문 접힘/펼침
  - 공통 컴포넌트 `js/components/detail-accordion.js` 가 문서 내 모든 `.detail-section` 에 자동 바인딩 — 페이지 구현체에서 별도 호출 불필요
  - 기본 상태: **열림**. 상태 저장 X (새로고침 시 초기화)
  - 토글 트리거는 섹션 제목 클릭, `.help-tip` 클릭 시 토글 생략

### 4.2 폼 그리드 — 3 pair / row
- 기본 그리드: **3 pair per row = 6 cols**
  ```css
  grid-template-columns: 120px 1fr 120px 1fr 120px 1fr;
  ```
- 한 pair = `label (120px) + value (1fr)`
- `.df-value-span3` = 라벨 + 2col value (= 반쪽 row). 해당 pair 만 넓게.
- `.df-value-span5` = 라벨 + 나머지 전체 (full row 1 pair).
- **row 의 특정 pair 자리를 비우고 다음 row 로 강제 이동**하려면 빈 `<div></div>` 로 패딩.
  ```html
  <label>성약담당자</label><div class="df-value">…</div>
  <div></div><div></div><div></div><div></div>   ← 나머지 4칸 비움
  <label>생성일자</label>…
  ```

### 4.3 필드 폭 / 높이 규칙
| 항목 | 값 |
| --- | --- |
| 라벨 폭 | 120px 고정 |
| input / select / textarea 높이 | **26px 통일** |
| textarea | `resize: vertical; height: 26px; min-height: 26px` (기본 1줄, 필요시 수동 확장) |
| 날짜 input (`df-input-date`) | `max-width: 140px` |
| 숫자 input (`df-input-num`) | `max-width: 80px; text-align: right` |
| 은행 select (`df-input-bank`) | `max-width: 120px` |
| radio-btn / seg-btn 내부 버튼 | `min-width: 56px` — 같은 그룹 내 크기 통일 |

### 4.4 필수 표시
- 필수 라벨에 `.req` 추가 → `::before { content: '* '; color: #ef4444 }`

### 4.5 설명/주석은 툴팁 (`help-tip`)
- 본문 공간을 먹는 `* 설명…` 텍스트 블록은 쓰지 않는다.
- 라벨 옆 혹은 섹션 제목 옆에 `<span class="help-tip" data-tip="...">?</span>` 로 hover 툴팁
- 줄바꿈은 `&#10;` 사용
- 배경 `#333` / 흰 글씨 / `max-width: 340px`

---

## 5. 컴포넌트 타입 선택 규칙

공통 정책 §6.3 과 동일하게 적용:

| 옵션 수 / 길이 | 컴포넌트 | 클래스 |
| --- | --- | --- |
| 2~3개 & 짧음(≤6자) | 라디오 | `radio-btn-group` |
| 4개 이상 OR 긴 텍스트 | 드롭다운 | `select.df-input` |
| 다중 선택 태그 | 태그 셀렉트 | `tag-select` |
| **프론트 전용 토글** (저장 X) | 검정 세그먼트 | `seg-btn-group.seg-btn-front` |
| 수수료율 VAT 기준 등 각 row 내 개별 스위치 | 검정 세그먼트 | 같은 위 |

- **Y/N boolean** 필드(연장검토, 잠금, 자동 갱신 등)는 **라디오 버튼 2개** 로 통일 (도메인 라벨 사용, 예: `검토/미검토`, `잠금/해제`).
- **토글 슬라이드**(`.lock-toggle`) 는 리스트 그리드의 lock 컬럼 같은 인라인 스위치에만 사용. 폼에서는 혼용하지 말 것.

---

## 6. 푸터 (탭별 별도 고정)

- **위치**: **각 `.detail-tab-panel` 내부 하단** — 탭마다 다른 버튼 세트 구성
- 구조:
  ```
  .detail-tab-panel (flex column, height: 100%)
    .detail-tab-content (flex: 1, overflow-y: auto)  ← 스크롤
    .detail-footer (flex-shrink: 0)                  ← 탭별 고정
  ```
- **탭마다 다른 액션**: 기본정보 탭의 [저장/연장/해지/외부연동] vs 연결 제휴점 탭의 [추가/제거] 처럼 맥락별 버튼만 노출
- **구성 순서** (공통):
  - **저장하기** (primary filled) — 제일 먼저
  - 부가 액션 (연장 / 복제 / 재발행 등 outline-primary)
  - 위험 액션 — **계약 해지 / 삭제** 등은 `btn-outline-danger` (빨강)
  - 외부 연동 액션 (정산서 생성 / 바로빌 계정 생성 / 공동인증서 가져오기 등 primary filled)
- `border-top: 1px solid #e8e8e8` 구분선
- **버튼 크기는 전부 `btn-sm`** — 푸터 안에서 사이즈 섞지 말 것

---

## 7. 데이터 로드 / context 전달

- 리스트 → 상세 이동: `TabManager.open({ id: '<domain>-detail', detailOf: '<list tab id>', context: { idx } })`
- 상세 페이지는 `tab:activated` 이벤트에서 `e.detail.context` 읽어 자동 로드
- 수동 조회: 메타바의 PK IDX 입력 + `조회` 버튼으로 재로드. **상세 탭은 idx 별로 새 탭을 만들지 않는다** — 같은 `{domain}-detail` 탭에 덮어쓰기 (공통 정책 §5).
- 로드 실패 시 메타바만 idx 표시 + 필드는 비움, `alert` 안내

---

## 8. 인터랙션 패턴

- **필드 바인딩**: `renderDetail(row)` 함수 하나에서 모든 필드 값 세팅. setRadio / value 직접 세팅 혼용 최소화.
- **VAT 제외↔포함 동기화**: 각 수수료율 행마다 독립 토글. `readOnly` 속성으로 editable 측 스왑.
- **태그 멀티셀렉트**: `tag-select` 컴포넌트 재사용. chip 제거(×) + dropdown 검색 + 선택/해제 토글 지원.
- **푸터 액션**: 아직 API 미연결 상태면 `alert('<액션명> (플레이스홀더)')` stub 로 먼저 배선.
- **프론트 전용 토글**: 저장되지 않음을 툴팁에 **명시** (`프론트 전용 — …`).

---

## 9. 섹션 배치 원칙 (정산계약 상세 기준)

순서가 곧 업무 흐름을 반영한다. 도메인마다 다를 수 있지만 큰 틀은:

1. **식별 정보** (거래처 / 연결 제휴점 수 / 계약명 / 계약 타입 / 태그) — "이 건이 뭐냐"
2. **생성/주기 정보** (정산 주기, 지급일, 증빙 수취 등) — "어떻게 운영되냐"
3. **본문 상세** (기간, 계좌, 메모) — 계속 쓰는 필드
4. **계산 규칙** (수수료 정보) — 돈 관련
5. **첨부자료** — 부속 자료
6. **해지 정보** — 종료 관련 (있을 때만)
7. **시스템 정보** — 생성자/수정자/담당자
8. **외부 연동 정보** (대행업체 정보 등) — 가장 하단, 참고용

---

## 10. 구현 체크리스트

- [ ] 페이지 id = `page-<domain>-detail`, `data-doc="<domain>"`
- [ ] 탭 id = `<domain>-detail` (idx별 개별 탭 X)
- [ ] 메타 바 sticky + 조회 버튼 + Enter 키 동작
- [ ] 탭 바 — 콘텐츠 탭 / 링크 탭 분리 렌더
- [ ] 각 섹션: `.detail-section` + `.detail-section-title` + `.detail-form-grid`
- [ ] 모든 `.df-input` 높이 26px 통일
- [ ] 라디오 그룹 내부 버튼 `min-width: 56px`
- [ ] 설명 텍스트는 `help-tip` 로 이동
- [ ] 푸터는 `.page` 바로 아래 (탭 패널 바깥) — 스크롤 영향 없음
- [ ] 리스트 → 상세 context 전달 + 메타바 자동 채움
- [ ] 필요없는 full-row 는 쓰지 말 것. **1 pair 로 충분하면 1 pair**.

---

*이 문서는 살아있는 문서입니다. 작업하면서 규칙이 바뀌면 이 문서부터 업데이트하고 코드에 반영합니다.*
