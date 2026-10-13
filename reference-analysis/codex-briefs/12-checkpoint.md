# Codex 작업 12: CheckPoint

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-checkpoint-devices.js` (supportedTypes: 'CheckPoint')
- `source-migration/source-checkpoint-devices.test.cjs`
- `source-migration/checkpoint-device-report.json`
- `codex-briefs/12-checkpoint.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_03_01`, `st_w_07_04`, `st_w_15_01`, `st_w_15_02`
- opens on its own: none

## Task-specific notes

- Appears in four stages: st_w_03_01, st_w_07_04, st_w_15_01, st_w_15_02. Reused a lot, so precision matters.
- The port currently restarts the whole round on any death (source-stage-runtime.js `status: dead`). A checkpoint changes WHERE the party respawns. Establish exactly what is saved (position per player? one shared point?), when it activates, and describe the runtime hook in `integration` - do not edit the restart logic yourself.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### CheckPoint → CheckPointComponent (creator ordinal 3)

```
GetHashCode                 0x1817ed890
Serialize                   0x1817ed8b0
SetEntityRef                0x181507220
Creator                     0x1817ed930
ParseParameter              0x1817eda50
InitCollision               0x1817edba0
OnCollided                  0x1817edc80
.cctor                      0x1817edd70
```
instances: st_w_03_01 ×1, st_w_07_04 ×1, st_w_15_01 ×1, st_w_15_02 ×1
