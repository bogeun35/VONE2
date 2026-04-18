// ===== 이체관리 실 데이터 기반 AG Grid =====

const realData = [
  { seq: 32884, settleIdx: 512004, settleName: '채인석커피(판교점)_계약서', bizNo: '1148800321', withdrawAccount: '104730802402', bankName: '국민은행', ownerName: '채인석', accountNo: '80420104123777', transferAmount: 295901, partnerIdx: 512004, partnerName: '채인석커피', shopId: 'A01F5B10-1111-2222-3333-444455556666', shopName: '채인석커피(판교점)', createdAt: '2026-04-17 09:10', createdBy: '이주환', requestedAt: '', requestedBy: '', paidAt: '', updatedAt: '2026-04-17 09:10', updatedBy: '이주환', txIdx: '', failReason: '', status: '이체 대기', bizType: '개인', ceoName: '채인석', bizName: '채인석커피', payDueDate: '2026-04-18' },
  { seq: 32883, settleIdx: 511877, settleName: '성수공방_계약서', bizNo: '2098702215', withdrawAccount: '104730802402', bankName: '신한은행', ownerName: '박지은', accountNo: '110555123456', transferAmount: 412300, partnerIdx: 511877, partnerName: '성수공방', shopId: 'B01F5B10-1111-2222-3333-444455556666', shopName: '성수공방', createdAt: '2026-04-17 08:55', createdBy: '전은혜', requestedAt: '2026-04-17 09:02', requestedBy: '전은혜', paidAt: '', updatedAt: '2026-04-17 09:02', updatedBy: '전은혜', txIdx: '', failReason: '', status: '이체 승인', bizType: '개인', ceoName: '박지은', bizName: '성수공방', payDueDate: '2026-04-18' },
  { seq: 32882, settleIdx: 511590, settleName: '(주)그린테이블_계약서', bizNo: '3308801007', withdrawAccount: '104730802402', bankName: '우리은행', ownerName: '(주)그린테이블', accountNo: '1005704555821', transferAmount: 1820500, partnerIdx: 511590, partnerName: '주식회사 그린테이블', shopId: 'C01F5B10-1111-2222-3333-444455556666', shopName: '(주)그린테이블', createdAt: '2026-04-17 08:40', createdBy: '이샛별', requestedAt: '2026-04-17 08:45', requestedBy: '이샛별', paidAt: '', updatedAt: '2026-04-17 08:45', updatedBy: '이샛별', txIdx: '', failReason: '', status: '실행 요청', bizType: '법인', ceoName: '최정우', bizName: '주식회사 그린테이블', payDueDate: '2026-04-18' },
  { seq: 32881, settleIdx: 511412, settleName: '미소베이커리_계약서', bizNo: '4185100884', withdrawAccount: '104730802402', bankName: '농협은행', ownerName: '송미소', accountNo: '3020112244335', transferAmount: 184720, partnerIdx: 511412, partnerName: '미소베이커리', shopId: 'D01F5B10-1111-2222-3333-444455556666', shopName: '미소베이커리', createdAt: '2026-04-16 18:30', createdBy: '전은혜', requestedAt: '2026-04-16 18:35', requestedBy: '전은혜', paidAt: '2026-04-16 18:35', updatedAt: '2026-04-16 18:36', updatedBy: '전은혜', txIdx: '', failReason: '계좌정보 불일치(예금주명 상이)로 지급이체를 실패하였습니다.', status: '이체 실패', bizType: '개인', ceoName: '송미소', bizName: '미소베이커리', payDueDate: '2026-04-17' },
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
    // 정산년월: payDueDate 기준. 일부 행은 전월로 섞어서 3월/4월 혼합되게
    let settleMonth = '';
    if (row.payDueDate) {
      const [yy, mmStr] = row.payDueDate.split('-');
      let mm = parseInt(mmStr, 10);
      let y = parseInt(yy, 10);
      if (row.seq % 3 === 0) { mm -= 1; if (mm === 0) { mm = 12; y -= 1; } }
      settleMonth = `${String(y).slice(2)}년 ${mm}월`;
    }
    // 이체 성공 건에만 매칭된 통장거래 IDX(입금Idx) 부여
    const depositIdx = row.status === '이체 성공' ? 563570 + (row.seq % 20) : null;
    // 처리 IDX (txIdx): 실제 은행 이체 API 호출이 발생한 성공/실패 건에 번호 부여
    const txIdx = (row.status === '이체 성공' || row.status === '이체 실패')
      ? (row.txIdx || 7812340 + (row.seq % 97))
      : (row.txIdx || null);
    // 승인일시/승인자: 요청 이후 상태(이체 승인/실행 요청/이체 성공/이체 실패)에만 값 부여
    const approvedStatuses = ['이체 승인', '실행 요청', '이체 성공', '이체 실패'];
    let approvedAt = '', approvedBy = '';
    if (approvedStatuses.includes(row.status) && row.requestedAt) {
      // 요청일시 + 몇 분 뒤를 승인일시로 샘플링
      const base = new Date(row.requestedAt.replace(' ', 'T'));
      base.setMinutes(base.getMinutes() + (row.seq % 5 + 1));
      const pad = n => String(n).padStart(2, '0');
      approvedAt = `${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(base.getDate())} ${pad(base.getHours())}:${pad(base.getMinutes())}`;
      approvedBy = row.seq % 2 === 0 ? '김승인' : '이주환';
    }
    // 계약구분 (mock): 계약서명 키워드 기반 → 없으면 seq mod 기반
    const _TYPES = ['식권대장', '복지대장', '퀵대장', '단체선물대장', '기타'];
    let ctype = _TYPES[row.seq % _TYPES.length];
    if (row.settleName) {
      if (row.settleName.includes('뉴빌리티') || row.settleName.includes('로봇')) ctype = '퀵대장';
      else if (row.settleName.includes('선물')) ctype = '단체선물대장';
    }
    return { ...row, matchCeo, matchBiz, matchTotal, matchTotalLabel, settleMonth, depositIdx, txIdx, approvedAt, approvedBy, ctype };
  });
}

