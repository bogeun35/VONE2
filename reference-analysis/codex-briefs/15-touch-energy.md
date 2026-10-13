# Codex 작업 15: TouchEnergy

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-touchenergy-devices.js` (supportedTypes: 'TouchEnergy')
- `source-migration/source-touchenergy-devices.test.cjs`
- `source-migration/touchenergy-device-report.json`
- `codex-briefs/15-touch-energy.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_02_02`, `st_w_02_04`
- opens on its own: none
- opens together with the other briefs: `st_w_02_02`

## Task-specific notes

- Appears in st_w_02_02 and st_w_02_04.
- Find what "energy" is charged by touching, by whom, and what it notifies when full.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### TouchEnergy → TouchEnergyComponent (creator ordinal 221)

```
get_m_ContactedInfos        0x18172ea30
GetHashCode                 0x18172ea90
Serialize                   0x18172ec20
SetEntityRef                0x181507220
GetEntityRef                0x180ab5e50
IsVisible                   0x18172f170
Creator                     0x18172f180
Initialize                  0x18172f290
ParseParameter              0x18172f350
InitPost                    0x180476130  (empty)
OnStart                     0x180476130  (empty)
OnUpdate                    0x180476130  (empty)
OnPost                      0x18172f880
updateContactedInfos        0x18172f910
checkCloseContact           0x18172fbd0
showHitMark                 0x18172fee0
updateEnergy                0x181730160
.cctor                      0x181730340
<checkCloseContact>g__check|40_00x181730470
```
instances: st_w_02_02 ×1, st_w_02_04 ×1
