# Codex 작업 06: GoKart + Stick

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-gokart-devices.js` (supportedTypes: 'GoKart', 'Stick')
- `source-migration/source-gokart-devices.test.cjs`
- `source-migration/gokart-device-report.json`
- `codex-briefs/06-12-01-gokart-stick.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_12_01`
- opens on its own: `st_w_12_01`

## Task-specific notes

- Opens st_w_12_01 on its own. Note that Stick does not appear at 2 players - check which counts author it.
- StickComponent.ParseParameter is at the SAME address as FakePlayerComponent.ParseParameter (0x1816f93b0): a shared body. Read what it actually stores before assuming Stick has parameters of its own.
- GoKart is likely ridden by players. Describe the runtime hook in `integration`; do not edit the runtime.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### GoKart → GoKartComponent (creator ordinal 173)

```
get_m_PlayerInfos           0x18185bbf0
GetHashCode                 0x18185bc50
Serialize                   0x18185be60
SetEntityRef                0x181507220
GetEntityRef                0x180ab5e50
SetRiding                   0x181698260
IsRiding                    0x181698250
SetStop                     0x181839730
IsStop                      0x181698280
SetDead                     0x18185c310
IsDead                      0x1816982b0
Creator                     0x18185c330
Initialize                  0x18185c650
ParseParameter              0x18185c6e0
InitCollision               0x18185c970
InitPost                    0x18185cc90
OnStart                     0x18185cd00
prepareDrivers              0x18185cdc0
changeDrivers               0x18185d030
ridePlayers                 0x18185d3b0
OnUpdate                    0x18185d6b0
checkFloating               0x18185da10
updatePlayerInfos           0x18185dab0
calcSpeed                   0x18185dfc0
getOff                      0x18185e370
calcGravity                 0x18185ea10
isContactedHead             0x18185eb30
calcJumpVelo                0x18185ebf0
notifyAllPlayerDead         0x18185ece0
OnPost                      0x18185edc0
OnRecvEvent                 0x18185ee30
changeNextDriverIndex       0x18185ef80
OnContactAdded              0x18185f020
.cctor                      0x18185f130
```
instances: st_w_12_01 ×1

### Stick → StickComponent (creator ordinal 224)

```
GetHashCode                 0x18170f630
Serialize                   0x181695760
SetEntityRef                0x180a19170
Creator                     0x18170f650
Initialize                  0x180476130  (empty)
ParseParameter              0x1816f93b0
InitPost                    0x180476130  (empty)
.cctor                      0x18170f870
```
instances: st_w_12_01 ×2..8: 0/0/0/5/5/5/5
