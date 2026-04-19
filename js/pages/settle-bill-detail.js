// ===== 정산서 상세 (settle-bill-detail) =====
// 정책: docs/common/detail-policy.md · docs/common/policy.md
// 패턴: settle-contract-detail.js 참조

(function () {
  const PAGE_ID = 'page-settle-bill-detail';
  const TAB_ID = 'settle-bill-detail';
  let currentCtx = null;

  function fmtDateTime(s) { return s ? String(s).replace('T', ' ') : ''; }

  // settle-list rawRows 에서 idx 로 조회
  function loadBill(idx) {
    const rows = (window.SettleList && window.SettleList._rows) || [];
    return rows.find(r => String(r.idx) === String(idx));
  }

  function monthLabel(startAt) {
    if (!startAt) return '';
    const [y, m] = String(startAt).split('-');
    return `${String(y).slice(2)}년 ${parseInt(m, 10)}월`;
  }

  function renderMeta(row) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v != null ? v : ''; };
    if (!row) {
      ['sbdMetaIdx','sbdMetaMonth','sbdMetaStatus','sbdMetaContractIdx','sbdMetaContractName','sbdMetaContractCtype','sbdMetaPartnerIdx','sbdMetaBizNo'].forEach(id => set(id, ''));
      return;
    }
    set('sbdMetaIdx', row.idx);
    set('sbdMetaMonth', monthLabel(row.startAt));
    set('sbdMetaStatus', row.status);
    set('sbdMetaContractIdx', row.contractIdx);
    set('sbdMetaContractName', row.contractName);
    set('sbdMetaContractCtype', row.ctype || '');
    set('sbdMetaPartnerIdx', row.partnerIdx);
    set('sbdMetaBizNo', row.bizNo);
  }

  // 태그 멀티선택
  const TAG_OPTIONS = ['기타비용', '로봇', '이용료', '기기수수료'];
  const _tagState = new Set();
  function renderTagSelect(initial) {
    _tagState.clear(); (initial || []).forEach(t => _tagState.add(t));
    const wrap = document.querySelector('#page-settle-bill-detail .tag-select[data-name="sbdTags"]');
    if (!wrap) return;
    const chips = wrap.querySelector('.tag-select-chips');
    const input = wrap.querySelector('.tag-select-input');
    const dropdown = wrap.querySelector('.tag-select-dropdown');
    function renderChips() {
      chips.innerHTML = Array.from(_tagState).map(t =>
        `<span class="tag-select-chip">${t}<span class="tag-select-chip-x" data-v="${t}">×</span></span>`
      ).join('');
    }
    function renderDropdown() {
      const q = input.value.trim().toLowerCase();
      const items = TAG_OPTIONS.filter(t => !q || t.toLowerCase().includes(q));
      dropdown.innerHTML = items.length
        ? items.map(t => `<div class="tag-select-item${_tagState.has(t) ? ' selected' : ''}" data-v="${t}">${t}</div>`).join('')
        : '<div class="tag-select-empty">일치 결과 없음</div>';
    }
    if (!wrap.dataset.bound) {
      wrap.dataset.bound = '1';
      input.addEventListener('focus', () => { wrap.classList.add('open'); renderDropdown(); dropdown.style.display = 'block'; });
      input.addEventListener('input', renderDropdown);
      wrap.addEventListener('click', (e) => {
        if (e.target.closest('.tag-select-chip-x')) { _tagState.delete(e.target.dataset.v); renderChips(); renderDropdown(); return; }
        if (e.target.closest('.tag-select-item')) {
          const v = e.target.closest('.tag-select-item').dataset.v;
          if (_tagState.has(v)) _tagState.delete(v); else _tagState.add(v);
          renderChips(); renderDropdown(); input.focus(); return;
        }
        if (e.target === wrap || e.target.closest('.tag-select-control')) input.focus();
      });
      document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) { wrap.classList.remove('open'); dropdown.style.display = 'none'; } });
    }
    renderChips();
  }

  function setRadio(groupName, value) {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    const group = page.querySelector(`.radio-btn-group[data-name="${groupName}"], .seg-btn-group[data-name="${groupName}"]`);
    if (!group) return;
    group.querySelectorAll('.radio-btn, .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.value === value);
    });
  }

  function fillStaticSelects() {
    const bankOpts = [
      '한국씨티은행 / 104730802402 / 주식회사 현대벤디스 / 식권대장',
      '우리은행 / 1005702490310 / 주식회사 현대벤디스 / 식권대장 외 매입지급용',
      '신한은행 / 140013837960 / 주식회사 현대벤디스 / 식권대장',
    ].map(v => `<option>${v}</option>`).join('');
    ['sbdVendysWithdraw', 'sbdVendysDeposit'].forEach(id => { const el = document.getElementById(id); if (el && !el.children.length) el.innerHTML = bankOpts; });
    const settleBankOpts = ['신한은행', '국민은행', '우리은행', '농협은행', 'KEB하나은행', '케이뱅크'].map(v => `<option>${v}</option>`).join('');
    const sb = document.getElementById('sbdAcctBank'); if (sb && !sb.children.length) sb.innerHTML = settleBankOpts;
  }

  function renderDetail(row) {
    if (!row) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v != null ? v : ''; };

    // 1. 정산 기준 정보
    set('sbdStartAt', row.startAt);
    set('sbdEndAt', row.endAt);
    renderTagSelect(Array.isArray(row.tags) ? row.tags : []);
    setRadio('sbdFeeCalc', 'TXN');
    const pointExcl = (row.feeAmount && row.tradeAmount) ? (row.feeAmount / row.tradeAmount * 100) : 3;
    const payExcl = 3;  // mock
    set('sbdPointFeeExcl', pointExcl.toFixed(2));
    set('sbdPointFeeIncl', (pointExcl * 1.1).toFixed(2));
    document.getElementById('sbdPointFeeDb').textContent = `DB: ${pointExcl.toFixed(1)}%`;
    set('sbdPayFeeExcl', payExcl.toFixed(2));
    set('sbdPayFeeIncl', (payExcl * 1.1).toFixed(2));
    document.getElementById('sbdPayFeeDb').textContent = `DB: ${payExcl.toFixed(1)}%`;
    setRadio('sbdLocked', row.locked ? 'Y' : 'N');
    set('sbdMemo', row.settleMemo || '');

    // 2. 계약 정보 (snapshot mock)
    set('sbdCycleType', '정기');
    set('sbdCycleDay', '1 일');
    set('sbdPayDay', '지정일');
    set('sbdEvWriteOpt', '주기 종료일');
    set('sbdPayBase', '지정일');
    set('sbdHolidayAdj', '전날');

    // 3. 정산 증빙 정보
    setRadio('sbdProofOffset', row.proofOffset || '상계');
    const mappedProof = row.proofType === '전자세금용 인증서 등록' ? '시스템 발행' : (row.proofType || '시스템 발행');
    setRadio('sbdProofType', mappedProof);
    setRadio('sbdLinkType', row.linkType || 'BAROBILL');
    set('sbdWriteAt', row.writeAt);
    set('sbdIssueAt', fmtDateTime(row.issueAt));
    set('sbdSendAt', fmtDateTime(row.sendAt));

    // 4. 정산 지급 정보
    setRadio('sbdTransferOffset', row.transferOffset || '상계');
    set('sbdPayDueDate', row.payDueDate);
    const bankEl = document.getElementById('sbdAcctBank'); if (bankEl && row.acctBank) bankEl.value = row.acctBank;
    set('sbdAcctNo', row.acctNo);
    set('sbdAcctOwner', row.acctOwner);
    set('sbdWithdrawRemark', `S${String(row.idx).padStart(8, '0')}`);
    set('sbdDepositRemark', '');

    // 6. 공급자 거래처 정보 (mock enrichment)
    const addressPool = [
      '서울특별시 강서구 양천로 570,2층 212호',
      '서울시 성동구 왕십리로 456 3층',
      '경기도 성남시 분당구 판교로 100',
      '서울시 종로구 종로 12 5층',
      '서울시 마포구 독막로 78 2층',
    ];
    const itemPool = ['한식', '음식점업', '도소매업', '운수업', '서비스업'];
    const categoryPool = ['음식점업', '정보통신업', '도매 및 소매업', '운수 및 창고업', '전문 서비스업'];
    const pick = (arr) => arr[(row.partnerIdx || 0) % arr.length];
    set('sbdBizIdx', row.partnerIdx);
    set('sbdBizName', row.partnerName);
    set('sbdBizClosed', row.closedAt || '');
    set('sbdBizNumber', row.bizNo);
    set('sbdBizSubNumber', '0000');
    set('sbdBizCeo', row.ceoName);
    set('sbdBizPhone', '-');
    set('sbdBizEmail', '-');
    set('sbdBizItem', pick(itemPool));
    set('sbdBizCategory', pick(categoryPool));
    set('sbdBizAddress', pick(addressPool));

    // 7. 시스템 정보 (mock)
    set('sbdCreatedAt', row.writeAt ? row.writeAt + ' 00:04' : '');
    set('sbdCreatedBy', '');
    set('sbdCreatedById', 'SYSTEM');
    set('sbdUpdatedAt', fmtDateTime(row.sendAt) || fmtDateTime(row.issueAt) || '');
    set('sbdUpdatedBy', '정보근');
    set('sbdUpdatedById', '26F31CB6-B1C6-F721-34DC-66D40CF46709');
  }

  function showPanel(panelName) {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    page.querySelectorAll('.detail-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === panelName));
    page.querySelectorAll('.detail-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === panelName));
  }

  function handleLinkTab(link) {
    if (!window.TabManager) return;
    if (link === 'contract') {
      const cIdx = currentCtx && currentCtx.contractIdx;
      if (!cIdx) { alert('조회된 정산서가 없습니다.'); return; }
      window.TabManager.open({ id: 'settle-contract-detail', title: '정산계약 상세', detailOf: TAB_ID, context: { idx: cIdx } });
    } else if (link === 'partner') {
      const pIdx = currentCtx && currentCtx.partnerIdx;
      if (!pIdx) { alert('조회된 정산서가 없습니다.'); return; }
      window.TabManager.open({ id: 'biz-account-detail', title: '거래처 상세', detailOf: TAB_ID, context: { bizAccountIdx: pIdx } });
    }
  }

  function bindRadioClicks() {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    page.querySelectorAll('.radio-btn-group, .seg-btn-group').forEach(group => {
      group.querySelectorAll('.radio-btn, .seg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          group.querySelectorAll('.radio-btn, .seg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    });
  }

  let bound = false;
  function bindOnce() {
    if (bound) return;
    const page = document.getElementById(PAGE_ID);
    if (!page) return;

    fillStaticSelects();
    bindRadioClicks();

    // 탭 클릭
    page.querySelectorAll('.detail-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.link) { handleLinkTab(btn.dataset.link); return; }
        showPanel(btn.dataset.tab);
      });
    });

    // 조회
    const loadBtn = document.getElementById('sbdLoadBtn');
    if (loadBtn) loadBtn.addEventListener('click', () => {
      const idx = document.getElementById('sbdMetaIdx').value.trim(); if (!idx) return;
      const row = loadBill(idx);
      if (!row) { alert(`정산서 IDX ${idx} 를 찾을 수 없습니다.`); return; }
      currentCtx = row; renderMeta(row); renderDetail(row);
    });
    const idxEl = document.getElementById('sbdMetaIdx');
    if (idxEl) idxEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadBtn.click(); });

    // VAT 제외↔포함 per-row toggle
    function bindFeeToggle(groupName, exclId, inclId) {
      const group = page.querySelector(`.seg-btn-group[data-name="${groupName}"]`);
      if (!group) return;
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn'); if (!btn) return;
        const exclMode = btn.dataset.value === 'EXCL_VAT';
        const elExcl = document.getElementById(exclId); const elIncl = document.getElementById(inclId);
        if (!elExcl || !elIncl) return;
        elExcl.readOnly = !exclMode; elExcl.classList.toggle('df-input-readonly', !exclMode);
        elIncl.readOnly = exclMode;  elIncl.classList.toggle('df-input-readonly', exclMode);
      });
    }
    bindFeeToggle('sbdPointFeeInput', 'sbdPointFeeExcl', 'sbdPointFeeIncl');
    bindFeeToggle('sbdPayFeeInput', 'sbdPayFeeExcl', 'sbdPayFeeIncl');

    // 푸터 stub
    const stub = (id, label) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => alert(`${label} (플레이스홀더)`)); };
    stub('sbdSaveBtn', '저장하기');
    stub('sbdIssueBtn', '증빙 발급');
    stub('sbdTransferCreateBtn', '이체 생성');
    stub('sbdCancelBtn', '정산 취소');
    stub('sbdVerifyAcct', '계좌 검증');
    stub('sbdInternalAddUrl', '내부 URL 추가');
    stub('sbdInternalPickFile', '내부 파일 선택');
    stub('sbdExternalAddUrl', '외부 URL 추가');
    stub('sbdExternalPickFile', '외부 파일 선택');

    bound = true;
  }

  function onPageShown(tabId, context) {
    if (tabId !== TAB_ID) return;
    bindOnce();
    if (context && context.idx) {
      const row = loadBill(context.idx);
      if (row) { currentCtx = row; renderMeta(row); renderDetail(row); }
      else { currentCtx = { idx: context.idx }; renderMeta({ idx: context.idx }); }
    } else if (!currentCtx) {
      renderMeta(null);
    }
    showPanel('basic');
  }

  window.addEventListener('tab:activated', (e) => onPageShown(e && e.detail && e.detail.id, e && e.detail && e.detail.context));
  window.addEventListener('page:shown', (e) => onPageShown(e && e.detail && e.detail.tabId, e && e.detail && e.detail.context));

  window.SettleBillDetail = { loadBill };
})();
