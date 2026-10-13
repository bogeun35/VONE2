# Codex 작업 13: Wind

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-wind-devices.js` (supportedTypes: 'Wind')
- `source-migration/source-wind-devices.test.cjs`
- `source-migration/wind-device-report.json`
- `codex-briefs/13-wind.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_02_04`, `st_w_07_01`, `st_w_09_04`, `st_w_12_03`
- opens on its own: none

## Task-specific notes

- Appears in four stages: st_w_02_04, st_w_07_01, st_w_09_04, st_w_12_03. st_w_12_03 needs only this plus SpeedSwitch.
- WindComponent.ForTopView exists (0x1816b9080). Top-view stages are not ported yet and `StageComponent.IsTopViewSort` was never found being set (see switch-direction-report.json). Implement the side-view behaviour and refuse the top-view path rather than guess it.
- Wind pushes players, so it changes velocity. Express that as a force the runtime applies, through `integration`.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### Wind → WindComponent (creator ordinal 77)

```
GetHashCode                 0x181738610
Serialize                   0x181738680
SetEntityRef                0x181507220
IsStrong                    0x1816f2970
SetStrong                   0x1816f2950
ForTopView                  0x1816b9080
Creator                     0x181738820
Initialize                  0x181738a00
ParseParameter              0x181738a70
InitCollision               0x181738cc0
InitPost                    0x181738e70
OnRecvEvent                 0x181738ef0
OnCollided                  0x181738ff0
.cctor                      0x1817390c0
```
instances: st_w_02_04 ×1, st_w_07_01 ×2, st_w_09_04 ×1, st_w_12_03 ×1
