# Codex 작업 14: PlayerMagnet

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-magnet-devices.js` (supportedTypes: 'PlayerMagnet')
- `source-migration/source-magnet-devices.test.cjs`
- `source-migration/magnet-device-report.json`
- `codex-briefs/14-player-magnet.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_03_03`, `st_w_03_04`, `st_w_05_03`
- opens on its own: none
- opens together with the other briefs: `st_w_03_03`, `st_w_05_03`

## Task-specific notes

- Appears in st_w_03_03, st_w_03_04 and st_w_05_03.
- It acts on players, so describe the runtime hook (a velocity or a position change per tick) in `integration`.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### PlayerMagnet → PlayerMagnetComponent (creator ordinal 72)

```
get_m_CandidateList         0x1816cf5f0
set_m_CandidateList         0x181507200
GetHashCode                 0x1816cf630
ClearPointers               0x1816a28c0
OnRemoved                   0x1816cf6e0
Serialize                   0x1816cf780
SetEntityRef                0x181507220
GetEntityRef                0x180ab5e50
IsCallOnUpdate              0x1816cf970
Creator                     0x1816cf980
checkPlayers                0x1816cfbe0
Initialize                  0x1816cfc60
ParseParameter              0x1816cfd90
InitCollision               0x1816cfed0
InitPost                    0x1816cffb0
OnExit                      0x1816d0010
OnStart                     0x1816d00b0
syncPlayerPos               0x1816d0120
OnUpdate                    0x1816d0480
update                      0x1816d05c0
isInputOn                   0x1816d0770
playMagnetSe                0x1816d0840
captureProc                 0x1816d0940
releaseTarget               0x1816d12e0
suckTarget                  0x1816d13e0
getTargetDestPos            0x1816d1ac0
isCatchedRelative           0x1816d1c90
captureTarget               0x1816d1e00
OnPost                      0x1816d20f0
updateParticle              0x1816d21e0
playParticle                0x1816d2360
checkCatch                  0x1816d2450
OnRecvEvent                 0x1816d25e0
OnCollided                  0x1816d27a0
OnMoveByContact             0x1816d2b00
GetTarget                   0x180491c10
.cctor                      0x1816d2be0
<captureProc>g__find|59_0   0x1816d3080
```
instances: st_w_03_03 ×8, st_w_03_04 ×8, st_w_05_03 ×8
