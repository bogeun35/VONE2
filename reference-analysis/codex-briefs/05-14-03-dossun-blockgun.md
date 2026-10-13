# Codex 작업 05: Dossun + PlayerBlockGun

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-dossun-devices.js` (supportedTypes: 'Dossun', 'PlayerBlockGun')
- `source-migration/source-dossun-devices.test.cjs`
- `source-migration/dossun-device-report.json`
- `codex-briefs/05-14-03-dossun-blockgun.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_14_01`, `st_w_14_03`
- opens on its own: `st_w_14_03`

## Task-specific notes

- Opens st_w_14_03 on its own. PlayerBlockGun is also in st_w_14_01 (with BreakableRect and Text).
- Dossun is the crushing block. Establish how it decides to fall, its speeds, and whether it kills on contact or only when crushing against terrain.
- PlayerBlockGun is one per player (8 actors): it is probably equipment. If it changes player input or spawns blocks, describe the runtime hook in `integration`.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### Dossun → DossunComponent (creator ordinal 157)

```
GetHashCode                 0x18181c7e0
Serialize                   0x18181c870
SetEntityRef                0x181507220
Creator                     0x18181caf0
Initialize                  0x18181cc20
ParseParameter              0x18181ccc0
InitCollision               0x18181ce90
InitPost                    0x180476130  (empty)
OnStart                     0x18181d000
createSensor                0x18181d070
OnUpdate                    0x18181d350
updatePhase                 0x18181d3c0
OnPost                      0x180476130  (empty)
OnCollided                  0x18181d560
OnContacted                 0x18181d760
.cctor                      0x18181d8e0
```
instances: st_w_14_03 ×1

### PlayerBlockGun → PlayerBlockGunComponent (creator ordinal 161)

```
GetHashCode                 0x181892e40
Serialize                   0x181892ef0
SetEntityRef                0x180538380
GetEntityRef                0x180491c00
GetPlayerIndex              0x1816d9fc0
GetColorIndex               0x1814a0070
Creator                     0x181893050
Initialize                  0x181893290
ParseParameter              0x1818932f0
InitPost                    0x181893490
OnStart                     0x1818934f0
OnUpdate                    0x1818935c0
createBullet                0x1818936e0
OnPost                      0x181893af0
OnRecvEvent                 0x181893b90
syncPlayerPos               0x181893ca0
NotifyBulletDisappeared     0x1816d9ca0
.cctor                      0x181893f80
```
instances: st_w_14_01 ×8, st_w_14_03 ×8
