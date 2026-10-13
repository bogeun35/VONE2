# Codex 작업 03: MoveWall + SpeedSwitch

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-movewall-devices.js` (supportedTypes: 'MoveWall', 'SpeedSwitch')
- `source-migration/source-movewall-devices.test.cjs`
- `source-migration/movewall-device-report.json`
- `codex-briefs/03-12-04-movewall-speedswitch.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_02_04`, `st_w_12_03`, `st_w_12_04`
- opens on its own: `st_w_12_04`

## Task-specific notes

- Opens st_w_12_04 on its own. SpeedSwitch is also one of the two missing pieces of st_w_12_03 (with Wind), and MoveWall appears in st_w_02_04.
- MoveWall has an InitCollision, so it is probably a solid - say whether it pushes players and what happens to a player caught between it and terrain. SpeedSwitch has OnCollided and OnRecvEvent: find what "speed" it changes and on whom.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### MoveWall → MoveWallComponent (creator ordinal 23)

```
GetHashCode                 0x181885470
Serialize                   0x181885560
SetEntityRef                0x181507220
Creator                     0x181885800
Initialize                  0x181885930
ParseParameter              0x1818859c0
InitCollision               0x181885b70
InitPost                    0x180476130  (empty)
OnStart                     0x180476130  (empty)
OnUpdate                    0x181885cd0
OnPost                      0x180476130  (empty)
OnPushedBack                0x181886080
OnCollided                  0x181886130
setState                    0x1818861c0
.cctor                      0x1818861d0
```
instances: st_w_02_04 ×1, st_w_12_04 ×1

### SpeedSwitch → SpeedSwitchComponent (creator ordinal 96)

```
GetHashCode                 0x181708980
Serialize                   0x1816eecc0
SetEntityRef                0x181507220
Creator                     0x1817089b0
Initialize                  0x180476130  (empty)
ParseParameter              0x181708cc0
OnStart                     0x181708fe0
OnUpdate                    0x181709090
OnPost                      0x180476130  (empty)
OnCollided                  0x181709220
OnRecvEvent                 0x1817092e0
GetSwitch                   0x1817093a0
```
instances: st_w_12_03 ×1, st_w_12_04 ×1
