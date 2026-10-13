# Codex 작업 21 (2차): 14-3 쿵쿵 블록 + 플레이어 블록

Shared rules: `reference-analysis/AGENTS.md`. Your files (you may edit these):
`source-migration/source-dossun-devices.js`, `source-dossun-devices.test.cjs`,
`dossun-device-report.json`; you may also CREATE `source-migration/source-playerblock-devices.js`,
`source-playerblock-devices.test.cjs`, `playerblock-device-report.json`;
write `codex-briefs/21-playerblock-r2.result.md`.

Round 1 stopped because PlayerBlockGun's bullet creates a **PlayerBlockComponent**
on the player it hits, and nothing implements that.

```
PlayerBlockComponent.Creator     0x181891200
PlayerBlockComponent.OnUpdate    0x181891730
PlayerBlockComponent.OnCollided  0x181891b70
```

1. Reverse PlayerBlockComponent: what the block is (a solid others can stand on?),
   its box, its lifetime, and what happens to the player it is attached to.
2. Finish the gun: one outstanding bullet per gun, the input edge (logical input 9),
   bullet travel and hit. A bullet is a short-lived actor; model it inside your module
   state rather than as a stage actor, and expose its box through `solids()`/`displays()`.
3. Dossun: you need "Map.Move-derived sensor and collision routing". Implement what
   you can establish; anything that needs the move-contact routine (brief 17, in
   parallel) goes behind a clearly named call the runtime will make.

Goal: st_w_14_03 compiles for every count 2..8.