const gridData = enrichData(realData);

// Cell Renderers
function StatusRenderer(p) {
  if (!p.value) return '';
  const colorMap = { '이체 성공': '#16a34a', '이체 실패': '#ef4444', '이체 대기': '#d97706', '이체 승인': '#7c3aed', '실행 요청': '#2563eb' };
  return `<span style="color:${colorMap[p.value] || '#333'}">${p.value}</span>`;
}

function BizTypeRenderer(p) {
  if (!p.value) return '';
  return p.value;
}

function ActionRenderer(p) {
  if (!p.data) return '';
  if (p.data.status === '이체 실패') {
    return `<button class="grid-action-btn outline-primary" onclick="openSuccessModal(${p.data.seq})">성공 처리</button><button class="grid-action-btn primary">이체 확인</button>`;
  }
  if (p.data.status === '이체 성공') return `<button class="grid-action-btn" disabled>실패 처리</button>`;
  if (p.data.status === '이체 대기' || p.data.status === '이체 승인') return `<button class="grid-action-btn primary">정보갱신</button>`;
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
  const color = v >= 60 ? '#16a34a' : '#ef4444';
  const style = v < 60 ? `color:${color};font-weight:600` : `color:${color}`;
  return `<span style="${style}">${v}%</span>`;
}

function MatchTotalRenderer(p) {
  if (!p.data) return '';
  const v = p.data.matchTotal;
  const color = v >= 60 ? '#16a34a' : '#ef4444';
  const style = v < 60 ? `color:${color};font-weight:600` : `color:${color}`;
  return `<span style="${style}">${v}</span>`;
}

function MatchNumRenderer(p) {
  if (p.value == null) return '';
  const v = Number(p.value);
  const color = v >= 60 ? '#16a34a' : '#ef4444';
  const style = v < 60 ? `color:${color};font-weight:600` : `color:${color}`;
  return `<span style="${style}">${v}</span>`;
}

const rightAlign = { textAlign: 'right' };
const centerAlign = { textAlign: 'center' };

