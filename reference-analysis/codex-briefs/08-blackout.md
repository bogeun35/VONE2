# Codex 작업 08: Blackout + BlackoutController

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-blackout-devices.js` (supportedTypes: 'Blackout', 'BlackoutController')
- `source-migration/source-blackout-devices.test.cjs`
- `source-migration/blackout-device-report.json`
- `codex-briefs/08-blackout.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_03_01`, `st_w_07_03`, `st_w_09_01`, `st_w_09_03`, `st_w_15_02`
- opens on its own: none
- opens together with the other briefs: `st_w_07_03`

## Task-specific notes

- Blocks five stages: st_w_03_01, st_w_07_03, st_w_09_01, st_w_09_03, st_w_15_02. Opens none alone, but st_w_07_03 needs only this plus WeightedLift (which Claude is doing).
- The central question, answered with addresses: does Blackout touch the SIMULATION (collision, death, input, events) or only what is visible? If it is visibility only, the module should expose the darkness state for the renderer and must not block the stage.
- BlackoutController authors QPlayerCountParam strings in datas[0] and datas[1] - the grammar is documented in source-landmine-devices.js and source-countup-devices.js.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### Blackout → BlackoutComponent (creator ordinal 97)

```
get_m_SearchLightList       0x1817ce340
set_m_SearchLightList       0x181507200
GetHashCode                 0x1817ce380
ClearPointers               0x1816a28c0
OnRemoved                   0x1817ce440
Serialize                   0x1817ce4e0
SetEntityRef                0x181507220
IsChangeBackgroundColor     0x1816b9080
IsEnableDropCurtain         0x1817ce8e0
SetDownDropCurtain          0x1817ce8f0
IsDownDropCurtain           0x1816cf970
IsExistBlackoutController   0x18170fcd0
SetBlackout                 0x1817ce910
InBlackout                  0x1817ce930
IsBlackoutSuspend           0x1817ce940
Creator                     0x1817ce950
Initialize                  0x1817ceac0
ParseParameter              0x1817ceb20
InitPost                    0x1817cedb0
OnExit                      0x1817cefd0
OnStart                     0x1817cf070
OnUpdate                    0x1817cf1b0
updatePhase                 0x1817cf220
playDropCurtain             0x1817cf750
suspendStage                0x1817cf810
resumeStage                 0x1817cf8b0
startFade                   0x1817cf950
isFade                      0x1817cfa30
OnPost                      0x180476130  (empty)
OnRecvEvent                 0x1817cfaf0
AddSearchLight              0x1817cfba0
CheckAlivePlayer            0x1817cfc80
.cctor                      0x1817cfd30
```
instances: st_w_03_01 ×1, st_w_07_03 ×1, st_w_09_01 ×1, st_w_09_03 ×1, st_w_15_02 ×1

### BlackoutController → BlackoutControllerComponent (creator ordinal 127)

```
GetHashCode                 0x1817cfea0
Serialize                   0x1817cff40
SetEntityRef                0x180538380
SetVisibleUI                0x181698260
IsVisibleUI                 0x181698250
Creator                     0x1817d0170
Initialize                  0x1817d0280
ParseParameter              0x1817d0300
InitPost                    0x180476130  (empty)
OnStart                     0x1817d0590
decideControlPlayer         0x1817d0670
OnUpdate                    0x1817d0740
updatePhase                 0x1817d07c0
waitKey                     0x1817d0bc0
setBlackout                 0x1817d0c10
OnPost                      0x180476130  (empty)
OnRecvEvent                 0x1817d0cd0
.cctor                      0x1817d0d70
```
instances: st_w_07_03 ×1, st_w_15_02 ×1
