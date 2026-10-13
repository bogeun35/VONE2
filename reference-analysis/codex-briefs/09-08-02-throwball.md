# Codex 작업 09: CannonPlayer + ThrowBallBasket + ThrowBallController

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- `source-migration/source-throwball-devices.js` (supportedTypes: 'CannonPlayer', 'ThrowBallBasket', 'ThrowBallController')
- `source-migration/source-throwball-devices.test.cjs`
- `source-migration/throwball-device-report.json`
- `codex-briefs/09-08-02-throwball.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_08_02`, `st_w_08_04`
- opens on its own: `st_w_08_02`, `st_w_08_04`

## Task-specific notes

- These three are ALL that st_w_08_02 and st_w_08_04 lack, so this one brief opens two rounds.
- CannonPlayer is a player variant. Establish whether it replaces the normal player for some party members, and describe the runtime hook in `integration`.

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### CannonPlayer — not in creator-delegates-resolved.local.json; find its creator first

### ThrowBallBasket → ThrowBallBasketComponent (creator ordinal 149)

```
GetHashCode                 0x181726a10
Serialize                   0x181726a70
SetEntityRef                0x181507220
GetEntityRef                0x180ab5e50
Creator                     0x181726c10
Initialize                  0x181726d70
ParseParameter              0x181726e00
InitCollision               0x181726fa0
InitPost                    0x181727270
OnContactAdded              0x1817273b0
IsCleared                   0x1817276e0
.cctor                      0x1817276f0
```
instances: st_w_08_02 ×2..8: 1/1/1/2/3/3/3, st_w_08_04 ×2..8: 1/1/1/2/3/3/3

### ThrowBallController → ThrowBallControllerComponent (creator ordinal 155)

```
get_m_AreaInfoList          0x181728980
set_m_AreaInfoList          0x181507200
get_m_BasketInfoList        0x1817289c0
set_m_BasketInfoList        0x18141fba0
GetHashCode                 0x181728a00
ClearPointers               0x1816e10d0
OnRemoved                   0x181728a80
Serialize                   0x181728b20
SetEntityRef                0x180538380
isActive                    0x181728e80
inactivate                  0x181728e90
Creator                     0x181728eb0
Initialize                  0x181728fa0
ParseParameter              0x1817291b0
InitPost                    0x180476130  (empty)
OnExit                      0x1817292a0
OnStart                     0x180476130  (empty)
OnUpdate                    0x180476130  (empty)
OnPost                      0x181729460
basketProc                  0x181729500
ballProc                    0x181729700
createAreaInfo              0x181729b10
OnRecvEvent                 0x18172a340
AddBasket                   0x18172a410
.cctor                      0x18172a520
```
instances: st_w_08_02 ×1, st_w_08_04 ×1
