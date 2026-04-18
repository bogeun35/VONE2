# VONE2 — 작업 가이드 (Claude 용)

> 이 문서는 차회차 작업자(또는 본인 미래)를 위한 **아키텍처 + 컨벤션 + 레시피** 핸드북이다.
> 새 페이지(예: 정산계약관리)를 붙이기 전에 반드시 훑을 것.

---

## 0. 배포 / 리포 기본

- 리포: `bogeun35/VONE2`, 브랜치: `main`
- 호스팅: GitHub Pages (정적). `main` 푸시 = 즉시 배포
- Firebase Auth (Google, `@vendys.co.kr` 만 허용), `planvendys` 프로젝트와 공유
- 컬러 토큰 없이 색상은 CSS 하드코딩 (청록 `#0ea5a0`, 블루 `#2563eb`, 위험 빨강, 일반 검정)
- 한국어 UI, 주석도 한국어

### 버튼 디자인 시스템 (중요 · MEMORY 규칙)
- **파랑 / 빨강 / 검정 3색만** 사용
- **filled** = 실행/이동 (ex: 데이터 조회, 저장, 이체 승인)
- **stroke (outline)** = 모달 오픈 (ex: 필터 초기화, 컬럼 선택)
- **빨강** = 삭제 **전용**
- **검정** = input 옆 검증/검색 보조 버튼

---

## 1. 디렉토리 구조

```
VONE2/
├─ index.html            # 단일 HTML 엔트리. LNB / 탭바 / 페이지 컨테이너 / 모달 포함
├─ css/style.css         # 단일 스타일시트 (모든 컴포넌트)
├─ js/
│  ├─ auth.js            # Firebase Auth + showApp() 부트스트랩
│  ├─ app.js             # LNB 토글, 필터 아코디언, 문서 사이드바, 저장 파이프라인
│  ├─ tab-manager.js     # 탭 바 모델 + 렌더 + 이벤트 (window 'tab:activated')
│  ├─ components/
│  │  ├─ page-stub.js             # LNB → 페이지 자동 생성/전환 (사이트맵 역할)
│  │  ├─ vone-table-filter.js     # AG Grid floating filter — 표현식 기반 (>=100 & <500)
│  │  ├─ grid-template.js         # AG Grid 컬럼 템플릿 저장/복원
│  │  ├─ grid-column-picker.js    # 컬럼 선택 모달
│  │  ├─ grid-range-select.js     # 셀 범위 선택 (AG Grid Community 에 없는 기능)
│  │  ├─ date-input-placeholder.js# <input type="date"> yyyy-mm-dd 플레이스홀더
│  │  └─ doc-editor.js            # Toast UI 기반 MD 에디터 + 이미지 자동 업로드
│  └─ pages/
│     └─ transfer.js     # 이체관리 페이지 — AG Grid 초기화, mock 데이터
├─ docs/
│  ├─ CLAUDE.md          # ← 이 문서
│  ├─ templates/         # 컬럼 템플릿 (JSON)
│  ├─ transfer/          # 이체관리 정책/기획 문서
│  │  ├─ policy.md
│  │  └─ plans/
│  └─ assets/            # MD 에디터 이미지 업로드 타겟 (YYYY-MM/<ts>-<name>.ext)
```

---

## 2. 런타임 흐름

1. `auth.js`: Firebase 인증 대기 → 성공 시 `showApp(user)`
2. `showApp()` 순서:
   ```
   PageStub.boot()      ← LNB 메타 수집 + 'tab:activated' 리스너 등록
   TabManager.boot()    ← localStorage 에서 탭 복원 or 기본 이체관리 탭
                        ← 활성 탭에 대해 'tab:activated' 디스패치
   ```
3. `tab:activated` → `PageStub.showPage(tabId)` → 실제 페이지(`#page-<tabId>`) 없으면 stub 생성, 있으면 표시
4. 이체관리 탭이 첫 활성화되면 `transfer.js` 내부에서 AG Grid 초기화
   - `transferGrid` 셀렉터로 DOM 을 찾아 `new agGrid.Grid(...)`
   - 모든 floating filter 는 VoneTableFilter 로 치환 (단일 텍스트 박스 + 표현식 파서)

### 주요 custom event
| 이름 | 디스패처 | 구독자 | 의미 |
| --- | --- | --- | --- |
| `tab:activated` | TabManager | PageStub, 페이지 구현체 | 탭 전환 |
| `tab:refresh` | TabManager | 페이지 구현체 | 현재 탭 새로고침 |
| `page:shown` | PageStub | (확장용) | 페이지 DOM 이 화면에 표시됨 |

