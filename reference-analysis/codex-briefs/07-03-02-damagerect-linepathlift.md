# Codex 작업 07: DamageRect + LinePathLift

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-linepath-devices.js` (supportedTypes: 'DamageRect', 'LinePathLift')
- `source-migration/source-linepath-devices.test.cjs`
- `source-migration/linepath-device-report.json`
- `codex-briefs/07-03-02-damagerect-linepathlift.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_02_04`, `st_w_03_02`, `st_w_03_03`, `st_w_06_02`
- opens on its own: `st_w_03_02`
- opens together with the other briefs: `st_w_03_03`

## Task-specific notes

- Opens st_w_03_02 on its own. LinePathLift is also in st_w_02_04 and st_w_03_03; DamageRect in st_w_03_03 and st_w_06_02.
- KNOWN OBSTACLE: st_w_03_02's LinePathLift authors datas[4] = 2.3335, which is not an exact multiple of 1/65536. The project currently refuses such slots because nobody has established how the stage loader turns an authored float into an FP raw (truncate? round? via float32 or double?). Find the loader path that converts a `t == 1` parameter into the qword ParseParameter reads at `[entry + 0x18]`, and settle it with addresses. This unblocks several other actors project-wide, so it is worth the time even if the module itself ends up partial.
- LinePathLiftComponent.ParseParameter uses Frame.GetPlayerIndexCount, so the path or speed probably scales with the party size.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### DamageRect → DamageRectComponent (creator ordinal 9)

```
GetHashCode                 0x18180dcd0
Serialize                   0x18180dd30
SetEntityRef                0x180a19170
GetEntityRef                0x1807c43b0
Creator                     0x18180dd70
Initialize                  0x180476130  (empty)
ParseParameter              0x18180ded0
InitCollision               0x18180dfc0
InitPost                    0x18180e090
OnStart                     0x18180e0e0
OnUpdate                    0x18180e190
checkDamage                 0x18180e330
OnPost                      0x180476130  (empty)
OnRecvEvent                 0x18180ebf0
.cctor                      0x18180ecf0
```
instances: st_w_03_02 ×2..8: 6/4/4/4/4/4/4, st_w_03_03 ×2, st_w_06_02 ×4

### LinePathLift → LinePathLiftComponent (creator ordinal 103)

```
get_m_FakePathPositions     0x181877bf0
set_m_FakePathPositions     0x1804b3e70
get_m_PathPositions         0x181877c30
set_m_PathPositions         0x1804b3e80
GetHashCode                 0x181877c70
ClearPointers               0x181877dc0
OnRemoved                   0x181877dd0
Serialize                   0x181877e70
SetEntityRef                0x180643460
Creator                     0x1818782b0
Initialize                  0x1818783e0
ParseParameter              0x1818785b0
InitCollision               0x181878b30
InitPost                    0x180476130  (empty)
OnExit                      0x181878c20
OnStart                     0x180476130  (empty)
OnUpdate                    0x181878d00
liftUpdate                  0x181878ed0
fakeLiftUpdate              0x1818794b0
OnPost                      0x180476130  (empty)
OnRecvEvent                 0x1818798e0
MoveLift                    0x18187a110
StopLift                    0x18187a250
calcNeedRideCount           0x18187a280
getRideCount                0x18187a310
isEnableMoveRidingActor     0x18187a380
.cctor                      0x18187a460
```
instances: st_w_02_04 ×1, st_w_03_02 ×1, st_w_03_03 ×1
