# Codex 작업 18 (2차): 11-2 봉 사다리 + 떠다니는 가시 마무리

Shared rules: `reference-analysis/AGENTS.md`. Your files (you may edit these):
`source-migration/source-pole-devices.js`, `source-pole-devices.test.cjs`,
`pole-device-report.json`, and write `codex-briefs/18-pole-r2.result.md`.

Round 1 stopped on two things. Finish both.

1. **FloatingThorn's sine table.** You refused Math.sin, correctly. The native uses a
   lookup table — it is DATA in the binary. Find the table the motion code indexes
   (follow the load from FloatingThornComponent.OnUpdate 0x18184a040), read its
   entries out of the file, and use them verbatim. With that, make FloatingThorn
   compile for st_w_11_02 (36 of them) and st_w_07_04.
2. **PoleLadder needs player state 10.** The runtime will host it, so write the
   player-side behaviour as PURE functions the runtime can call each tick, e.g.
   `poleEnter(player, pole)`, `poleStep(player, input, pole) -> {x, y, vx, vy, state}`,
   `poleExit(...)`, from PlayerComponent.OnInitialize_PoleLadder 0x1816c9380 and
   OnUpdate_PoleLadder 0x1816c95b0 (and whatever they call). Test them on their own.
   Describe in `integration` precisely where in the runtime tick they must run.

Goal: `compile()` succeeds for st_w_11_02 at every count 2..8 and the only thing left
is Claude calling your pole functions from the runtime.
