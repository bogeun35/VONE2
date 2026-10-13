# Instructions for Codex — 참치파크 (PICO PARK 2 web port)

You are a **teammate**, not the lead. Claude leads this project: it designs the
architecture, reviews your work, registers your module into the runtime, deploys
and commits. You take one task at a time from the queue and hand back a
verified, self-contained module.

## How to take a task

1. The human names one brief file in `codex-briefs/` (for example
   `codex-briefs/08-blackout.md`). Do that one and only that one. Several Codex
   sessions run at the same time, each on a different brief; the briefs are cut so
   that no actor type belongs to two of them.
2. Read that brief, then the "Read first" list below.
3. When finished, write `codex-briefs/<NN-task>.result.md` (format at the bottom)
   and stop. Do not edit `codex-briefs/QUEUE.md` or any other brief — Claude keeps
   the board, and concurrent edits from parallel sessions would collide.
4. If no brief was named, ask which one. Do not pick one yourself.

## Read first

1. `HANDOFF.md` — project rules and the trap list. **Trap #1:**
   `source-migration/assembly-csharp-method-index.json` holds only the Unity VIEW
   layer. Every simulation component is in `source-migration/quantum-method-index.json`.
2. `source-migration/source-landmine-devices.js` + `landmine-device-report.json` —
   the reference module. Copy its shape exactly: a header comment in which every
   constant carries the native address it came from, and a report with
   `verification` and `unresolved`.
3. `source-migration/source-countup-devices.js` — a simpler recent example.

## Tools — read-only static analysis, never run the original game

- `python -I tools/disasm.py 0xADDR ...` — named methods, call targets labelled.
- `python -I tools/disasm.py --raw 0xADDR 300` — code the indexes do not name.
- `python -I source-migration/resolve-string-literals.local.py --cctor 0xADDR` —
  reads the constants a `.cctor` builds with `FP.FromString_UNSAFE`. These were once
  believed unreadable; they are not. Run this before calling any FP constant unknown.
- `source-migration/quantum-field-offsets.json` — field names. Instance struct
  offset = il2cpp offset − 16. Static offsets are used as-is.
- `source-migration/creator-delegates-resolved.local.json` — which component runs
  an actor type. Several types share one component; do not assume names match.
- Stage data:
  ```js
  const s = JSON.parse(fs.readFileSync('source-migration/installed-stage-decoded.local.json'));
  const st = s.stages.find(x => x.stageId === 'st_w_13_04');
  // A stage can ship several variants and the player count picks one:
  const pop = require('./source-migration/population-rules.cjs');
  const actors = pop.actorsForCount(pop.selectVariant(st.json.stageInitParamList, count, true), count);
  // each actor: {typeName, playerCount, posX, posY, name, datas:[{t,f,s}]}  (t=1 float, t=2 string)
  ```
  Never read only `stageInitParamList[0]` — that has produced wrong conclusions here.

## Rules that are not negotiable

- **Never invent a constant.** Every number in the module cites the address it was
  read from. If something cannot be established, `compile()` **throws** with a
  specific message and the report lists it under `unresolved`. A refusal is
  correct; a plausible-looking guess is a defect. If you later find you were wrong,
  record the correction in the report — do not quietly rewrite history.
- FP is 16.16 fixed point. `FP.FromString` / `FP.FromFloat` **truncate** (proved:
  `QFP._0_10` is the inlined raw 6553, not 6554). Accumulate time in integer raws,
  `Math.trunc(dt * 65536)`; one 60 Hz frame is 1092, which is `QFP.OneFrame`.
  Accumulating the float drifts a 0.5 s timer by a whole frame.
- Randomness goes through a seeded PCG32 passed in `compile(..., options)` — copy the
  landmine module's `pcg32` / `rngRange`. Never `Math.random`.
- Module interface, exactly: `compile(actors, count, options)`, `create(compiled)`,
  `solids(state)`, `beforeStep(state, ctx)`, `afterStep(state, ctx)`,
  `displays(state)`, `supportedTypes`. State must survive
  `JSON.parse(JSON.stringify(state))` because the online layer ships it.
- **Create only your new files** (module, test, report, result note). Do not edit
  `source-stage-runtime.js`, `package-source-play.cjs`, `deploy-source-play.cjs`,
  anything under `play/`, any existing module, `HANDOFF.md` or `NEXT-TASKS.md`.
  Claude registers modules; several agents work in this tree at once.
- **Do not commit, push or deploy.** Claude reviews and commits.
- If a module you need from another task does not exist yet, say so in the result
  note instead of writing it yourself.

## Tests

- `node --test source-migration/<your-module>.test.cjs` must pass.
- Assert exact decoded values from the real stage data, exact tick counts, exact
  state transitions. An assertion that is true by construction
  (`assert.ok(n >= 0)`) is worthless — do not write one. A good test fails if the
  behaviour is wrong.
- Run the whole suite too (`node --test source-migration/*.test.cjs`). If a file
  you did not write fails, Claude is probably mid-edit: report it, do not fix it.

## Result note — `codex-briefs/<task>.result.md`

```
# <task> — result
status: done | partial | blocked
files: <the files you created>
tests: <N passing in your file>; full suite: <pass/fail, which files>
what it is: <two or three sentences, plain language, what the device does in the game>
stage compiles alone: <yes/no for 2..8 players, and what else it still needs>
key findings: <the non-obvious facts, each with its address>
unresolved: <everything you refused or could not establish>
```

Write the result note in Korean if you can; the human owner reads Korean.
