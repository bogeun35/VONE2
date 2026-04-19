// ===== 정산서 관리 (settle-list) =====
// 정책: docs/settle-bill/policy.md · docs/common/policy.md

(function () {
  const CONTRACT_TYPES = ['식권대장', '복지대장', '퀵대장', '단체선물대장', '기타'];
  const SETTLE_STATUSES = ['정산 대기', '정산 확정', '증빙 완료', '거래 완료'];
  const TAG_OPTIONS = ['기타비용', '로봇', '이용료', '기기수수료'];
  const PROOF_STATUSES = ['증빙 생성 필요', '실패', '완료', '승인 대기', '국세청 전송'];

  // ---------- mock rows ----------
  const rawRows = [
    { idx: 509555, partnerIdx: 41485, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21426, shopId: '019B72D2-F132-7546-8520-71509C051B6E', contractName: '(주) 밥플러스프렌즈_계약서', ctype: '식권대장', tags: null, shopName: '밥플러스 엔에이치서울타워', bizNo: '8738703463', ceoName: '주보매나', partnerName: '(주) 밥플러스프렌즈', closedAt: '', payDueDate: '2026-04-15', acctOwner: '(주)밥플러스프렌즈', acctBank: '농협은행', acctNo: '3550095261613', acctVerifyAt: '2026-04-14T18:46:45', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 3241000, feeAmount: 106953, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 3134047, purchaseDone: 3134047, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-08T15:51:08', sendAt: '2026-04-08T16:35:27', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 3134047, payWait: 0, payMemo: '', settleMemo: '', payDone: 3134047, status: '거래 완료', locked: false },
    { idx: 509868, partnerIdx: 41945, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21818, shopId: '019C30A3-0FA6-7DA6-9F5F-A2B9C0051B6E', contractName: '(주) 야마야푸즈서비스 야마야 광화문 D타워점_계약서', ctype: '식권대장', tags: ['이용료'], shopName: '야마야 광화문 D타워점', bizNo: '8158501825', ceoName: '야마야푸즈', partnerName: '(주) 야마야푸즈서비스', closedAt: '', payDueDate: '2026-04-15', acctOwner: '야마야푸즈서비스', acctBank: '신한은행', acctNo: '14001283796012', acctVerifyAt: '2026-04-13T10:11:02', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 4210500, feeAmount: 126315, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 4084185, purchaseDone: 4084185, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-07T14:20:11', sendAt: '2026-04-07T15:03:55', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 4084185, payWait: 0, payMemo: '', settleMemo: '', payDone: 4084185, status: '거래 완료', locked: false },
    { idx: 509441, partnerIdx: 41601, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21534, shopId: '019BB6C2-DC2F-7910-ABAF-27B0A0051B6E', contractName: '(주) 연식품 정성순대양재역점_계약서', ctype: '식권대장', tags: null, shopName: '정성순대 양재역점', bizNo: '1348561501', ceoName: '연식품', partnerName: '(주) 연식품', closedAt: '', payDueDate: '2026-04-15', acctOwner: '연식품', acctBank: '국민은행', acctNo: '80420104555888', acctVerifyAt: '2026-04-12T09:50:20', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 2188700, feeAmount: 65661, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 2123039, purchaseDone: 0, purchaseStatus: '승인 대기', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 대기', payNeed: 2123039, payWait: 2123039, payMemo: '', settleMemo: '', payDone: 0, status: '정산 확정', locked: false },
    { idx: 509844, partnerIdx: 13928, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 22077, shopId: '019B5822-081F-79BF-960A-18F4C0051B6E', contractName: '(주) 정정당당_계약서', ctype: '식권대장', tags: null, shopName: '양촌리 목동점', bizNo: '1268177697', ceoName: '정정당당', partnerName: '(주) 정정당당', closedAt: '', payDueDate: '2026-04-15', acctOwner: '정정당당', acctBank: 'KEB하나은행', acctNo: '23491032500123', acctVerifyAt: '2026-04-11T11:02:44', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 1820400, feeAmount: 54612, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 1765788, purchaseDone: 1765788, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-05T10:22:00', sendAt: '2026-04-05T10:55:30', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 1765788, payWait: 0, payMemo: '', settleMemo: '', payDone: 1765788, status: '거래 완료', locked: false },
    { idx: 509970, partnerIdx: 41051, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 22127, shopId: '', contractName: '(주) 청앤컴퍼니_계약서', ctype: '단체선물대장', tags: null, shopName: '', bizNo: '5998103807', ceoName: '청앤컴퍼니', partnerName: '(주) 청앤컴퍼니', closedAt: '', payDueDate: '2026-04-15', acctOwner: '청앤컴퍼니', acctBank: '우리은행', acctNo: '1005704711233', acctVerifyAt: '2026-04-10T16:05:17', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 980000, feeAmount: 19600, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 960400, purchaseDone: 960400, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-08T09:00:10', sendAt: '2026-04-08T09:10:22', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 완료', payNeed: 960400, payWait: 0, payMemo: '', settleMemo: '', payDone: 960400, status: '거래 완료', locked: true },
    { idx: 509946, partnerIdx: 41051, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 22129, shopId: '019A4D0A-6B3B-7811-9895-4EB0C0051B6E', contractName: '(주) 청앤컴퍼니_계약서', ctype: '단체선물대장', tags: null, shopName: '고돈집', bizNo: '5998103807', ceoName: '청앤컴퍼니', partnerName: '(주) 청앤컴퍼니', closedAt: '', payDueDate: '2026-04-15', acctOwner: '청앤컴퍼니', acctBank: '우리은행', acctNo: '1005704711233', acctVerifyAt: '2026-04-10T16:06:02', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 512000, feeAmount: 10240, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 501760, purchaseDone: 501760, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-08T09:02:40', sendAt: '2026-04-08T09:12:45', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 완료', payNeed: 501760, payWait: 0, payMemo: '', settleMemo: '', payDone: 501760, status: '거래 완료', locked: false },
    { idx: 510012, partnerIdx: 41130, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 22188, shopId: '019BC1F4-2A5D-7B3C-B100-31F2A0051B6E', contractName: '주식회사 뉴빌리티(로봇대장)_계약서', ctype: '퀵대장', tags: ['로봇'], shopName: '[뉴빌리티] 본사', bizNo: '5398700775', ceoName: '이상민', partnerName: '주식회사 뉴빌리티', closedAt: '', payDueDate: '2026-04-18', acctOwner: '주식회사 뉴빌리티', acctBank: '우리은행', acctNo: '1005704140945', acctVerifyAt: '2026-04-14T09:00:12', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 5800000, feeAmount: 0, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 5800000, purchaseDone: 0, purchaseStatus: '증빙 생성 필요', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-02', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 대기', payNeed: 5800000, payWait: 5800000, payMemo: '', settleMemo: '', payDone: 0, status: '정산 확정', locked: false },
    { idx: 510055, partnerIdx: 42095, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21949, shopId: 'F89F5505-9CE2-491D-A709-C375302936F1', contractName: '컴포즈커피테헤란로점 _계약서', ctype: '식권대장', tags: null, shopName: '컴포즈커피 테헤란로점', bizNo: '5077700634', ceoName: '박하영', partnerName: '컴포즈커피테헤란로점', closedAt: '', payDueDate: '2026-04-15', acctOwner: '박하영(컴포즈커피테)', acctBank: 'KEB하나은행', acctNo: '23491032587107', acctVerifyAt: '2026-04-12T13:44:20', acctVerifyOk: '실패', acctVerifyFailReason: '예금주 상이', tradeAmount: 682500, feeAmount: 20475, proofType: '시스템발행', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 662025, purchaseDone: 662025, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-06T11:10:20', sendAt: '2026-04-06T11:20:11', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 실패', payNeed: 662025, payWait: 662025, payMemo: '', settleMemo: '', payDone: 0, status: '증빙 완료', locked: false },
    { idx: 510101, partnerIdx: 38775, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21401, shopId: 'GIFT-2026-01', shopName: '현대차 본사 선물 허브', contractName: '단체선물 2026 설시즌_계약서', ctype: '단체선물대장', tags: null, bizNo: '1018105856', ceoName: '현대자동차', partnerName: '현대자동차', closedAt: '', payDueDate: '2026-04-20', acctOwner: '현대자동차(주)', acctBank: '국민은행', acctNo: '06301045912333', acctVerifyAt: '2026-04-09T10:02:14', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 12400000, feeAmount: 248000, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 12152000, purchaseDone: 0, purchaseStatus: '승인 대기', salesNeed: 12400000, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-02', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 대기', payNeed: 12152000, payWait: 12152000, payMemo: '', settleMemo: '', payDone: 0, status: '정산 확정', locked: false },
    { idx: 510148, partnerIdx: 39880, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21508, shopId: 'C01F5B10-1111-2222-3333-444455556666', shopName: '(주)그린테이블 본사', contractName: '(주)그린테이블 복지포인트_계약서', ctype: '복지대장', tags: null, bizNo: '3308801007', ceoName: '최정우', partnerName: '주식회사 그린테이블', closedAt: '', payDueDate: '2026-04-20', acctOwner: '(주)그린테이블', acctBank: '우리은행', acctNo: '1005704555821', acctVerifyAt: '2026-04-13T14:30:05', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 3420000, feeAmount: 85500, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 3334500, purchaseDone: 3334500, purchaseStatus: '국세청 전송', salesNeed: 3420000, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-02', issueAt: '2026-04-10T09:18:50', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 대기', payNeed: 3334500, payWait: 3334500, payMemo: '', settleMemo: '', payDone: 0, status: '증빙 완료', locked: false },
    { idx: 510202, partnerIdx: 40211, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21611, shopId: 'B01F5B10-1111-2222-3333-444455556666', shopName: '성수공방', contractName: '성수공방_계약서', ctype: '식권대장', tags: null, bizNo: '2098702215', ceoName: '박지은', partnerName: '성수공방', closedAt: '', payDueDate: '2026-04-18', acctOwner: '박지은', acctBank: '신한은행', acctNo: '110555123456', acctVerifyAt: '2026-04-14T08:12:01', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 412300, feeAmount: 12369, proofType: '종이세금계산서', linkType: '', proofOffset: '별도', purchaseNeed: 399931, purchaseDone: 0, purchaseStatus: '증빙 생성 필요', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-02', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 승인', payNeed: 399931, payWait: 399931, payMemo: '', settleMemo: '', payDone: 0, status: '정산 확정', locked: false },
    { idx: 510255, partnerIdx: 38620, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21390, shopId: '4EF9C582-AF44-4ACF-B272-2CECA08EC42C', shopName: '전주식당(성남)', contractName: '전주식당(성남)_계약서', ctype: '식권대장', tags: null, bizNo: '8616100099', ceoName: '김순모', partnerName: '전주식당(성남)', closedAt: '', payDueDate: '2026-04-17', acctOwner: '김순모', acctBank: '농협은행', acctNo: '3020111803611', acctVerifyAt: '2026-04-13T09:18:40', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 2732742, feeAmount: 81982, proofType: '시스템발행', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 2650760, purchaseDone: 2650760, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-06T14:22:10', sendAt: '2026-04-06T14:50:00', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 2650760, payWait: 0, payMemo: '', settleMemo: '', payDone: 2650760, status: '거래 완료', locked: false },
    { idx: 510310, partnerIdx: 36905, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21155, shopId: 'D01F5B10-1111-2222-3333-444455556666', shopName: '미소베이커리', contractName: '미소베이커리_계약서', ctype: '식권대장', tags: null, bizNo: '4185100884', ceoName: '송미소', partnerName: '미소베이커리', closedAt: '2026-03-31', payDueDate: '2026-04-17', acctOwner: '송미소', acctBank: '농협은행', acctNo: '3020112244335', acctVerifyAt: '2026-04-14T10:10:45', acctVerifyOk: '실패', acctVerifyFailReason: '계좌정보 불일치', tradeAmount: 184720, feeAmount: 5541, proofType: '종이세금계산서', linkType: '', proofOffset: '별도', purchaseNeed: 179179, purchaseDone: 0, purchaseStatus: '실패', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 실패', payNeed: 179179, payWait: 179179, payMemo: '', settleMemo: '', payDone: 0, status: '정산 대기', locked: true },
    { idx: 510377, partnerIdx: 35901, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21044, shopId: '019C0DB1-MACH-2222-3333-A3A8F688F78E', shopName: '[뉴빌리티] 기기 운용', contractName: '주식회사 뉴빌리티(로봇대장)_기기수수료_계약서', ctype: '퀵대장', tags: ['로봇', '기기수수료'], bizNo: '5398700775', ceoName: '이상민', partnerName: '주식회사 뉴빌리티', closedAt: '', payDueDate: '2026-04-28', acctOwner: '주식회사 뉴빌리티', acctBank: '우리은행', acctNo: '1005704140945', acctVerifyAt: '', acctVerifyOk: '', acctVerifyFailReason: '', tradeAmount: 780000, feeAmount: 7800, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '별도', purchaseNeed: 772200, purchaseDone: 0, purchaseStatus: '증빙 생성 필요', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-02', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 대기', payNeed: 772200, payWait: 772200, payMemo: '', settleMemo: '', payDone: 0, status: '정산 대기', locked: false },
    { idx: 510423, partnerIdx: 35512, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 20998, shopId: '019CFB97-3B7D-7A85-AB6A-5B03F56D68A1', shopName: '서현양갈비양꼬치', contractName: '서현양갈비양꼬치_계약서', ctype: '식권대장', tags: null, bizNo: '1440217523', ceoName: 'JINJINGYU', partnerName: '서현양갈비양꼬치', closedAt: '', payDueDate: '2026-04-16', acctOwner: 'JINJINGYU', acctBank: '국민은행', acctNo: '92900101438230', acctVerifyAt: '2026-04-14T09:22:10', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 93315, feeAmount: 2799, proofType: '종이세금계산서', linkType: '', proofOffset: '상계', purchaseNeed: 90516, purchaseDone: 90516, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-07T11:00:11', sendAt: '2026-04-07T11:10:02', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 실패', payNeed: 90516, payWait: 90516, payMemo: '', settleMemo: '', payDone: 0, status: '증빙 완료', locked: false },
    { idx: 510501, partnerIdx: 35210, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 20901, shopId: 'A01F5B10-1111-2222-3333-444455556666', shopName: '채인석커피(판교점)', contractName: '채인석커피(판교점)_계약서', ctype: '식권대장', tags: null, bizNo: '1148800321', ceoName: '채인석', partnerName: '채인석커피', closedAt: '', payDueDate: '2026-04-18', acctOwner: '채인석', acctBank: '국민은행', acctNo: '80420104123777', acctVerifyAt: '2026-04-15T08:44:02', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 295901, feeAmount: 8877, proofType: '시스템발행', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 287024, purchaseDone: 287024, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-08T10:04:20', sendAt: '2026-04-08T10:20:12', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 승인', payNeed: 287024, payWait: 287024, payMemo: '', settleMemo: '', payDone: 0, status: '증빙 완료', locked: false },
    { idx: 510602, partnerIdx: 34120, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 20810, shopId: 'DC2504BF-7CD9-AB76-4956-5584F18216DF', shopName: '호호미역(경희궁 직영점)', contractName: '호호미역(경희궁 직영점)_계약서', ctype: '식권대장', tags: null, bizNo: '2257100313', ceoName: '임영제', partnerName: '호호미역 경희궁 직영점', closedAt: '', payDueDate: '2026-04-16', acctOwner: '임영제(호호미역)', acctBank: '신한은행', acctNo: '110484273518', acctVerifyAt: '2026-04-13T15:40:10', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 1538497, feeAmount: 46155, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 1492342, purchaseDone: 1492342, purchaseStatus: '국세청 전송', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-06T16:20:40', sendAt: '2026-04-06T16:30:12', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 1492342, payWait: 0, payMemo: '', settleMemo: '', payDone: 1492342, status: '거래 완료', locked: false },
    { idx: 510701, partnerIdx: 33190, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 20707, shopId: '0A2FFA11-F263-AD36-37A4-BA145BFA0F45', shopName: '트러스트커피(선릉점)', contractName: '트러스트커피(선릉점)_계약서', ctype: '식권대장', tags: null, bizNo: '5460900023', ceoName: '서광석', partnerName: '트러스트커피', closedAt: '', payDueDate: '2026-04-15', acctOwner: '서광석', acctBank: '우리은행', acctNo: '1002844918916', acctVerifyAt: '2026-04-13T09:10:22', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 212354, feeAmount: 6371, proofType: '종이세금계산서', linkType: '', proofOffset: '별도', purchaseNeed: 205983, purchaseDone: 0, purchaseStatus: '증빙 생성 필요', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '', sendAt: '', purchaseMemo: '', salesMemo: '', transferOffset: '별도', payStatus: '이체 대기', payNeed: 205983, payWait: 205983, payMemo: '', settleMemo: '', payDone: 0, status: '정산 대기', locked: false },
    { idx: 510803, partnerIdx: 32055, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 20601, shopId: '6A14FF0F-81D3-2116-76D6-5DEF4A44AAA1', shopName: '제비면가', contractName: '제비면가_계약서', ctype: '식권대장', tags: null, bizNo: '7560202084', ceoName: '김수영', partnerName: '제비면가', closedAt: '', payDueDate: '2026-04-15', acctOwner: '김수영(제비면가)', acctBank: '케이뱅크', acctNo: '100216198463', acctVerifyAt: '2026-04-12T10:30:10', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 777021, feeAmount: 23310, proofType: '공급자발행', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 753711, purchaseDone: 753711, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-07T09:01:22', sendAt: '2026-04-07T09:22:10', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 753711, payWait: 0, payMemo: '', settleMemo: '', payDone: 753711, status: '거래 완료', locked: false },
    { idx: 510904, partnerIdx: 40912, startAt: '2026-03-01', endAt: '2026-03-31', contractIdx: 21702, shopId: 'CF5714DD-DC5C-76F5-DC24-606571F03BEB', shopName: '투썸플레이스(을지로입구역점)', contractName: '투썸플레이스(을지로입구역점)_계약서', ctype: '식권대장', tags: ['이용료'], bizNo: '4048601054', ceoName: '송정석', partnerName: '투썸플레이스 주식회사', closedAt: '', payDueDate: '2026-04-16', acctOwner: '투썸플레이스주식회사', acctBank: '우리은행', acctNo: '27837054218114', acctVerifyAt: '2026-04-13T11:40:33', acctVerifyOk: '성공', acctVerifyFailReason: '', tradeAmount: 590807, feeAmount: 17724, proofType: '전자세금용 인증서 등록', linkType: 'BAROBILL', proofOffset: '상계', purchaseNeed: 573083, purchaseDone: 573083, purchaseStatus: '완료', salesNeed: 0, salesDone: 0, salesStatus: '증빙 생성 필요', writeAt: '2026-04-01', issueAt: '2026-04-05T15:00:10', sendAt: '2026-04-05T15:22:00', purchaseMemo: '', salesMemo: '', transferOffset: '상계', payStatus: '이체 완료', payNeed: 573083, payWait: 0, payMemo: '', settleMemo: '', payDone: 573083, status: '거래 완료', locked: true },
  ];

  // ---------- Cell Renderers ----------
  function LinkRenderer(p) { return p.value != null && p.value !== '' ? `<a class="grid-link">${p.value}</a>` : ''; }
  function ShopLinkRenderer(p) {
    if (!p.value) return '';
    return `<a class="grid-link" onclick="window.SettleList.openShopDetail('${p.value}')">${p.value}</a>`;
  }
  function TagsRenderer(p) {
    if (!p.value || !p.value.length) return '';
    return p.value.map(t => `<span class="tag-chip">${t}</span>`).join(' ');
  }
  function AmountRenderer(p) { return p.value != null && p.value !== '' ? Number(p.value).toLocaleString() : ''; }
  function BooleanRenderer(p) { return p.value === true ? 'Y' : p.value === false ? 'N' : ''; }
  function LockedRenderer(p) {
    if (!p.data) return '';
    const on = !!p.value;
    return `<span class="lock-toggle ${on ? 'on' : 'off'}" title="${on ? '잠금 해제' : '잠금'}" onclick="window.SettleList.toggleLock(${p.data.idx})">
      <span class="lock-toggle-track"><span class="lock-toggle-thumb"></span></span>
    </span>`;
  }
  function StatusRenderer(p) {
    if (!p.value) return '';
    // 거래 완료 = 녹색 강조 (스크린샷 기준). 나머지는 기본 색.
    if (p.value === '거래 완료') return `<span style="color:#16a34a;font-weight:600">${p.value}</span>`;
    return p.value;
  }
  function DetailBtnRenderer(p) {
    if (!p.data) return '';
    return `<button class="grid-action-btn outline-primary" onclick="window.SettleList.openDetail(${p.data.idx})">상세보기</button>`;
  }
  const fmtDateTime = (p) => (p && p.value ? String(p.value).replace('T', ' ') : '');

  const rightAlign = { textAlign: 'right' };
  const centerAlign = { textAlign: 'center' };

  // ---------- Column Defs ----------
  // 평탄한 column 정의. 그룹은 아래 columnDefs 에서 children 으로 재구성.
  const C = {
    _select:      { headerName: '', field: '_select', width: 32, maxWidth: 32, pinned: 'left', checkboxSelection: true, headerCheckboxSelection: true, headerCheckboxSelectionFilteredOnly: true, sortable: false, filter: false, resizable: false, suppressMovable: true, lockPosition: 'left', cellClass: 'cell-select', headerClass: 'header-center' },
    idx:          { headerName: '정산서 IDX', field: 'idx', width: 60, pinned: 'left', cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    startAt:      { headerName: '정산 시작일', field: 'startAt', width: 82, cellStyle: centerAlign, headerClass: 'header-center' },
    endAt:        { headerName: '정산 종료일', field: 'endAt', width: 82, cellStyle: centerAlign, headerClass: 'header-center' },
    tradeAmount:  { headerName: '거래 금액', field: 'tradeAmount', width: 92, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    feeAmount:    { headerName: '수수료', field: 'feeAmount', width: 82, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    writeAt:      { headerName: '작성일자', field: 'writeAt', width: 82, cellStyle: centerAlign, headerClass: 'header-center' },
    issueAt:      { headerName: '발급일자', field: 'issueAt', width: 130, valueFormatter: fmtDateTime },
    sendAt:       { headerName: '전송일자', field: 'sendAt', width: 130, valueFormatter: fmtDateTime },
    settleMemo:   { headerName: '정산서 메모', field: 'settleMemo', width: 120 },
    status:       { headerName: '정산 상태', field: 'status', width: 72, pinned: 'right', cellRenderer: StatusRenderer, cellStyle: centerAlign, headerClass: 'header-center' },
    locked:       { headerName: '잠금', field: 'locked', width: 48, pinned: 'right', cellRenderer: LockedRenderer, cellStyle: centerAlign, headerClass: 'header-center' },

    contractIdx:  { headerName: '정산계약 IDX', field: 'contractIdx', width: 54, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    ctype:        { headerName: '계약서 타입', field: 'ctype', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
    contractName: { headerName: '정산계약명', field: 'contractName', width: 180 },
    tags:         { headerName: '태그', field: 'tags', width: 100, cellRenderer: TagsRenderer, valueFormatter: p => (p.value || []).join(', ') },
    shopId:       { headerName: '제휴점 ID', field: 'shopId', width: 140, cellRenderer: ShopLinkRenderer },
    shopName:     { headerName: '연결 제휴점', field: 'shopName', width: 140 },
    payDueDate:   { headerName: '지급 예정일', field: 'payDueDate', width: 82, cellStyle: centerAlign, headerClass: 'header-center' },
    acctOwner:    { headerName: '예금주', field: 'acctOwner', width: 100 },
    acctBank:     { headerName: '은행', field: 'acctBank', width: 70 },
    acctNo:       { headerName: '계좌번호', field: 'acctNo', width: 110, cellStyle: rightAlign, headerClass: 'header-right' },
    acctVerifyAt: { headerName: '계좌 검증 일시', field: 'acctVerifyAt', width: 130, valueFormatter: fmtDateTime },
    acctVerifyOk: { headerName: '검증 성공 여부', field: 'acctVerifyOk', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
    acctVerifyFailReason: { headerName: '검증 실패 사유', field: 'acctVerifyFailReason', width: 120 },

    partnerIdx:   { headerName: '거래처 IDX', field: 'partnerIdx', width: 48, cellRenderer: LinkRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    partnerName:  { headerName: '거래처명', field: 'partnerName', width: 120 },
    bizNo:        { headerName: '사업자번호', field: 'bizNo', width: 82, cellStyle: rightAlign, headerClass: 'header-right' },
    ceoName:      { headerName: '대표자명', field: 'ceoName', width: 70 },
    closedAt:     { headerName: '폐업일자', field: 'closedAt', width: 74, cellStyle: centerAlign, headerClass: 'header-center' },

    salesNeed:    { headerName: '매출 증빙 필요 금액', field: 'salesNeed', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    salesDone:    { headerName: '매출 증빙 완료 금액', field: 'salesDone', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    salesStatus:  { headerName: '매출 증빙 상태', field: 'salesStatus', width: 92, cellStyle: centerAlign, headerClass: 'header-center' },
    salesMemo:    { headerName: '매출 비고', field: 'salesMemo', width: 100 },

    proofType:    { headerName: '매입증빙수취유형', field: 'proofType', width: 110 },
    linkType:     { headerName: '연동사 타입', field: 'linkType', width: 68 },
    proofOffset:  { headerName: '증빙상계여부', field: 'proofOffset', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
    purchaseNeed: { headerName: '매입 증빙 필요 금액', field: 'purchaseNeed', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    purchaseDone: { headerName: '매입 증빙 완료 금액', field: 'purchaseDone', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    purchaseStatus: { headerName: '매입 증빙 상태', field: 'purchaseStatus', width: 92, cellStyle: centerAlign, headerClass: 'header-center' },
    purchaseMemo: { headerName: '매입 비고', field: 'purchaseMemo', width: 100 },

    transferOffset: { headerName: '이체상계여부', field: 'transferOffset', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
    payStatus:    { headerName: '지급 상태', field: 'payStatus', width: 72, cellStyle: centerAlign, headerClass: 'header-center' },
    payNeed:      { headerName: '지급 필요 금액', field: 'payNeed', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    payWait:      { headerName: '이체 대기 금액', field: 'payWait', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },
    payMemo:      { headerName: '지급 비고', field: 'payMemo', width: 100 },
    payDone:      { headerName: '지급 완료 금액', field: 'payDone', width: 98, cellRenderer: AmountRenderer, cellStyle: rightAlign, headerClass: 'header-right', context: { voneIsNumeric: true } },

    _detail:      { headerName: '상세보기', field: '_detail', width: 72, cellRenderer: DetailBtnRenderer, pinned: 'right', sortable: false, filter: false, cellClass: 'cell-action-buttons' },
  };

  // VoneTableFilter 는 평탄한 리스트에만 install (children 순회 안 함)
  const flatCols = Object.values(C);
  if (window.VoneTableFilterLib) {
    window.VoneTableFilterLib.installAll(flatCols, { exclude: ['_select', '_detail'] });
    window.VoneTableFilterLib.installHintHeader(flatCols, '_select');
  }

  // 그룹 헤더 구성 (정책: 정산서 / 계약 / 거래처 / 매출 / 매입 / 이체)
  const groupClass = 'header-center ts-group-header';
  const columnDefs = [
    C._select,
    { headerName: '정산서 데이터', headerClass: groupClass, children: [
      C.idx, C.startAt, C.endAt, C.tradeAmount, C.feeAmount,
      C.writeAt, C.issueAt, C.sendAt, C.settleMemo, C.status, C.locked,
    ]},
    { headerName: '계약 데이터', headerClass: groupClass, children: [
      C.contractIdx, C.ctype, C.contractName, C.tags, C.shopId, C.shopName,
      C.payDueDate, C.acctOwner, C.acctBank, C.acctNo, C.acctVerifyAt, C.acctVerifyOk, C.acctVerifyFailReason,
    ]},
    { headerName: '거래처 데이터', headerClass: groupClass, children: [
      C.partnerIdx, C.partnerName, C.bizNo, C.ceoName, C.closedAt,
    ]},
    { headerName: '매출 데이터', headerClass: groupClass, children: [
      C.salesNeed, C.salesDone, C.salesStatus, C.salesMemo,
    ]},
    { headerName: '매입 데이터', headerClass: groupClass, children: [
      C.proofType, C.linkType, C.proofOffset, C.purchaseNeed, C.purchaseDone, C.purchaseStatus, C.purchaseMemo,
    ]},
    { headerName: '이체 데이터', headerClass: groupClass, children: [
      C.transferOffset, C.payStatus, C.payNeed, C.payWait, C.payMemo, C.payDone,
    ]},
    C._detail,
  ];

  // ---------- 상태 ----------
  let gridApi = null;
  const state = {
    contractType: new Set(CONTRACT_TYPES),
    settleStatus: new Set(SETTLE_STATUSES),
    tag: new Set(),
    proofType: 'all',
    proofOffset: 'all',
    transferOffset: 'all',
    acctVerify: 'all',
    purchaseAmount: 'all',
    purchaseStatus: 'all',
    salesAmount: 'all',
    salesStatus: 'all',
    payAmount: 'all',
    transferStatus: 'all',
  };

  function applyFilter() {
    if (!gridApi) return;
    const filtered = rawRows.filter(r => {
      if (state.contractType.size && !state.contractType.has(r.ctype)) return false;
      if (state.settleStatus.size && !state.settleStatus.has(r.status)) return false;
      if (state.tag.size) {
        const rowTags = Array.isArray(r.tags) ? r.tags : [];
        let ok = false;
        for (const t of state.tag) { if (rowTags.includes(t)) { ok = true; break; } }
        if (!ok) return false;
      }
      if (state.proofType !== 'all') {
        const key = (r.proofType || '').replace(/\s/g, '').replace(/^전자세금용인증서등록$/, '시스템발행');
        if (key !== state.proofType) return false;
      }
      if (state.proofOffset !== 'all' && r.proofOffset !== state.proofOffset) return false;
      if (state.transferOffset !== 'all' && r.transferOffset !== state.transferOffset) return false;
      if (state.acctVerify !== 'all' && r.acctVerifyOk !== state.acctVerify) return false;
      const yn = (want, v) => want === 'all' || (want === 'yes' ? v > 0 : !(v > 0));
      if (!yn(state.purchaseAmount, r.purchaseNeed)) return false;
      if (!yn(state.salesAmount, r.salesNeed)) return false;
      if (!yn(state.payAmount, r.payNeed)) return false;
      if (state.purchaseStatus !== 'all' && r.purchaseStatus !== state.purchaseStatus) return false;
      if (state.salesStatus !== 'all' && r.salesStatus !== state.salesStatus) return false;
      if (state.transferStatus !== 'all' && r.payStatus !== state.transferStatus) return false;
      return true;
    });
    gridApi.setGridOption('rowData', filtered);
    const totalEl = document.getElementById('slGridTotal');
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

  function bindSelects(root) {
    root.querySelectorAll('select[data-name]').forEach(sel => {
      const name = sel.dataset.name;
      if (!(name in state)) return;
      sel.addEventListener('change', () => { state[name] = sel.value; });
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
      if (!items.length) { dropdown.innerHTML = '<div class="tag-select-empty">일치 결과 없음</div>'; return; }
      dropdown.innerHTML = items.map(t =>
        `<div class="tag-select-item${state.tag.has(t) ? ' selected' : ''}" data-v="${t}">${t}</div>`
      ).join('');
    }
    function openDropdown() { wrap.classList.add('open'); renderDropdown(); dropdown.style.display = 'block'; }
    function closeDropdown() { wrap.classList.remove('open'); dropdown.style.display = 'none'; }
    input.addEventListener('focus', openDropdown);
    input.addEventListener('input', openDropdown);
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.tag-select-chip-x')) { state.tag.delete(e.target.dataset.v); renderChips(); renderDropdown(); return; }
      if (e.target.closest('.tag-select-item')) {
        const v = e.target.closest('.tag-select-item').dataset.v;
        if (state.tag.has(v)) state.tag.delete(v); else state.tag.add(v);
        renderChips(); renderDropdown(); input.focus(); return;
      }
      if (e.target === wrap || e.target.closest('.tag-select-control')) input.focus();
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) closeDropdown(); });
    renderChips();
  }

  function resetFilter() {
    state.contractType = new Set(CONTRACT_TYPES);
    state.settleStatus = new Set(SETTLE_STATUSES);
    state.tag.clear();
    state.proofType = 'all';
    state.proofOffset = 'all';
    state.transferOffset = 'all';
    state.acctVerify = 'all';
    state.purchaseAmount = 'all';
    state.purchaseStatus = 'all';
    state.salesAmount = 'all';
    state.salesStatus = 'all';
    state.payAmount = 'all';
    state.transferStatus = 'all';

    const page = document.getElementById('page-settle-list');
    if (!page) return;
    page.querySelectorAll('.checkbox-btn-group').forEach(group => {
      const set = state[group.dataset.name];
      group.querySelectorAll('.checkbox-btn').forEach(btn => {
        btn.classList.toggle('active', set instanceof Set && set.has(btn.dataset.value));
      });
    });
    page.querySelectorAll('.radio-btn-group').forEach(group => {
      const val = state[group.dataset.name];
      group.querySelectorAll('.radio-btn').forEach(b => b.classList.toggle('active', b.dataset.value === val));
    });
    page.querySelectorAll('select[data-name]').forEach(sel => { sel.value = 'all'; });
    const chips = page.querySelector('.tag-select-chips'); if (chips) chips.innerHTML = '';
    const tagInput = page.querySelector('.tag-select-input'); if (tagInput) tagInput.value = '';
    page.querySelectorAll('.filter-text-input').forEach(i => { i.value = ''; });
    page.querySelectorAll('.date-range input[type="date"]').forEach(i => { i.value = ''; });
    page.querySelectorAll('.btn-period.active').forEach(b => b.classList.remove('active'));
    applyFilter();
  }

  // ---------- 상세/이동 ----------
  function openDetail(idx) {
    if (!window.TabManager) return;
    window.TabManager.open({ id: 'settle-bill-detail', title: '정산서 상세', detailOf: 'settle-list', context: { idx } });
  }
  function openShopDetail(shopId) {
    if (!window.TabManager) return;
    window.TabManager.open({ id: 'shop-detail', title: '제휴점 상세', detailOf: 'settle-list', context: { shopId } });
  }
  function toggleLock(idx) {
    const row = rawRows.find(r => r.idx === idx); if (!row) return;
    row.locked = !row.locked;
    if (gridApi) gridApi.forEachNode(node => { if (node.data && node.data.idx === idx) node.setData(row); });
  }

  // ---------- 그리드 초기화 ----------
  function initGrid() {
    const gridDiv = document.getElementById('settleListGrid');
    if (!gridDiv || gridApi) return;
    gridApi = agGrid.createGrid(gridDiv, {
      columnDefs,
      rowData: rawRows,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      animateRows: true,
      defaultColDef: { sortable: true, resizable: true, filter: true, floatingFilter: true, minWidth: 10 },
      rowHeight: 28,
      headerHeight: 28,
      groupHeaderHeight: 24,
      floatingFiltersHeight: 26,
      pagination: true,
      paginationPageSize: 1000,
      suppressPaginationPanel: true,
      onSelectionChanged: () => {
        const count = gridApi ? gridApi.getSelectedRows().length : 0;
        const el = document.getElementById('slSelectedCount');
        if (el) el.textContent = count;
      },
      onPaginationChanged: () => { renderPagination(); },
    });
    window.slGridApi = gridApi;
    const totalEl = document.getElementById('slGridTotal');
    if (totalEl) totalEl.textContent = `검색결과 : ${rawRows.length.toLocaleString()}건`;

    if (window.GridColumnContext) window.GridColumnContext.attach({ gridDiv, gridApi });

    if (window.GridRangeSelect) {
      const rangeCtl = window.GridRangeSelect.attach({ gridDiv, gridApi, statusEl: document.getElementById('slCellRangeStatus') });
      const copyAllBtn = document.getElementById('slCopyAllBtn');
      if (copyAllBtn && rangeCtl) copyAllBtn.addEventListener('click', () => rangeCtl.copyAll({ includeHeaders: true, onlyFiltered: true }));
    }
    const resetBtn = document.getElementById('slResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => gridApi.resetColumnState());

    const colPickerBtn = document.getElementById('slColPickerBtn');
    if (colPickerBtn && window.GridColumnPicker) {
      colPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.GridColumnPicker.open({ gridApi, anchorEl: colPickerBtn, tableName: '정산서 조회 테이블' });
      });
    }
    const tplBtn = document.getElementById('slTplBtn');
    if (tplBtn && window.GridTemplate) {
      tplBtn.addEventListener('click', () => {
        window.GridTemplate.openModal({ gridId: 'settleListGrid', gridApi, tableName: '정산서 조회 테이블' });
      });
    }
    const pageSizeSel = document.getElementById('slPageSizeSelect');
    if (pageSizeSel) {
      pageSizeSel.addEventListener('change', () => {
        const n = parseInt(pageSizeSel.value, 10) || 1000;
        gridApi.setGridOption('paginationPageSize', n);
        gridApi.paginationGoToPage(0);
      });
    }
    renderPagination();
  }

  function renderPagination() {
    const el = document.getElementById('slPagination');
    if (!el || !gridApi) return;
    const total = gridApi.paginationGetTotalPages();
    const current = gridApi.paginationGetCurrentPage();
    if (total <= 1) { el.innerHTML = `<button class="page-btn active" disabled>1</button>`; return; }
    const windowSize = 5;
    const start = Math.max(0, Math.min(current - 2, total - windowSize));
    const end = Math.min(total - 1, Math.max(current + 2, windowSize - 1));
    let html = `<button class="page-btn" data-pg="prev" ${current === 0 ? 'disabled' : ''}>&lt;</button>`;
    if (start > 0) {
      html += `<button class="page-btn" data-pg="0">1</button>`;
      if (start > 1) html += `<span class="page-dots">...</span>`;
    }
    for (let i = start; i <= end; i++) html += `<button class="page-btn${i === current ? ' active' : ''}" data-pg="${i}">${i + 1}</button>`;
    if (end < total - 1) {
      if (end < total - 2) html += `<span class="page-dots">...</span>`;
      html += `<button class="page-btn" data-pg="${total - 1}">${total}</button>`;
    }
    html += `<button class="page-btn" data-pg="next" ${current >= total - 1 ? 'disabled' : ''}>&gt;</button>`;
    el.innerHTML = html;
    el.querySelectorAll('.page-btn[data-pg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.pg;
        if (v === 'prev') gridApi.paginationGoToPreviousPage();
        else if (v === 'next') gridApi.paginationGoToNextPage();
        else gridApi.paginationGoToPage(parseInt(v, 10));
      });
    });
  }

  // ---------- 푸터 액션 ----------
  function getSelectedIdxList() { return gridApi ? gridApi.getSelectedRows().map(r => r.idx) : []; }
  function bulkLock(flag) {
    const sel = getSelectedIdxList();
    if (!sel.length) { alert('선택된 정산서가 없습니다.'); return; }
    sel.forEach(idx => { const r = rawRows.find(x => x.idx === idx); if (r) r.locked = flag; });
    if (gridApi) gridApi.forEachNode(node => { if (node.data && sel.includes(node.data.idx)) node.setData(node.data); });
    alert(`${sel.length}건 ${flag ? '잠금' : '잠금 해제'} 완료`);
  }

  // ---------- 바인딩 ----------
  let bound = false;
  function bindFiltersOnce() {
    if (bound) return;
    const page = document.getElementById('page-settle-list');
    if (!page) return;
    bindCheckboxGroups(page);
    bindRadioGroups(page);
    bindSelects(page);
    bindTagSelect(page);
    const ft = document.getElementById('slFilterToggle');
    const fb = document.getElementById('slFilterBody');
    if (ft && fb) ft.addEventListener('click', () => { ft.classList.toggle('open'); fb.classList.toggle('open'); });
    const searchBtn = document.getElementById('slSearchBtn'); if (searchBtn) searchBtn.addEventListener('click', applyFilter);
    const resetBtn = document.getElementById('slFilterReset'); if (resetBtn) resetBtn.addEventListener('click', resetFilter);

    // 푸터
    const createBtn = document.getElementById('slCreateBtn');
    if (createBtn) createBtn.addEventListener('click', () => alert('정산서 생성 모달 (플레이스홀더)'));
    const verifyBtn = document.getElementById('slVerifyBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', () => {
      const n = getSelectedIdxList().length; if (!n) return alert('선택된 정산서가 없습니다.');
      alert(`${n}건 계좌 검증 요청 (플레이스홀더)`);
    });
    const transferBtn = document.getElementById('slTransferBtn');
    if (transferBtn) transferBtn.addEventListener('click', () => {
      const n = getSelectedIdxList().length; if (!n) return alert('선택된 정산서가 없습니다.');
      alert(`${n}건 이체 생성 (플레이스홀더)`);
    });
    const lockBtn = document.getElementById('slLockBtn'); if (lockBtn) lockBtn.addEventListener('click', () => bulkLock(true));
    const unlockBtn = document.getElementById('slUnlockBtn'); if (unlockBtn) unlockBtn.addEventListener('click', () => bulkLock(false));
    const bulkEditBtn = document.getElementById('slBulkEditBtn');
    if (bulkEditBtn) bulkEditBtn.addEventListener('click', () => {
      const n = getSelectedIdxList().length; if (!n) return alert('선택된 정산서가 없습니다.');
      alert(`${n}건 일괄 수정 모달 (플레이스홀더)`);
    });

    bound = true;
  }

  function onPageShown(tabId) {
    if (tabId !== 'settle-list') return;
    bindFiltersOnce();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      initGrid();
      if (gridApi && gridApi.onGridSizeChanged) gridApi.onGridSizeChanged();
    }));
  }

  window.addEventListener('tab:activated', (e) => onPageShown(e && e.detail && e.detail.id));
  window.addEventListener('page:shown', (e) => onPageShown(e && e.detail && e.detail.tabId));
  document.addEventListener('DOMContentLoaded', () => {
    const active = window.TabManager && window.TabManager.getActive && window.TabManager.getActive();
    if (active === 'settle-list') onPageShown(active);
  });

  window.SettleList = { openDetail, openShopDetail, toggleLock, _rows: rawRows };
})();
