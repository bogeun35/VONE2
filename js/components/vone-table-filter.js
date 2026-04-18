/**
 * VoneTableFilter — VoneTable 필터 정책서 기반 공통 커스텀 필터
 *
 * 문법:
 *   텍스트        포함 (대소문자 무시)
 *   "텍스트"       정확히 일치
 *   !텍스트        미포함
 *   !"텍스트"      정확히 일치하지 않음
 *   A|B|C          OR (포함)
 *   >N / >=N / <N / <=N   숫자 비교 (쉼표 자동 제거)
 *   N~M            범위 (N 이상 M 이하)
 *   =              빈 셀
 *   !=             값 있는 셀
 *
 * 사용:
 *   // 컬럼 정의에서
 *   { ..., filter: VoneTableFilter, floatingFilter: true, floatingFilterComponent: VoneTableFloatingFilter }
 *   // 또는 defaultColDef 로 일괄
 *   VoneTableFilter.installAll(columnDefs);
 */
(function () {

  // ========= DSL Parser =========
  function parseNum(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v == null) return null;
    const s = String(v).replace(/,/g, '').trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }
  function toStr(v) { return v == null ? '' : String(v); }

  function parseExpression(raw) {
    if (!raw) return null;
    const e = String(raw).trim();
    if (!e) return null;

    // = (빈 셀)
    if (e === '=') return (v) => v == null || v === '';
    // != (값 있는 셀)
    if (e === '!=') return (v) => !(v == null || v === '');

    // !"정확 불일치"
    const exactNot = e.match(/^!"(.*)"$/);
    if (exactNot) {
      const target = exactNot[1];
      return (v) => toStr(v) !== target;
    }

    // "정확 일치"
    const exact = e.match(/^"(.*)"$/);
    if (exact) {
      const target = exact[1];
      return (v) => toStr(v) === target;
    }

    // 범위: N~M
    const rangeM = e.match(/^(-?[\d,]+(?:\.\d+)?)\s*~\s*(-?[\d,]+(?:\.\d+)?)$/);
    if (rangeM) {
      const lo = parseNum(rangeM[1]);
      const hi = parseNum(rangeM[2]);
      if (lo !== null && hi !== null) {
        const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
        return (v) => {
          const n = parseNum(v);
          return n !== null && n >= a && n <= b;
        };
      }
    }

    // 비교: >= <= > <
    const cmp = e.match(/^(>=|<=|>|<)\s*(-?[\d,]+(?:\.\d+)?)$/);
    if (cmp) {
      const op = cmp[1];
      const num = parseNum(cmp[2]);
      if (num !== null) {
        return (v) => {
          const n = parseNum(v);
          if (n === null) return false;
          if (op === '>=') return n >= num;
          if (op === '<=') return n <= num;
          if (op === '>') return n > num;
          if (op === '<') return n < num;
        };
      }
    }

    // !텍스트 (미포함)
    if (e.startsWith('!') && !e.startsWith('!"')) {
      const needle = e.slice(1).trim().toLowerCase();
      if (needle === '') return null;
      return (v) => !toStr(v).toLowerCase().includes(needle);
    }

    // OR: A|B|C (포함 중 하나)
    if (e.includes('|')) {
      const parts = e.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (parts.length > 0) {
        return (v) => {
          const s = toStr(v).toLowerCase();
          return parts.some(p => s.includes(p));
        };
      }
    }

    // 기본: 포함 (대소문자 무시)
    const needle = e.toLowerCase();
    return (v) => toStr(v).toLowerCase().includes(needle);
  }

  // 디버그 플래그 (콘솔 window.__VONE_FILTER_DEBUG = true 로 켜기)
  function dbg(...args) {
    if (typeof window !== 'undefined' && window.__VONE_FILTER_DEBUG) {
      console.log('[VoneFilter]', ...args);
    }
  }

  // ========= AG Grid 커스텀 Filter =========
  class VoneTableFilter {
    init(params) {
      this.params = params;
      this.expression = '';
      this.predicate = null;
      this.eGui = document.createElement('div');
      this.eGui.className = 'vone-filter-popup';
      this.eGui.innerHTML = '<div style="padding:8px;font-size:11px;color:#888">헤더 아래 입력란을 사용해주세요</div>';
      // 필드 이름 해석: colDef.field > column.getColId()
      const colDef = params.colDef || (params.column && params.column.getColDef && params.column.getColDef());
      this._field = (colDef && colDef.field) || (params.column && params.column.getColId && params.column.getColId()) || null;
      dbg('init', { field: this._field });
    }
    getGui() { return this.eGui; }
    doesFilterPass(params) {
      if (!this.predicate) return true;
      let value;
      if (this.params.valueGetter) {
        try {
          value = this.params.valueGetter({
            node: params.node,
            data: params.data,
            getValue: (f) => params.data ? params.data[f] : undefined,
          });
        } catch (err) {
          value = this._field && params.data ? params.data[this._field] : undefined;
        }
      } else if (this._field && params.data) {
        value = params.data[this._field];
      }
      const pass = this.predicate(value);
      if (typeof window !== 'undefined' && window.__VONE_FILTER_DEBUG) {
        if (!window.__voneFilterCalls) window.__voneFilterCalls = 0;
        if (window.__voneFilterCalls < 3) {
          console.log('[VoneFilter] doesFilterPass', { field: this._field, value, expr: this.expression, pass });
          window.__voneFilterCalls++;
        }
      }
      return pass;
    }
    isFilterActive() { return this.predicate !== null; }
    getModel() { return this.expression ? { expr: this.expression } : null; }
    setModel(model) {
      const expr = model && typeof model === 'object' ? model.expr : '';
      const newExpr = expr || '';
      const changed = newExpr !== this.expression;
      this.expression = newExpr;
      this.predicate = parseExpression(this.expression);
      dbg('setModel', { field: this._field, expr: this.expression, active: this.predicate !== null, changed });
      // AG Grid 에 필터 상태 변경 알림 (이게 빠지면 re-filter 트리거 안 될 수 있음)
      if (changed && this.params && typeof this.params.filterChangedCallback === 'function') {
        // 동기 호출 피하기 위해 microtask 로
        Promise.resolve().then(() => {
          try { this.params.filterChangedCallback(); } catch (e) { dbg('filterChangedCallback error', e); }
        });
      }
    }
    destroy() {}
  }

  // ========= AG Grid 커스텀 Floating Filter =========
  class VoneTableFloatingFilter {
    init(params) {
      this.params = params;
      const colDef = params.column.getColDef();
      const isNumeric =
        (colDef.context && colDef.context.voneIsNumeric === true) ||
        (colDef.cellStyle && typeof colDef.cellStyle === 'object' && colDef.cellStyle.textAlign === 'right') ||
        (typeof colDef.cellStyle === 'function'); // 오른쪽 정렬 함수도 숫자 취급

      this.eGui = document.createElement('div');
      this.eGui.className = 'vone-floating-filter-wrap';

      this.input = document.createElement('input');
      this.input.type = 'text';
      this.input.className = 'vone-floating-filter';
      this.input.placeholder = '';
      this.input.spellcheck = false;
      this.input.autocomplete = 'off';
      // 숫자 컬럼은 시각적으로 우측정렬
      if (isNumeric) this.input.classList.add('is-numeric');

      this.eGui.appendChild(this.input);

      this._timer = null;
      this.input.addEventListener('input', () => {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.applyFilter(), 150);
      });
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(this._timer);
          this.applyFilter();
        } else if (e.key === 'Escape') {
          this.input.value = '';
          this.applyFilter();
        }
      });
    }
    applyFilter() {
      const val = this.input.value;
      const colId = this.params.column.getColId();
      dbg('applyFilter', { colId, val });
      const cb = (instance) => {
        if (!instance) {
          dbg('applyFilter: parent instance null', { colId });
          return;
        }
        try {
          instance.setModel(val ? { expr: val } : null);
        } catch (e) {
          dbg('setModel error', e);
        }
        // onFilterChanged 로 재평가 트리거
        try { this.params.api.onFilterChanged(); } catch (e) { dbg('onFilterChanged error', e); }
      };
      // v31 에서는 Promise 가 반환되는 경우도 있고 콜백 방식도 지원
      try {
        const maybePromise = this.params.parentFilterInstance(cb);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(cb).catch((e) => dbg('parentFilterInstance promise err', e));
        }
      } catch (e) {
        dbg('parentFilterInstance throw', e);
      }
    }
    onParentModelChanged(parentModel) {
      const v = parentModel?.expr || '';
      if (this.input.value !== v) this.input.value = v;
    }
    getGui() { return this.eGui; }
    destroy() { clearTimeout(this._timer); }
  }

  // ========= 헬퍼 =========
  // columnDefs 배열의 각 컬럼에 Vone 필터를 일괄 적용
  // 숫자 여부를 colDef 외부에 저장 (AG Grid 가 알 수 없는 프로퍼티로 경고를 내지 않도록)
  const _numericMap = new WeakMap();
  function installAll(columnDefs, options = {}) {
    const { exclude = [] } = options;
    const excludeSet = new Set(exclude);
    columnDefs.forEach(c => {
      if (!c.field && !c.colId) return;
      const id = c.colId || c.field;
      if (excludeSet.has(id)) return;
      // 숫자/오른쪽 정렬 컬럼 표시
      const isNumeric =
        c.filter === 'agNumberColumnFilter' ||
        (c.cellStyle && typeof c.cellStyle === 'object' && c.cellStyle.textAlign === 'right') ||
        (c.headerClass && String(c.headerClass).includes('header-right'));
      _numericMap.set(c, isNumeric);
      // context 에 담아 두면 column.getColDef().context 로 런타임에 접근 가능
      c.context = Object.assign({}, c.context || {}, { voneIsNumeric: isNumeric });
      c.filter = VoneTableFilter;
      c.floatingFilter = true;
      c.floatingFilterComponent = VoneTableFloatingFilter;
      c.suppressHeaderMenuButton = true;
      c.suppressFloatingFilterButton = true;
    });
  }

  // `?` 힌트 버튼을 특정 컬럼(id)의 floating filter 자리에 주입
  function installHintHeader(columnDefs, hintColId) {
    const col = columnDefs.find(c => (c.colId || c.field) === hintColId);
    if (!col) return;
    col.floatingFilterComponent = VoneHintFloatingFilter;
    col.floatingFilter = true;
    // filter 가 없어도 floatingFilter 뜨도록
    if (!col.filter) col.filter = VoneTableFilter;
    col.suppressHeaderMenuButton = true;
    col.suppressFloatingFilterButton = true;
  }

  // 힌트 floating filter — `?` 버튼 + hover 툴팁
  class VoneHintFloatingFilter {
    init() {
      this.eGui = document.createElement('div');
      this.eGui.className = 'vone-floating-filter-wrap vone-hint-wrap';
      this.eGui.innerHTML = `
        <button class="vone-hint-btn" type="button" aria-label="필터 문법 도움말">?</button>
        <div class="vone-hint-popup" role="tooltip">
          <div class="vone-hint-title">VoneTable 필터 문법</div>
          <table class="vone-hint-table vone-hint-md">
            <thead>
              <tr><th>문법</th><th>입력 예시</th><th>결과 (13행)</th></tr>
            </thead>
            <tbody>
              <tr><td>포함</td><td><code>settleName</code> 에 <code>식당</code></td><td>13 → 1</td></tr>
              <tr><td>정확 일치</td><td><code>settleName</code> 에 <code>"한라식당"</code></td><td>0 (데이터 없음)</td></tr>
              <tr><td>미포함</td><td><code>status</code> 에 <code>!이체 성공</code></td><td>13 → 5</td></tr>
              <tr><td>OR</td><td><code>status</code> 에 <code>이체 실패|이체 대기</code></td><td>13 → 3</td></tr>
              <tr><td>비교</td><td><code>transferAmount</code> 에 <code>&gt;1000000</code></td><td>13 → 5</td></tr>
              <tr><td>범위</td><td><code>transferAmount</code> 에 <code>500000~2000000</code></td><td>13 → 5</td></tr>
              <tr><td>빈 셀</td><td><code>paidAt</code> 에 <code>=</code></td><td>13 → 4</td></tr>
              <tr><td>값 있음</td><td><code>paidAt</code> 에 <code>!=</code></td><td>13 → 9 (4+9=13 ✓)</td></tr>
              <tr class="vone-hint-and"><td>AND 결합</td><td><code>status=이체 성공</code> + <code>transferAmount&gt;500000</code></td><td>8·7 교집합 = 6</td></tr>
            </tbody>
          </table>
          <div class="vone-hint-footer">여러 컬럼 조건은 <b>AND</b> 로 결합 · 대소문자 무시 · 숫자 쉼표 자동 제거</div>
        </div>
      `;
    }
    getGui() { return this.eGui; }
    onParentModelChanged() {}
    destroy() {}
  }

  // 전역 노출
  window.VoneTableFilter = VoneTableFilter;
  window.VoneTableFloatingFilter = VoneTableFloatingFilter;
  window.VoneTableFilterLib = {
    parseExpression,
    installAll,
    installHintHeader,
    Filter: VoneTableFilter,
    FloatingFilter: VoneTableFloatingFilter,
    HintFloatingFilter: VoneHintFloatingFilter,
  };
})();
