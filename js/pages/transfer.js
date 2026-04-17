// ===== 이체관리 실 데이터 기반 AG Grid =====

const realData = [
  { seq: 32877, settleIdx: 508856, settleName: '전주식당(성남)_계약서', bizNo: '8616100099', withdrawAccount: '104730802402', bankName: '농협은행', ownerName: '김순모', accountNo: '3020111803611', transferAmount: 2732742, partnerIdx: 508856, partnerName: '전주식당(성남)', shopId: '4EF9C582-AF44-4ACF-B272-2CECA08EC42C', shopName: '전주식당(성남)', createdAt: '2026-04-16 15:19', createdBy: '이주환', requestedAt: '', requestedBy: '이주환', paidAt: '2026-04-16 15:40', updatedAt: '2026-04-16 15:40', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '개인', ceoName: '김순모', bizName: '전주식당', payDueDate: '2026-04-17' },
  { seq: 32876, settleIdx: 504190, settleName: '호호미역(경희궁 직영점)_계약서', bizNo: '2257100313', withdrawAccount: '104730802402', bankName: '신한은행', ownerName: '임영제(호호미역)', accountNo: '110484273518', transferAmount: 1538497, partnerIdx: 504190, partnerName: '호호미역 경희궁 직영점', shopId: 'DC2504BF-7CD9-AB76-4956-5584F18216DF', shopName: '호호미역(경희궁 직영점)', createdAt: '2026-04-15 18:04', createdBy: '전은혜', requestedAt: '2026-04-15 18:04', requestedBy: '전은혜', paidAt: '2026-04-15 18:04', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '개인', ceoName: '임영제', bizName: '호호미역', payDueDate: '2026-04-16' },
  { seq: 32875, settleIdx: 500286, settleName: '투썸플레이스(을지로입구역점)_계약서', bizNo: '4048601054', withdrawAccount: '104730802402', bankName: '우리은행', ownerName: '투썸플레이스주식회사', accountNo: '27837054218114', transferAmount: 590807, partnerIdx: 500286, partnerName: '투썸플레이스 주식회사', shopId: 'CF5714DD-DC5C-76F5-DC24-606571F03BEB', shopName: '투썸플레이스(을지로입구역점)', createdAt: '2026-04-15 17:22', createdBy: '전은혜', requestedAt: '2026-04-15 17:25', requestedBy: '전은혜', paidAt: '2026-04-15 17:25', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '법인', ceoName: '송정석', bizName: '투썸플레이스주식회사', payDueDate: '2026-04-16' },
  { seq: 32874, settleIdx: 503404, settleName: '함평해장_계약서', bizNo: '2738803073', withdrawAccount: '104730802402', bankName: '국민은행', ownerName: '세향푸드', accountNo: '64930104155760', transferAmount: 1247815, partnerIdx: 503404, partnerName: '세향푸드', shopId: '9D797C76-EA20-C1E1-F823-DD2F6604E186', shopName: '함평해장', createdAt: '2026-04-15 17:18', createdBy: '전은혜', requestedAt: '2026-04-15 17:25', requestedBy: '전은혜', paidAt: '2026-04-15 17:25', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '법인', ceoName: '이세향', bizName: '세향푸드', payDueDate: '2026-04-16' },
  { seq: 32873, settleIdx: 509690, settleName: '주식회사 뉴빌리티(로봇대장)_계약서', bizNo: '5398700775', withdrawAccount: '104730802402', bankName: '우리은행', ownerName: '주식회사 뉴빌리티', accountNo: '1005704140945', transferAmount: 3850000, partnerIdx: 509690, partnerName: '주식회사 뉴빌리티', shopId: '019C0DB1-9FE5-7378-8A51-A3A8F688F78E', shopName: '[뉴빌리티]', createdAt: '2026-04-15 16:38', createdBy: '이샛별', requestedAt: '2026-04-15 17:25', requestedBy: '이샛별', paidAt: '2026-04-15 17:25', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '법인', ceoName: '이상민', bizName: '주식회사 뉴빌리티', payDueDate: '2026-04-16' },
  { seq: 32872, settleIdx: 511245, settleName: '서현양갈비양꼬치_계약서', bizNo: '1440217523', withdrawAccount: '104730802402', bankName: '국민은행', ownerName: 'JINJINGYU', accountNo: '92900101438230', transferAmount: 93315, partnerIdx: 511245, partnerName: '서현양갈비양꼬치', shopId: '019CFB97-3B7D-7A85-AB6A-5B03F56D68A1', shopName: '서현양갈비양꼬치', createdAt: '2026-04-15 16:27', createdBy: '전은혜', requestedAt: '2026-04-15 16:27', requestedBy: '전은혜', paidAt: '', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '은행/인증 오류(기타오류(미정의오류코드))로 지급이체를 실패하였습니다.', status: '이체 실패', bizType: '개인', ceoName: 'JINJINGYU', bizName: '서현양갈비양꼬치', payDueDate: '2026-04-16' },
  { seq: 32865, settleIdx: 498403, settleName: '트러스트커피(선릉점)_계약서', bizNo: '5460900023', withdrawAccount: '104730802402', bankName: '우리은행', ownerName: '서광석', accountNo: '1002844918916', transferAmount: 212354, partnerIdx: 498403, partnerName: '트러스트커피', shopId: '0A2FFA11-F263-AD36-37A4-BA145BFA0F45', shopName: '트러스트커피(선릉점)', createdAt: '2026-04-15 09:20', createdBy: '전은혜', requestedAt: '2026-04-15 10:24', requestedBy: '전은혜', paidAt: '2026-04-15 10:24', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '개인', ceoName: '서광석', bizName: '트러스트커피', payDueDate: '2026-04-15' },
  { seq: 32864, settleIdx: 505449, settleName: '김가네김밥(평택더샵센트럴점)_계약서', bizNo: '7170202639', withdrawAccount: '104730802402', bankName: '우리은행', ownerName: '양혜경', accountNo: '09130340202001', transferAmount: 422985, partnerIdx: 505449, partnerName: '김가네김밥 평택더샵센트럴점', shopId: 'C184FEF3-71D3-2206-3A76-8825BCFA31C1', shopName: '김가네김밥(평택더샵센트럴점)', createdAt: '2026-04-15 09:19', createdBy: '전은혜', requestedAt: '2026-04-15 10:24', requestedBy: '전은혜', paidAt: '2026-04-15 10:24', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '개인', ceoName: '양혜경', bizName: '김가네김밥', payDueDate: '2026-04-15' },
  { seq: 32863, settleIdx: 499842, settleName: '제비면가_계약서', bizNo: '7560202084', withdrawAccount: '104730802402', bankName: '케이뱅크', ownerName: '김수영(제비면가)', accountNo: '100216198463', transferAmount: 777021, partnerIdx: 499842, partnerName: '제비면가', shopId: '6A14FF0F-81D3-2116-76D6-5DEF4A44AAA1', shopName: '제비면가', createdAt: '2026-04-14 22:23', createdBy: '전은혜', requestedAt: '2026-04-15 10:24', requestedBy: '전은혜', paidAt: '2026-04-15 10:24', updatedAt: '2026-04-15 19:41', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 성공', bizType: '개인', ceoName: '김수영', bizName: '제비면가', payDueDate: '2026-04-15' }
];

// 예금주 검증 로직
function calcMatchRate(a, b) {
  if (!a || !b) return 0;
  const na = a.replace(/[() （）\s]/g, '');
  const nb = b.replace(/[() （）\s]/g, '');
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  let matched = 0;
  for (const ch of shorter) { if (longer.includes(ch)) matched++; }
  return Math.round((matched / longer.length) * 100);
}

function enrichData(rows) {
  return rows.map(row => {
    const matchCeo = calcMatchRate(row.ownerName, row.ceoName);
    const matchBiz = calcMatchRate(row.ownerName, row.bizName);
    const matchTotal = row.bizType === '개인' ? matchCeo : matchBiz;
    const matchTotalLabel = row.bizType === '개인' ? '대표자' : '사업자';
    return { ...row, matchCeo, matchBiz, matchTotal, matchTotalLabel };
  });
}

const gridData = enrichData(realData);

// Cell Renderers
function StatusRenderer(p) {
  if (!p.value) return '';
  const map = { '이체 성공': 'badge-success', '이체 실패': 'badge-fail', '이체 대기': 'badge-pending', '이체 승인': 'badge-approved', '실행 요청': 'badge-requested' };
  return `<span class="badge ${map[p.value] || 'badge-pending'}">${p.value}</span>`;
}

function ActionRenderer(p) {
  if (!p.data) return '';
  if (p.data.status === '이체 실패') {
    return `<button class="grid-action-btn success" onclick="openSuccessModal(${p.data.seq})">성공 처리</button><button class="grid-action-btn primary">이체 확인</button>`;
  }
  if (p.data.status === '이체 성공') return `<button class="grid-action-btn">실패 처리</button>`;
  if (p.data.status === '이체 대기') return `<button class="grid-action-btn primary">이체 요청</button>`;
  return '';
}

function LinkRenderer(p) {
  return p.value ? `<a class="grid-link">${p.value}</a>` : '';
}

function AmountRenderer(p) {
  return p.value != null ? Number(p.value).toLocaleString() : '';
}

function MatchRenderer(p) {
  if (p.value == null) return '';
  const v = Number(p.value);
  const label = v + '%';
  if (v >= 60) return `<span class="match-high">${label}</span>`;
  return `<span class="match-low">${label}</span>`;
}

function MatchTotalRenderer(p) {
  if (!p.data) return '';
  const v = p.data.matchTotal;
  const label = v + '% (' + p.data.matchTotalLabel + ')';
  if (v >= 60) return `<span class="match-high">${label}</span>`;
  return `<span class="match-low">${label}</span>`;
}

function BizTypeRenderer(p) {
  if (!p.value) return '';
  const cls = p.value === '법인' ? 'badge-approved' : 'badge-requested';
  return `<span class="badge ${cls}">${p.value}</span>`;
}

const columnDefs = [
  { headerCheckboxSelection: true, checkboxSelection: true, width: 32, pinned: 'left', suppressMenu: true, resizable: false },
  { headerName: '이체관리 IDX', field: 'seq', width: 95, cellRenderer: LinkRenderer },
  { headerName: '정산서 IDX', field: 'settleIdx', width: 85, cellRenderer: LinkRenderer },
  { headerName: '정산서명', field: 'settleName', width: 200 },
  { headerName: '사업자구분', field: 'bizType', width: 70, cellRenderer: BizTypeRenderer },
  { headerName: '사업자명', field: 'bizName', width: 130 },
  { headerName: '사업자 등록번호', field: 'bizNo', width: 110 },
  { headerName: '대표자명', field: 'ceoName', width: 90 },
  { headerName: '출금예정 계좌', field: 'withdrawAccount', width: 110 },
  { headerName: '은행명', field: 'bankName', width: 75 },
  { headerName: '예금주명', field: 'ownerName', width: 130 },
  { headerName: '계좌번호', field: 'accountNo', width: 120 },
  { headerName: '이체예정금액', field: 'transferAmount', width: 100, cellRenderer: AmountRenderer, cellStyle: { textAlign: 'right' } },
  { headerName: '지급예정일', field: 'payDueDate', width: 90 },
  { headerName: '검증(대표자)', field: 'matchCeo', width: 85, cellRenderer: MatchRenderer, cellStyle: { textAlign: 'center' } },
  { headerName: '검증(사업자)', field: 'matchBiz', width: 85, cellRenderer: MatchRenderer, cellStyle: { textAlign: 'center' } },
  { headerName: '검증(종합)', field: 'matchTotal', width: 95, cellRenderer: MatchTotalRenderer, cellStyle: { textAlign: 'center' } },
  { headerName: '거래처 IDX', field: 'partnerIdx', width: 80, cellRenderer: LinkRenderer },
  { headerName: '거래처명', field: 'partnerName', width: 140 },
  { headerName: '제휴점명', field: 'shopName', width: 140 },
  { headerName: '생성일시', field: 'createdAt', width: 110 },
  { headerName: '생성자', field: 'createdBy', width: 60 },
  { headerName: '요청일시', field: 'requestedAt', width: 110 },
  { headerName: '요청자', field: 'requestedBy', width: 60 },
  { headerName: '지급일시', field: 'paidAt', width: 110 },
  { headerName: '수정일시', field: 'updatedAt', width: 110 },
  { headerName: '수정자', field: 'updatedBy', width: 60 },
  { headerName: '실패 사유', field: 'failReason', width: 200 },
  { headerName: '상태', field: 'status', width: 80, cellRenderer: StatusRenderer, pinned: 'right' },
  { headerName: '상태 변경', field: '_action', width: 140, cellRenderer: ActionRenderer, sortable: false, filter: false, pinned: 'right' }
];

const gridOptions = {
  columnDefs,
  rowData: gridData,
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  animateRows: true,
  defaultColDef: { sortable: true, resizable: true, filter: true },
  rowHeight: 30,
  headerHeight: 30,
  getRowStyle: p => {
    if (p.data && p.data.status === '이체 실패') return { background: '#fff8f8' };
    return null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const gridDiv = document.getElementById('transferGrid');
  if (gridDiv) agGrid.createGrid(gridDiv, gridOptions);
});

// 성공 처리 모달
function openSuccessModal(seq) {
  const row = gridData.find(r => r.seq === seq);
  if (!row) return;

  const modal = document.getElementById('successModal');
  document.getElementById('modalSettleName').textContent = row.settleName;
  document.getElementById('modalAmount').textContent = row.transferAmount.toLocaleString() + '원';

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('modalDateFrom').value = today;
  document.getElementById('modalDateTo').value = today;
  document.getElementById('modalAmountFrom').value = row.transferAmount;
  document.getElementById('modalAmountTo').value = row.transferAmount;

  modal.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('successModal');
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');

  function closeModal() { modal.classList.remove('open'); }
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
});
