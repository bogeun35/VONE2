# 사격 계열(6-1·6-2·6-3·6-4·15-3) 분석 메모 — 2026-10-17 (Claude)

아직 구현 전. 저장형 Ghidra 조회 결과를 정리한 것. 출력 파일은 `source-migration/plane*.local.txt`, `obstacle.local.txt`
(커밋 안 됨 — `tools/ghidra/decompile.sh` 로 다시 뽑을 수 있음).

## 비행기 플레이어
- `BattlePlanePlayer`(107)·`PlanePlayer`(26)·`Player`(27) 모두 `ActorFactoryComponent.createPlayer` 0x1816a3e40 로 같은 Player 생성.
  상태 6(Plane)/7(BattlePlane) 요청 위치는 아직 못 찾음(PlayerComponent.ParseParameter/Initialize 의 종류 분기 확인 필요).
- `OnInitialize_Plane` 0x1816c81c0: 애니 8, 속도 +0x88 = PlayerComponent+0x180(1.5) × Stage+0x10 × QPlayerDefine 걷기(3) = 4.5,
  +0x90 = 그 × Stage+0x50, 플레이어 플래그 0x1000, 충돌 +6 |= 0x80.
- `OnInitialize_BattlePlane` 0x1816c1cf0: Plane 초기화 + +0x14 |= 0x10, HP(+5) = GetHitPointMax 0x1816c25d0
  (+0x14 비트5 없으면 2, 있으면 비트9 따라 5/3).
- `OnUpdate_Plane` 0x1816c8400: 좌우(버튼 7/6)·상하(4/5) → 8방향 각도(도×0x477: 0, 0xc8eb, 0x191d6, 0x25ac1, 0x323ac,
  0x3ec97, 0x4b582, 0x57e6d) → vx = CalcScreenEndWalkVeloX(cos×속도), vy = sin×속도 (cos 0x1816d3190 / sin 0x1816465d0 =
  FPSinCos 표). 플래그 0x1000000 이면 isPushedByPlanePlayer 0x1816c8bb0(층1 접촉 상대의 Velo 를 4면별로 더함).
  vx += 자동 스크롤 속도. ScrollType 2: 화면 왼쪽 끝 밀기(moveContactActor), 32px(0x200000) 넘게 뒤처지면 이벤트43.
  끝에 movePlayerVerticalOnPlane 0x1816c9070(|v|≥4 raw 이면 MoveContactActor).
- `CalcScreenEndWalkVeloX` 0x1816a1ad0: |v|≤3 raw 이면 0, 화면(카메라 뷰 영역) 밖으로 나가면 0.
- `OnUpdate_BattlePlane` 0x1816c1d80: HP 변화에 따라 애니 8/9, 피격 단계 0~4(무적 PlayerComponent+0x148, 흔들림 +0x150 동안
  RNG Next(0,14)-7 × (남은비율²) 오프셋), HP 0 → 단계3 → 이벤트43(사망). 회복 타이머.
- `battlePlaneDamageProc` 0x1816c00f0: 피격 처리(SE 11, 흔들림), 상세 미정리.

## 총(PlayerGun 108)
- Creator 0x1816cd5e0: 슬롯0 = 플레이어 액터 번호(존재할 때만). ParseParameter 0x1816cd810: 슬롯1 발사 간격(+0x30, 양수만),
  슬롯2 탄속(+0x28, [cctor+0x38=5, cctor+0x40] 범위로 제한), 슬롯3 ==1 이면 누르고 있기 연사(+4), 슬롯4 1=일반 플레이어만,
  2=비행기만. 총구 오프셋: 일반 cctor[0..1]=(28,-10), 비행기 cctor[2..3]=(30,-12). 플레이어에 Equip.
- InitPost 0x1816cdb50: 재사용 총알 3발(ResuablePlayerGunBulletComponent.Creator).
- OnUpdate 0x1816ce150: 간격 타이머 → 샷(버튼 9) 누름(또는 누르고 있기) → createBullet 0x1816ce5b0(쉬는 총알 하나를
  Resume, 발사 위치가 pushBack 대상과 겹치면 안 쏨, SE 0x14). OnPost: 플레이어 위치 따라감.

## 장애물(PlaneObstacle 25 → NormalPlaneObstacleComponent)
- ParseParameter 0x181887cf0: 슬롯0 종류(0 길 / 1 길+밀상자 / 2·3 길 기울기 ∓ / 4·5 곡선 ∓ / 6 이상 길 + 색블록 칸수 = 종류-4),
  슬롯1 → +0, 슬롯2 → +0x40(길이 480), 슬롯3 → +1(0이면 생성 벽이 DamageRect(9, 닿으면 사망), 아니면 Rect(30)),
  슬롯4 → +0x10, 슬롯5 → +0x38, 슬롯6 → +0x19.
- OnStart → GenerateRoad 0x18188ed70 / GenerateCurve 0x18188f790: randomY 0x181890120 로 길 높이, 위·아래 벽 사각형
  (ObstacleComponent.generateRect 0x18188afc0), 종류 1이면 PushBox(29), 종류≥6이면 MapBlockReplacer.GetValidColorIndexArray
  로 섞은 색을 맵 칸(0x1e+색)에 써서 **색 블록**을 깜(자기 색 총알로 부수는 칸으로 추정 — 맵 칸 파괴 경로 확인 필요).
- ObstacleComponent.OnPost 0x18188a670: 생성된 조각이 카메라 오른쪽+여유 안에 들어오면 저장된 속도로 움직이기 시작.
- 6-3 데이터: 슬롯0=8(색블록 4칸 길), 슬롯2=480, 4인 이하/5인 이상 배치가 따로 있음(5인 이상 슬롯6=1).
