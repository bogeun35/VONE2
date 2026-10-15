# NativeCreationOrder — result
status: done / FROZEN (정적 분석·검증 계약; factory 구현 없음)
files: source-migration/native-creation-order-report.json, source-migration/native-creation-order.test.cjs, 이 결과 및 선점

tests: 독립 검증19 passing; 전체1456 passing / 0 failing. 원작 실행 없이 DLL·metadata·설치 자산을 읽었다. 프리팹 추출은 bundled Python3.12 -I -B와 기존 UnityPy/TypeTreeGenerator를 사용했다.

what it is: 실제 factory 구현이 사용할 생성 순서·분기·allocator·typed pool 계약을 주소와 명령으로 정리했다. 3-2·10-4의 온/오프라인2..8인 모두에 converter 우선순위와 population/Player limit를 적용한 조건부 생성 순번 및 typed component 추가 순서를 보고서에 저장했다. 이 순번은 EntityRef index가 아니며, 실제 allocator 초기 상태·프리팹 materialization·추가 callback을 생략한 전체 native 생성순서로 제시하지 않았다.

stage compiles alone: no. 보고서는 구현 계약과 근거이며, allocator/factory/runtime 모듈은 추가하지 않았다.

## 가장 중요한 두 정정

1. ActorInitialization에서 get/add라고 부른 0x1801f9ad0은 **Frame.AddComponent<ActorComponent>**다. 슬롯0x1831c6a98 / MethodSpec95521로 독립 확정했다. Has call0x1801f9c3d에서 이미 Actor가 있으면0x1801f9c44 ->0x1801f9d30의 zero-pointer 분기로 가며,0x1801f9d5e가 그 포인터에 EntityRef를 쓴다. 따라서 existing Actor를 반환/보존하는 get-or-add 성공 경로로 구현하면 안 된다. 동결된 ActorInitialization.initialize는 Actor.Initialize 자체의 쓰기 패치로만 맞으며, 실제 factory에서는 **Actor component 부재 확인 + defaultMaterialized** 경로에 적용해야 한다. 동결 파일은 수정하지 않았다.
2. authored 배열은 native creator 순서가 아니다. convertStageInitParam0x180554022가 sortActorCreateParamList0x180554390을 호출한다. 먼저 type priority로 i/j pairwise swap, 이어 threshold로 pairwise swap한다. 두 stage threshold가 모두0이어도 첫 정렬이 필요하며, swap 때문에 같은 priority의 상대 순서까지 변한다. JS stable sort로 대체하면 안 된다.

## 확인된 준비·생성 순서

Stage.Update0x18170a570는 상태별 prepare를 한 번 실행하고 성공하면 다음 상태로 증가시킨 뒤 return한다. 다섯 prepare를 한 Update에 몰아 실행하지 않는다.

| 단계 | 확인된 작업 | Entity 소비 분기 |
|---|---|---|
| 사전 | StageComponent.CreateEntity 및 앞선 Game/global 상태 | 호스트의 실제 초기 allocator/singleton 상태 필요 |
| prepare1 | ActorManager → ActorScene.Initialize → ActorFactory.Initialize | 각각 GetOrAddSingletonPointer. 기존 singleton이면0개, 없고 supplied ref0이면 Frame.Create1개 |
| prepare2 | Map → Camera → CollisionScene → StageNotice | 각각 직접 Frame.Create(prototype). callback 효과는 별도 |
| prepare3 | Stage scale/settings → limitPlayer → InitPlayerIndexList(shuffle) → camera request → ActorFactory.Update(threshold0) | 두 stage의 초기 authored actors는 **여기서** 생성 시도 |
| prepare4 | InputType별 Normal/Majority/Multi/Half input singleton | 초기 actors **뒤**에 새 singleton이 추가될 수 있음 |
| prepare5 | initScroll → CheckDarkness → SetActive | 직접 Frame.Create 없음; 호출된 branch/listener 전체 무생성을 단정하지 않음 |

prepare3의 factory 호출은0x18170ae0c, prepare4 NormalInput 경로는0x18170b19f다. prepare1의0x1819756e0은 GetSingletonEntityRefIndexUnchecked이며 allocation이 아니다. singleton helper0x180786ee0은 existing singleton을 검사하고, 없으면0x180786f08에서 실제 Frame.Create를 호출한다.

## 실제 stage 적용

설치된 decoded stage variant에 native converter의 두 pairwise pass를 적용하고 population을 검사했다. scene limitPlayer=1, 유효 GamePlayerInfo count개, creator/registration 성공, 기존 Actor/typed pool 및 hidden callback 추가가 없다는 조건의 순서다.

| Stage | 조건부 성공 Actor 수, n=2..8 | 확인 사항 |
|---|---|---|
| 3-2 | 14,13,14,15,16,17,18 | authored Player8슬롯 중 n개 생성, shufflePlayer0 |
| 10-4 | 20,21,22,23,24,25,26 | authored Player8슬롯 중 n개 생성, shufflePlayer1 |

10-4의 비Player 순서는 Key → Goal → Bridge1 → Bridge2 → Rect1 → **Switch2 → Switch1** → **Thunder2 → Thunder5 → Thunder6 → Thunder7 → Thunder3 → Thunder4 → Thunder1** → WeightedLiftEx1 → Thorn1 → Thorn2 → Thorn3다. 3-2도 DamageRect/Rect/Thunder/Thorn/LinePathLift 순서로 바뀐다. count별 상세 authoredIndex/convertedIndex/skip/조건부 순번은 JSON의 `actualPopulations`에 있다.

