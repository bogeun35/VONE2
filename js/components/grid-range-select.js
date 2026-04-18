/**
 * GridRangeSelect — AG Grid Community 에서 엔터프라이즈 기능 대체 구현
 *   1) 셀 드래그 블록 선택 (Shift+클릭으로 확장)
 *   2) Ctrl+C 로 TSV 복사 (엑셀 붙여넣기 호환)
 *   3) Ctrl+V 로 TSV 일괄 붙여넣기 (블록 크기만큼 반복 없이, 클립보드 모양대로 확장)
 *   4) 블록 선택 시 상태바에 셀수 / 숫자셀 / 합계 / 평균 / 최소 / 최대 표시
 *
 * 사용:
 *   GridRangeSelect.attach({ gridDiv, gridApi, statusEl })
 *     statusEl: 합계/평균을 렌더할 DOM (선택)
 */
(function () {
  function attach({ gridDiv, gridApi, statusEl }) {
    if (!gridDiv || !gridApi) return;

    let rangeStart = null; // { rowIndex, colId }
    let rangeEnd = null;
    let dragging = false;

    function displayedColIds() {
      return gridApi.getAllDisplayedColumns().map(c => c.getColId());
    }

    function colIdxRange() {
      const cols = displayedColIds();
      const a = cols.indexOf(rangeStart.colId);
      const b = cols.indexOf(rangeEnd.colId);
      return [Math.min(a, b), Math.max(a, b), cols];
    }
    function rowRange() {
      return [
        Math.min(rangeStart.rowIndex, rangeEnd.rowIndex),
        Math.max(rangeStart.rowIndex, rangeEnd.rowIndex),
      ];
    }
    function isSingleCell() {
      return rangeStart && rangeEnd
        && rangeStart.rowIndex === rangeEnd.rowIndex
        && rangeStart.colId === rangeEnd.colId;
    }

    function clearHighlight() {
      gridDiv.querySelectorAll('.ag-cell.cell-range-selected').forEach(c => c.classList.remove('cell-range-selected'));
      gridDiv.querySelectorAll('.ag-cell.cell-range-anchor').forEach(c => c.classList.remove('cell-range-anchor'));
    }

    // AG Grid 의 포커스 셀을 rangeEnd 와 동기화 — 블록 끝 = 커서가 되도록
    function syncFocusToRangeEnd() {
      if (!rangeEnd) return;
      try {
        gridApi.setFocusedCell(rangeEnd.rowIndex, rangeEnd.colId);
      } catch {}
    }

    function updateHighlight() {
      clearHighlight();
      if (!rangeStart || !rangeEnd) {
        renderStatus(null);
        return;
      }
      const [rs, re] = rowRange();
      const [ca, cb, cols] = colIdxRange();
      const colSet = new Set(cols.slice(ca, cb + 1));

      gridDiv.querySelectorAll('.ag-row').forEach(rowEl => {
        const ri = parseInt(rowEl.getAttribute('row-index'), 10);
        if (Number.isNaN(ri) || ri < rs || ri > re) return;
        rowEl.querySelectorAll('.ag-cell').forEach(cellEl => {
          const cid = cellEl.getAttribute('col-id');
          if (colSet.has(cid)) {
            cellEl.classList.add('cell-range-selected');
            if (ri === rangeStart.rowIndex && cid === rangeStart.colId) {
              cellEl.classList.add('cell-range-anchor');
            }
          }
        });
      });
      computeStatus();
    }

    // ===== 상태바 계산 =====
    function computeStatus() {
      if (!statusEl) return;
      const [rs, re] = rowRange();
      const [ca, cb, cols] = colIdxRange();
      const colIds = cols.slice(ca, cb + 1);
      let count = 0;
      const nums = [];
      for (let r = rs; r <= re; r++) {
        const node = gridApi.getDisplayedRowAtIndex(r);
        if (!node) continue;
        colIds.forEach(cid => {
          count++;
          const raw = node.data ? node.data[cid] : null;
          const n = toNumber(raw);
          if (n !== null) nums.push(n);
        });
      }
      const sum = nums.reduce((a, b) => a + b, 0);
      renderStatus({
        count,
        numericCount: nums.length,
        sum,
        avg: nums.length ? sum / nums.length : null,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
      });
    }
    function toNumber(v) {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/,/g, '').trim();
        if (cleaned === '') return null;
        const n = Number(cleaned);
        return Number.isNaN(n) ? null : n;
      }
      return null;
    }
    function fmt(n) {
      if (n === null || n === undefined) return '-';
      if (Number.isInteger(n)) return n.toLocaleString();
      return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    function renderStatus(s) {
      if (!statusEl) return;
      if (!s || s.count <= 1) {
        statusEl.style.display = 'none';
        statusEl.innerHTML = '';
        return;
      }
      statusEl.style.display = 'inline-flex';
      statusEl.innerHTML = `
        <span class="range-stat"><span class="range-stat-label">셀</span> ${s.count}</span>
        ${s.numericCount > 0 ? `
          <span class="range-stat"><span class="range-stat-label">숫자셀</span> ${s.numericCount}</span>
          <span class="range-stat"><span class="range-stat-label">합계</span> ${fmt(s.sum)}</span>
          <span class="range-stat"><span class="range-stat-label">평균</span> ${fmt(s.avg)}</span>
          <span class="range-stat"><span class="range-stat-label">최소</span> ${fmt(s.min)}</span>
          <span class="range-stat"><span class="range-stat-label">최대</span> ${fmt(s.max)}</span>
        ` : ''}
      `;
    }

    // ===== 마우스 드래그로 범위 선택 =====
    gridDiv.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const cell = e.target.closest('.ag-cell');
      const row = e.target.closest('.ag-row');
      if (!cell || !row) return;
      // 체크박스/버튼/링크 상호작용은 간섭하지 않음
      if (e.target.closest('input, button, a.grid-link, a')) return;
      // 헤더 컨텍스트 메뉴 영역은 스킵
      if (e.target.closest('.ag-header-cell')) return;

      const rowIndex = parseInt(row.getAttribute('row-index'), 10);
      const colId = cell.getAttribute('col-id');
      if (Number.isNaN(rowIndex) || !colId) return;

      if (e.shiftKey && rangeStart) {
        rangeEnd = { rowIndex, colId };
      } else {
        rangeStart = { rowIndex, colId };
        rangeEnd = { rowIndex, colId };
      }
      dragging = true;
      syncFocusToRangeEnd();
      updateHighlight();
    });

    gridDiv.addEventListener('mouseover', (e) => {
      if (!dragging) return;
      const cell = e.target.closest('.ag-cell');
      const row = e.target.closest('.ag-row');
      if (!cell || !row) return;
      const rowIndex = parseInt(row.getAttribute('row-index'), 10);
      const colId = cell.getAttribute('col-id');
      if (Number.isNaN(rowIndex) || !colId) return;
      if (rangeEnd && rangeEnd.rowIndex === rowIndex && rangeEnd.colId === colId) return;
      rangeEnd = { rowIndex, colId };
      syncFocusToRangeEnd();
      updateHighlight();
    });

    document.addEventListener('mouseup', () => { dragging = false; });

    // 스크롤/모델 변경 시 하이라이트 재적용 (가상화 복원)
    gridApi.addEventListener && gridApi.addEventListener('bodyScroll', () => {
      requestAnimationFrame(() => { if (rangeStart) updateHighlight(); });
    });
    gridApi.addEventListener && gridApi.addEventListener('modelUpdated', () => {
      requestAnimationFrame(() => { if (rangeStart) updateHighlight(); });
    });

    // ===== 키보드 (capture 단계로 AG Grid 기본 핸들러보다 먼저 처리) =====
    const ARROW_DELTA = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    const keyHandler = (e) => {
      // 입력 중인 필드는 건너뜀
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      // 그리드 위 또는 그리드 내부 포커스일 때만 반응
      const hoverOrFocused = gridDiv.matches(':hover') || gridDiv.contains(document.activeElement);
      if (!hoverOrFocused) return;

      // Esc — 선택 해제
      if (e.key === 'Escape' && rangeStart) {
        rangeStart = rangeEnd = null;
        clearHighlight();
        renderStatus(null);
        return;
      }

      // Ctrl+A — 보이는 행 × 보이는 열 전체 선택
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        const cols = displayedColIds();
        const rowCount = gridApi.getDisplayedRowCount();
        if (!cols.length || !rowCount) return;
        rangeStart = { rowIndex: 0, colId: cols[0] };
        rangeEnd = { rowIndex: rowCount - 1, colId: cols[cols.length - 1] };
        syncFocusToRangeEnd();
        updateHighlight();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Shift+Arrow / Ctrl+Shift+Arrow — 블록 확장/축소
      if (e.shiftKey && ARROW_DELTA[e.key]) {
        // range 없으면 AG Grid 포커스 셀을 앵커로 삼아 생성
        if (!rangeStart) {
          const fc = gridApi.getFocusedCell && gridApi.getFocusedCell();
          if (fc) {
            rangeStart = { rowIndex: fc.rowIndex, colId: fc.column.getColId() };
            rangeEnd = { ...rangeStart };
          } else {
            return;
          }
        }
        const [dr, dc] = ARROW_DELTA[e.key];
        const cols = displayedColIds();
        const rowCount = gridApi.getDisplayedRowCount();
        const curRow = rangeEnd.rowIndex;
        const curColIdx = cols.indexOf(rangeEnd.colId);
        let newRow = curRow, newColIdx = curColIdx;

        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Shift+Arrow → 데이터 끝(또는 처음)으로 점프
          if (dr < 0) newRow = 0;
          else if (dr > 0) newRow = rowCount - 1;
          if (dc < 0) newColIdx = 0;
          else if (dc > 0) newColIdx = cols.length - 1;
        } else {
          // Shift+Arrow → 한 칸 이동 (rangeEnd 기준이므로 rangeStart 반대 방향이면 축소)
          newRow = Math.max(0, Math.min(rowCount - 1, curRow + dr));
          newColIdx = Math.max(0, Math.min(cols.length - 1, curColIdx + dc));
        }
        rangeEnd = { rowIndex: newRow, colId: cols[newColIdx] };
        syncFocusToRangeEnd();
        // 확장된 끝을 화면에 보이게 스크롤
        try { gridApi.ensureIndexVisible(newRow); } catch {}
        try { gridApi.ensureColumnVisible(cols[newColIdx]); } catch {}
        requestAnimationFrame(updateHighlight);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Arrow만 (Shift 없이) — AG Grid 기본 포커스 이동에 맡기되 rangeStart 는 해제하고 새 rangeEnd 에 붙임
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && ARROW_DELTA[e.key] && rangeStart) {
        // rangeStart 가 여러 셀이었다면 축소 → 단일셀 상태로 전환
        const fc = gridApi.getFocusedCell && gridApi.getFocusedCell();
        if (fc) {
          // AG Grid 가 포커스를 옮기고 나면 그 다음 tick 에 range 를 단일 셀로 재설정
          setTimeout(() => {
            const fc2 = gridApi.getFocusedCell && gridApi.getFocusedCell();
            if (!fc2) return;
            rangeStart = { rowIndex: fc2.rowIndex, colId: fc2.column.getColId() };
            rangeEnd = { ...rangeStart };
            updateHighlight();
          }, 0);
        }
      }
    };
    document.addEventListener('keydown', keyHandler, true); // capture = true

    // ===== 전체 복사 (헤더 포함 TSV → 클립보드) =====
    async function copyAll({ includeHeaders = true, onlyFiltered = true } = {}) {
      const cols = gridApi.getAllDisplayedColumns()
        .filter(c => !String(c.getColId()).startsWith('_'));
      const colIds = cols.map(c => c.getColId());
      const headers = cols.map(c => c.getColDef().headerName || c.getColId());
      const lines = [];
      if (includeHeaders) lines.push(headers.join('\t'));

      const walker = onlyFiltered ? 'forEachNodeAfterFilterAndSort' : 'forEachNode';
      let rows = 0;
      gridApi[walker](node => {
        if (!node.data) return;
        lines.push(colIds.map(cid => {
          const v = node.data[cid];
          return v == null ? '' : String(v).replace(/\t|\r?\n/g, ' ');
        }).join('\t'));
        rows++;
      });

      const text = lines.join('\n');
      try {
        await navigator.clipboard.writeText(text);
        flashToast(`전체 ${rows}행 × ${colIds.length}열 복사됨`);
      } catch (err) {
        // 폴백: 숨겨진 textarea 로 execCommand 복사
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); flashToast(`전체 ${rows}행 × ${colIds.length}열 복사됨 (fallback)`); }
        catch (e2) { flashToast('복사 실패 — 브라우저 권한을 확인해주세요'); }
        ta.remove();
      }
    }

    // ===== 복사 (TSV) =====
    document.addEventListener('copy', (e) => {
      if (!rangeStart) return;
      if (!gridDiv.matches(':hover') && !gridDiv.contains(document.activeElement)) return;
      // input/textarea 포커스 중이면 기본 복사 우선
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;

      const [rs, re] = rowRange();
      const [ca, cb, cols] = colIdxRange();
      const colIds = cols.slice(ca, cb + 1);
      const lines = [];
      for (let r = rs; r <= re; r++) {
        const node = gridApi.getDisplayedRowAtIndex(r);
        if (!node) continue;
        lines.push(colIds.map(cid => {
          const v = node.data ? node.data[cid] : '';
          return v == null ? '' : String(v).replace(/\t|\r?\n/g, ' ');
        }).join('\t'));
      }
      e.clipboardData.setData('text/plain', lines.join('\n'));
      e.preventDefault();
      flashToast(`${lines.length}행 × ${colIds.length}열 복사됨`);
    });

    // ===== 붙여넣기 (TSV 일괄) =====
    document.addEventListener('paste', (e) => {
      if (!rangeStart) return;
      if (!gridDiv.matches(':hover') && !gridDiv.contains(document.activeElement)) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;

      const text = e.clipboardData.getData('text');
      if (!text) return;
      e.preventDefault();

      // 파싱: 탭/줄바꿈 구분
      const rows = text.replace(/\r/g, '').split('\n');
      // 마지막 빈 줄 제거
      while (rows.length && rows[rows.length - 1] === '') rows.pop();
      const matrix = rows.map(line => line.split('\t'));

      const [rs] = rowRange();
      const cols = displayedColIds();
      const csi = cols.indexOf(rangeStart.colId);
      if (csi < 0) return;

      // 붙여넣기 영역이 선택된 블록보다 작을 때: 클립보드 모양대로만 쓴다
      // 더 클 때: 클립보드 모양대로 확장
      const updates = [];
      let wroteCells = 0;
      matrix.forEach((vals, r) => {
        const node = gridApi.getDisplayedRowAtIndex(rs + r);
        if (!node) return;
        vals.forEach((v, c) => {
          const colId = cols[csi + c];
          if (!colId) return;
          // 값 형 변환: 원본이 number 였으면 number, commas 제거
          const orig = node.data ? node.data[colId] : undefined;
          let parsed = v;
          if (typeof orig === 'number') {
            const n = Number(v.replace(/,/g, '').trim());
            parsed = Number.isNaN(n) ? v : n;
          }
          node.data[colId] = parsed;
          wroteCells++;
        });
        updates.push(node.data);
      });
      if (updates.length) gridApi.applyTransaction({ update: updates });

      // 붙여넣은 영역으로 range 확장
      const lastRow = rs + matrix.length - 1;
      const lastColIdx = Math.min(csi + (matrix[0]?.length || 1) - 1, cols.length - 1);
      rangeEnd = { rowIndex: lastRow, colId: cols[lastColIdx] };
      updateHighlight();
      flashToast(`${matrix.length}행 × ${matrix[0]?.length || 0}열 붙여넣음 (${wroteCells}셀)`);
    });

    // ===== 토스트 =====
    function flashToast(msg) {
      let t = document.getElementById('gridRangeToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'gridRangeToast';
        t.className = 'grid-range-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('visible');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('visible'), 1600);
    }

    // 초기: range 없음
    renderStatus(null);

    return {
      clear: () => {
        rangeStart = rangeEnd = null;
        clearHighlight();
        renderStatus(null);
      },
      getRange: () => rangeStart && rangeEnd ? { start: { ...rangeStart }, end: { ...rangeEnd } } : null,
      copyAll,
    };
  }

  window.GridRangeSelect = { attach };
})();