const columnDefs = [
  {
    headerName: '', field: '_select',
    width: 32, minWidth: 32, maxWidth: 32,
    pinned: 'left',
    checkboxSelection: true,
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true,
    sortable: false, filter: false, resizable: false, suppressMovable: true,
    lockPosition: 'left',
    cellClass: 'cell-select',
    headerClass: 'header-center',
  },
  { headerName: '이체관리 IDX', field: 'seq', width: 40, minWidth: 40, pinned: 'left', cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '정산서 IDX', field: 'settleIdx', width: 40, minWidth: 40, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '정산년월', field: 'settleMonth', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
  { headerName: '계약구분', field: 'ctype', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
  { headerName: '정산계약명', field: 'settleName', width: 150, minWidth: 90 },
  { headerName: '사업자구분', field: 'bizType', width: 58, minWidth: 50, cellRenderer: BizTypeRenderer, cellStyle: centerAlign, headerClass: 'header-center' },
  { headerName: '사업자명', field: 'bizName', width: 100, minWidth: 70 },
  { headerName: '사업자 등록번호', field: 'bizNo', width: 88, minWidth: 80, cellStyle: rightAlign, headerClass: 'header-right' },
  { headerName: '대표자명', field: 'ceoName', width: 68, minWidth: 55 },
  { headerName: '출금예정 계좌', field: 'withdrawAccount', width: 92, minWidth: 80, cellStyle: rightAlign, headerClass: 'header-right' },
  { headerName: '은행명', field: 'bankName', width: 58, minWidth: 50 },
  { headerName: '예금주명', field: 'ownerName', width: 96, minWidth: 70 },
  { headerName: '계좌번호', field: 'accountNo', width: 100, minWidth: 85, cellStyle: rightAlign, headerClass: 'header-right' },
  { headerName: '이체예정금액', field: 'transferAmount', width: 84, minWidth: 70, pinned: 'right', cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '지급예정일', field: 'payDueDate', width: 78, minWidth: 70 },
  { headerName: '검증(대표자)', field: 'matchCeo', width: 70, minWidth: 60, cellRenderer: MatchNumRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '검증(사업자)', field: 'matchBiz', width: 70, minWidth: 60, cellRenderer: MatchNumRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '검증(%)', field: 'matchTotal', width: 60, minWidth: 50, pinned: 'right', cellRenderer: MatchTotalRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '거래처 IDX', field: 'partnerIdx', width: 40, minWidth: 40, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '통장거래 IDX', field: 'depositIdx', width: 70, minWidth: 60, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '처리 IDX', field: 'txIdx', width: 70, minWidth: 60, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', filter: 'agNumberColumnFilter' },
  { headerName: '거래처명', field: 'partnerName', width: 108, minWidth: 70 },
  { headerName: '제휴점명', field: 'shopName', width: 108, minWidth: 70 },
  { headerName: '생성일시', field: 'createdAt', width: 92, minWidth: 85 },
  { headerName: '생성자', field: 'createdBy', width: 52, minWidth: 45 },
  { headerName: '요청일시', field: 'requestedAt', width: 92, minWidth: 85 },
  { headerName: '요청자', field: 'requestedBy', width: 52, minWidth: 45 },
  { headerName: '승인일시', field: 'approvedAt', width: 92, minWidth: 85 },
  { headerName: '승인자', field: 'approvedBy', width: 52, minWidth: 45 },
  { headerName: '지급일시', field: 'paidAt', width: 92, minWidth: 85 },
  { headerName: '수정일시', field: 'updatedAt', width: 92, minWidth: 85 },
  { headerName: '수정자', field: 'updatedBy', width: 52, minWidth: 45 },
  { headerName: '실패 사유', field: 'failReason', width: 150, minWidth: 80 },
  { headerName: '상태', field: 'status', width: 68, minWidth: 60, cellRenderer: StatusRenderer, pinned: 'right' },
  { headerName: '상태 변경', field: '_action', width: 150, minWidth: 130, cellRenderer: ActionRenderer, sortable: false, filter: false, pinned: 'right', cellClass: 'cell-action-buttons' }
];

let gridApi = null;

// VoneTable 필터 정책서 기반 공통 커스텀 필터 일괄 적용
if (window.VoneTableFilterLib) {
  window.VoneTableFilterLib.installAll(columnDefs, {
    exclude: ['_select', '_action'],  // 시스템 컬럼 제외
  });
  window.VoneTableFilterLib.installHintHeader(columnDefs, '_select');
}

const gridOptions = {
  columnDefs,
  rowData: gridData,
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  animateRows: true,
  defaultColDef: { sortable: true, resizable: true, filter: true, floatingFilter: true, minWidth: 10 },
  rowHeight: 28,
  headerHeight: 28,
  floatingFiltersHeight: 26,
  getRowStyle: p => {
    if (p.data && p.data.status === '이체 실패') return { background: '#fff8f8' };
    return null;
  },
  onSelectionChanged: () => {
    const count = gridApi ? gridApi.getSelectedRows().length : 0;
    const el = document.querySelector('.selected-count strong');
    if (el) el.textContent = count;
  }
};

// 커스텀 컬럼 우클릭 메뉴
document.addEventListener('DOMContentLoaded', () => {
  const gridDiv = document.getElementById('transferGrid');
  if (!gridDiv) return;

  const result = agGrid.createGrid(gridDiv, gridOptions);
  gridApi = result;
  // 디버그/외부 조작용 글로벌 노출
  window.gridApi = gridApi;

  // 셀 범위 선택 + 엑셀 복붙 + 상태바 (Community 버전 대체)
  let rangeCtl = null;
  if (window.GridRangeSelect) {
    rangeCtl = window.GridRangeSelect.attach({
      gridDiv,
      gridApi,
      statusEl: document.getElementById('cellRangeStatus'),
    });
  }

  // 전체 복사 버튼
  const copyAllBtn = document.getElementById('gridCopyAllBtn');
  if (copyAllBtn && rangeCtl) {
    copyAllBtn.addEventListener('click', () => {
      rangeCtl.copyAll({ includeHeaders: true, onlyFiltered: true });
    });
  }

  // 헤더 우클릭 컨텍스트 메뉴 (공통 컴포넌트)
  if (window.GridColumnContext) {
    window.GridColumnContext.attach({ gridDiv, gridApi });
  }

  // 컬럼 초기화 버튼
  const resetBtn = document.getElementById('gridResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (gridApi) gridApi.resetColumnState();
    });
  }

  // 컬럼 선택 팝오버 버튼
  const colPickerBtn = document.getElementById('gridColPickerBtn');
  if (colPickerBtn && window.GridColumnPicker) {
    colPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.GridColumnPicker.open({
        gridApi,
        anchorEl: colPickerBtn,
        tableName: '이체 조회 테이블',
      });
    });
  }

  // 템플릿 설정 버튼 (GitHub 공유 저장소 기반)
  const tplBtn = document.getElementById('gridTplBtn');
  if (tplBtn && window.GridTemplate) {
    tplBtn.addEventListener('click', () => {
      window.GridTemplate.openModal({
        gridId: 'transferGrid',
        gridApi,
        tableName: '이체 조회 테이블',
      });
    });
  }
});

