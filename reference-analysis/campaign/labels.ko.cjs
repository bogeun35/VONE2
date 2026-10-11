'use strict';

// Presentation labels only. Preserve original research and stable source IDs.
const games = {pico1:'피코파크 1', pico2:'피코파크 2'};
const modes = {world:'본편', dark:'고난도 도전', battle:'대전', endless:'무한 도전'};
const worlds = {
  pico1:['첫 만남','함께 가자','시간 제한','장치 퍼즐','모두가 하나로','밀거나 뛰거나','움직이고 멈추고','추억의 게임','공놀이','둘이서 함께','손에 든 도구','마지막 도전'],
  pico2:['새로운 만남','서로의 거리','모양 맞추기','위험한 공원','시간 제한','함께 물리치자','멈추고 움직이고','작은 게임들','위에서 내려다보기','실력과 장비','회피의 달인','계속 전진','특별한 도전','유용한 도구','마지막 도전']
};
const statuses = {
  'secondary-text-confirmed; gameplay not watched':'자료 확인 · 플레이 대조 전',
  'secondary-text inventory; detailed rules need gameplay verification':'목록 확인 · 세부 규칙 확인 필요',
  'text-confirmed':'자료 확인',
  'text_evidence':'자료 확인',
  'unverified':'확인 필요',
  'partial':'추가 확인 필요',
  'partial_text_evidence':'추가 확인 필요',
  'community_list':'이용자 자료 · 원작 대조 전'
};
const mechanics = {};
const stageRows = [
 ['01-01','동료 쌓기 · 버튼 다리 · 승강기'],
 ['01-02','벽 밀기 · 떨어지는 기둥 · 발판 되돌리기'],
 ['01-03','위아래 경로의 버튼을 서로 열어 주기'],
 ['01-04','이동 발판 · 탑승 인원에 반응하는 발판'],
 ['02-01','밧줄로 연결된 동료와 함께 이동'],
 ['02-02','밧줄에 매달려 동료의 착지 돕기'],
 ['02-03','밧줄로 연결된 동료를 쌓아 운반'],
 ['02-04','쌓은 높이를 조절하며 함께 건너기'],
 ['03-01','제한 시간 안에 동전 모으기'],
 ['03-03','제한 시간 안에 동전을 모아 열쇠 얻기'],
 ['03-04','버튼을 눌러 남은 시간 늘리기'],
 ['04-01','방패로 위험 구간 통과'],
 ['04-02','함께 날며 장애물 밀기'],
 ['04-03','각자의 남은 시간을 합쳐 목표 맞추기'],
 ['04-04','크기 변경 버튼 · 함께 타는 승강기'],
 ['06-01','같은 색 블록 밀기 · 움직이는 계단'],
 ['06-02','자동으로 움직이는 화면 · 계단 운반'],
 ['06-03','발판을 타고 위로 이동'],
 ['06-04','누르면 위험해지는 버튼 피하기'],
 ['07-01','움직임에 반응해 쫓아오는 유령'],
 ['07-02','신호에 맞춰 움직이고 멈추기'],
 ['07-03','시선으로 열쇠를 든 유령의 움직임 조절'],
 ['07-04','움직일 때 줄어드는 공동 체력'],
 ['08-01','떨어지는 블록으로 함께 줄 맞추기'],
 ['08-02','공으로 벽돌 없애기'],
 ['08-03','점점 빨라지는 블록 맞추기'],
 ['08-04','장애물과 가속 벽돌이 추가된 벽돌 깨기'],
 ['09-01','점점 빨라지는 공 피하기'],
 ['09-02','무게로 기울어지는 발판 조절'],
 ['09-03','튕기는 공으로 블록을 깨 길 만들기'],
 ['09-04','동료가 공의 튀는 방향 조절'],
 ['10-01','둘씩 교대하며 버튼·낙하 블록·크기 변경 구간 통과'],
 ['10-02','동료의 도움으로 공중 점프 · 발판 타이밍 맞추기'],
 ['10-03','어두워진 길 통과'],
 ['10-04','어둠 속 보이지 않는 블록 건너기'],
 ['11-01','도구에 동료를 담아 발사'],
 ['11-02','동료를 끌어당겨 구덩이 건너기'],
 ['11-03','사라지는 발판 위에서 동료를 담고 발사하고 받기'],
 ['11-04','상자를 끌어당겨 시간제 버튼과 이동 발판에 옮기기'],
 ['12-01','방패 · 움직이는 블록 · 동료 쌓기'],
 ['12-02','바람 · 점프대 · 인원수 승강기'],
 ['12-03','날아서 장애물 구간 통과'],
 ['12-04','앞서 배운 장치를 함께 사용하는 마지막 이동 구간']
];
for(const [id, text] of stageRows) mechanics[`pico1/world/${id}`]=text;
const modeTitles = {
 'pico1/battle':['높이 대결','영역 차지','점프 생존','시간 맞추기'],
 'pico1/endless':['끝없는 점프','끝없는 블록 퍼즐','끝없는 달리기','끝없는 비행'],
 'pico2/battle':['높이 대결','시야 제한 높이 대결','밀쳐내기','반응 속도','비행 생존','공중 점프','열쇠 쟁탈','공 주고받기'],
 'pico2/endless':['끝없는 달리기','반응 속도 도전','그래프 맞추기','탄막 피하기','밧줄 회피','위험 버튼 피하기','끝없는 공 주고받기']
};
const modeMechanics = {
 'pico1/battle':['시간이 끝났을 때 가장 높이 있는 사람이 승리','공의 방향을 바꿔 더 넓은 영역 차지','포탄을 피해 마지막까지 살아남기','남은 시간을 0.01초에 가깝게 멈추기'],
 'pico1/endless':['함께 포탄을 계속 피하기 · 맞으면 종료','떨어지는 블록으로 함께 줄 없애기','흘러가는 장애물을 계속 뛰어넘기','밧줄로 연결된 채 날아서 지형 피하기 · 부딪히면 종료']
};
for(const [group, texts] of Object.entries(modeMechanics)) texts.forEach((text,i)=>mechanics[`${group}/${String(i+1).padStart(2,'0')}`]=text);
function required(table,key){if(!Object.hasOwn(table,key))throw new Error(`Missing Korean label: ${key}`);return table[key];}
function chapter(c){return c.mode==='world'?`${c.sourceWorld}. ${required(worlds,c.game)[c.sourceWorld-1]}`:c.sourceWorld?`${c.sourceWorld}. ${required(modes,c.mode)}`:required(modes,c.mode);}
function entryTitle(e){return ['world','dark'].includes(e.mode)?e.originalId:required(modeTitles,`${e.game}/${e.mode}`)[e.sourceOrder.ordinal-1];}
function mechanic(e){const text=mechanics[e.sourceId] ?? e.evidence.mechanic ?? '규칙 확인 필요';if(/[A-Za-z]/.test(text))throw new Error(`Untranslated mechanic: ${e.sourceId}`);return text;}
module.exports={games,modes,chapter,entryTitle,mechanic,status:e=>required(statuses,e.evidence.status)};
