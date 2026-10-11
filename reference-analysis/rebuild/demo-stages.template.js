(function(root){
'use strict';
const catalogue=/*CATALOGUE*/[];
const defs=new Map();
function add(ids,family,implemented,omitted=[],config={}){for(const id of ids.split(' '))defs.set(id,{family,implementedRules:implemented.split('|'),omittedRules:omitted,config});}
// Each reference has explicit coverage. Coordinates are demo design, not recovered original maps.
add('pico1/world/01-01','observed','몸 쌓기|다리 버튼|전원 승강기', ['원작 물리 수치 보정']);
add('pico1/world/01-03','relay','위아래 경로|버튼으로 동료 통과',['상자를 버튼 위에 놓는 과정']);
add('pico1/world/01-04','moving','움직이는 발판|전원 승강기',['무게로 내려가는 중앙 발판·기둥 회피']);
add('pico1/world/03-01 pico1/world/03-03 pico2/world/05-01','coins','제한 시간|모든 동전 회수|전원 출구');
add('pico1/world/03-04 pico2/world/05-02','timer','시간 연장 버튼|계단 오르기|열쇠 회수');
add('pico1/world/04-02','flight','비행|위아래 굴곡 통과',['함께 상자를 미는 구간']);
add('pico1/world/06-03','vertical','수직 이동 발판|오르내리며 열쇠 회수',['공략에 없는 나머지 구간']);
add('pico1/world/06-04 pico2/world/13-01 pico2/endless/06','avoidbuttons','위험 버튼 회피|높은 열쇠',['무한 반복 진행']);
add('pico1/world/07-01','traffic','정지 신호에 멈추기',['뒤쫓는 유령 형상·추격 속도']);
add('pico1/world/07-02','traffic','정지 신호|점프대',['상자 재배치']);
add('pico1/world/07-04','stamina','공동 이동 체력|번갈아 이동|점프대');
add('pico1/world/10-02','stack','동료 발판|상단 열쇠',['동시 점프 화살표·구조 버튼']);
add('pico1/world/10-03','blackout','어두운 경로|승강기|점프대');
add('pico1/world/12-02','windlift','바람|점프대|전원 승강기',['왼쪽으로 복귀하는 출구 동선']);
add('pico1/world/12-03','flight','비행|장애물 통과|열쇠 회수');
add('pico1/world/12-04','finale','다리 버튼|점프대|이동 장애물|위험 버튼',['자동 스크롤']);
add('pico2/world/01-01','springrelay','몸 쌓기|버튼으로 점프대 작동');
add('pico2/world/01-04','hiddenbutton','숨은 버튼|문 열기|열쇠 회수');
add('pico2/world/02-03','alignment','수직 쌓기|위험 버튼 회피',['정렬 강제 실패 조건']);
add('pico2/world/03-01','safegap','움직이는 위험 구역|안전 틈',['원작 빛 장치의 정확한 주기']);
add('pico2/world/03-02','movinghazard','이동 발판|위험 구역 회피');
add('pico2/world/04-01','relay','동료가 문을 유지|열쇠 회수',['머리로 문을 받치는 물리']);
add('pico2/world/04-03','fallinghazard','번갈아 내려오는 위험물');
add('pico2/world/04-04','laser','주기적 위험 구역|타이밍 통과',['레이저 발사·소멸은 이동 위험물로 시각화']);
add('pico2/world/07-02','oneatatime','동시 이동 제한',['유령 추격 시각화']);
add('pico2/world/07-03','blackout','암전 경로',['밝을 때 이동 금지 조건']);
add('pico2/world/11-04','narrow','좁은 안전 통로|몸 쌓기',['연속 파도에 따른 틈 축소']);
add('pico2/world/12-03','speedkey','열쇠 후 속도 상승|강한 점프');
add('pico2/world/12-04','longjump','긴 도약|가시 구간');
add('pico2/world/15-01','moving','이동 발판|쌓기',['원형 경로 바퀴·열쇠 후 복귀']);
add('pico2/dark/01-01','relay','오른쪽 이동|버튼');
add('pico2/dark/01-02 pico2/dark/02-04','stackrelay','쌓기|버튼 담당 유지');
add('pico2/dark/01-03 pico2/dark/03-01','vertical','상승 발판|점프');
add('pico2/dark/02-01','moving','분리 발판 경로',['점선 경로의 정확한 배치']);
add('pico2/dark/02-03','dodge','움직이는 공 회피');
add('pico2/dark/03-03 pico2/dark/04-01','safegap','움직이는 분홍 위험물 회피');
add('pico2/dark/03-04','bridge','발판|다리 버튼|점프');
add('pico2/dark/04-02 pico2/dark/04-04','dodge','움직이는 적 회피|발판',['적의 원작 추적 행동']);
add('pico2/dark/04-03','wind','바람|장애물 점프');
add('pico1/world/01-02','crates','상자 밀기|상자를 발판으로 사용',['떨어지는 기둥']);
add('pico1/world/06-01','cratestairs','상자 밀기|상자 계단',['자기 색상 상자만 미는 제한']);
add('pico1/world/06-02','cratestairs','상자 계단 밀기',['자동 스크롤']);
add('pico1/world/10-04 pico2/world/15-02','darkcrates','암전|상자 이동|계단 만들기',['원작 숨은 장치 배치']);
add('pico2/world/01-03','crates','기둥 밀어 통과',['기둥 자동 복원']);
add('pico2/dark/01-04','cratestairs','쌓기|상자 밀기');
add('pico1/world/02-01 pico1/world/02-02','rope','동료 연결|좁은 틈 건너기',['아래 매달려 열쇠를 얻는 원작 경로']);
add('pico1/world/02-03','ropestack','동료 연결|쌓기|승강기');
add('pico1/world/02-04','ropestack','동료 연결|머리 위 장애물',['붕괴 다리']);
add('pico2/world/02-01 pico2/world/09-04','rope','동료 연결|간격 유지|절벽 통과');
add('pico2/world/11-02','ropespring','동료 연결|상승|가시 회피');
add('pico2/world/02-02','icecontact','빙판 관성|동료 접촉 금지');
add('pico2/world/02-04','windcontact','바람|동료 접촉 금지');
add('pico2/world/15-04','icemoving','빙판|이동 발판',['발판 출현 조건']);
const miniGroups={precision:'pico1/world/04-03 pico1/battle/04',blocks:'pico1/world/08-01 pico1/world/08-03 pico1/endless/02',bricks:'pico1/world/08-02 pico1/world/08-04 pico1/world/09-03',reaction:'pico2/world/10-01 pico2/battle/04 pico2/endless/02',graph:'pico2/world/13-02 pico2/endless/03',memory:'pico2/world/03-04',rally:'pico2/world/13-03 pico2/battle/08 pico2/endless/07',basketball:'pico2/world/08-02 pico2/world/08-04',whack:'pico2/world/14-02 pico2/world/14-04',dodge:'pico1/battle/03 pico1/endless/01 pico2/world/11-01 pico2/endless/04',height:'pico1/battle/01 pico2/battle/01 pico2/battle/02 pico2/battle/06'};
for(const [family,ids]of Object.entries(miniGroups))for(const id of ids.split(' '))defs.set(id,{family,route:'mini',implementedRules:[],omittedRules:['원작 수치·배치 미보정'],config:{}});
const box=(id,x,y,w,h)=>({id,x,y,w,h});
function list(){return catalogue.map(row=>{const d=defs.get(row.id);return {...row,family:d?.family||'pending',route:d?.route||'platform',playable:!!d,approximation:true,implementedRules:d?.implementedRules||[],omittedRules:d?.omittedRules||['단계 고유 규칙 구현 대기'],verification:'not_reviewed'};});}
function createStage(id,count=2){
 if(!Number.isInteger(count)||count<2||count>8)throw new Error('2~8명만 지원합니다.');
 const d=defs.get(id),meta=list().find(x=>x.id===id);if(!d||d.route==='mini')throw new Error('플랫폼 데모가 없는 단계입니다: '+id);
 if(d.family==='observed'){const S=typeof module!=='undefined'&&module.exports?require('./stage1-1.js'):root.ParkStageOne;return S.createStage(count);}
 const ordinal=Number(id.slice(-2)),game=id.startsWith('pico2')?2:1;
 const m={id,name:meta.mechanic,width:2000,height:720,spawns:Array.from({length:count},(_,i)=>({x:45+i*40,y:562})),platforms:[box('ground',0,600,2000,120)],switches:[],devices:[],timers:[],hazards:[],coins:[],springs:[],movingPlatforms:[],rules:{},key:box('key',1760,550,24,24),exit:box('exit',1880,522,58,78),killY:780,reconstruction:{status:'mechanic_demo',geometry:'original_layout_unverified',populationScaling:'unverified',implementedRules:meta.implementedRules,omittedRules:meta.omittedRules}};
 const ledge=(name,x,y,w=150)=>m.platforms.push(box(name,x,y,w,18));
 const hazard=(name,x,y,w=36,h=36,axis,distance=0,speed=90)=>m.hazards.push({...box(name,x,y,w,h),shape:/^(spike|side-spikes|keep-gap)/.test(name)?'spike':'rect',...(axis?{axis,distance,speed}: {})});
 const spring=(name,x,y=600,power=730,signal)=>m.springs.push({...box(name,x,y,60,8),power,...(signal?{signal}:{})});
 const button=(name,x,y,signal)=>m.switches.push({...box(name,x,y,64,6),signal});
 const gate=(name,x,y,signal,mode='while')=>m.devices.push({...box(name,x,y,24,140),kind:'gate',signal,mode,active:false});
 const lift=(x,y=600,toY=340)=>m.devices.push({...box('team-lift',x,y,Math.max(150,count*34),12),kind:'lift',fromY:y,toY,speed:75,requiredPlayers:count,active:true});
 const exitAt=(x,y)=>{m.exit=box('exit',x,y-78,58,78);m.key=box('key',x-120,y-55,24,24);};
 const gaps=()=>{m.platforms=[box('start',0,600,600,120),box('landing',880,600,1120,120)];};
 switch(d.family){
 case 'coins': m.timeLimit=55+count*4;for(let j=0;j<4;j++){const x=550+j*310,y=ordinal===3?510-(j%3)*65:530-(j%2)*70;ledge('coin-ledge'+j,x,y,150);for(let k=0;k<2;k++)m.coins.push(box('coin'+j+'-'+k,x+30+k*70,y-32,20,20));}m.requiredCoins=8;break;
 case 'timer':m.timeLimit=12+count*2;for(let j=0;j<5;j++){const x=440+j*255,y=600-j*40;ledge('stairs'+j,x,y,200);button('time'+j,x+45,y,'time'+j);m.switches.at(-1).timeBonus=8;}exitAt(1850,400);ledge('exit-floor',1700,400,300);break;
 case 'relay':case 'stackrelay':case 'hiddenbutton': {const y=d.family==='stackrelay'?448:500;ledge('scout-perch',530,y,210);button('open',590,y,'open');gate('route-gate',900,460,'open','latch');if(d.family==='hiddenbutton')m.switches[0].hidden=true;ledge('return-step',800,545,85);m.key=box('key',1450,550,24,24);break;}
 case 'springrelay':ledge('scout',500,465,180);button('spring-switch',555,465,'boost');spring('relay-spring',860,600,820,'boost');spring('holder-return',620,465,730);ledge('upper-exit',760,340,1240);exitAt(1850,340);break;
 case 'bridge':case 'finale':gaps();m.platforms[1].x=800;m.platforms[1].w=1200;ledge('scout-step',450,530,145);button('bridge-switch',1030,600,'bridge');m.devices.push({...box('bridge',600,600,200,14),kind:'bridge',signal:'bridge',mode:'latch',active:false});if(d.family==='finale'){spring('bounce',1180);hazard('slime',1450,566,36,34,'x',180,85);hazard('bad-button',1710,592,50,8);}break;
 case 'moving':case 'movinghazard':gaps();m.platforms[1].x=1350;m.platforms[1].w=650;m.movingPlatforms.push({...box('ferry',610,580,Math.max(150,count*34),18),axis:'x',distance:590,speed:95});if(d.family==='movinghazard')hazard('ceiling-danger',920,490,45,55,'y',65,80);else {ledge('upper-exit',1630,430,370);spring('rise',1490);exitAt(1870,430);}break;
 case 'vertical':m.width=1400;m.platforms=[box('start',0,600,1400,120)];m.movingPlatforms.push({...box('rise-one',550,595,Math.max(160,count*34),18),axis:'y',distance:-190,speed:75},{...box('rise-two',930,410,170,18),axis:'y',distance:-140,speed:55});ledge('middle',840,410,90);ledge('top',1120,270,280);exitAt(1280,270);break;
 case 'stack':case 'alignment':case 'narrow':ledge('body-climb',550,470,200);ledge('body-climb-two',800,405,160);m.key=box('key',845,370,24,24);if(d.family!=='stack'){hazard('left-button',500,592,40,8);hazard('right-button',755,592,40,8);}if(d.family==='narrow'){hazard('roof-left',1150,300,250,220);hazard('roof-right',1450,300,250,220);}break;
 case 'flight':m.rules.flight=true;m.key=box('key',1620,250,24,24);exitAt(1880,600);m.key=box('key',1620,250,24,24);for(let j=0;j<4;j++)hazard('wall'+j,600+j*290,j%2?390:0,50,j%2?210:390);break;
 case 'traffic':m.rules.trafficLight={go:3.8,stop:1.6};spring('traffic-spring',700);ledge('high',1020,420,260);m.key=box('key',1120,380,24,24);break;
 case 'stamina':m.rules.stamina={max:5+count,recovery:2};spring('first-spring',700);ledge('rest',1000,460,220);m.key=box('key',1070,420,24,24);break;
 case 'blackout':m.rules.blackout=true;if(game===1){lift(700);ledge('upper',700+Math.max(150,count*34),340,700);spring('exit-spring',1500);ledge('door-ledge',1730,400,270);exitAt(1850,400);m.key=box('key',1170,300,24,24);}else{for(let j=0;j<4;j++)ledge('remember'+j,540+j*290,530-(j%2)*60,140);}break;
 case 'windlift':m.rules.wind=-65;spring('lift-spring',570);lift(850);ledge('upper',850+Math.max(150,count*34),340,1150-Math.max(150,count*34));exitAt(1870,340);break;
 case 'wind':m.rules.wind=-85;for(let j=0;j<4;j++)hazard('spike'+j,570+j*300,575,65,25);break;
 case 'avoidbuttons':for(let j=0;j<5;j++)hazard('bad-button'+j,540+j*235,592,45+(ordinal%2)*15,8);ledge('key-step',1600,520,170);m.key=box('key',1670,480,24,24);break;
 case 'safegap':for(let j=0;j<4;j++)hazard('moving-light'+j,560+j*320,405,100,80,'y',160,60+j*8);break;
 case 'fallinghazard':case 'laser':for(let j=0;j<5;j++)hazard('fall'+j,530+j*270,j%2?270:550,d.family==='laser'?14:70,d.family==='laser'?180:42,'y',j%2?280:-280,100);break;
 case 'dodge':for(let j=0;j<4;j++)hazard('rolling'+j,700+j*300,562,38,38,'x',-180,90+ordinal*10);ledge('safe-perch',1040,515,100);break;
 case 'oneatatime':m.rules.oneAtTime=true;for(let j=0;j<3;j++)ledge('waiting'+j,550+j*380,540,180);break;
 case 'speedkey':m.rules.speedAfterKey=1.5;m.key=box('key',530,550,24,24);m.platforms=[box('start',0,600,850,120),box('middle',1040,570,260,150),box('end',1500,540,500,180)];exitAt(1880,540);m.key=box('key',530,550,24,24);break;
 case 'longjump':m.physics={jumpSpeed:680};m.platforms=[box('start',0,600,600,120),box('a',790,560,180,160),box('b',1180,525,180,195),box('end',1570,500,430,220)];exitAt(1860,500);break;
 case 'crates':case 'cratestairs':case 'darkcrates':m.crates=[box('crate-a',500,535,80,65),box('crate-b',720,535,75,65)];ledge('crate-wall',850,465,400);m.key=box('key',1110,425,24,24);if(d.family==='cratestairs'){m.crates.push(box('crate-c',1050,400,75,65));ledge('high-wall',1440,390,360);m.key=box('key',1510,350,24,24);}if(d.family==='darkcrates')m.rules.blackout=true;break;
 case 'rope':case 'ropestack':case 'ropespring':m.rules.ropeLength=180;m.platforms=[box('start',0,600,650,120),box('middle',780,600,380,120),box('end',1290,600,710,120)];if(d.family==='ropestack'){m.platforms=[box('start',0,600,2000,120)];lift(1000);ledge('upper',1000+Math.max(150,count*34),340,1000-Math.max(150,count*34));exitAt(1850,340);}else if(d.family==='ropespring'){spring('rope-bounce',470,600,780);ledge('safe-high',800,410,360);m.key=box('key',950,370,24,24);hazard('side-spikes',1260,575,50,25);}break;
 case 'icecontact':case 'windcontact':m.rules.noContact=true;m.spawns=m.spawns.map((p,i)=>({...p,x:40+i*60}));if(d.family==='icecontact')m.rules.ice=true;else m.rules.wind=65;for(let j=0;j<3;j++)hazard('keep-gap'+j,700+j*380,577,55,23);break;
 case 'icemoving':m.rules.ice=true;m.platforms=[box('start',0,600,650,120),box('end',1240,510,760,210)];m.movingPlatforms.push({...box('ice-ferry',640,560,Math.max(170,count*34),18),axis:'x',distance:420,speed:75});exitAt(1860,510);break;
 default:throw new Error('Unknown demo family '+d.family);
 }
 return m;
}
const api={list,createStage};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ParkDemoStages=api;
})(typeof window!=='undefined'?window:globalThis);
