# Codex 작업 목록

세션 하나에 파일 하나. 각 Codex 세션에 아래 표의 지시문 한 줄을 그대로 붙여넣으면 됩니다.
같은 장치를 두 파일이 나눠 갖지 않으므로 전부 동시에 돌려도 서로 겹치지 않습니다.
끝난 작업은 `NN-작업.result.md` 가 생깁니다. 검토·등록·배포·커밋은 Claude 가 합니다.

| # | 장치 | 혼자 여는 라운드 | Codex 에 붙여넣을 지시 |
|---|---|---|---|
| 01 | FakePlayer, FakeTimer | st_w_13_04 | `reference-analysis/codex-briefs/01-13-04-fake.md 작업을 해줘` |
| 02 | RallyController, RallyMallet | st_w_13_03 | `reference-analysis/codex-briefs/02-13-03-rally.md 작업을 해줘` |
| 03 | MoveWall, SpeedSwitch | st_w_12_04 | `reference-analysis/codex-briefs/03-12-04-movewall-speedswitch.md 작업을 해줘` |
| 04 | FloatingThorn, PoleLadder | st_w_11_02 | `reference-analysis/codex-briefs/04-11-02-floatingthorn-poleladder.md 작업을 해줘` |
| 05 | Dossun, PlayerBlockGun | st_w_14_03 | `reference-analysis/codex-briefs/05-14-03-dossun-blockgun.md 작업을 해줘` |
| 06 | GoKart, Stick | st_w_12_01 | `reference-analysis/codex-briefs/06-12-01-gokart-stick.md 작업을 해줘` |
| 07 | DamageRect, LinePathLift | st_w_03_02 | `reference-analysis/codex-briefs/07-03-02-damagerect-linepathlift.md 작업을 해줘` |
| 08 | Blackout, BlackoutController | - | `reference-analysis/codex-briefs/08-blackout.md 작업을 해줘` |
| 09 | CannonPlayer, ThrowBallBasket, ThrowBallController | st_w_08_02, st_w_08_04 | `reference-analysis/codex-briefs/09-08-02-throwball.md 작업을 해줘` |
| 10 | TargetPlayer, BasketPlayer, AppleController, Apple | st_w_08_03, st_w_08_01 | `reference-analysis/codex-briefs/10-08-01-apple.md 작업을 해줘` |
| 11 | Coin, CoinObserver | - | `reference-analysis/codex-briefs/11-coin.md 작업을 해줘` |
| 12 | CheckPoint | - | `reference-analysis/codex-briefs/12-checkpoint.md 작업을 해줘` |
| 13 | Wind | - | `reference-analysis/codex-briefs/13-wind.md 작업을 해줘` |
| 14 | PlayerMagnet | - | `reference-analysis/codex-briefs/14-player-magnet.md 작업을 해줘` |
| 15 | TouchEnergy | - | `reference-analysis/codex-briefs/15-touch-energy.md 작업을 해줘` |
| 16 | Text | - | `reference-analysis/codex-briefs/16-text-report.md 작업을 해줘` |

Claude 가 직접 하는 것(Codex 에 주지 말 것): Gear, SwitchTargetGroup, WeightedLift, WeightedLiftSingle.

작업 폴더는 `C:\Users\user\projects\VONE2\reference-analysis` 로 열어 주세요 — 그래야 Codex 가
`AGENTS.md` 를 자동으로 읽습니다.