// ===== 성공 처리 모달 =====
// 통장 거래내역 샘플 데이터 (입금 건)
const bankTxData = [
  { idx: 563571, txAt: '2026-04-17T17:02:44', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '채인석', withdrawAmount: 0, depositAmount: 295901, linkable: 295901, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563572, txAt: '2026-04-17T15:22:11', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '전주식당', withdrawAmount: 0, depositAmount: 2732742, linkable: 2732742, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563573, txAt: '2026-04-17T14:50:08', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '호호미역', withdrawAmount: 0, depositAmount: 1538497, linkable: 1538497, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563574, txAt: '2026-04-17T12:15:03', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '서현양갈비', withdrawAmount: 0, depositAmount: 93315, linkable: 93315, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563575, txAt: '2026-04-17T10:02:55', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '투썸플레이스', withdrawAmount: 0, depositAmount: 590807, linkable: 590807, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563576, txAt: '2026-04-17T09:44:32', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '제비면가', withdrawAmount: 0, depositAmount: 777021, linkable: 777021, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563577, txAt: '2026-04-17T13:05:12', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '서현양갈비(중복)', withdrawAmount: 0, depositAmount: 93315, linkable: 93315, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563578, txAt: '2026-04-17T11:40:27', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: 'JINJINGYU', withdrawAmount: 0, depositAmount: 93315, linkable: 93315, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563579, txAt: '2026-04-17T18:22:05', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '미소베이커리', withdrawAmount: 0, depositAmount: 184720, linkable: 184720, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563583, txAt: '2026-04-17T06:12:45', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '송미소', withdrawAmount: 0, depositAmount: 184720, linkable: 184720, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563580, txAt: '2026-04-17T16:33:49', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '그린테이블', withdrawAmount: 0, depositAmount: 1820500, linkable: 1820500, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563581, txAt: '2026-04-17T08:12:03', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '성수공방', withdrawAmount: 0, depositAmount: 412300, linkable: 412300, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
  { idx: 563582, txAt: '2026-04-17T07:55:18', bankName: '우리은행', accountNo: '1005202418280', ownerName: '주식회사 현대벤디스', alias: '재무계좌', memo1: '채인석커피(중복)', withdrawAmount: 0, depositAmount: 295901, linkable: 295901, billIdx: '-', settleIdx: '-', memo: '', createdAt: '2026-04-17T19:00:01', createdBy: 'SYSTEM', updatedAt: '2026-04-17T19:00:01', updatedBy: '' },
].map(r => ({
  ...r,
  txAt: r.txAt.replace('T', ' '),
  createdAt: r.createdAt.replace('T', ' '),
  updatedAt: r.updatedAt.replace('T', ' '),
  withdrawAmount: r.linkable, // 샘플: 출금액 = 연결 가능 금액
}));

let modalGridApi = null;
let modalCurrentSeq = null;

const modalColumnDefs = [
  { headerName: '통장거래내역 IDX', field: 'idx', width: 80, headerClass: 'header-right', cellStyle: { textAlign: 'right' } },
  { headerName: '거래일시', field: 'txAt', width: 150 },
  { headerName: '거래 은행명', field: 'bankName', width: 80 },
  { headerName: '계좌번호', field: 'accountNo', width: 110, headerClass: 'header-right', cellStyle: { textAlign: 'right' } },
  { headerName: '예금주명', field: 'ownerName', width: 130 },
  { headerName: '별칭', field: 'alias', width: 80 },
  { headerName: '적요', field: 'memo1', width: 90 },
  { headerName: '출금액', field: 'withdrawAmount', width: 70, headerClass: 'header-right', cellStyle: { textAlign: 'right' }, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
  { headerName: '연결 가능 금액', field: 'linkable', width: 100, headerClass: 'header-right', cellStyle: { textAlign: 'right' }, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
  { headerName: '청구서 IDX', field: 'billIdx', width: 70, headerClass: 'header-right', cellStyle: { textAlign: 'right' } },
  { headerName: '정산서 IDX', field: 'settleIdx', width: 70, headerClass: 'header-right', cellStyle: { textAlign: 'right' } },
  { headerName: '메모', field: 'memo', width: 80 },
  { headerName: '생성일시', field: 'createdAt', width: 150 },
  { headerName: '생성자', field: 'createdBy', width: 70 },
  { headerName: '수정일시', field: 'updatedAt', width: 150 },
  { headerName: '수정자', field: 'updatedBy', width: 70 },
];

function filterBankTx() {
  // 24시간 포맷 텍스트 입력: 'YYYY-MM-DD HH:MM:SS' — txAt 형식과 동일해 문자열 비교 가능
  const from = (document.getElementById('modalDateFrom').value || '').trim();
  const to = (document.getElementById('modalDateTo').value || '').trim();
  const minAmt = parseInt(document.getElementById('modalAmountFrom').value, 10) || 0;
  const maxAmt = parseInt(document.getElementById('modalAmountTo').value, 10) || Number.MAX_SAFE_INTEGER;
  return bankTxData.filter(r => {
    if (from && r.txAt < from) return false;
    if (to && r.txAt > to) return false;
    if (r.linkable < minAmt || r.linkable > maxAmt) return false;
    return true;
  });
}

function runModalQuery() {
  if (!modalGridApi) return;
  const rows = filterBankTx();
  modalGridApi.setGridOption('rowData', rows);
  document.getElementById('modalResultCount').textContent = `조회 결과 : ${rows.length}건`;
  updateModalSelectionUI();
}

function updateModalSelectionUI() {
  const selected = modalGridApi ? modalGridApi.getSelectedRows().length : 0;
  document.getElementById('modalSelectedCount').textContent = selected;
  const btn = document.getElementById('modalConfirmBtn');
  if (btn) btn.disabled = selected !== 1;
}

// 3-버튼 커스텀 confirm (닫기 / 정산서도 연결 후 성공처리 / 그냥 성공처리)
function confirmSuccessChoice(msg, onLinkAndSuccess, onJustSuccess) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-body">${msg.replace(/\n/g, '<br>')}</div>
      <div class="confirm-actions">
        <button class="btn btn-sm btn-outline-primary" data-act="close">닫기</button>
        <button class="btn btn-sm btn-primary" data-act="link">정산서도 연결 후 성공처리</button>
        <button class="btn btn-sm btn-primary" data-act="success">그냥 성공처리</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    overlay.remove();
    if (act === 'link') onLinkAndSuccess();
    else if (act === 'success') onJustSuccess();
  });
}

