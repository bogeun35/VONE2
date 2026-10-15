# NativeMaterialization — result
status: frozen — standard installed native registration path closed
owner: helper chat 3
files: source-migration/native-materialization-report.json, native-materialization.test.cjs, native-materialization-audit.local.py; this result and claim note only
tests: dedicated 27/27; full 1931/1931 passed

## Follow-up outcome
표준 QuantumGame.CreateFrameContext → SystemSetup.CreateSystems → Frame 생성 경로를 실제 설치 DLL에서 연결했다. 이전 결과의 “표준 경로에도 실제 callback snapshot 필수” 요구는 이번 정적 등록 근거로 해소했다. 원작을 실행한 결과나 임의로 변경된 Frame의 snapshot이라고 주장하지 않는다.

- View numeric component ID = 18, size = 8, flags = 0, mask word0 bit18 = 0x0000000000040000. ComponentTypeId.Setup은 reserved null index0(0x1819361d5) 다음 고정 builtin 목록을 등록한다. View는 18번째 추가(0x1819372ba/0x1819372cb)이며 Add<View>0x180730710은 현재 list.Count를 Id에 복사하고 list에 append한다. 이름이나 authoring index에서 만든 값이 아니다.
- globalComponentDelegates[View].OnAdded = null. View 등록은 serializer-only ComponentCallbacks 생성자0x1819346b0을 호출한다(0x181937293). 생성자는 OnAdded(+8)를 0x181934716에서, OnRemoved(+0x10)를 0x18193475f에서 명시적으로 0으로 쓴다. Add는 이 24-byte struct를 callback list에 추가하며 Setup이 최종 array를 ComponentTypeId.Callbacks(+0x50)에 저장한다(0x18193768f).
- Frame+70[View] = null. InitGen의 실제 BuildSignalsArrayOnComponentAdded<View> 호출0x1817443f9 → shared0x18077d990, View predicate0x1808a9680의 instance 검사, filtered array의 length 검사, empty 경로의 xor r8d,r8d(0x18077dce6) → slot write0x18077dd06을 추적했다. 제네릭 method spec/pointer table도 독립 검증했다.
- Frame+198 prototype signal systems = empty, Frame+80 = null. Frame ctor0x18173a150은 BuildSignalsArray<ISignalOnEntityPrototypeMaterialized> 결과를 +198에 저장(0x18173b13f), empty면0x18173b199에서 +80 등록을 건너뛴다. QuantumGame.CreateFrame0x181763360의 새 Frame 할당은 payload memset으로 초기값0을 보장한다.
- SystemSetup.CreateSystems0x181787aa0은 고정 6개: InternalSystem, EntityPrototypeSystem, PlayerConnectedSystem, InjectAssetSystem, GameSystem, StageSystem. CreateFrameContext0x181763690은 이 결과를 non-null 필터 후 roots(Game+a8)에 저장하고 SystemBase.Hierarchy를 펼쳐 systemsAll(Game+b0)에 저장한다. 실제 CreateFrame이 이 두 배열을 Frame에 전달한다. 전체 설치 metadata에는 concrete ISignalOnComponentAdded/ISignalOnEntityPrototypeMaterialized 구현이 없으므로 해당 compiled hierarchy까지 두 필터는 비어 있다.

## Materialization contract
14개 설치 prefab(ActionMapView, StageNoticeView, Thunder, Thorn, Goal, CameraView, Player, Key, Switch, WeightedLift, LinePathLift, Bridge, DamageRect, Rect)은 표준 ResourceContainer가 로드되고 변경 없이 PrepareAsset을 거친 조건에서 Components=[View_Prototype(Current=exact view GUID)]이다. TransformMode2와 physics/nav 비활성만으로 빈 배열을 추정하지 않았다. 실제 root EntityView, EntityViewAsset.Parent, AssetResourceContainer6164의 338개 registry 레코드, PrepareAsset 수집/쓰기 경로를 대조했다.

Frame.Create는 root 할당 → EnsureIsSorted → View를 같은 root에 Set → 조건부 listener → Frame callback 순서다. 단일 View는 prototype listener를 구현하지 않으며 위 표준 callback 세 곳이 null이므로 이 materialization 구간은 추가 Entity를 0개 만든다. 이후 CreateActorEntity의 Actor 추가/초기화 및 각 Creator의 명시 작업은 기존 CreationOrder 범위로 남는다.

기존 보고서의 일부 GUID 문자열 반올림을 정정했다: Key prototype 843619264496456800 → 843619264496456878, Player 2433998748904079400 → 2433998748904079550. Key view GUID는 375727164598194221. 새 report의 registry GUID는 모두 정확한 uint64 10진 문자열이며 Number 변환 없이 사용해야 한다.

## Remaining host inputs
- 활성 UnityDB/container의 로드완료, PrepareAsset 후 container/registry 변경 여부.
- 생성 전 allocator/free-list/version, typed View/Actor pool 및 mask 상태. View ID18 자체는 이제 해결됨.
- 표준 DLL/metadata/등록 경로에서 벗어나는 custom systems 또는 callback mutation이 있다면 그 정확한 효과. 표준 경로의 callback snapshot은 더 이상 필수 입력이 아니다.

정적 감사만 수행했다. 원작 실행, Git, 기존 Allocator/CreationOrder/factory/runtime/bridge/공용 파일 변경 없음. --followup은 실제 byte block/metadata usage/generic pointer 근거만 재생성하며 --audit는 기존 근거를 재생성하므로 서술 재대조가 필요하다.
