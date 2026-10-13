# Codex 작업 04: FloatingThorn + PoleLadder

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-pole-devices.js` (supportedTypes: 'FloatingThorn', 'PoleLadder')
- `source-migration/source-pole-devices.test.cjs`
- `source-migration/pole-device-report.json`
- `codex-briefs/04-11-02-floatingthorn-poleladder.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_07_04`, `st_w_11_02`
- opens on its own: `st_w_11_02`

## Task-specific notes

- Opens st_w_11_02 on its own (36 FloatingThorns and one PoleLadder). FloatingThorn is also in st_w_07_04.
- FloatingThornComponent has TWO Creators in the index - find which actor type each one serves before assuming they are the same.
- PoleLadder very likely changes how a player moves (climbing). The module cannot edit the player runtime: expose exactly what the runtime must do in an `integration` export, the way source-landmine-devices.js exposes `p.inputLocked`.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### FloatingThorn → FloatingThornComponent (creator ordinal 126)

```
GetHashCode                 0x181849700
Serialize                   0x181849760
SetEntityRef                0x181507220
GetEntityRef                0x180ab5e50
Creator                     0x181849990
Creator                     0x181849ae0
Initialize                  0x181849ca0
ParseParameter              0x181849cc0
InitCollision               0x181849de0
InitPost                    0x180476130  (empty)
OnStart                     0x180476130  (empty)
OnUpdate                    0x18184a040
OnPost                      0x180476130  (empty)
updateFloating              0x18184a0b0
OnCollided                  0x18184a180
Disappear                   0x18184a220
Resume                      0x18184a330
IsValid                     0x18184a4b0
.cctor                      0x18184a4c0
```
instances: st_w_07_04 ×8, st_w_11_02 ×2..8: 36/30/24/18/18/12/12

### PoleLadder → PoleLadderComponent (creator ordinal 158)

```
GetHashCode                 0x1816da220
Serialize                   0x1816da2b0
SetEntityRef                0x180a19170
Creator                     0x1816da470
Initialize                  0x180476130  (empty)
ParseParameter              0x1816da590
InitCollision               0x1816da750
InitPost                    0x180476130  (empty)
OnStart                     0x1816da860
OnUpdate                    0x1816da8c0
getPosYMin                  0x1816da9a0
getPosYMax                  0x1816da9f0
OnPost                      0x1816daa50
OnCollided                  0x180476130  (empty)
OnRecvEvent                 0x1816dadd0
.cctor                      0x1816dae50
```
instances: st_w_11_02 ×1
