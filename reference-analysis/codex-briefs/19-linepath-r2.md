# Codex 작업 19 (2차): 3-2 선로 리프트 + 피해 사각형 마무리

Shared rules: `reference-analysis/AGENTS.md`. Your files (you may edit these):
`source-migration/source-linepath-devices.js`, `source-linepath-devices.test.cjs`,
`linepath-device-report.json`, and write `codex-briefs/19-linepath-r2.result.md`.

Your round-1 discovery (stage float → string → FP.FromString) has been checked by
Claude against the binary and is now an established fact in AGENTS.md. Use it: the
"not a multiple of 1/65536" refusal no longer applies.

Finish both devices so st_w_03_02 compiles for every count 2..8:

1. **LinePathLift** — path points, per-count speed (your raws 262144/196608/152928...),
   travel and how riders are carried. If carrying needs the move-contact routine
   (brief 17 is reversing it in parallel), implement everything else and expose the
   carry as a clearly named call the runtime makes; do not block on brief 17.
2. **DamageRect** — you found it sends event **43**, not 19, and that OnStart disables
   its collision. Establish: what turns it on, who receives event 43, and what
   PlayerComponent does with 43 (PlayerComponent.OnRecvEvent 0x1816c1080; the
   TouchEnergy report calls 43 "QuakeDead"). Is it a death, and does an immortal
   player survive it? Put the answer, with addresses, in the report — three modules
   depend on it.
