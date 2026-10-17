# PlayerWarpGun 결과
상태: partial — 출하 장치 코어 구현·검증 완료, host Actor/충돌query/65·66/렌더 통합 대기
담당: 보조 세션3 (01a13559-c00c-7060-b3b1-0466fccc7349)
전용25/25 통과, 전체928/928 통과 (2026-10-14).

## 출하 compile과 생성
실제5-4 전2..8 variant의 총8개를 읽고 존재하는player actorindex에 해당하는 총만 compile합니다. 결과는 각각2..8개입니다. slot0이index0..7이며 Creator0x1816d91c0/c7가actor생성 전에 IsExistPlayerByActorIndex를 검사합니다. 옵션playerActorIndexes는native비연속index존재목록을 제공합니다.

Parse0x1816d92c0가player entity/color/index를복사하고 Equip/SetHoldGun(true)를호출합니다. firstbeforeStep의effects는호스트가처리할장착목록입니다. 총InitPost flagsOR0xa80, OnStart는syncPlayerPos를호출하며 OnPost도활성총만동기화합니다. ownerPos에direction×scale×(20,-10)을더합니다. Left/invertY와sorting+1도네이티브경로대로기록했습니다.

실제프리팹 PlayerWarpGun1778/PlayerWarpGunBullet2578과자손까지정적추출했습니다. serialized장치component가없습니다. PlayerColorController/GameAnimator/SortingGroup/SpriteRenderer등view자손만있습니다. 정확한Actor scale/fullflags/priority는호스트값이므로추정default를넣지않았습니다. 숫자오프셋·속도는nativecctor에서읽었습니다.

## 탄환 state와 수명
Input9의native IsPressInput edge가true이고총Actor비활성bit3이없으며탄환ref가없을때발사합니다. edge에는Player state/enable 및stageinputmode가포함되므로단순held버튼으로대체하면안됩니다. muzzle은총Pos+(gunDirection×gunScale×(10,-7)),velocityX=gunDirectionX×gunScale×6,velocityY=0입니다. ownerLook/invertY에따라부호를변경합니다.

탄환은고유ID·gunID·position·velocity·direction·player/colorindex·10×10rect·소멸상태·타이머·삭제요청을JSONstate로보관합니다. 이동은nativeActor공통파이프라인이actorMotionRequests를적용하고bulletActorStates로반환합니다. velocity×dt를임의적분하거나AABB충돌을만들지않았습니다. 실제movement연결은아직host작업입니다.

충돌시먼저requestDisappear: velocity0,collisionflagbit0,Actor.proc2,소멸timer32768(0.5초). 1092raw에서30틱후8raw남고31틱에삭제요청합니다. 총의탄환ref는OnExit통보때만clear하여그뒤새edge로재발사합니다. 소멸요청/충돌순간에재발사허용하지않습니다. 화면밖삭제는X만검사하고 [left−10,right+10) 범위입니다.

## 캡처와 해제
첫충돌은type7(Box) 또는27(Player)를캡처합니다. 자기playerindex27은제외합니다. targetevent65를동기실행하고SetTarget의event30(index+1조회)을동기실행해총색상을계산합니다. unsupported/null대상도탄환은소모하며target은null입니다.

총이target을가지고쏜다음탄환충돌은해제입니다. target GetRect와contact normal로upper후lower두후보를만듭니다. normalX>0이면bullet왼쪽에−1픽셀gap,그외오른쪽+1gap. 위쪽Y=bulletY−1−rectY−height,아래쪽후보=위쪽Y+2+height입니다. OnCollided normal은velocity0설정전실제Xvelocity부호이며0은+1입니다.

각후보는nativeCollisionScene.IsCollidedByPushBackTarget0x1817f73b0 mask3조회가필요합니다. 이함수는map contact와activecollisionlist/layercheck/pre+currentcollision을사용합니다. releaseQueries에targetID/정확한후보좌표/mask3/실제blocked결과가없으면거부합니다. firstclear이면secondquery불필요,firstblocked/secondclear이면lower해제,둘다blocked이면target을유지합니다. 성공시event66.position을호스트에동기전달하고target을clear합니다. 호스트는trialcollision current/pre좌표와flag6수정·실패restore를native순서대로수행해야합니다.

## 공통 계약과 제한
dispatchActorEvent는65/66의실제Player/Box/commonhandler를동기실행하고30의int32응답을반환해야합니다. 반환events는감사목록이므로다시dispatch하면안됩니다. Playercapturedstate/collision/velocity구현을중복하지않았습니다. OnRecvEvent30/41/54의response/색상refresh/param증가는export된onRecvEvent로처리하고다른event는commonActor에연결합니다. 53은resolvedpausedGunIds/pausedBulletIds가필요합니다.

beforeStep/afterStep는본인state를clone하여성공후commit하지만동기dispatcher의host부작용은호스트전체frame transaction에서rollback해야합니다. direct contact/setTarget export는native변경순서를따르므로확인된facts또는callertransaction이필수입니다.

compile성공·진단queryfacts·단위테스트를실제playable로주장하지않습니다. Actor movement/creation/deletion/충돌cache/query/Player65·66/renderer및원작병행검수는남아있습니다. completePhysicsFidelity=false입니다.

## 파일 및 다음 연결
신규고유파일: source-migration/source-playerwarpgun-devices.js/.test.cjs, playerwarpgun-device-report.json, playerwarpgun-native.local.txt(기존81KB역어셈블재사용), extract-playerwarpgun-prototype.local.py, playerwarpgun-prototype-evidence.json; 이결과노트와작업중-PlayerWarpGun.md.
추출기는bundledPython3.12 -I -B +기존cp312UnityPy를읽기만하며원작실행없음. 모든명령cwd=C:\Users\user\projects\VONE2\reference-analysis.
전용: node --test source-migration/source-playerwarpgun-devices.test.cjs
전체: node --test source-migration/*.test.cjs

네이티브주소·fields·분기와자세한정정이력은JSONreport에보존했습니다. 다음은리드의host계약연결/실제5-4플레이검수입니다. frozenSearchLight/DistanceConstraint/UpDownLift,기존PlayerBlockGun/ThrowBall/commonruntime/Git/배포는변경하지않았습니다.
