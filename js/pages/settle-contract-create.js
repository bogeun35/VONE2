// ===== 정산계약 신규 생성 (settle-contract-create) =====
(function () {
  const PAGE_ID = 'page-settle-contract-create';
  const TAB_ID = 'settle-contract-create';
  let bound = false;

  // 셀렉트 옵션 채우기 (1~28일)
  function fillDaySelect(id) {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    for (let d = 1; d <= 28; d++) {
      const o = document.createElement('option');
      o.value = d;
      o.textContent = d + '일';
      sel.appendChild(o);
    }
  }

  // 은행 셀렉트 옵션
  const BANKS = ['국민','신한','우리','하나','농협','기업','SC제일','씨티','카카오뱅크','토스뱅크','케이뱅크','대구','부산','경남','광주','전북','제주','수협','새마을금고','신협','우체국','산업'];
  function fillBankSelect(id) {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    sel.innerHTML = '<option value="">선택</option>';
    BANKS.forEach(b => {
      const o = document.createElement('option');
      o.value = b; o.textContent = b;
      sel.appendChild(o);
    });
  }

  // 태그 멀티선택
  const TAG_OPTIONS = ['기타비용', '로봇', '이용료', '기기수수료'];
  const _tagState = new Set();
  function initTagSelect() {
    const wrap = document.querySelector('#' + PAGE_ID + ' .tag-select[data-name="sccTags"]');
    if (!wrap) return;
    const chips = wrap.querySelector('.tag-select-chips');
    const input = wrap.querySelector('.tag-select-input');
    const dropdown = wrap.querySelector('.tag-select-dropdown');

    function renderChips() {
      chips.innerHTML = Array.from(_tagState).map(t =>
        `<span class="tag-select-chip">${t}<span class="tag-select-chip-x" data-v="${t}">×</span></span>`
      ).join('');
    }
    function renderDropdown(filter) {
      const q = (filter || '').toLowerCase();
      const opts = TAG_OPTIONS.filter(t => !q || t.toLowerCase().includes(q));
      dropdown.innerHTML = opts.map(t => {
        const checked = _tagState.has(t) ? ' checked' : '';
        return `<label class="tag-select-option"><input type="checkbox"${checked} data-v="${t}"> ${t}</label>`;
      }).join('');
      dropdown.style.display = opts.length ? '' : 'none';
    }
    chips.addEventListener('click', (e) => {
      const x = e.target.closest('.tag-select-chip-x');
      if (x) { _tagState.delete(x.dataset.v); renderChips(); renderDropdown(input.value); }
    });
    input.addEventListener('focus', () => renderDropdown(input.value));
    input.addEventListener('input', () => renderDropdown(input.value));
    dropdown.addEventListener('change', (e) => {
      const cb = e.target;
      if (cb.checked) _tagState.add(cb.dataset.v); else _tagState.delete(cb.dataset.v);
      renderChips();
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) dropdown.style.display = 'none';
    });
  }

  // 제휴점 찾기 모달
  const _shops = [];
  function openShopSearchModal() {
    const bg = document.getElementById('shopSearchModalBg');
    if (bg) bg.style.display = '';
  }
  function closeShopSearchModal() {
    const bg = document.getElementById('shopSearchModalBg');
    if (bg) bg.style.display = 'none';
  }
  function renderShopTable() {
    const body = document.getElementById('sccShopBody');
    const total = document.getElementById('sccShopTotal');
    if (!body) return;
    if (total) total.textContent = _shops.length;
    if (_shops.length === 0) {
      body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px 0">제휴점을 추가하세요</td></tr>';
      return;
    }
    body.innerHTML = _shops.map((s, i) =>
      `<tr>
        <td><input type="checkbox" data-shop-idx="${i}"></td>
        <td>${s.idx || ''}</td><td>${s.name || ''}</td><td>${s.bizNo || ''}</td>
        <td>${s.ceo || ''}</td><td>${s.address || ''}</td><td>${s.phone || ''}</td>
        <td>${s.status || '정상'}</td>
      </tr>`
    ).join('');
  }

  function bindOnce() {
    if (bound) return;
    bound = true;

    fillDaySelect('sccCycleDay');
    fillDaySelect('sccPayDay');
    fillBankSelect('sccSettleBank');
    initTagSelect();
    renderShopTable();

    // 거래처 찾기
    const findPartnerBtn = document.getElementById('sccFindPartnerBtn');
    if (findPartnerBtn) {
      findPartnerBtn.addEventListener('click', () => {
        const keyword = prompt('거래처 IDX 또는 거래처명을 입력하세요');
        if (!keyword) return;
        const rows = (window.SettleContract && window.SettleContract._rows) || [];
        const found = rows.find(r =>
          String(r.partnerIdx) === keyword || (r.partnerName && r.partnerName.includes(keyword))
        );
        if (found) {
          document.getElementById('sccPartnerIdx').value = found.partnerIdx || '';
          document.getElementById('sccPartnerName').value = found.partnerName || '';
          document.getElementById('sccBizNo').value = found.bizNo || '';
        } else {
          alert('거래처를 찾을 수 없습니다.');
        }
      });
    }

    // 제휴점 찾기 모달 열기/닫기
    const findShopBtn = document.getElementById('sccFindShopBtn');
    if (findShopBtn) findShopBtn.addEventListener('click', openShopSearchModal);

    const modalClose = document.getElementById('shopSearchModalClose');
    const modalCancel = document.getElementById('shopSearchCancelBtn');
    if (modalClose) modalClose.addEventListener('click', closeShopSearchModal);
    if (modalCancel) modalCancel.addEventListener('click', closeShopSearchModal);
    const modalBg = document.getElementById('shopSearchModalBg');
    if (modalBg) modalBg.addEventListener('click', (e) => { if (e.target === modalBg) closeShopSearchModal(); });

    // 모달 검색 (mock)
    const searchBtn = document.getElementById('shopSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const q = (document.getElementById('shopSearchInput').value || '').trim();
        const body = document.getElementById('shopSearchBody');
        if (!body) return;
        // mock 데이터
        const mockShops = [
          { idx: 'S-001', name: '강남식당', bizNo: '123-45-67890', ceo: '김철수', address: '서울 강남구', phone: '02-1234-5678', status: '정상' },
          { idx: 'S-002', name: '역삼분식', bizNo: '234-56-78901', ceo: '이영희', address: '서울 강남구', phone: '02-2345-6789', status: '정상' },
          { idx: 'S-003', name: '서초카페', bizNo: '345-67-89012', ceo: '박민수', address: '서울 서초구', phone: '02-3456-7890', status: '정상' },
          { idx: 'S-004', name: '신사베이커리', bizNo: '456-78-90123', ceo: '정수진', address: '서울 강남구', phone: '02-4567-8901', status: '정상' },
          { idx: 'S-005', name: '삼성치킨', bizNo: '567-89-01234', ceo: '최동현', address: '서울 강남구', phone: '02-5678-9012', status: '정상' },
        ];
        const filtered = q ? mockShops.filter(s => s.name.includes(q) || s.bizNo.includes(q) || s.idx.includes(q)) : mockShops;
        body.innerHTML = filtered.map(s =>
          `<tr>
            <td><input type="checkbox" data-shop='${JSON.stringify(s)}'></td>
            <td>${s.idx}</td><td>${s.name}</td><td>${s.bizNo}</td>
            <td>${s.ceo}</td><td>${s.address}</td><td>${s.phone}</td><td>${s.status}</td>
          </tr>`
        ).join('') || '<tr><td colspan="8" style="text-align:center;color:#999;padding:16px 0">검색 결과 없음</td></tr>';
      });
    }

    // 모달 전체선택
    const checkAll = document.getElementById('shopSearchCheckAll');
    if (checkAll) {
      checkAll.addEventListener('change', () => {
        document.querySelectorAll('#shopSearchBody input[type="checkbox"]').forEach(cb => { cb.checked = checkAll.checked; });
      });
    }

    // 모달 선택 추가
    const confirmBtn = document.getElementById('shopSearchConfirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        document.querySelectorAll('#shopSearchBody input[type="checkbox"]:checked').forEach(cb => {
          try {
            const s = JSON.parse(cb.dataset.shop);
            if (!_shops.find(x => x.idx === s.idx)) _shops.push(s);
          } catch (e) { /* skip */ }
        });
        renderShopTable();
        closeShopSearchModal();
      });
    }

    // 제휴점 제거
    const removeShopBtn = document.getElementById('sccShopRemoveBtn');
    if (removeShopBtn) {
      removeShopBtn.addEventListener('click', () => {
        const toRemove = new Set();
        document.querySelectorAll('#sccShopBody input[type="checkbox"]:checked').forEach(cb => {
          toRemove.add(Number(cb.dataset.shopIdx));
        });
        if (toRemove.size === 0) return;
        for (let i = _shops.length - 1; i >= 0; i--) { if (toRemove.has(i)) _shops.splice(i, 1); }
        renderShopTable();
      });
    }

    // 제휴점 전체선택
    const shopCheckAll = document.getElementById('sccShopCheckAll');
    if (shopCheckAll) {
      shopCheckAll.addEventListener('change', () => {
        document.querySelectorAll('#sccShopBody input[type="checkbox"]').forEach(cb => { cb.checked = shopCheckAll.checked; });
      });
    }

    // 저장
    const saveBtn = document.getElementById('sccSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = document.getElementById('sccContractName').value.trim();
        const ctype = document.getElementById('sccCtype').value;
        if (!ctype) { alert('계약 타입을 선택하세요.'); return; }
        if (!name) { alert('계약명을 입력하세요.'); return; }
        if (!document.getElementById('sccPartnerIdx').value) { alert('거래처를 선택하세요.'); return; }
        alert('정산 계약이 생성되었습니다. (디자인 시스템 — 실제 API 연동 없음)');
      });
    }

    // 취소
    const cancelBtn = document.getElementById('sccCancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (window.TabManager) {
          window.TabManager.closeTab(TAB_ID);
        }
      });
    }
  }

  function onPageShown(tabId) {
    if (tabId !== TAB_ID) return;
    bindOnce();
  }

  window.addEventListener('tab:activated', (e) => onPageShown(e && e.detail && e.detail.id));
  window.addEventListener('page:shown', (e) => onPageShown(e && e.detail && e.detail.tabId));

  document.addEventListener('DOMContentLoaded', () => {
    const active = window.TabManager && window.TabManager.getActive && window.TabManager.getActive();
    if (active === TAB_ID) onPageShown(active);
  });
})();
