# FactoryUniqueName — result
status: done (동결)
files: source-migration/source-factory-unique-name.js, .test.cjs, factory-unique-name-report.json; 이 result 및 작업중 claim.
tests: 전용11/11; 전체1979/1979 통과. 원작 실행 없음.

what it is: CreateActor 진입 시 null/빈 managed name만 생성하는 독립 helper. factory raw+2를 uniqueId로 명시 전달하고 ushort 선증가 후 A{counter}_{실제 enum명}을 만든다. QString 변환은 별도 encodeActorName API이며 실제 Actor.Initialize 시점에만 호출해야 한다.
stage compiles alone: 아니오. 전체 factory/allocator/materialization/typed creator/runtime 연결은 lead 소유이며 변경하지 않았다.

- 빈 이름 판정 0x1816a338c..3396, GetUniqueName 호출 0x1816a33a1은 creator 0x1816a3628보다 앞이다. 따라서 blank Player가 후속 limit/null 반환해도 소비한다. marked/threshold/population skip에서는 helper를 호출하지 않는다. 전체 배열 선행 변환에 resolver를 사용하면 안 된다.
- ushort 선증가 0x1816a3791, 65535→0. boxed counter read 0x1816a37c5는 Enum.ToString 0x1816a383e보다 먼저여서 enum host 중 factory 변경이 있어도 이름 counter는 이미 capture한 값을 쓴다. enum 오류/이후 QString 오류는 helper의 counter를 되돌리지 않는다. 외부 Factory.update transaction rollback은 별도이며 통합 테스트했다.
- literal slot0x1831c3e08 A{0}_{1}, AppendFormat0x1816a38da. 길이31 초과 시 StringBuilder.Remove(31,length-31) 0x1816a38ee..3907. UTF16 prefix31이며 UTF8 byte30이 아니다. Actor.Initialize QString ctor0x18169ccae에서 기존 NativeQString의 오류를 그대로 전파한다. 재명명/30바이트 rescue 없음.
- 설치 metadata TypeDef5073 Quantum.QActorType, fields20980..21217의 signed I4 상수238개(0..237, alias 없음)를 직접 추출하여 report에 field/defaultData 위치와 함께 기록. type138 ShootingEnemyBossParamSetter, type139 ShootingEnemyBossExParamSetter는 긴 생성 이름의 QString 실패를 검증했다.
- 실제3-2/10-4 각각 offline/online 2..8 선택의 모든 parameter를 lazy resolve 대조. 전체 설치60stage의 authored fixture3474개 중 빈 이름464개를 확인(각 variant counter0 fixture에서는 QString 실패0). 이는 실제 population skip/creator limit/초기 counter가 반영된 stage boot 결과가 아니다. 모든238 enum은 counter 자릿수 경계 및 overflow를 별도로 검증했다.

unresolved: 정의되지 않은 int32 enum 값은 FlagsAttribute/숫자 formatting을 추측하지 않고 exact synchronous nativeEnumToString host를 요구한다(선증가 후 명시 오류). managed OOM/format allocation 실패는 시뮬레이션하지 않는다. 실제 runtime 연결과 counter snapshot/외부 transaction은 lead가 담당한다. 기존 QString/Factory/StageDriver/HANDOFF/Git/배포 변경 없음.
