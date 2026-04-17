// ===== 이체관리 AG Grid =====
const bankNames = ['농협은행', '신한은행', '우리은행', '국민은행', '케이뱅크', '하나은행', '기업은행', '카카오뱅크'];
const statusList = ['이체 성공', '이체 실패', '이체 성공', '이체 성공', '이체 성공', '이체 성공', '이체 성공', '이체 실패'];
const shopNames = [
  '전주식당(상남)_계약서', '호호미역(경희궁 직영점)_계약서', '두썸플레이스(을지로입구역점)_...',
  '함평해정_계약서', '주식회사 뉴빌리티(로봇대장)_계...', '서현양갈비양꼬치_계약서',
  '트러스트커피(선릉점)_계약서', '김가네김밥(팽택더샵센트럴점)_...', '제비면가_계약서',
  '바른식탁(삼성점)_계약서', '한첨 손대국 여의도 본점_계약서', '멘아하나비(신사점)_계약서',
  '차돌박힌후꾸미신릉점_계약서', '1984 그수육집칼국수 마곡나루...'
];
const ownerNames = ['김승모', '임영제(호호미역)', '두썸플레이스수식...', '새양푸드', '주식회사 뉴빌리티', 'JINJINGYU', '서광석', '양혜경', '김수명(제비면가)', '한란희(바른식탁)', '홍윤철', '도경우', '박찬혁', '송재명(1984 그 수)'];

function generateTransferData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    const idx = 32877 - i;
    const settleIdx = [508856, 504190, 500286, 503404, 509690, 511245, 498403, 505449, 499842, 498723, 509685, 509558, 509569, 509726][i % 14];
    const shopName = shopNames[i % shopNames.length];
    const bizNo = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const accountNo = '10473080' + String(2402 + (i % 5));
    const bank = bankNames[i % bankNames.length];
    const owner = ownerNames[i % ownerNames.length];
    const bankAccount = String(Math.floor(1000000000000 + Math.random() * 9000000000000));
    const amount = Math.floor(50000 + Math.random() * 5000000);
    const status = statusList[i % statusList.length];
    const txIdx = settleIdx;

    data.push({
      seq: idx,
      transferIdx: settleIdx,
      settleIdx: settleIdx,
      settleName: shopName,
      bizNo: bizNo,
      withdrawAccount: accountNo,
      bankName: bank,
      ownerName: owner,
      accountNo: bankAccount,
      transferAmount: amount,
      txConfirmIdx: txIdx,
      status: status
    });
  }
  return data;
}

function StatusCellRenderer(params) {
  if (!params.value) return '';
  const cls = params.value === '이체 성공' ? 'badge-success' :
              params.value === '이체 실패' ? 'badge-fail' :
              params.value === '요청됨' ? 'badge-requested' : 'badge-pending';
  return `<span class="badge ${cls}">${params.value}</span>`;
}

function ActionCellRenderer(params) {
  if (!params.data) return '';
  if (params.data.status === '이체 실패') {
    return `<button class="grid-action-btn success">성공 처리</button><button class="grid-action-btn primary">이체 확인</button>`;
  }
  return `<button class="grid-action-btn">실패 처리</button>`;
}

function LinkCellRenderer(params) {
  if (!params.value) return '';
  return `<a class="grid-link">${params.value}</a>`;
}

function AmountCellRenderer(params) {
  if (params.value == null) return '';
  return Number(params.value).toLocaleString();
}

const columnDefs = [
  { headerCheckboxSelection: true, checkboxSelection: true, width: 36, pinned: 'left', suppressMenu: true, resizable: false },
  { headerName: '이체관리 IDX', field: 'seq', width: 100, cellRenderer: LinkCellRenderer },
  { headerName: '정산서 IDX', field: 'settleIdx', width: 90, cellRenderer: LinkCellRenderer },
  { headerName: '정산서명', field: 'settleName', width: 220 },
  { headerName: '사업자 등록번호', field: 'bizNo', width: 120 },
  { headerName: '출금예정 계좌', field: 'withdrawAccount', width: 120 },
  { headerName: '은행명', field: 'bankName', width: 80 },
  { headerName: '예금주명', field: 'ownerName', width: 140 },
  { headerName: '계좌번호', field: 'accountNo', width: 120 },
  { headerName: '이체예정금액', field: 'transferAmount', width: 110, cellRenderer: AmountCellRenderer, cellStyle: { textAlign: 'right' } },
  { headerName: '거래 IDX', field: 'txConfirmIdx', width: 80, cellRenderer: LinkCellRenderer },
  { headerName: '상태', field: 'status', width: 90, cellRenderer: StatusCellRenderer },
  { headerName: '상태 변경', field: 'action', width: 170, cellRenderer: ActionCellRenderer, sortable: false, filter: false }
];

const gridOptions = {
  columnDefs: columnDefs,
  rowData: generateTransferData(100),
  rowSelection: 'multiple',
  suppressRowClickSelection: true,
  animateRows: true,
  defaultColDef: {
    sortable: true,
    resizable: true,
    filter: true,
    suppressMovable: false
  },
  rowHeight: 30,
  headerHeight: 30,
  getRowStyle: params => {
    if (params.data && params.data.status === '이체 실패') {
      return { background: '#fff8f8' };
    }
    return null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const gridDiv = document.getElementById('transferGrid');
  if (gridDiv) {
    agGrid.createGrid(gridDiv, gridOptions);
  }
});
