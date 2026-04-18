// ===== 정산 계약 관리 (settle-contract-list) =====
// - 조건 검색: 계약서타입(멀티), 태그(서치+드롭), 증빙수취유형(멀티), 상계/상태 라디오, 기간, 키워드
// - 테이블: AG Grid + VoneTableFilter 일괄 적용
// - 푸터: 정산계약 신규 생성 (모달 → 현재 alert 플레이스홀더)
// - 로우 액션: 정산서보기, 상세보기

(function () {
  // ---------- mock 데이터 ----------
  const TAG_OPTIONS = ['기타비용', '로봇', '이용료', '기기수수료'];
  const CONTRACT_TYPES = ['식권대장', '복지대장', '퀵대장', '단체선물대장', '기타'];

  const rawRows = [
    { idx: 21949, name: '컴포즈커피테헤란로점 _계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 42095, partnerName: '컴포즈커피테헤란로점', bizNo: '5077700634', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: 'F89F5505-9CE2-491D-A709-C375302936F1', shopName: '컴포즈커피 테헤란로점', cycleType: '정기', cycleDay: 1, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', certExpire: '', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: 'KEB하나은행', settleAccount: '23491032587107', settleOwner: '박하영(컴포즈커피테)', startAt: '2023-08-01', endAt: '2027-02-24', terminatedAt: '', extReview: 'Y', status: '유효', managerId: '', managerName: '', createdAt: '2026-02-24T14:36:49', createdBy: '김지혜', updatedAt: '2026-03-30T19:38:44', updatedBy: '이주환', locked: false },
    { idx: 21850, name: '(주)뉴빌리티 로봇운영_계약서', ctype: '퀵대장', tags: ['로봇', '이용료'], partnerIdx: 41021, partnerName: '주식회사 뉴빌리티', bizNo: '5398700775', subBizNo: '0000', isGroup: 'N', shopCount: 3, shopId: '019C0DB1-9FE5-7378-8A51-A3A8F688F78E', shopName: '[뉴빌리티] 본사', cycleType: '정기', cycleDay: 25, payCycle: '월', pointFeeRate: 0.00, payFeeRate: 0.00, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', certExpire: '2027-08-15', closedAt: '', proofOffset: '별도', transferOffset: '별도', settleBank: '우리은행', settleAccount: '1005704140945', settleOwner: '주식회사 뉴빌리티', startAt: '2024-01-01', endAt: '2027-12-31', terminatedAt: '', extReview: 'N', status: '유효', managerId: 'U0231', managerName: '이샛별', createdAt: '2024-01-05T10:20:00', createdBy: '이샛별', updatedAt: '2026-04-10T09:12:30', updatedBy: '전은혜', locked: false },
    { idx: 21702, name: '투썸플레이스(을지로입구역점)_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 40912, partnerName: '투썸플레이스 주식회사', bizNo: '4048601054', subBizNo: '0001', isGroup: 'Y', shopCount: 18, shopId: 'CF5714DD-DC5C-76F5-DC24-606571F03BEB', shopName: '투썸플레이스(을지로입구역점)', cycleType: '정기', cycleDay: 10, payCycle: '월', pointFeeRate: 0.035, payFeeRate: 0.035, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', certExpire: '2026-11-30', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: '우리은행', settleAccount: '27837054218114', settleOwner: '투썸플레이스주식회사', startAt: '2022-05-01', endAt: '2026-04-30', terminatedAt: '', extReview: 'Y', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2022-05-02T13:00:00', createdBy: '김지혜', updatedAt: '2026-03-15T14:05:12', updatedBy: '이주환', locked: true },
    { idx: 21611, name: '성수공방_계약서', ctype: '식권대장', tags: ['기타비용'], partnerIdx: 40211, partnerName: '성수공방', bizNo: '2098702215', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: 'B01F5B10-1111-2222-3333-444455556666', shopName: '성수공방', cycleType: '정기', cycleDay: 15, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '종이세금계산서', linkType: '', certExpire: '', closedAt: '', proofOffset: '별도', transferOffset: '상계', settleBank: '신한은행', settleAccount: '110555123456', settleOwner: '박지은', startAt: '2024-06-01', endAt: '2026-05-31', terminatedAt: '', extReview: 'N', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2024-06-03T09:40:00', createdBy: '전은혜', updatedAt: '2026-02-18T11:22:45', updatedBy: '전은혜', locked: false },
    { idx: 21508, name: '(주)그린테이블 복지포인트_계약서', ctype: '복지대장', tags: ['이용료'], partnerIdx: 39880, partnerName: '주식회사 그린테이블', bizNo: '3308801007', subBizNo: '0000', isGroup: 'Y', shopCount: 12, shopId: 'C01F5B10-1111-2222-3333-444455556666', shopName: '(주)그린테이블 본사', cycleType: '정기', cycleDay: 20, payCycle: '월', pointFeeRate: 0.025, payFeeRate: 0.025, proofType: '공급자발행', linkType: 'BAROBILL', certExpire: '2027-02-28', closedAt: '', proofOffset: '별도', transferOffset: '별도', settleBank: '우리은행', settleAccount: '1005704555821', settleOwner: '(주)그린테이블', startAt: '2023-03-01', endAt: '2026-02-28', terminatedAt: '', extReview: 'Y', status: '유효', managerId: 'U0231', managerName: '이샛별', createdAt: '2023-03-02T10:00:00', createdBy: '이샛별', updatedAt: '2026-01-20T15:30:00', updatedBy: '김지혜', locked: false },
    { idx: 21401, name: '단체선물 2026 설시즌_계약서', ctype: '단체선물대장', tags: ['기타비용'], partnerIdx: 38775, partnerName: '현대자동차', bizNo: '1018105856', subBizNo: '0002', isGroup: 'Y', shopCount: 120, shopId: 'GIFT-2026-01', shopName: '현대차 본사 선물 허브', cycleType: '일회성', cycleDay: 0, payCycle: '건별', pointFeeRate: 0.02, payFeeRate: 0.02, proofType: '공급자발행', linkType: 'BAROBILL', certExpire: '', closedAt: '', proofOffset: '별도', transferOffset: '별도', settleBank: '국민은행', settleAccount: '06301045912333', settleOwner: '현대자동차(주)', startAt: '2026-01-15', endAt: '2026-02-28', terminatedAt: '', extReview: 'N', status: '만료', managerId: 'U0145', managerName: '박지원', createdAt: '2026-01-10T11:30:00', createdBy: '박지원', updatedAt: '2026-03-01T09:00:00', updatedBy: 'SYSTEM', locked: true },
    { idx: 21390, name: '전주식당(성남)_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 38620, partnerName: '전주식당(성남)', bizNo: '8616100099', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: '4EF9C582-AF44-4ACF-B272-2CECA08EC42C', shopName: '전주식당(성남)', cycleType: '정기', cycleDay: 5, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '시스템발행', linkType: 'BAROBILL', certExpire: '', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: '농협은행', settleAccount: '3020111803611', settleOwner: '김순모', startAt: '2024-10-01', endAt: '2026-09-30', terminatedAt: '', extReview: 'N', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2024-10-02T09:20:00', createdBy: '전은혜', updatedAt: '2026-03-20T16:44:00', updatedBy: '전은혜', locked: false },
    { idx: 21155, name: '미소베이커리_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 36905, partnerName: '미소베이커리', bizNo: '4185100884', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: 'D01F5B10-1111-2222-3333-444455556666', shopName: '미소베이커리', cycleType: '정기', cycleDay: 1, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '종이세금계산서', linkType: '', certExpire: '', closedAt: '2026-03-31', proofOffset: '별도', transferOffset: '별도', settleBank: '농협은행', settleAccount: '3020112244335', settleOwner: '송미소', startAt: '2024-02-01', endAt: '2026-01-31', terminatedAt: '2026-03-31', extReview: 'N', status: '만료', managerId: 'U0112', managerName: '전은혜', createdAt: '2024-02-05T10:00:00', createdBy: '전은혜', updatedAt: '2026-04-01T10:00:00', updatedBy: 'SYSTEM', locked: true },
    { idx: 21044, name: '주식회사 뉴빌리티(로봇대장)_기기수수료_계약서', ctype: '퀵대장', tags: ['로봇', '기기수수료'], partnerIdx: 35901, partnerName: '주식회사 뉴빌리티', bizNo: '5398700775', subBizNo: '0001', isGroup: 'N', shopCount: 5, shopId: '019C0DB1-MACH-2222-3333-A3A8F688F78E', shopName: '[뉴빌리티] 기기 운용', cycleType: '정기', cycleDay: 28, payCycle: '월', pointFeeRate: 0.00, payFeeRate: 0.01, proofType: '공급자발행', linkType: 'BAROBILL', certExpire: '2027-08-15', closedAt: '', proofOffset: '별도', transferOffset: '별도', settleBank: '우리은행', settleAccount: '1005704140945', settleOwner: '주식회사 뉴빌리티', startAt: '2025-02-01', endAt: '2028-01-31', terminatedAt: '', extReview: 'Y', status: '유효', managerId: 'U0231', managerName: '이샛별', createdAt: '2025-02-02T11:00:00', createdBy: '이샛별', updatedAt: '2026-04-11T11:22:00', updatedBy: '이샛별', locked: false },
    { idx: 20998, name: '서현양갈비양꼬치_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 35512, partnerName: '서현양갈비양꼬치', bizNo: '1440217523', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: '019CFB97-3B7D-7A85-AB6A-5B03F56D68A1', shopName: '서현양갈비양꼬치', cycleType: '정기', cycleDay: 15, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '종이세금계산서', linkType: '', certExpire: '', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: '국민은행', settleAccount: '92900101438230', settleOwner: 'JINJINGYU', startAt: '2025-01-01', endAt: '2026-12-31', terminatedAt: '', extReview: 'N', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2025-01-05T10:00:00', createdBy: '전은혜', updatedAt: '2026-04-15T11:10:00', updatedBy: '전은혜', locked: false },
    { idx: 20901, name: '채인석커피(판교점)_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 35210, partnerName: '채인석커피', bizNo: '1148800321', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: 'A01F5B10-1111-2222-3333-444455556666', shopName: '채인석커피(판교점)', cycleType: '정기', cycleDay: 1, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '시스템발행', linkType: 'BAROBILL', certExpire: '', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: '국민은행', settleAccount: '80420104123777', settleOwner: '채인석', startAt: '2024-08-01', endAt: '2027-07-31', terminatedAt: '', extReview: 'Y', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2024-08-02T10:00:00', createdBy: '전은혜', updatedAt: '2026-03-01T13:20:00', updatedBy: '전은혜', locked: false },
    { idx: 20810, name: '호호미역(경희궁 직영점)_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 34120, partnerName: '호호미역 경희궁 직영점', bizNo: '2257100313', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: 'DC2504BF-7CD9-AB76-4956-5584F18216DF', shopName: '호호미역(경희궁 직영점)', cycleType: '정기', cycleDay: 20, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '공급자발행', linkType: 'BAROBILL', certExpire: '2026-12-31', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: '신한은행', settleAccount: '110484273518', settleOwner: '임영제(호호미역)', startAt: '2023-11-01', endAt: '2026-10-31', terminatedAt: '', extReview: 'Y', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2023-11-03T10:00:00', createdBy: '김지혜', updatedAt: '2026-04-05T15:44:00', updatedBy: '이주환', locked: false },
    { idx: 20707, name: '트러스트커피(선릉점)_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 33190, partnerName: '트러스트커피', bizNo: '5460900023', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: '0A2FFA11-F263-AD36-37A4-BA145BFA0F45', shopName: '트러스트커피(선릉점)', cycleType: '정기', cycleDay: 5, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '종이세금계산서', linkType: '', certExpire: '', closedAt: '', proofOffset: '별도', transferOffset: '별도', settleBank: '우리은행', settleAccount: '1002844918916', settleOwner: '서광석', startAt: '2025-03-01', endAt: '2027-02-28', terminatedAt: '', extReview: 'N', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2025-03-04T10:00:00', createdBy: '전은혜', updatedAt: '2026-04-10T09:15:00', updatedBy: '전은혜', locked: false },
    { idx: 20601, name: '제비면가_계약서', ctype: '식권대장', tags: ['이용료'], partnerIdx: 32055, partnerName: '제비면가', bizNo: '7560202084', subBizNo: '0000', isGroup: 'N', shopCount: 1, shopId: '6A14FF0F-81D3-2116-76D6-5DEF4A44AAA1', shopName: '제비면가', cycleType: '정기', cycleDay: 10, payCycle: '월', pointFeeRate: 0.03, payFeeRate: 0.03, proofType: '공급자발행', linkType: 'BAROBILL', certExpire: '', closedAt: '', proofOffset: '상계', transferOffset: '상계', settleBank: '케이뱅크', settleAccount: '100216198463', settleOwner: '김수영(제비면가)', startAt: '2024-05-01', endAt: '2027-04-30', terminatedAt: '', extReview: 'Y', status: '유효', managerId: 'U0112', managerName: '전은혜', createdAt: '2024-05-02T10:00:00', createdBy: '전은혜', updatedAt: '2026-04-12T14:00:00', updatedBy: '전은혜', locked: false },
  ];

  // ---------- Cell Renderers ----------
  function LinkRenderer(p) { return p.value != null && p.value !== '' ? `<a class="grid-link">${p.value}</a>` : ''; }
  function TagsRenderer(p) {
    if (!p.value || !p.value.length) return '';
    return p.value.map(t => `<span class="tag-chip">${t}</span>`).join(' ');
  }
  function StatusRenderer(p) {
    if (!p.value) return '';
    const color = p.value === '유효' ? '#16a34a' : '#9aa3af';
    return `<span style="color:${color};font-weight:600">${p.value}</span>`;
  }
  function YNRenderer(p) {
    if (p.value === 'Y') return '<span style="color:#2563eb;font-weight:600">Y</span>';
    if (p.value === 'N') return '<span style="color:#9aa3af">N</span>';
    return p.value || '';
  }
  function LockedRenderer(p) {
    return p.value ? '<span style="color:#d97706">🔒 잠금</span>' : '<span style="color:#9aa3af">-</span>';
  }
  function PctRenderer(p) { return p.value != null ? (Number(p.value) * 100).toFixed(2) + '%' : ''; }
  function DetailBtnRenderer(p) {
    if (!p.data) return '';
    return `<button class="grid-action-btn outline-primary" onclick="window.SettleContract.openDetail(${p.data.idx})">상세보기</button>`;
  }
  function SettleBtnRenderer(p) {
    if (!p.data) return '';
    return `<button class="grid-action-btn" onclick="window.SettleContract.openSettleList(${p.data.idx})">정산서 보기</button>`;
  }

  const rightAlign = { textAlign: 'right' };
  const centerAlign = { textAlign: 'center' };

  // ---------- Column Defs ----------
  const columnDefs = [
    { headerName: '', field: '_select', width: 32, minWidth: 32, maxWidth: 32, pinned: 'left', checkboxSelection: true, headerCheckboxSelection: true, headerCheckboxSelectionFilteredOnly: true, sortable: false, filter: false, resizable: false, suppressMovable: true, lockPosition: 'left', cellClass: 'cell-select', headerClass: 'header-center' },
    { headerName: '정산계약 IDX', field: 'idx', width: 90, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '계약명', field: 'name', width: 240, minWidth: 120 },
    { headerName: '계약서 타입', field: 'ctype', width: 90, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '태그', field: 'tags', width: 160, cellRenderer: TagsRenderer, valueFormatter: p => (p.value || []).join(', ') },
    { headerName: '거래처 IDX', field: 'partnerIdx', width: 80, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '거래처명', field: 'partnerName', width: 150, minWidth: 100 },
    { headerName: '거래처 사업자번호', field: 'bizNo', width: 110, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '종사업장 번호', field: 'subBizNo', width: 90, cellStyle: rightAlign, headerClass: 'header-right' },
    { headerName: '그룹정산 여부', field: 'isGroup', width: 90, cellRenderer: YNRenderer, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '연결 제휴점 수', field: 'shopCount', width: 90, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '제휴점 ID', field: 'shopId', width: 200 },
    { headerName: '연결 제휴점명', field: 'shopName', width: 170, minWidth: 110 },
    { headerName: '정산 주기', field: 'cycleType', width: 80, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '정산주기일', field: 'cycleDay', width: 80, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '지급 주기', field: 'payCycle', width: 70, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '서비스 포인트 수수료율 (%)', field: 'pointFeeRate', width: 120, cellRenderer: PctRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '대장페이 수수료율 (%)', field: 'payFeeRate', width: 120, cellRenderer: PctRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    { headerName: '매입 증빙 수취 유형', field: 'proofType', width: 150 },
    { headerName: '연동사 타입', field: 'linkType', width: 90 },
    { headerName: '공동인증서 만료일', field: 'certExpire', width: 110, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '폐업일자', field: 'closedAt', width: 90, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '적격 증빙 상계 여부', field: 'proofOffset', width: 120, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '이체 상계 여부', field: 'transferOffset', width: 100, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '정산 은행명', field: 'settleBank', width: 100 },
    { headerName: '정산 계좌번호', field: 'settleAccount', width: 130, cellStyle: rightAlign, headerClass: 'header-right' },
    { headerName: '정산 예금주', field: 'settleOwner', width: 130 },
    { headerName: '계약 시작일', field: 'startAt', width: 100, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '계약 종료일', field: 'endAt', width: 100, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '계약 해지일', field: 'terminatedAt', width: 100, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '연장검토 여부', field: 'extReview', width: 90, cellRenderer: YNRenderer, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '상태', field: 'status', width: 70, cellRenderer: StatusRenderer, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '계약 담당자 ID', field: 'managerId', width: 100 },
    { headerName: '계약 담당자', field: 'managerName', width: 90 },
    { headerName: '생성일시', field: 'createdAt', width: 150 },
    { headerName: '생성자', field: 'createdBy', width: 70 },
    { headerName: '수정일시', field: 'updatedAt', width: 150 },
    { headerName: '수정자', field: 'updatedBy', width: 70 },
    { headerName: '잠금여부', field: 'locked', width: 90, cellRenderer: LockedRenderer, cellStyle: centerAlign, headerClass: 'header-center' },
    { headerName: '정산서 보기', field: '_viewSettle', width: 110, cellRenderer: SettleBtnRenderer, pinned: 'right', sortable: false, filter: false, cellClass: 'cell-action-buttons' },
    { headerName: '상세보기', field: '_detail', width: 100, cellRenderer: DetailBtnRenderer, pinned: 'right', sortable: false, filter: false, cellClass: 'cell-action-buttons' },
  ];

  if (window.VoneTableFilterLib) {
    window.VoneTableFilterLib.installAll(columnDefs, { exclude: ['_select', '_viewSettle', '_detail'] });
    window.VoneTableFilterLib.installHintHeader(columnDefs, '_select');
  }

  // ---------- 상태 ----------
  let gridApi = null;
  const state = {
    contractType: new Set(),        // 멀티
    proofType: new Set(),           // 멀티
    tag: new Set(),                 // 멀티 (서치 드롭)
    proofOffset: 'all',
    transferOffset: 'all',
    groupSettle: 'all',
    contractStatus: 'all',
    closedBiz: 'all',
  };

  function applyFilter() {
    if (!gridApi) return;
    const filtered = rawRows.filter(r => {
      if (state.contractType.size && !state.contractType.has(r.ctype)) return false;
      if (state.proofType.size) {
        const key = (r.proofType || '').replace(/\s/g, '').replace(/^전자세금용인증서등록$/, '시스템발행');
        if (!state.proofType.has(key)) return false;
      }
      if (state.tag.size) {
        const rowTags = r.tags || [];
        let ok = false;
        for (const t of state.tag) { if (rowTags.includes(t)) { ok = true; break; } }
        if (!ok) return false;
      }
      if (state.proofOffset !== 'all' && r.proofOffset !== state.proofOffset) return false;
      if (state.transferOffset !== 'all' && r.transferOffset !== state.transferOffset) return false;
      if (state.groupSettle !== 'all') {
        const isGroup = r.isGroup === 'Y';
        if (state.groupSettle === 'group' && !isGroup) return false;
        if (state.groupSettle === 'single' && isGroup) return false;
      }
      if (state.contractStatus !== 'all' && r.status !== state.contractStatus) return false;
      if (state.closedBiz !== 'all') {
        const isClosed = !!r.closedAt;
        if (state.closedBiz === '정상' && isClosed) return false;
        if (state.closedBiz === '폐업' && !isClosed) return false;
      }
      return true;
    });
    gridApi.setGridOption('rowData', filtered);
    const totalEl = document.getElementById('scGridTotal');
    if (totalEl) totalEl.textContent = `검색결과 : ${filtered.length.toLocaleString()}건`;
  }

  // ---------- 필터 UI 바인딩 ----------
  function bindCheckboxGroups(root) {
    root.querySelectorAll('.checkbox-btn-group').forEach(group => {
      const name = group.dataset.name;
      const set = state[name];
      if (!(set instanceof Set)) return;
      group.querySelectorAll('.checkbox-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const v = btn.dataset.value;
          if (set.has(v)) { set.delete(v); btn.classList.remove('active'); }
          else { set.add(v); btn.classList.add('active'); }
        });
      });
    });
  }

  function bindRadioGroups(root) {
    root.querySelectorAll('.radio-btn-group').forEach(group => {
      const name = group.dataset.name;
      if (!(name in state)) return;
      group.querySelectorAll('.radio-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          group.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state[name] = btn.dataset.value;
        });
      });
    });
  }

  function bindTagSelect(root) {
    const wrap = root.querySelector('.tag-select[data-name="tag"]');
    if (!wrap) return;
    const input = wrap.querySelector('.tag-select-input');
    const chips = wrap.querySelector('.tag-select-chips');
    const dropdown = wrap.querySelector('.tag-select-dropdown');

    function renderChips() {
      chips.innerHTML = Array.from(state.tag).map(t =>
        `<span class="tag-select-chip">${t}<span class="tag-select-chip-x" data-v="${t}">×</span></span>`
      ).join('');
    }

    function renderDropdown() {
      const q = input.value.trim().toLowerCase();
      const items = TAG_OPTIONS.filter(t => !q || t.toLowerCase().includes(q));
      if (!items.length) {
        dropdown.innerHTML = '<div class="tag-select-empty">일치 결과 없음</div>';
        return;
      }
      dropdown.innerHTML = items.map(t =>
        `<div class="tag-select-item${state.tag.has(t) ? ' selected' : ''}" data-v="${t}">${t}</div>`
      ).join('');
    }

    function openDropdown() {
      wrap.classList.add('open');
      renderDropdown();
      dropdown.style.display = 'block';
    }
    function closeDropdown() {
      wrap.classList.remove('open');
      dropdown.style.display = 'none';
    }

    input.addEventListener('focus', openDropdown);
    input.addEventListener('input', () => { openDropdown(); });
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.tag-select-chip-x')) {
        const v = e.target.dataset.v;
        state.tag.delete(v);
        renderChips();
        renderDropdown();
        return;
      }
      if (e.target.closest('.tag-select-item')) {
        const v = e.target.closest('.tag-select-item').dataset.v;
        if (state.tag.has(v)) state.tag.delete(v); else state.tag.add(v);
        renderChips();
        renderDropdown();
        input.focus();
        return;
      }
      if (e.target === wrap || e.target.closest('.tag-select-control')) {
        input.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) closeDropdown();
    });

    renderChips();
  }

  function resetFilter() {
    // 상태 초기화
    state.contractType.clear();
    state.proofType.clear();
    state.tag.clear();
    state.proofOffset = 'all';
    state.transferOffset = 'all';
    state.groupSettle = 'all';
    state.contractStatus = 'all';
    state.closedBiz = 'all';

    const page = document.getElementById('page-settle-contract-list');
    if (!page) return;
    // 체크박스 버튼
    page.querySelectorAll('.checkbox-btn.active').forEach(b => b.classList.remove('active'));
    // 라디오 → 첫 번째(전체) 활성
    page.querySelectorAll('.radio-btn-group').forEach(group => {
      group.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      const first = group.querySelector('.radio-btn');
      if (first) first.classList.add('active');
    });
    // 태그 chips
    const chips = page.querySelector('.tag-select-chips');
    if (chips) chips.innerHTML = '';
    const tagInput = page.querySelector('.tag-select-input');
    if (tagInput) tagInput.value = '';
    // 텍스트/데이트
    page.querySelectorAll('.filter-text-input').forEach(i => { i.value = ''; });
    page.querySelectorAll('.date-range input[type="date"]').forEach(i => { i.value = ''; });
    // 기간 프리셋 해제
    page.querySelectorAll('.btn-period.active').forEach(b => b.classList.remove('active'));

    applyFilter();
  }

  // ---------- 상세/정산서 (placeholder) ----------
  function openDetail(idx) {
    const row = rawRows.find(r => r.idx === idx);
    alert(`[상세보기]\n정산계약 IDX : ${idx}\n계약명: ${row ? row.name : ''}\n(실제 상세 페이지는 추후 구현)`);
  }
  function openSettleList(idx) {
    const row = rawRows.find(r => r.idx === idx);
    alert(`[정산서 보기]\n정산계약 IDX : ${idx}\n계약명: ${row ? row.name : ''}\n해당 계약에 속한 정산서 목록을 새 탭으로 열 예정`);
  }
  function openNew() {
    alert('[정산계약 신규 생성 모달]\n아직 미구현 — 추후 작업에서 계약 생성 폼을 여기서 띄웁니다');
  }

  // ---------- 그리드 초기화 ----------
  function initGrid() {
    const gridDiv = document.getElementById('settleContractGrid');
    if (!gridDiv || gridApi) return;
    gridApi = agGrid.createGrid(gridDiv, {
      columnDefs,
      rowData: rawRows,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      animateRows: true,
      defaultColDef: { sortable: true, resizable: true, filter: true, floatingFilter: true },
      rowHeight: 28,
      headerHeight: 28,
      floatingFiltersHeight: 26,
      onSelectionChanged: () => {
        const count = gridApi ? gridApi.getSelectedRows().length : 0;
        const el = document.getElementById('scSelectedCount');
        if (el) el.textContent = count;
      },
    });
    window.scGridApi = gridApi;
    const totalEl = document.getElementById('scGridTotal');
    if (totalEl) totalEl.textContent = `검색결과 : ${rawRows.length.toLocaleString()}건`;

    if (window.GridRangeSelect) {
      const rangeCtl = window.GridRangeSelect.attach({
        gridDiv, gridApi, statusEl: document.getElementById('scCellRangeStatus'),
      });
      const copyAllBtn = document.getElementById('scCopyAllBtn');
      if (copyAllBtn && rangeCtl) {
        copyAllBtn.addEventListener('click', () => rangeCtl.copyAll({ includeHeaders: true, onlyFiltered: true }));
      }
    }

    const resetBtn = document.getElementById('scResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => gridApi.resetColumnState());

    const colPickerBtn = document.getElementById('scColPickerBtn');
    if (colPickerBtn && window.GridColumnPicker) {
      colPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.GridColumnPicker.open({ gridApi, anchorEl: colPickerBtn, tableName: '정산 계약 조회 테이블' });
      });
    }

    const tplBtn = document.getElementById('scTplBtn');
    if (tplBtn && window.GridTemplate) {
      tplBtn.addEventListener('click', () => {
        window.GridTemplate.openModal({ gridId: 'settleContractGrid', gridApi, tableName: '정산 계약 조회 테이블' });
      });
    }
  }

  // ---------- 페이지 활성화 훅 ----------
  let bound = false;
  function bindFiltersOnce() {
    if (bound) return;
    const page = document.getElementById('page-settle-contract-list');
    if (!page) return;
    bindCheckboxGroups(page);
    bindRadioGroups(page);
    bindTagSelect(page);

    // 필터 아코디언
    const ft = document.getElementById('scFilterToggle');
    const fb = document.getElementById('scFilterBody');
    if (ft && fb) ft.addEventListener('click', () => { ft.classList.toggle('open'); fb.classList.toggle('open'); });

    // 조회/초기화
    const searchBtn = document.getElementById('scSearchBtn');
    if (searchBtn) searchBtn.addEventListener('click', applyFilter);
    const resetBtn = document.getElementById('scFilterReset');
    if (resetBtn) resetBtn.addEventListener('click', resetFilter);

    // 푸터 신규 생성
    const newBtn = document.getElementById('scNewBtn');
    if (newBtn) newBtn.addEventListener('click', openNew);

    bound = true;
  }

  function onPageShown(tabId) {
    if (tabId !== 'settle-contract-list') return;
    bindFiltersOnce();
    // 페이지가 display:none 이었다가 표시되는 순간 그리드 생성 (레이아웃 확보 후)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      initGrid();
      if (gridApi && gridApi.onGridSizeChanged) gridApi.onGridSizeChanged();
    }));
  }

  window.addEventListener('tab:activated', (e) => {
    onPageShown(e && e.detail && e.detail.id);
  });
  window.addEventListener('page:shown', (e) => {
    onPageShown(e && e.detail && e.detail.tabId);
  });

  // 최초 로드 시 이미 활성 상태라면 바로 초기화
  document.addEventListener('DOMContentLoaded', () => {
    const active = window.TabManager && window.TabManager.getActive && window.TabManager.getActive();
    if (active === 'settle-contract-list') onPageShown(active);
  });

  // 외부 공개 (렌더러에서 호출)
  window.SettleContract = { openDetail, openSettleList, openNew };
})();
