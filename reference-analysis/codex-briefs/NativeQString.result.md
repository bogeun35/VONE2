# NativeQString — result
status: partial (검증된 키 생성·해시·동등성 완료, 미확인 분기 명시적 거부)
files: source-migration/source-native-qstring.js, source-migration/source-native-qstring.test.cjs, source-migration/native-qstring-report.json, codex-briefs/NativeQString.result.md, codex-briefs/작업중-NativeQString.md
tests: 전용 33/33 통과; 전체 1686/1686 통과.

what it is: Actor.Name용 QStringUtf8_32를 실제 바이트 구조로 제공한다. `{bytes:[32개]}`이며 문자열을 자르거나 정규화하지 않는다. FindActor는 빈 키 처리 후 명시적 dictionary host에 조회만 위임하며 Scene 등록·중복명 정책은 구현하지 않았다.

stage compiles alone: 아니오. 문자열 helper이므로 2..8인 플레이 독립 실행 대상이 아니다. 모든 실제 stage variant 이름 691종을 검증했으며 가장 긴 EndlessDeadSwitchCreator1도25바이트다. 리드가 factory/name dictionary에 이 helper를 연결해야 한다.

key findings:
- 총32바이트 = uint16 byteCount + UTF8 payload30바이트. 초과는 ArgumentException, truncate 아님 (.ctor0x18168e770, capacity helper0x181939a90).
- implicit conversion은32바이트를0으로 초기화(0x18168eae6..eaf2); 기존 storage의 nonempty ctor는 미사용 꼬리 바이트 보존(0x18168e806..e83c), empty/null은 전체0(0x18168e854).
- Length는 UTF16 문자 수(GetCharCount0x18168e91c..e93a). 이모지 하나는4바이트/길이2. NUL도 명시적 길이 안의 payload다.
- 기본 UTF8 encoder는 잘못된 UTF16 surrogate를 U+FFFD로 교체한다. UTF8Encoding.SetDefaultFallbacks0x1812bfc30..bfcd6, 두 fallback literal slot0x1831cb728의 실제 metadata bytes EF BF BD 확인.
- typed Equals는 길이 제한 바이트 비교(0x18168ec40→0x181939ce0); 해시는 int32 `h=31*h+unsignedByte`, 마지막 `(byteCount+2201)*31+h`(0x18168ed10..ed32). 꼬리 무시, casefold/normalize 없음.
- Scene.FindActor(QString)0x1816a7b80: 빈 키→null, ContainsKey→get_Item→Frame.GetActor. ContainsKey의 QString hash 직접 호출도 확인(0x180033b9b).

API: `fromString`, `constructInto`, `fromBytes`, `byteCount`, `payload`, `toString`, `length`, `equals`, `getHashCode`, `compareOrdinal`, `isFindActorKey`, `findActor`. Browser global은 `SourceNativeQString`.

unresolved:
- 손상된 raw UTF8의 decoder fallback grouping 미확인: toString/length/FindActor는 명시적으로 throw. raw hash/동등성은 사용 가능. fromString으로 생성한 키는 유효한 UTF8이다.
- 서로 다른 바이트에서 ordinal 반환값의 정확한 크기는 external MemCmp 내부호출이므로 추정하지 않음. compareOrdinal은 이때 `host.compareBytes` 요구. 동등성·공통 prefix 길이 차이는 host 없이 제공.
- Equals(object) 박싱/string 분기, serialization, QString64/128 범위 밖. Scene 등록·unique-name/lifecycle은 리드 소유.

동결: 기존 모듈/runtime/play/HANDOFF/Git 수정 없음. 위 신규 파일만 생성.
