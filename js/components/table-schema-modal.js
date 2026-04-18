/**
 * TableSchemaModal — 헤더의 "테이블 정의" 버튼 클릭 시 DB 스키마(영문+한글)를 모달로 표시
 *
 * 데이터 소스:
 *   - docs/common/db-schema.json    (원본 테이블/컬럼)
 *   - docs/common/db-schema-ko.json (한글 번역 / 설명, _common fallback 포함)
 */
(function () {
  const SCHEMA_PATH = 'docs/common/db-schema.json';
  const KO_PATH = 'docs/common/db-schema-ko.json';
  const EDIT_URL_KO = 'https://github.com/bogeun35/VONE2/edit/main/docs/common/db-schema-ko.json';
  let schema = null;
  let ko = null;
  let selectedTable = null;

  function $(id) { return document.getElementById(id); }

  async function loadOnce() {
    if (schema && ko) return;
    try {
      const [sRes, kRes] = await Promise.all([
        fetch(SCHEMA_PATH + '?t=' + Date.now(), { cache: 'no-store' }),
        fetch(KO_PATH + '?t=' + Date.now(), { cache: 'no-store' }),
      ]);
      schema = (await sRes.json()).schema;
      ko = await kRes.json();
    } catch (e) {
      console.error('[TableSchema] load fail', e);
      schema = []; ko = { _common: {}, tables: {} };
    }
  }

  function getTableKo(name) {
    const t = ko.tables[name];
    return (t && t.ko) || '';
  }

  function getColKo(tableName, colName) {
    const t = ko.tables[tableName];
    const fromTable = t && t.columns && t.columns[colName];
    if (fromTable && fromTable.ko) return fromTable;
    const fromCommon = ko._common[colName];
    if (fromCommon) return fromCommon;
    return { ko: '', desc: '' };
  }

  function renderTableList(filter) {
    const listEl = $('tableSchemaList');
    if (!listEl) return;
    const q = (filter || '').trim().toLowerCase();
    const items = schema.filter(t => {
      if (!q) return true;
      const en = t.name.toLowerCase();
      const k = getTableKo(t.name).toLowerCase();
      return en.includes(q) || k.includes(q);
    });
    listEl.innerHTML = items.map(t => {
      const kname = getTableKo(t.name);
      const active = t.name === selectedTable ? ' active' : '';
      return `<div class="ts-item${active}" data-name="${t.name}">
        <span class="ts-item-en">${t.name}</span>
        <span class="ts-item-ko">${kname || '<span class="ts-undef">미확정</span>'}</span>
      </div>`;
    }).join('');
    listEl.querySelectorAll('.ts-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedTable = el.dataset.name;
        renderTableList(filter);
        renderDetail();
      });
    });
  }

  function renderDetail() {
    const detail = $('tableSchemaDetail');
    if (!detail) return;
    if (!selectedTable) {
      detail.innerHTML = '<div class="ts-empty">좌측에서 테이블을 선택하세요.</div>';
      return;
    }
    const t = schema.find(x => x.name === selectedTable);
    if (!t) { detail.innerHTML = '<div class="ts-empty">테이블을 찾을 수 없습니다.</div>'; return; }
    const tKo = ko.tables[selectedTable] || {};
    const pk = t.columns[0];

    const rows = t.columns.map((col, i) => {
      const info = getColKo(selectedTable, col);
      const tag = i === 0
        ? '<span class="ts-tag ts-tag-pk">PK</span>'
        : /Idx$|Seq$/.test(col) && col !== pk
          ? '<span class="ts-tag ts-tag-fk">FK?</span>'
          : '';
      return `<tr>
        <td class="ts-col-no">${i + 1}</td>
        <td class="ts-col-en">${col} ${tag}</td>
        <td class="ts-col-ko">${info.ko || '<span class="ts-undef">미확정</span>'}</td>
        <td class="ts-col-desc">${info.desc || ''}</td>
      </tr>`;
    }).join('');

    detail.innerHTML = `
      <div class="ts-detail-header">
        <h4>${t.name} <span class="ts-detail-ko">${tKo.ko || '<span class="ts-undef">미확정</span>'}</span></h4>
        ${tKo.desc ? `<p class="ts-detail-desc">${tKo.desc}</p>` : ''}
        <div class="ts-detail-meta">컬럼 ${t.columns.length}개 · PK: <code>${pk}</code></div>
      </div>
      <table class="ts-cols-table">
        <thead><tr><th style="width:32px">#</th><th>영문 컬럼</th><th>한글</th><th>설명</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  async function open() {
    const overlay = $('tableSchemaModal');
    if (!overlay) return;
    overlay.classList.add('open');
    const edit = $('tableSchemaEditLink');
    if (edit) edit.href = EDIT_URL_KO;
    await loadOnce();
    if (!selectedTable && schema.length) selectedTable = schema[0].name;
    const filter = $('tableSchemaFilter');
    renderTableList(filter ? filter.value : '');
    renderDetail();
  }
  function close() {
    const overlay = $('tableSchemaModal');
    if (overlay) overlay.classList.remove('open');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('btnOpenTableSchema');
    if (btn) btn.addEventListener('click', open);
    const x = $('tableSchemaClose');
    if (x) x.addEventListener('click', close);
    const overlay = $('tableSchemaModal');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const filter = $('tableSchemaFilter');
    if (filter) filter.addEventListener('input', () => renderTableList(filter.value));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  });

  window.TableSchemaModal = { open, close };
})();
