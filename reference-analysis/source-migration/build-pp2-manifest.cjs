'use strict';
// Inventory only. This does not create stages or promote mechanic demos to source imports.
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=require(path.join(base,'pico2-stages.json'));
const recoveredPath=path.join(__dirname,'source-world-import-report.json');
const recovered=fs.existsSync(recoveredPath)?JSON.parse(fs.readFileSync(recoveredPath,'utf8')):null;
const demos=require(path.join(base,'rebuild/demo-stages.js')).list();
const classes=new Set(require(path.join(base,'local-data/gameplay-script-catalog.json')).scripts.map(x=>x.m_ClassName));
// Additional gaps found by comparing the actual demo implementation with the saved source actions.
const requirements={
'1-1':['cooperative_platform','동료 쌓기, 버튼과 스프링 연결, 버튼 담당의 합류 동선'],
'1-2':['shield_crates','상자를 머리 위에 운반, 가시와 캐릭터 사이 차폐 판정'],
'1-3':['restoring_objects','미는 기둥의 복원, 복원 전 통과, 끼임 처리'],
'1-4':['cooperative_platform','숨은 버튼의 실제 발견 조건과 열쇠 장치 연결'],
'2-1':['rope','밧줄 길이 제약과 지형 충돌, 매달림, 전원 이동'],
'2-2':['contact_ice_wind','빙판 가감속과 동료 접촉 실패 조건'],
'2-3':['alignment','수직 정렬 유지 조건, 위험 버튼 배치와 열쇠 접근'],
'2-4':['contact_ice_wind','바람 방향과 강도, 접촉 실패, 간격 유지'],
'3-1':['phased_hazards','작은 빛/큰 빛의 형상, 중심 안전 구역, 시간 주기'],
'3-2':['path_platforms','기구 경로와 위험 영역, 플랫폼 위 안전 위치 변화'],
'3-3':['magnet','동료 흡착/분리, 흡착 후 이동 및 중력 처리'],
'3-4':['memory','원본 배치 제시, 숨김, 인원별 자리 재현과 판정'],
'4-1':['body_door','머리로 문 받치기, 하중/충돌, 담당자 후속 탈출'],
'4-2':['shield_crates','상자로 톱 궤도 반사, 동료 보호와 열쇠 회수'],
'4-3':['phased_hazards','좌우 교대 낙하 가시의 예고/낙하/복귀 주기'],
'4-4':['phased_hazards','레이저 발사, 지속, 소멸, 실제 광선 충돌 범위'],
'5-1':['timer_collect','공동 시간 제한, 모든 동전 확인, 전원 출구'],
'5-2':['timer_collect','시간 연장 버튼, 왼쪽 복귀 열쇠 동선, 연장 재사용 조건'],
'5-3':['magnet','자석 결합 이동과 모든 동전/시간 조건 결합'],
'5-4':['player_launch','동료 장전, 조준, 발사, 착지와 재합류'],
'6-1':['plane_combat','비행 이동/사격, 자기 색상 벽돌만 파괴'],
'6-2':['plane_combat','비행기 위 동료 탑승, 탄환/레이저 회피, 탑승자 충돌'],
'6-3':['plane_combat','비행 사격과 아군 피격 실패'],
'6-4':['plane_combat','총잡이와 방패 역할, 방향 차폐, 미사일'],
'7-1':['turn_ghost','조작 권한 한 명 제한, 안전 지점에서 역할 교대'],
'7-2':['turn_ghost','둘 이상 이동 감지 후 유령 추적, 정지/회피 조건'],
'7-3':['turn_ghost','밝음/암전 주기, 밝을 때 이동 금지와 기억 경로'],
'7-4':['turn_ghost','시선으로 유령 정지, 유령 접촉/발판과 열쇠 접근'],
'8-1':['ball_delivery','발사 담당과 받는 담당, 투사체 전달 성공 조건'],
'8-2':['ball_delivery','공 줍기, 운반/투척, 골대 진입 판정'],
'8-3':['ball_delivery','발사/받기, 공과 폭탄 구별, 폭탄 접촉 실패'],
'8-4':['ball_delivery','공 줍기와 농구, 섞인 폭탄 회피'],
'9-1':['capture_stealth','시야 제한, 절벽, 박쥐 움직임과 우리 포획'],
'9-2':['capture_stealth','동료 사이 밧줄과 나비 교차 포획, 여섯 마리 목표'],
'9-3':['capture_stealth','상자 은폐 상태, 적 시야/발각 판정'],
'9-4':['rope','밧줄 간격과 수평 정렬, 절벽 경로'],
'10-1':['reaction','신호 대기, 조기 입력 실패, 반응 버튼 목표'],
'10-2':['player_launch','사람/상자를 반대 방향으로 발사, 아래 발판 착지'],
'10-3':['ball_delivery','늘어나는 귀, 공 반사/운반, 왼쪽 용기 도착'],
'10-4':['gravity','점프 입력 중력 반전, 천장/바닥 접지, 동료 충돌'],
'11-1':['phased_hazards','탄환 궤도/주기와 지정 생존 시간'],
'11-2':['rope','밧줄 등반과 위아래 이동, 가시 경로'],
'11-3':['phased_hazards','대형 공 회전 경로, 시계 방향 회피'],
'11-4':['phased_hazards','파도별 낙하 틈 축소, 마지막 파도 쌓기'],
'12-1':['shared_jump','공중에서 각 인원이 한 번씩 점프 이어 주기, 착지 시 재충전'],
'12-2':['autoscroll','자동 스크롤 경계 실패, 상자로 상승 플랫폼을 막아 시간 확보'],
'12-3':['speed_change','열쇠 전후 속도와 슈퍼 점프 변경'],
'12-4':['speed_change','긴 점프 물리와 연속 가시 착지 구간'],
'13-1':['danger_buttons','안전/실패 버튼과 실제 선택 순서/열쇠 조건'],
'13-2':['graph','방향별 입력 인원과 목표 색 그래프 비교'],
'13-3':['ball_delivery','공 연속 열두 번 반사, 실패/리셋 조건'],
'13-4':['identity','복제 캐릭터 속 실제 조작 대상 식별과 통과 조건'],
'14-1':['player_transform','상자화 상태 전환, 가시 차폐, 붕괴 바닥 차단'],
'14-2':['punch','두더지 위치/등장, 실제 캐릭터 타격 판정과 목표'],
'14-3':['player_transform','낙하물 차폐, 공중 동료 상자화와 고정 발판'],
'14-4':['punch','구름 상대 이동과 타격 거리, 여섯 번 명중'],
'15-1':['path_platforms','원형 경로 바퀴, 쌓기, 열쇠 후 역방향 복귀'],
'15-2':['crate_stack','암전, 상자 회전/기울임 쌓기, 벽 장치 회피'],
'15-3':['plane_combat','추적탄 비행기 우선 공격, 방향 방패와 미사일 방어'],
'15-4':['contact_ice_wind','빙판, 왼쪽 벽 대기, 오른쪽 발판 출현 조건']
};
const extraGaps={
'2-3':['정렬 강제 조건을 생략한 일반 쌓기 데모'],
'3-4':['공략의 실제 공간 배치를 5칸 선택 문제로 대체'],
'5-2':['왼쪽 복귀 동선을 오른쪽 계단으로 대체'],
'7-2':['추적 유령 대신 동시 이동 즉시 실패'],
'8-2':['공 줍기/운반 없이 제자리 각도 조절 발사로 대체'],
'8-4':['공 줍기/운반 없이 제자리 발사, 폭탄 상호작용도 원작 미확인'],
'10-1':['5회 반응 라운드는 임의 설정; 원작 횟수/시간 미확인'],
'11-1':['20초 생존과 탄환 생성 규칙은 임의 설정'],
'11-2':['밧줄 등반을 점프대+상승 발판 경로로 대체'],
'12-3':['열쇠 후 수평 속도 배율만 구현, 슈퍼 점프 전환 누락'],
'13-1':['실패 버튼만 반복 배치, 원작 선택 장치 미확인'],
'13-2':['두 방향 인원 수 비교로 단순화, 원작 그래프 구성 미확인'],
'13-3':['일반 패들 반사 게임, 원작 캐릭터/공 상호작용 미확인'],
'14-2':['이동/타격 대신 지정 인원 action 입력으로 대체'],
'14-4':['구름 상대와 거리 조절 대신 지정 인원 action 입력으로 대체'],
'15-2':['상자의 기울임/회전 물리 미지원']
};
const classHints={
cooperative_platform:['BridgeComponent','JumpSwitchComponent'],shield_crates:['PushBoxComponent'],restoring_objects:['PushBoxComponent'],rope:['EntityComponentPhysicsJoints2D'],contact_ice_wind:['SwitchIceRectComponent'],alignment:['PlayerComponent'],phased_hazards:['LaserKeyBoxComponent','WaveKeyBoxComponent'],path_platforms:['LinePathLiftComponent','RouletteLiftComponent'],magnet:['PlayerMagnetComponent'],body_door:['WeightedLiftComponent'],timer_collect:['CoinObserverComponent','SwitchTimerActorComponent'],player_launch:['PlayerCannonComponent','PlayerWarpGunComponent'],plane_combat:['PlayerGunComponent','PlayerGuardComponent'],turn_ghost:['PlayerMoveObserverComponent','GhostPlayerComponent'],ball_delivery:['PlayerBasketComponent','PlayerHeaddressComponent'],capture_stealth:['PlayerComponent'],gravity:['PlayerComponent'],shared_jump:['PlayerComponent'],autoscroll:['StageComponent'],speed_change:['SpeedSwitchComponent'],danger_buttons:['DeadSwitchComponent'],identity:['FakePlayerComponent'],punch:['PlayerPunchComponent'],player_transform:['PlayerBlockComponent','PlayerBlockGunComponent'],crate_stack:['PushBoxComponent']
};
const rows=source.world.map(s=>{
 const id=`pico2/world/${String(s.world).padStart(2,'0')}-${String(s.stage).padStart(2,'0')}`;
 const d=demos.find(x=>x.id===id),r=requirements[s.id];if(!r)throw Error('Missing specification '+s.id);
 return {id,round:s.id,chapter:s.world,position:s.stage,title:s.mechanic,
  status:d?.playable?'implemented_partial':'spec_missing',
  sourceEvidence:{kind:'secondary_text',status:s.status,mechanic:s.mechanic,solutionAction:s.solution_action,urls:s.source,limitations:s.notes},
  engineFamily:r[0],requiredRules:r[1].split(', '),
  currentDemo:{playable:!!d?.playable,family:d?.family||null,route:d?.playable?d.route:null,implementedRules:d?.implementedRules||[],knownGaps:[...(d?.omittedRules||[]),...(extraGaps[s.id]||[])]},
  sourceTransfer:recovered?{status:'source_data_imported_runtime_pending',geometry:'raw_coordinates_recovered',objectPlacement:'all_source_actors_preserved',triggerLinks:'serialized_parameters_preserved_interpretation_pending',physicsCalibration:'unknown',populationVariants:'all_variants_recovered_selection_pending',sourceDataImported:true,exactMapImported:false,source:recovered.stages.find(row=>row.id===id)}:{status:'spec_missing',geometry:'unknown',objectPlacement:'unknown',triggerLinks:'unknown',physicsCalibration:'unknown',populationVariants:'unknown',exactMapImported:false},
  candidateRuntimeClasses:(classHints[r[0]]||[]).filter(x=>classes.has(x)),
  review:{completeRoute:false,allPopulations2Through8:false,realOnline:false,originalFidelity:false}
 };
});
if(rows.length!==60||new Set(rows.map(x=>x.id)).size!==60)throw Error('Expected exactly 60 unique World stages');
const engineFamilies=Object.keys(Object.groupBy?Object.groupBy(rows,r=>r.engineFamily):rows.reduce((a,r)=>(a[r.engineFamily]=1,a),{})).map(family=>({family,rounds:rows.filter(r=>r.engineFamily===family).map(r=>r.round),currentPartialDemos:rows.filter(r=>r.engineFamily===family&&r.currentDemo.playable).length,requiredRules:[...new Set(rows.filter(r=>r.engineFamily===family).flatMap(r=>r.requiredRules))],candidateRuntimeClasses:[...new Set(rows.filter(r=>r.engineFamily===family).flatMap(r=>r.candidateRuntimeClasses))]}));
const output={schemaVersion:1,date:'2026-10-09',scope:'PICO PARK 2 World 60 only; no Battle/Endless/Dark or PICO PARK 1',
 notice:'현재 게임은 임의 지형의 규칙 데모이며 원작 60단계 이관이 아니다. 런타임 클래스 이름은 존재 증거일 뿐 동작/단계 배치 증거가 아니다. 이 목록은 수정·검수 전 이관 누락을 드러내는 체크리스트다.',
 statusLegend:{observed:'출처에서 규칙을 관찰했으나 구현하지 않음',spec_missing:'정확한 지형·장치 연결·규칙 수치 등 이관 명세 누락',implemented_partial:'규칙 일부만 실행 가능하며 원작 지형/전체 규칙은 미이관',imported_not_reviewed:'원작 단계 데이터/규칙 이관 후 게임성 검수 전; 현재 이 상태인 단계 없음'},
 counts:{total:rows.length,implementedPartial:rows.filter(r=>r.currentDemo.playable).length,notImplemented:rows.filter(r=>!r.currentDemo.playable).length,sourceDataImported:recovered?.stages.length||0,sourceVariants:recovered?.variants||0,sourceActors:recovered?.actors||0,exactMapImported:0,completeRouteReviewed:0},
 migrationOrder:['원작 단계별 데이터와 장치 연결 회수','엔진별 누락 동작 구현','원작 지형과 단계 진행 조건 연결','각 단계 기본 실행 확인','이관 완료 후 2~8인 경로/실패/복구/재미 검수'],
 originalDataExtraction:recovered?{status:'source_data_recovered',streamingAssets:{binaryFiles:94,worldStageIdsRecovered:60,stageIdMappingRecovered:true,rawGeometrySchemaRecovered:true,evidence:'installed-world-decode-report.json'},counts:{worldStages:60,variants:recovered.variants,actors:recovered.actors,actorTypes:recovered.actorTypes.length},roundTripLossless:recovered.roundTripLossless,remaining:'126종 장치의 파라미터 의미와 동작 및 인원 선택 규칙 연결; 원본 데이터 확보는 완료, 플레이 이관은 미완료'}:{status:'spec_missing',streamingAssets:{binaryFiles:94,stageIdMappingRecovered:false,geometrySchemaRecovered:false,evidence:'streaming-inventory.json',note:'파일 94개는 World 60개와의 대응표가 아니다. UnityPy에서 단계 오브젝트를 회수하지 못했다.'},remaining:'원본 지형·오브젝트·트리거·인원별 변형을 확정할 수 있는 해석 결과 필요'},
 evidenceFiles:['../pico2-stages.json','../rebuild/demo-stages.template.js','../rebuild/mini-games.js','../local-data/gameplay-script-catalog.json','../local-data/findings.json','streaming-inventory.json'],engineFamilies,stages:rows};
fs.writeFileSync(path.join(__dirname,'pp2-transfer-manifest.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.counts));