function openSuccessModal(seq) {
  const row = gridData.find(r => r.seq === seq);
  if (!row) return;
  modalCurrentSeq = seq;

  const modal = document.getElementById('successModal');
  document.getElementById('modalSeq').value = row.seq;
  document.getElementById('modalSettleMonth').value = row.settleMonth || '-';
  document.getElementById('modalSettleIdx').value = row.settleIdx;
  document.getElementById('modalSettleName').value = row.settleName;
  document.getElementById('modalAmount').value = row.transferAmount.toLocaleString() + '원';
  document.getElementById('modalShopName').value = row.shopName || '-';

  // 거래일시 디폴트: 해당 행의 지급일시(paidAt) ± 10초 (24시간 포맷)
  // paidAt 이 비어있는 실패 건은 요청일시 → 생성일시 순서로 폴백해 "이체 시도 시점" 주변을 잡는다
  const pad = n => String(n).padStart(2, '0');
  const fmt24 = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const baseStr = row.paidAt || row.requestedAt || row.createdAt;
  if (baseStr) {
    const base = new Date(baseStr.replace(' ', 'T'));
    document.getElementById('modalDateFrom').value = fmt24(new Date(base.getTime() - 10000));
    document.getElementById('modalDateTo').value   = fmt24(new Date(base.getTime() + 10000));
  } else {
    document.getElementById('modalDateFrom').value = '2026-04-17 00:00:00';
    document.getElementById('modalDateTo').value   = '2026-04-17 23:59:59';
  }
  document.getElementById('modalAmountFrom').value = row.transferAmount;
  document.getElementById('modalAmountTo').value = row.transferAmount;

  modal.classList.add('open');

  // 모달 그리드는 모달이 실제 레이아웃된 후에 초기화해야 사이즈가 잡힘
  // rAF 2회 → 브라우저 첫 페인트/레이아웃이 끝난 뒤 생성
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const gridDiv = document.getElementById('modalGrid');
    if (!modalGridApi) {
      modalGridApi = agGrid.createGrid(gridDiv, {
        columnDefs: modalColumnDefs,
        rowData: [],
        rowSelection: 'single',
        suppressRowClickSelection: false,
        animateRows: false,
        defaultColDef: { sortable: true, resizable: true, filter: false },
        rowHeight: 28,
        headerHeight: 28,
        domLayout: 'normal',
        onSelectionChanged: updateModalSelectionUI,
        onGridReady: () => {
          // ag-root-wrapper가 height:2px(border만)로 계산되는 이슈 우회 —
          // 부모(#modalGrid) 픽셀 높이를 직접 !important로 주입
          const wrapper = gridDiv.querySelector('.ag-root-wrapper');
          if (wrapper) {
            const applyH = () => {
              const h = gridDiv.clientHeight;
              if (h > 10) wrapper.style.setProperty('height', h + 'px', 'important');
            };
            applyH();
            // 모달 열림/전환 이후에도 한 번 더
            requestAnimationFrame(() => requestAnimationFrame(applyH));
            // 필터 토글 등에 대응해 ResizeObserver로 추적
            if (window.ResizeObserver) new ResizeObserver(applyH).observe(gridDiv);
          }
        },
      });
    } else {
      // 기존 그리드가 있으면 사이즈 재계산
      modalGridApi.onGridSizeChanged && modalGridApi.onGridSizeChanged();
    }
    runModalQuery();
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('successModal');
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');
  const searchBtn = document.getElementById('modalSearchBtn');
  const confirmBtn = document.getElementById('modalConfirmBtn');

  function closeModal() { modal.classList.remove('open'); }
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  if (searchBtn) searchBtn.addEventListener('click', runModalQuery);

  // 모달 필터 아코디언
  const modalFilterToggle = document.getElementById('modalFilterToggle');
  const modalFilterBody = document.getElementById('modalFilterBody');
  if (modalFilterToggle && modalFilterBody) {
    modalFilterToggle.addEventListener('click', () => {
      modalFilterToggle.classList.toggle('open');
      modalFilterBody.classList.toggle('open');
      if (modalGridApi) {
        requestAnimationFrame(() => modalGridApi.onGridSizeChanged && modalGridApi.onGridSizeChanged());
      }
    });
  }

  // 모달 이체정보 아코디언
  const modalInfoToggle = document.getElementById('modalInfoToggle');
  const modalInfoBody = document.getElementById('modalInfoBody');
  if (modalInfoToggle && modalInfoBody) {
    modalInfoToggle.addEventListener('click', () => {
      modalInfoToggle.classList.toggle('open');
      modalInfoBody.classList.toggle('open');
      if (modalGridApi) {
        requestAnimationFrame(() => modalGridApi.onGridSizeChanged && modalGridApi.onGridSizeChanged());
      }
    });
  }
  // ===== 날짜 빠른선택 핫키 (오늘 / 이번 달 / 지난 달) → date input 값 설정 =====
  (function bindDatePresetButtons() {
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    function getRange(label) {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
      if (label.includes('오늘')) {
        const today = fmt(new Date(y, m, d));
        return [today, today];
      }
      if (label.includes('지난')) {
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0); // 지난달 말일
        return [fmt(first), fmt(last)];
      }
      // 이번 달 기본
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return [fmt(first), fmt(last)];
    }
    document.querySelectorAll('.filter-inline-group').forEach(group => {
      const btns = group.querySelectorAll('.btn-group-period .btn-period');
      const dateInputs = group.querySelectorAll('.date-range input[type="date"]');
      if (!btns.length || dateInputs.length < 2) return;
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const [from, to] = getRange(btn.textContent.trim());
          dateInputs[0].value = from;
          dateInputs[1].value = to;
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          // change 이벤트로 연계된 리스너(검증/검색 등)에도 알림
          dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          dateInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  })();

  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    if (!modalGridApi) return;
    const sel = modalGridApi.getSelectedRows();
    if (sel.length !== 1) return;
    const row = gridData.find(r => r.seq === modalCurrentSeq);
    const tx = sel[0];
    const amt = tx.linkable.toLocaleString();
    const msg = `정산서IDX: ${row.settleIdx} 에 해당 통장내역(IDX ${tx.idx})을 연결하여 성공 처리합니다.\n정산서도 연결하시겠습니까?\n\n연결금액: ${amt}원\n연결가능금액: ${amt}원`;
    confirmSuccessChoice(
      msg,
      () => { // 정산서도 연결 + 성공처리
        alert(`정산서 ${row.settleIdx} 연결 + 이체 ${modalCurrentSeq} 성공 처리 완료 (통장거래 ${tx.idx}, ${amt}원)`);
        closeModal();
      },
      () => { // 그냥 성공처리
        alert(`이체 ${modalCurrentSeq} 성공 처리 완료 (통장거래 ${tx.idx}, ${amt}원)`);
        closeModal();
      }
    );
  });
});