---

## 3. LNB / 페이지 번호

- `<ul class="lnb-menu">` 내 `<li>` **순서** 기반 **CSS counter** (`.lnb-menu { counter-reset }`, `li::before { content: counter() }`)
- 번호를 HTML/JS 에 하드코딩하지 **말 것**. 순서만 바꾸면 자동 재정렬됨
- 번호는 **LNB(사이트맵) 에만** 노출. 탭, 페이지 헤더, breadcrumb 등 어디에도 숫자 표기 X
- LNB 메뉴 추가 규약: `<li><a href="#앵커" data-tab-id="{id}" data-tab-title="{탭 이름}">{본문}</a></li>`

---

## 4. 새 페이지 추가 레시피 (정산계약관리 = `settle-contract-list` 예시)

### A. 빠른 빈 페이지 (Stub 로 충분한 경우)
- 이미 LNB 에 `data-tab-id="settle-contract-list"` 가 있으므로, 클릭만 해도 `PageStub` 가 자동으로 공통 스키마(헤더 + 조건검색 + 테이블 placeholder + 푸터) 를 생성해 보여줌
- 별도 작업 불필요

### B. 실제 페이지 구현
1. `index.html` 의 `<main class="content">` 내부에 실제 마크업 추가:
   ```html
   <div class="page" id="page-settle-contract-list" data-doc="settle-contract" style="display:none">
     <div class="page-header">...</div>
     <div class="filter-box">...</div>
     <div class="grid-section">
       <div class="grid-toolbar">...</div>
       <div id="settleContractGrid" class="ag-theme-alpine grid-container"></div>
     </div>
     <div class="grid-action-footer">...</div>   <!-- 반드시 page 내부 -->
   </div>
   ```
   - **주의**: `id="page-<tabId>"` 규칙. PageStub 가 이 id 로 기존 페이지를 찾는다.
   - **주의**: `grid-action-footer` 는 **반드시 `.page` 안쪽**에 둘 것. 바깥에 두면 페이지 전환 시 다른 페이지에서도 보임

2. `js/pages/settle-contract.js` 생성. 패턴은 `js/pages/transfer.js` 를 복사:
   - `document.getElementById('settleContractGrid')` 로 DOM 확보
   - AG Grid 초기화 시:
     - `defaultColDef: { filter: 'voneTableFilter', floatingFilter: true, suppressHeaderMenuButton: true, ... }`
     - 숫자 컬럼에는 `context: { voneIsNumeric: true }` 를 줘서 필터 박스 우측 정렬
     - `window.gridApi = gridApi;` 로 디버깅 핸들 노출(선택)
   - 페이지가 초기화됐을 때만 동작하도록 `document.getElementById` 가 null 이면 early return
3. `index.html` 끝 `<script>` 목록에 추가:
   ```html
   <script src="js/pages/settle-contract.js"></script>
   ```
4. 정책/기획 문서 추가 (선택):
   - `docs/settle-contract/policy.md`
   - `docs/settle-contract/plans/*.md`
   - `index.html` 의 `data-doc="settle-contract"` 와 매핑됨 (`app.js` 참조)

### C. 공통 조건검색 UI 블록
- `.filter-box > .filter-header + .filter-body`
- `.filter-header-actions` 우측에 **필터 초기화(outline)** + **데이터 조회(filled primary)** 쌍 고정
- 라디오 버튼 그룹은 `<div class="radio-btn-group" data-name="...">` + `.radio-btn[data-value]` (app.js 가 active 토글 바인딩)
- 기간 선택은 `.btn-group-period` + `.date-range` (input type=date, lang="sv-SE") — date-input-placeholder.js 가 yyyy-mm-dd 플레이스홀더 자동 부여

### D. AG Grid 공통
- Community v31.3.2 사용. 엔터프라이즈 기능 금지
- 주의할 옵션:
  - `suppressMenu` → **`suppressHeaderMenuButton`** 로 대체됨 (deprecated)
  - `suppressFloatingFilterButton: true` + CSS `.ag-floating-filter-button { display:none }` (깔때기 아이콘 숨김)
- 커스텀 확장은 `colDef.context.*` 에만 (최상위 `_vone*` 같은 건 경고 나옴)
- 셀 범위 선택은 `grid-range-select.js` 가 Community 에 없는 걸 대체 구현

---

