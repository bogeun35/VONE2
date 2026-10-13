# Codex 작업 11: Coin + CoinObserver

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-coin-devices.js` (supportedTypes: 'Coin', 'CoinObserver')
- `source-migration/source-coin-devices.test.cjs`
- `source-migration/coin-device-report.json`
- `codex-briefs/11-coin.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_05_01`, `st_w_05_03`
- opens on its own: none
- opens together with the other briefs: `st_w_05_01`, `st_w_05_03`

## Task-specific notes

- Part of st_w_05_01 (which also needs WeightedLift) and st_w_05_03 (which also needs PlayerMagnet). Opens nothing alone, but both rounds are close.
- Find what the observer counts, against what threshold (and whether it scales with the party), and what it notifies on success.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### Coin → CoinComponent (creator ordinal 4)

```
GetHashCode                 0x1817f2750
Serialize                   0x181695760
SetEntityRef                0x180a19170
GetEntityRef                0x1807c43b0
Creator                     0x1817f2770
InitCollision               0x1817f29a0
InitPost                    0x180476130  (empty)
OnStart                     0x1817f2a80
OnUpdate                    0x180476130  (empty)
OnPost                      0x180476130  (empty)
OnCollided                  0x1817f2b50
.cctor                      0x1817f2c80
```
instances: st_w_05_01 ×58, st_w_05_03 ×75

### CoinObserver → CoinObserverComponent (creator ordinal 5)

```
get_m_CoinList              0x1817f2ed0
set_m_CoinList              0x181507200
GetHashCode                 0x1817f2f10
ClearPointers               0x1816a28c0
OnRemoved                   0x1817f2f30
Serialize                   0x1817f2fb0
SetEntityRef                0x181507220
Creator                     0x1817f30b0
Initialize                  0x1817f32a0
OnExit                      0x1817f33b0
OnStart                     0x180476130  (empty)
OnUpdate                    0x1817f3430
OnPost                      0x180476130  (empty)
AddCoin                     0x1817f3540
RemoveCoin                  0x1817f3600
```
instances: st_w_05_01 ×1, st_w_05_03 ×1
