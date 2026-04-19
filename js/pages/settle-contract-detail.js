// ===== 정산계약 상세 (settle-contract-detail) =====
// - 탭 id 고정 (공통 정책 §5): 같은 도메인은 단일 탭 덮어쓰기
// - 메타바 sticky: 탭 이동해도 계약 구분용으로 상단 유지
// - 기본정보/연결 제휴점/담당자 탭 3개 + 거래처/정산서 링크탭 2개
//
// 현재 단계: 탭 네비게이션 + 메타바 로드 + 링크탭 이동. 섹션 내용은 placeholder.

(function () {
  const PAGE_ID = 'page-settle-contract-detail';
  const TAB_ID = 'settle-contract-detail';
  let currentCtx = null;  // { idx, bizAccountIdx, contractName } — 로드된 계약 메타

  // 상세 로드: 실제 API 대신 settle-contract 리스트의 mock 에서 가져옴 (임시)
  function loadContract(idx) {
    const rows = (window.SettleContract && window.SettleContract._rows) || [];
    const row = rows.find(r => String(r.idx) === String(idx));
    if (!row) return null;
    return {
      idx: row.idx,
      contractName: row.name || '',
      bizAccountIdx: row.partnerIdx,
      partnerName: row.partnerName,
      bizNo: row.bizNo || '',
    };
  }

  function renderMeta(ctx) {
    const nameEl = document.getElementById('scdMetaName');
    const idxEl = document.getElementById('scdMetaIdx');
    const bizEl = document.getElementById('scdMetaBizNo');
    if (idxEl) idxEl.value = ctx ? ctx.idx : '';
    if (nameEl) nameEl.value = ctx ? ctx.contractName : '';
    if (bizEl) bizEl.value = ctx ? ctx.bizNo : '';
  }

  // 태그 멀티선택 (계약서 기본 정보)
  const TAG_OPTIONS = ['기타비용', '로봇', '이용료', '기기수수료'];
  const _tagState = new Set();
  function renderTagSelect(initial) {
    _tagState.clear(); (initial || []).forEach(t => _tagState.add(t));
    const wrap = document.querySelector('#page-settle-contract-detail .tag-select[data-name="scdTags"]');
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

  // 셀렉트 옵션 채우기 (시작일·지급일 1~31, 계좌 드롭 등)
  function fillStaticSelects() {
    const dayOpts = Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('');
    ['scdCycleDay', 'scdPayDay'].forEach(id => { const el = document.getElementById(id); if (el && !el.children.length) el.innerHTML = dayOpts; });
    // 출금/입금/지급 계좌 셀렉트 — 동일 목록(모두 동일 mock)
    const bankOpts = [
      '한국씨티은행 / 104730802402 / 주식회사 현대벤디스 / 식권대장',
      '우리은행 / 1005702490310 / 주식회사 현대벤디스 / 식권대장 외 매입지급용',
      '신한은행 / 140013837960 / 주식회사 현대벤디스 / 식권대장',
      '우리은행 / 1005103314735 / 주식회사 현대벤디스 / 단체선물대장',
    ].map(v => `<option>${v}</option>`).join('');
    ['scdVendysWithdraw', 'scdVendysDeposit'].forEach(id => { const el = document.getElementById(id); if (el && !el.children.length) el.innerHTML = bankOpts; });
    const settleBankOpts = ['신한은행', '국민은행', '우리은행', '농협은행', 'KEB하나은행', '케이뱅크'].map(v => `<option>${v}</option>`).join('');
    const settleBankEl = document.getElementById('scdSettleBank');
    if (settleBankEl && !settleBankEl.children.length) settleBankEl.innerHTML = settleBankOpts;
    // 성약담당자 드롭다운 (mock)
    const closerEl = document.getElementById('scdCloserSelect');
    if (closerEl && !closerEl.children.length) {
      const closers = ['이동현', '윤태현', '최수진', '홍지민', '정하늘'];
      closerEl.innerHTML = closers.map(n => `<option>${n}</option>`).join('');
    }
  }

  // radio-btn-group: 값 설정 helper
  function setRadio(groupName, value) {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    const group = page.querySelector(`.radio-btn-group[data-name="${groupName}"], .seg-btn-group[data-name="${groupName}"]`);
    if (!group) return;
    group.querySelectorAll('.radio-btn, .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.value === value);
    });
  }

  function setLockToggle(elId, on) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.toggle('on', !!on);
    el.classList.toggle('off', !on);
  }

  function fmtDateTime(s) { return s ? String(s).replace('T', ' ') : ''; }

  // 상세 섹션 필드 채우기
  function renderDetail(row) {
    if (!row) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v != null ? v : ''; };

    // 1. 계약서 기본 정보
    set('scdPartnerIdx', row.partnerIdx);
    set('scdPartnerName', row.partnerName);
    set('scdShopCount', row.shopCount);
    set('scdContractName', row.name);
    // 계약 타입 기본값 식권대장
    const ctypeEl = document.getElementById('scdCtype'); if (ctypeEl) ctypeEl.value = row.ctype || '식권대장';
    // 태그 멀티선택 (기본 null)
    renderTagSelect(Array.isArray(row.tags) ? row.tags : []);

    // 2. 정산 생성 정보
    setRadio('scdCycleType', row.cycleType === '정기' ? '정기' : '비정기');
    const cycleDayEl = document.getElementById('scdCycleDay'); if (cycleDayEl) cycleDayEl.value = String(row.cycleDay || 1);
    // 매입 증빙 수취 유형: '전자세금용 인증서 등록' → '시스템 발행' 매핑 (명칭 변경)
    const mappedProof = row.proofType === '전자세금용 인증서 등록' ? '시스템 발행' : (row.proofType || '시스템 발행');
    setRadio('scdProofType', mappedProof);
    setRadio('scdLinkType', row.linkType || 'BAROBILL');
    setRadio('scdPayCycle', row.payCycle === '일' ? '일' : '월');
    const payDayEl = document.getElementById('scdPayDay'); if (payDayEl) payDayEl.value = String(row.cycleDay || 15);
    setRadio('scdEvWriteDate', 'END');
    setRadio('scdEvWriteDate', 'END');
    setRadio('scdPayBase', 'FIXED');
    setRadio('scdHolidayAdj', 'PREV');
    setRadio('scdGroupSettle', row.isGroup === 'Y' ? 'Y' : 'N');

    // 3. 대행업체 정보 (mock 1건)
    const agencyBody = document.getElementById('scdAgencyBody');
    if (agencyBody) {
      if (row.linkType) {
        agencyBody.innerHTML = `<tr>
          <td>29656</td>
          <td>${row.linkType === 'BAROBILL' ? '바로빌' : '볼타'}</td>
          <td colspan="2">{"barobillContactId": "V3060680559", "barobillContactName": "김진아"}</td>
          <td>2026-04-02 13:25:22</td><td>${row.certExpire || '-'}</td>
          <td>${row.createdBy || '-'}</td><td>${fmtDateTime(row.createdAt)}</td>
          <td>${row.updatedBy || '-'}</td><td>${fmtDateTime(row.updatedAt)}</td>
        </tr>`;
        document.getElementById('scdAgencyTotal').textContent = '1';
      } else {
        agencyBody.innerHTML = '<tr><td colspan="10" class="empty-row">대행업체 정보 없음</td></tr>';
        document.getElementById('scdAgencyTotal').textContent = '0';
      }
    }

    // 4. 계약서 상세 정보
    set('scdStartAt', row.startAt);
    set('scdEndAt', row.endAt);
    set('scdExpireAt', row.endAt);
    set('scdTerminatedAt', row.terminatedAt);
    set('scdTerminatedReason', '');
    setRadio('scdExtReview', row.extReview === 'Y' ? 'Y' : 'N');
    // 정산 지급 계좌
    const sb = document.getElementById('scdSettleBank'); if (sb && row.settleBank) sb.value = row.settleBank;
    set('scdSettleAccount', row.settleAccount);
    set('scdSettleOwner', row.settleOwner);
    set('scdDepositRemark', '');
    set('scdMemo', '');
    setRadio('scdLocked', row.locked ? 'Y' : 'N');

    // 5. 수수료 정보
    const pointExcl = (row.pointFeeRate || 0) * 100;
    const payExcl = (row.payFeeRate || 0) * 100;
    set('scdPointFeeExcl', pointExcl.toFixed(2));
    set('scdPointFeeIncl', (pointExcl * 1.1).toFixed(2));
    set('scdPayFeeExcl', payExcl.toFixed(2));
    set('scdPayFeeIncl', (payExcl * 1.1).toFixed(2));
    document.getElementById('scdPointFeeDb').textContent = `DB: ${pointExcl.toFixed(1)}%`;
    document.getElementById('scdPayFeeDb').textContent = `DB: ${payExcl.toFixed(1)}%`;
    setRadio('scdFeeInput', 'EXCL_VAT');
    setRadio('scdFeeCalc', 'CLIENT');
    setRadio('scdProofOffset', row.proofOffset || '상계');
    setRadio('scdTransferOffset', row.transferOffset || '상계');

    // 6. 첨부자료 정보 (mock 1건)
    const attachBody = document.getElementById('scdAttachBody');
    if (attachBody) {
      attachBody.innerHTML = `<tr>
        <td>-</td><td>통장사본</td><td>amazonaws</td>
        <td>https://s3.ap-northeast-2.amazonaws.com/...</td>
        <td>2026-02-24 14:37:50</td><td>김지혜</td>
        <td><button class="btn btn-sm btn-outline-danger">삭제</button></td>
        <td><button class="btn btn-sm btn-outline-primary">미리보기</button></td>
      </tr>`;
      document.getElementById('scdAttachTotal').textContent = '1';
    }

    // 8. 거래처 정보 (readonly, mock enrichment)
    const addressPool = [
      '서울시 강남구 테헤란로 123 ABC빌딩 7층',
      '서울시 성동구 왕십리로 456 3층',
      '경기도 성남시 분당구 판교로 100',
      '서울시 종로구 종로 12 5층',
      '서울시 마포구 독막로 78 2층',
    ];
    const itemPool = ['소프트웨어 개발', '음식점업', '도소매업', '운수업', '서비스업'];
    const categoryPool = ['정보통신업', '음식업', '도매 및 소매업', '운수 및 창고업', '전문 서비스업'];
    const pick = (arr) => arr[(row.partnerIdx || 0) % arr.length];
    set('scdBizIdx', row.partnerIdx);
    set('scdBizName', row.partnerName);
    set('scdBizAddress', pick(addressPool));
    set('scdBizNumber', row.bizNo);
    set('scdBizSubNumber', row.subBizNo || '0000');
    set('scdBizCeo', row.contractManagerName || row.partnerName);
    set('scdBizPhone', row.contractManagerPhone || '01012345678');
    set('scdBizEmail', row.contractManagerEmail || 'contact@example.com');
    set('scdBizItem', pick(itemPool));
    set('scdBizCategory', pick(categoryPool));
    set('scdBizClosed', row.closedAt || '');

    // 7. 시스템 정보
    set('scdCreatedAt', fmtDateTime(row.createdAt));
    set('scdUpdatedAt', fmtDateTime(row.updatedAt));
    set('scdCreatedById', '7CF75B1E-4E79-8F24-EFBC-0F36A8CC2FCA');
    set('scdUpdatedById', '7AA9E1EA-FC59-4F1E-8CAA-DF5530D1CAC7');
    set('scdCreatedBy', row.createdBy);
    set('scdUpdatedBy', row.updatedBy);
  }

  // radio-btn-group / seg-btn-group 클릭 토글 (detail 페이지 내부)
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

  function showPanel(panelName) {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    page.querySelectorAll('.detail-tab').forEach(b => {
      const on = b.dataset.tab === panelName;
      b.classList.toggle('active', on);
    });
    page.querySelectorAll('.detail-tab-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === panelName);
    });
  }

  function handleLinkTab(link) {
    if (!window.TabManager) return;
    if (link === 'bizAccount') {
      const bizIdx = currentCtx && currentCtx.bizAccountIdx;
      if (!bizIdx) { alert('조회된 계약이 없습니다. 먼저 정산계약 IDX 를 조회하세요.'); return; }
      window.TabManager.open({
        id: 'biz-account-detail',
        title: '거래처 상세',
        detailOf: TAB_ID,
        context: { bizAccountIdx: bizIdx },
      });
    } else if (link === 'settleList') {
      const idx = currentCtx && currentCtx.idx;
      window.TabManager.open({
        id: 'settle-list',
        title: '정산서 관리',
        context: { contractIdx: idx },
      });
    }
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

    // 조회 버튼
    const loadBtn = document.getElementById('scdLoadBtn');
    if (loadBtn) loadBtn.addEventListener('click', () => {
      const idx = document.getElementById('scdMetaIdx').value.trim();
      if (!idx) return;
      const ctx = loadContract(idx);
      if (!ctx) { alert(`정산계약 IDX ${idx} 를 찾을 수 없습니다.`); return; }
      currentCtx = ctx;
      renderMeta(ctx);
      const rows = (window.SettleContract && window.SettleContract._rows) || [];
      const full = rows.find(r => String(r.idx) === String(idx));
      if (full) renderDetail(full);
    });

    // 엔터로 조회
    const idxEl = document.getElementById('scdMetaIdx');
    if (idxEl) idxEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('scdLoadBtn').click();
    });

    // VAT 제외↔포함 동기화 — 입력 기준 토글에 따라 editable 쪽이 바뀜 (프론트 전용)
    function syncFee(srcId, dstId, toInclFromExcl) {
      const src = document.getElementById(srcId); const dst = document.getElementById(dstId);
      if (!src || !dst) return;
      const v = parseFloat(src.value);
      if (isNaN(v)) return;
      dst.value = toInclFromExcl ? (v * 1.1).toFixed(2) : (v / 1.1).toFixed(2);
    }
    // 양방향 입력 핸들러 (readonly 측은 기본 이벤트 안 발생, 기준 전환 시 readonly 가 바뀜)
    [['scdPointFeeExcl', 'scdPointFeeIncl'], ['scdPayFeeExcl', 'scdPayFeeIncl']].forEach(([excl, incl]) => {
      const elExcl = document.getElementById(excl); const elIncl = document.getElementById(incl);
      if (elExcl) elExcl.addEventListener('input', () => syncFee(excl, incl, true));
      if (elIncl) elIncl.addEventListener('input', () => syncFee(incl, excl, false));
    });
    // 입력 기준 토글 — 서비스 포인트 / 대장페이 각각 별도 (readonly 스왑)
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
    bindFeeToggle('scdPointFeeInput', 'scdPointFeeExcl', 'scdPointFeeIncl');
    bindFeeToggle('scdPayFeeInput', 'scdPayFeeExcl', 'scdPayFeeIncl');

    // 푸터 버튼 stub
    const stub = (id, label) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => alert(`${label} (플레이스홀더)`));
    };
    stub('scdSaveBtn', '저장하기');
    stub('scdExtendBtn', '계약 연장');
    stub('scdTerminateBtn', '계약 해지');
    stub('scdCreateSettleBtn', '정산서 생성');
    stub('scdCreateBarobillBtn', '바로빌 계정 생성');
    stub('scdCreateBoltaBtn', '볼타 계정 생성');
    stub('scdFetchCertBtn', '공동인증서 가져오기');
    stub('scdVerifyAcct', '계좌 검증');
    stub('scdAttachAddUrl', 'URL 추가');
    stub('scdAttachPickFile', '파일 선택');

    bound = true;
  }

  function onPageShown(tabId, context) {
    if (tabId !== TAB_ID) return;
    bindOnce();
    // 다른 페이지(정산계약 관리)에서 context.idx 로 넘어온 경우 로드
    if (context && context.idx) {
      const ctx = loadContract(context.idx);
      const rows = (window.SettleContract && window.SettleContract._rows) || [];
      const full = rows.find(r => String(r.idx) === String(context.idx));
      if (ctx) { currentCtx = ctx; renderMeta(ctx); if (full) renderDetail(full); }
      else {
        currentCtx = { idx: context.idx, contractName: '', bizAccountIdx: null };
        renderMeta(currentCtx);
      }
    } else if (!currentCtx) {
      renderMeta(null);
    }
    showPanel('basic');
  }

  window.addEventListener('tab:activated', (e) => {
    onPageShown(e && e.detail && e.detail.id, e && e.detail && e.detail.context);
  });
  window.addEventListener('page:shown', (e) => {
    onPageShown(e && e.detail && e.detail.tabId, e && e.detail && e.detail.context);
  });

  window.SettleContractDetail = { loadContract };
})();