## 5. VoneTableFilter 사용법

```js
colDef: {
  field: 'amount',
  filter: 'voneTableFilter',
  floatingFilter: true,
  context: { voneIsNumeric: true },   // 우측 정렬 + 숫자 힌트
}
```

지원 표현식 (헤더 힌트 팝업이 문법/예제/결과 MD 표로 안내):
- 단순 포함: `12` (문자열 substring / 숫자 equals)
- 비교: `>= 100`, `< 500`, `= 0`
- 범위: `100..500`, `>=100 & <500`
- 여러 값: `서울, 부산` (OR)

**핵심 구현**: `setModel` 에서 필터 식이 바뀌면 `filterChangedCallback` 을 **microtask** 로 호출해 AG Grid 에 재필터를 알림. 이게 없으면 UI 는 바뀌어도 실제 행은 안 걸러진다 (과거 버그).

---

## 6. 문서 사이드바 / Toast UI 에디터

- `btnDocToggle` (페이지 헤더 우측) → `docSidebar` 표시/숨김
- 정책문서(policy.md) / 기획문서(plan) 탭
- 편집 모드: Toast UI Markdown + 실시간 프리뷰
- 이미지 붙여넣기(Ctrl+V) / 드래그&드롭 → GitHub Contents API 로 `docs/assets/YYYY-MM/<ts>-<safename>.<ext>` 에 PUT → raw URL 로 `![](...)` 자동 삽입
- 토큰은 로컬스토리지 `vone:gh:token` (⚙ 버튼으로 등록)

---

## 7. 탭 바

- 상태는 `localStorage` (`vone:tabs:list`, `vone:tabs:activeId`) 에 저장 → 새로고침/재로그인 시 복원
- 조작:
  - 클릭: 활성화 / 더블클릭: 고정 토글 / 가운데 클릭: 닫기 / 우클릭: 컨텍스트 메뉴
  - 우측 버튼: 새로고침 · 전체보기(목록) · **모든 탭 닫기** (고정 탭 유지)
- API: `TabManager.open({id,title})`, `close`, `closeAll`, `activate`, `togglePin`, `refresh`, `getActive`, `getTabs`

---

## 8. 스타일 컨벤션

- 클래스는 kebab-case (`grid-toolbar-left`, `filter-inline-group`)
- 상태 클래스: `.active`, `.open`, `.pinned`, `.is-empty`
- 아이콘은 인라인 SVG (외부 아이콘 라이브러리 없음). `fill="currentColor"` / `stroke="currentColor"` 로 색상은 CSS 상속
- 폰트 크기 12px 기본, 레이블 11px, 뱃지/카운터 10px
- 테이블 숫자는 반드시 `font-variant-numeric: tabular-nums`

---

## 9. 작업할 때 자주 하는 실수

1. `grid-action-footer` 를 페이지 바깥에 두기 → 다른 페이지에서도 보임 (페이지 stub 레이아웃 망가짐)
2. LNB 에 번호를 HTML 로 넣기 → 순서 변경 시 수동 재매김 필요. **CSS counter** 를 믿어라
3. AG Grid `suppressMenu` → 콘솔 경고. `suppressHeaderMenuButton` 쓸 것
4. colDef 최상위에 custom 프로퍼티 → `invalid colDef property` 경고. `context` 로 옮기기
5. VoneTableFilter 에서 `filterChangedCallback` 안 부름 → UI 만 바뀌고 필터 동작 X
6. 탭 이벤트 리스너를 `TabManager.boot()` 이후에 등록 → 최초 `tab:activated` 를 놓침. **boot 이전에 리스너 등록**

---

## 10. 지금부터 할 것 — 정산계약관리 (`settle-contract-list`)

- 현재 상태: LNB 메뉴 #4. 클릭하면 PageStub 가 빈 레이아웃을 보여주는 단계
- 다음 단계 (제안):
  1. `docs/settle-contract/policy.md` 초안 (이체관리와 동일 톤)
  2. `index.html` 에 `<div class="page" id="page-settle-contract-list" data-doc="settle-contract">` 실제 마크업 (조건검색 필드 정의부터)
  3. `js/pages/settle-contract.js` — 컬럼 스키마 + mock row + VoneTableFilter 적용
  4. 필요 시 `docs/templates/정산계약-테이블.json` 템플릿 저장
- 참고 페이지: **이체관리**(`page-transfer` / `transfer.js` / `docs/transfer/policy.md`) 가 유일한 완성 레퍼런스