10-4 shuffle은 실제 player-index list 및 RNG/GamePlayerInfo 연결에 영향을 주므로 authored Player 이름1..n을 네트워크 PlayerIndex/EntityRef로 사용하면 안 된다. inputType은 이 decoded stageInitParamList 안에 없으므로 외부 Stage/Game 설정을 호스트가 공급해야 한다.

## Component 추가와 프리팹

| Creator | Actor 뒤 추가 순서 | 별도 Entity에 대한 확인 |
|---|---|---|
| Player | DamageManage → Player | 직접 root prototype Create1개; 추가 listener 별도 |
| Key / Goal / Bridge / Rect / DamageRect / LinePathLift | 해당 typed component | 각각 직접 root1개 |
| Thorn | **ThornComponent** | NormalThorn 이름을 별도 typed pool로 만들면 안 됨 |
| Switch | SwitchComponent → NormalSwitchComponent | 서로 다른 두 pool, 같은 root Entity |
| Thunder | ThunderBaseComponent → ThunderComponent | 서로 다른 두 pool, 같은 root Entity |
| WeightedLiftEx | WeightedLiftComponent → ExtraWeightedLiftComponent | 서로 다른 두 pool, 같은 root Entity |

resources.assets에서 관련14개 root 프리팹과 모든 자식 계층을 읽었다. root에는 EntityPrototype/EntityView/view scripts와 Transform(맵에는 Grid)이 있고, serialized EntityComponentActorComponent/typed ComponentPrototype은 없었다. 모든 descendant에도 추가 EntityPrototype이 없다. Player view 자식13개나 Switch view 자식12개를 별도 native Entity로 세면 안 된다. root/child pathId, component class, authoring prototype, asset path/GUID와 자산 SHA256은 JSON에 있다. 64-bit asset GUID는 정밀도 보존을 위해 decimal string이며 EntityRef와 다르다.

단, authoring 자산의 Parent와 Settings.Container만으로 최종 runtime-baked Components 배열/순서와 모든 OnAdded/materialized listener를 완전히 확정하지 않았다. Frame.Create(prototype)는0x1819786e1에서 root를 할당하고0x181978732에서 component materialization 후,0x18197875c 및0x181978783의 callback 분기를 거친다. 이 효과를 생략하여 전체 native Entity stream이라고 주장하지 않는다.

## Allocator / primary ref / typed 물리 순서

- FrameBase.Create0x181979090: freeHead+28이0이면 nextUnused+20을 할당하고 증가시킨다. freeHead가 있으면 그 index를 pop하고 freeCount+24를 감소시킨다. 초기 Frame.Initialize0x18197739c..3a6은 nextUnused1/freeCount0/freeHead0을 설정하지만, **Stage 직전 상태가 그 초기 상태라는 뜻은 아니다**.
- entry stride16, 반환 Ref는 low32 index / high32 rawVersion.0x1819790e3..0ef는 `((oldVersion+1)&0x7fffffff)|0x80000000`을 쓴다. 무조건 generation1이라고 만들거나 high bit를 임의로 버리지 않는다.
- Frame.Destroy0x181977de8은 pending flag2를 표시한다. CommitDestroys0x1819795a6..5c3이 free chain에 index를 넣는다. destroy 요청 순간 index를 재사용하면 안 된다.
- Key.Creator는 InitPost 뒤0x18186b59c에서 manager+50, Goal.Creator는 InitCollision 뒤0x18185f728에서 manager+48에 EntityRef를 쓴다. last completed creator write가 primary이며 Frame.GetKey/GetGoal은 해당 ref만 읽는다. AddActor0x1816a3687보다 먼저 쓰므로 duplicate-name의 OnExit/Destroy나 stale ref를 다른 Key/Goal 스캔으로 보정하면 안 된다.
- typed pool은 성공한 component Add 순서에 append한다. 기존 pool prefix·프리팹 component·추가 callback·commit removal을 모두 포함해야 한다. removal은 swap-last라 이후 순서도 달라진다. source-actor-lifecycle-query를 읽기 전용 재사용했고 sparse EntityRef index로 검증했다. blockSize/version/현재 generation·component mask는 호스트 입력이다.

## 최소 host 계약과 남은 범위

1. converter-sorted stage entries, factory cursor/created bitset/current threshold.
2. stage 진입 전 allocator/singleton 상태 또는 **모든** root/extra 생성의 authoritative EntityRef 결과. 이전 global/Game 생성과 free/recycle 이력 포함.
3. resolved prototype 및 runtime-baked component 배열·mask·materialization/OnAdded event stream. Actor Add 전에 부재 확인.
4. 실제 scene player list, shuffle RNG 결과, GamePlayerInfo/color/PlayerIndex, 외부 inputType.
5. 각 typed pool의 sentinel/slots/blockSize/version과 live component mask 및 commit/remove 순서.
6. creator 완료 위치/이름, scene unique-name 판정, manager Key/Goal refs, duplicate OnExit/Destroy/cleanup 효과.

미확정 주소·명령·분기는 JSON의 `unresolved`, `prototypeMaterialization`, `instructionEvidence`, `creationBranchTable`, `minimumHostContract`에 구분했다. 전체 native entity numbering이나 listener가 추가 entity를 만들지 않는다는 결론은 내리지 않았다.

기존 factory/runtime/ActorLifecycle-query/ActorInitialization 및 공유 문서·Git 변경 없음. 이 작업의 보고서·독립 test·결과·선점만 작성하고 동결한다.
