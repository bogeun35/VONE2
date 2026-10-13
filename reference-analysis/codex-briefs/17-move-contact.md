# Codex 작업 17 (2차): 원작의 "올라탄 것 같이 옮기기" 함수 역공학

Shared rules: `reference-analysis/AGENTS.md` (read it, including "Established facts").

## Why this one matters most

Several devices are refused today for the same reason: the original moves whatever
stands on (or is pushed by) a moving body through ONE engine routine, and nobody has
reversed it. Without it a moving platform either leaves its riders behind or pushes
them through ceilings, so the port refuses rather than guess. It currently blocks:

- vertical `WeightedLiftEx` (6 actors) and every `WeightedLiftSingle` (3) — see
  `source-migration/source-lift-devices.js` `unresolved.verticalTravel`
- `MoveWall` in st_w_12_04 and st_w_02_04 — see `source-movewall-devices.js`
  `integration.motion` (it asks for exactly `isEnableMoveContactActor` / `moveContactActor`)
- probably `Dossun` and the GoKart passengers too

## Addresses

```
ActorComponent.IsEnableMoveContactActor  0x1816a15c0
ActorComponent.MoveContactActor          0x1816a0980 / 0x1816a0a70 / 0x1816a0b70 / 0x1816a0c50  (four overloads)
ActorComponent.GetMoveContactOption      0x18169dc90
ActorComponent statics: s_MoveContactActorList, s_MoveContactOption, MOVE_CONTACT_OPTION_DEFAULT
WeightedLiftComponent.MoveLift           0x181738170   (a caller: 0x1817383cb, 0x1817383fc, 0x181738448)
```

## Deliverables (all new files)

- `source-migration/source-move-contact.js` — a PURE helper, no device of its own:
  `isEnableMoveContactActor(world, mover, direction, option)` and
  `moveContactActor(world, mover, delta, option)` that operate on plain AABB data
  (`{id, x, y, w, h, solid, layer, ...}`) and return what moved and by how much.
  Model the recursion (a rider on a rider), the contact faces, the option flags and the
  ceiling check exactly as the native does, with addresses.
- `source-migration/source-move-contact.test.cjs` — include: a rider is carried up; a
  rider is NOT carried through a ceiling (and say what the native does instead —
  refuse the move, crush, or stop); a stack of two riders; a horizontal push.
- `source-migration/move-contact-report.json`
- `codex-briefs/17-move-contact.result.md`

Do NOT edit the lift or movewall modules. Say in the report exactly how each of them
should call your helper; Claude will wire it.
