# Codex 작업 20 (2차): 스피드 스위치를 무빙월에서 분리

Shared rules: `reference-analysis/AGENTS.md`. Your files (you may edit these):
`source-migration/source-movewall-devices.js`, `source-movewall-devices.test.cjs`,
`movewall-device-report.json`, and write `codex-briefs/20-speedswitch-r2.result.md`.

`st_w_12_03` needs only `SpeedSwitch` and `Wind` (the Wind module already compiles).
Right now your module refuses the whole stage because MoveWall needs the move-contact
routine (brief 17 is reversing that in parallel).

1. Make `compile()` succeed when a stage has SpeedSwitch but no MoveWall. MoveWall may
   keep refusing until brief 17 lands.
2. Write the player speed change as a PURE function the runtime calls on event 57:
   given the player's current speed state and the event payload, return the new walk
   and ice speeds — the clamp to raw 6553..196608 and the InitWalkSpeed recalculation
   you already found, with addresses.
3. Test against st_w_12_03's real SpeedSwitch data for every count 2..8.
