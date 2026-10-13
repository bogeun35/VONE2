# Codex 작업 16: Text

The shared rules are in `reference-analysis/AGENTS.md`. Read it first; this brief
only adds what is specific to this task.

## Deliverables

- edit `source-migration/source-text-devices.js` and `source-migration/source-text-devices.test.cjs` (this task only)
- `source-migration/text-device-report.json`
- `codex-briefs/16-text-report.result.md` when you stop (format in AGENTS.md)

## Why it matters

- stages that use these types: `st_w_02_02`, `st_w_02_04`, `st_w_03_03`, `st_w_03_04`, `st_w_05_04`, `st_w_06_01`, `st_w_09_03`, `st_w_10_03`, `st_w_14_01`, `st_w_15_04`
- opens on its own: none
- opens together with the other briefs: `st_w_03_03`, `st_w_02_02`

## Task-specific notes

- Text is the most common blocker (ten stages) but opens no round on its own.
- A module already exists: source-migration/source-text-devices.js with source-text-devices.test.cjs (17 tests, passing). It has NO report and was never registered. For THIS task only, you may edit those two files.
- Your job: verify every claim in the module header against the binary with tools/disasm.py, correct what is wrong (recording the correction), then write text-device-report.json in the same shape as landmine-device-report.json. The key question for the report: does Text affect the simulation at all, or is it display only?

## Starting addresses

`0x180476130` is a bare `ret` shared by every no-op override; a method at that
address does nothing.

### Text → TextComponent (creator ordinal 79)

```
GetHashCode                 0x18171ab30
Serialize                   0x18171acf0
SetEntityRef                0x180538380
GetEntityRef                0x180491c00
GetCreateParam              0x18171b130
SetLifeTime                 0x180643460
Creator                     0x18171b200
Creator                     0x18171b300
Initialize                  0x180476130  (empty)
ParseParameter              0x18171b4e0
SetParameter                0x18171b8f0
InitPost                    0x180476130  (empty)
OnExit                      0x18171bae0
OnStart                     0x180476130  (empty)
OnUpdate                    0x180476130  (empty)
OnPost                      0x18171bb80
SetText                     0x18171bc30
RequestExit                 0x18171bc90
.cctor                      0x18171bd40
```
instances: st_w_02_02 ×1, st_w_02_04 ×1, st_w_03_03 ×2, st_w_03_04 ×1, st_w_05_04 ×1, st_w_06_01 ×1, st_w_09_03 ×1, st_w_10_03 ×1, st_w_14_01 ×1, st_w_15_04 ×1
