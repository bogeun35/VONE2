'use strict';
// Verifies the ThornCeiling / DummyRect port against the real st_w_11_04 actor
// data decoded out of the installed game. No native code is executed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Terrain = require('./terrain-runtime.js');
const ThornCeiling = require('./source-thorn-ceiling-devices.js');

const HERE = __dirname;
const source = JSON.parse(fs.readFileSync(path.join(HERE, 'installed-stage-decoded.local.json'), 'utf8'));
const geometry = JSON.parse(fs.readFileSync(path.join(HERE, 'source-geometry.local.json'), 'utf8'));
const STAGE = 'st_w_11_04';
const F = 65536;
const COUNTS = [2, 3, 4, 5, 6, 7, 8];

const terrainFor = (count) => Terrain.createTerrain({ source, geometry, count, stageId: STAGE });
const compileFor = (count) => ThornCeiling.compile(terrainFor(count).actors, count);

// Independently decoded expectations, straight from the two source actors.
// datas[4] firstSafeZoneCount, [5] finalSafeZoneCount, [6] firstTrapRate,
// [11] trapMaxCount, [12] finalTrapRate, [13] hitPoint, for counts 2..8.
const EXPECT = {
  // variant 1 (needPlayerCount 0) is selected for 2..4 players
  small: {
    x: 312, y: 120, ceilingWidth: 13, avoidTime: 30, thornSpeed: 3, thornWaitTime: 3,
    maxDistanceFromPrevSafeZone: 3, targetName: 'Key1',
    firstSafeZoneCount: [3, 4, 5, 6, 7, 8, 9],
    finalSafeZoneCount: [1, 1, 2, 2, 2, 3, 3],
    firstSafeZoneTrapRate: [60, 60, 60, 60, 60, 60, 60],
    finalSafeZoneTrapRate: [100, 100, 100, 100, 100, 100, 100],
    safeZoneTrapMaxCount: [2, 3, 4, 5, 6, 6, 6],
    hitPoint: [1, 1, 2, 2, 3, 3, 3]
  },
  // variant 0 (needPlayerCount 5) is selected for 5..8 players
  large: {
    x: 120, y: 120, ceilingWidth: 21, avoidTime: 30, thornSpeed: 3, thornWaitTime: 5,
    maxDistanceFromPrevSafeZone: 3, targetName: 'Key1',
    firstSafeZoneCount: [3, 4, 5, 7, 8, 9, 10],
    finalSafeZoneCount: [1, 1, 2, 3, 3, 4, 4],
    firstSafeZoneTrapRate: [60, 60, 60, 60, 60, 60, 60],
    finalSafeZoneTrapRate: [100, 100, 100, 100, 100, 100, 100],
    safeZoneTrapMaxCount: [2, 3, 4, 5, 5, 6, 6],
    hitPoint: [1, 1, 2, 2, 2, 3, 3]
  }
};
const expectFor = (count) => (count >= 5 ? EXPECT.large : EXPECT.small);

// Both tables hold the FP quantisation of 0.4, i.e. 26214 / 65536.
const TRAP_WAIT_FP = 26214;

test('st_w_11_04 only needs ThornCeiling and DummyRect from this module', () => {
  const types = new Set(terrainFor(4).actors.map((a) => a.typeName));
  for (const type of ThornCeiling.supportedTypes) assert.ok(types.has(type), 'missing ' + type);
  assert.deepEqual(ThornCeiling.supportedTypes.slice().sort(), ['DummyRect', 'ThornCeiling']);
});

test('compile decodes every ParseParameter slot for 2..8 players', () => {
  for (const count of COUNTS) {
    const compiled = compileFor(count);
    const want = expectFor(count);
    const i = count - 2;
    assert.equal(compiled.schemaVersion, 1);
    assert.equal(compiled.count, count);
    assert.equal(compiled.ceilings.length, 1, count + 'p ceiling count');
    assert.deepEqual(compiled.warnings, [], count + 'p warnings');
    const c = compiled.ceilings[0];
    assert.equal(c.x, want.x);
    assert.equal(c.y, want.y);
    assert.equal(c.ceilingWidth, want.ceilingWidth);
    assert.equal(c.avoidTime, want.avoidTime);
    assert.equal(c.thornSpeed, want.thornSpeed);
    assert.equal(c.thornWaitTime, want.thornWaitTime);
    assert.equal(c.maxDistanceFromPrevSafeZone, want.maxDistanceFromPrevSafeZone);
    assert.equal(c.targetName, want.targetName);
    assert.equal(c.firstSafeZoneCount, want.firstSafeZoneCount[i], count + 'p firstSafeZoneCount');
    assert.equal(c.finalSafeZoneCount, want.finalSafeZoneCount[i], count + 'p finalSafeZoneCount');
    assert.equal(c.firstSafeZoneTrapRate, want.firstSafeZoneTrapRate[i]);
    assert.equal(c.finalSafeZoneTrapRate, want.finalSafeZoneTrapRate[i]);
    assert.equal(c.safeZoneTrapMaxCount, want.safeZoneTrapMaxCount[i]);
    assert.equal(c.hitPointMax, want.hitPoint[i], count + 'p hitPointMax');
    assert.equal(c.firstSafeZoneTrapWaitTimeFp, TRAP_WAIT_FP);
    assert.equal(c.finalSafeZoneTrapWaitTimeFp, TRAP_WAIT_FP);
    // The HP bar sits at UI_POS_Y_2 only when the maximum is exactly one.
    assert.equal(c.ui.y, c.hitPointMax === 1 ? 440 : 460);
    assert.equal(c.ui.scale, 7);
    // Every ceiling in the shipped stage enables retry-on-death.
    assert.equal(compiled.stageFlags.enableRetryByPlayerDead, true);
  }
});

test('the 48 pixel column pitch lands every column in a map chip centre', () => {
  for (const count of COUNTS) {
    const t = terrainFor(count);
    const c = compileFor(count).ceilings[0];
    for (let column = 0; column < c.ceilingWidth; column++) {
      const x = c.x + 48 * column;
      assert.equal((x - 24) % 48, 0, count + 'p column ' + column + ' is off grid');
      assert.ok(x > 0 && x < t.width, count + 'p column ' + column + ' is outside the map');
    }
    // The run of columns exactly fills the gap between the stage side walls.
    const span = 48 * c.ceilingWidth;
    assert.equal(span, count >= 5 ? 1008 : 624);
  }
});

test('DummyRect compiles to an inert marker with no behaviour', () => {
  for (const count of COUNTS) {
    const compiled = compileFor(count);
    assert.equal(compiled.dummyRects.length, 1, count + 'p DummyRect count');
    const d = compiled.dummyRects[0];
    assert.equal(d.type, 'DummyRect');
    assert.equal(d.name, 'DummyRect1');
    assert.equal(d.behaviour, 'none');
    assert.equal(d.y, 120);
    assert.equal(d.x, count >= 5 ? 48 : 192);
    // The two authored numbers are preserved verbatim and interpreted nowhere.
    assert.deepEqual(d.datas.slice(0, 6), count >= 5 ? [1088, 126, 0, 0, 0, 0] : [800, 126, 0, 0, 0, 0]);
  }
  assert.equal(ThornCeiling.dummyRect.behaviour, 'none');
  assert.equal(ThornCeiling.dummyRect.enumOrdinal, 115);
  // A DummyRect on its own produces nothing at all.
  const only = ThornCeiling.compile(
    [{ typeName: 'DummyRect', name: 'DummyRect1', posX: 192, posY: 120, playerCount: 0, createThreshold: 0, datas: [{ t: 1, f: 800 }, { t: 1, f: 126 }] }], 4);
  assert.equal(only.ceilings.length, 0);
  const state = ThornCeiling.create(only);
  assert.deepEqual(ThornCeiling.solids(state), []);
  assert.deepEqual(ThornCeiling.hazards(state), []);
  const result = ThornCeiling.afterStep(state, { dt: 1 / 60, players: [] });
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.deadPlayerIds, []);
  assert.deepEqual(result.hazards, []);
});

test('the difficulty ramp is the native ten step staircase over nine', () => {
  const c = { phase: 2, avoidTimeFp: 30 * F, thornWaitTimeFp: 3 * F };
  // Fresh into the avoid phase: timer == avoidTime so no progress at all.
  assert.equal(ThornCeiling.progressFp({ ...c, timerFp: 30 * F }), 0);
  // Exactly halfway: floor(10 * 0.5) = 5 steps of one ninth.
  assert.equal(ThornCeiling.progressFp({ ...c, timerFp: 15 * F }), Math.trunc(5 * F / 9));
  // Nine steps is exactly full progress.
  assert.equal(ThornCeiling.progressFp({ ...c, timerFp: 3 * F }), F);
  // The last thornWaitTime + 1 seconds are pinned to full progress.
  assert.equal(ThornCeiling.progressFp({ ...c, timerFp: 3.5 * F }), F);
  assert.equal(ThornCeiling.progressFp({ ...c, timerFp: 4.5 * F }), Math.trunc(8 * F / 9));
  // Phase zero is always flat, whatever the timer says.
  assert.equal(ThornCeiling.progressFp({ ...c, phase: 0, timerFp: 0 }), 0);
});

test('the parameter lerps round half up and keep the FP wait unrounded', () => {
  assert.equal(ThornCeiling.lerpRound(5, 1, 0), 5);
  assert.equal(ThornCeiling.lerpRound(5, 1, F), 1);
  // 5 -> 1 at one half is exactly 3.
  assert.equal(ThornCeiling.lerpRound(5, 1, F / 2), 3);
  // 60 -> 100 at one ninth is 64.44, which rounds down.
  assert.equal(ThornCeiling.lerpRound(60, 100, Math.trunc(F / 9)), 64);
  // 5 -> 2 at one third is 4.0 - but the FP third is a hair under, so still 4.
  assert.equal(ThornCeiling.lerpRound(5, 2, Math.trunc(3 * F / 9)), 4);
  assert.equal(ThornCeiling.lerpFp(TRAP_WAIT_FP, TRAP_WAIT_FP, F / 2), TRAP_WAIT_FP);
  assert.equal(ThornCeiling.lerpFp(0, F, F / 4), F / 4);
});

test('the PCG32 range helper is deterministic and excludes its upper bound', () => {
  const rng = { state: 0x853c49e6748fea9bn, inc: 0xda3e39cb94b95bdbn };
  const first = [ThornCeiling.pcg32(rng), ThornCeiling.pcg32(rng), ThornCeiling.pcg32(rng)];
  for (const v of first) assert.ok(Number.isInteger(v) && v >= 0 && v <= 0xffffffff);
  const again = { state: 0x853c49e6748fea9bn, inc: 0xda3e39cb94b95bdbn };
  assert.deepEqual([ThornCeiling.pcg32(again), ThornCeiling.pcg32(again), ThornCeiling.pcg32(again)], first);
  assert.equal(ThornCeiling.rngRange({ state: 1n, inc: 1n }, 4, 4), 4);
  const r = { state: 0x853c49e6748fea9bn, inc: 0xda3e39cb94b95bdbn };
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = ThornCeiling.rngRange(r, 0, 5);
    assert.ok(v >= 0 && v <= 4, 'draw ' + v + ' escaped [0,5)');
    seen.add(v);
  }
  assert.equal(seen.size, 5, 'every value below the bound should appear');
});

test('every generated row honours the safe zone, reachability and trap rules', () => {
  for (const count of COUNTS) {
    const compiled = compileFor(count);
    const c = compiled.ceilings[0];
    for (const seed of [1n, 0x853c49e6748fea9bn, 0xdeadbeefcafen]) {
      const state = ThornCeiling.create(compiled, { rngState: seed, rngIncrement: 0xda3e39cb94b95bdbn });
      const live = state.ceilings[0];
      let previousSafe = null;
      for (let row = 0; row < 40; row++) {
        // Walk the ramp by hand so every row sees a different progress value.
        live.phase = row === 0 ? 0 : 2;
        live.timerFp = Math.round((c.avoidTimeFp * (40 - row)) / 40);
        for (const thorn of live.thorns) { thorn.active = false; thorn.phase = 0; }
        const set = ThornCeiling.createThornSet(state, live);
        assert.ok(set, count + 'p row ' + row + ' produced nothing');
        const want = ThornCeiling.lerpRound(c.firstSafeZoneCount, c.finalSafeZoneCount, Math.round(set.progress * F));

        // Safe zones never exceed the lerped quota, and a column is only
        // dropped from the quota when the reachability rule forbids it.
        assert.ok(set.safeColumns.length <= want,
          count + 'p row ' + row + ' has ' + set.safeColumns.length + ' safe zones, quota ' + want);
        if (previousSafe) {
          for (const column of set.safeColumns) {
            const nearest = Math.min(...previousSafe.map((p) => Math.abs(p - column)));
            assert.ok(nearest <= c.maxDistanceFromPrevSafeZone,
              count + 'p row ' + row + ' safe column ' + column + ' is ' + nearest + ' from the previous row');
          }
        }
        // Traps only ever sit inside safe zones, never adjacent to each other,
        // and never more than m_SafeZoneTrapMaxCount of them.
        assert.ok(set.trapColumns.length <= c.safeZoneTrapMaxCount, count + 'p row ' + row + ' trap budget');
        for (const column of set.trapColumns) {
          assert.ok(set.safeColumns.includes(column), 'trap outside a safe zone');
          assert.ok(!set.trapColumns.includes(column - 1) && !set.trapColumns.includes(column + 1),
            count + 'p row ' + row + ' has adjacent traps at ' + column);
        }
        // A column gets a thorn when it is not safe, or when it is a trap.
        const expectThorns = c.ceilingWidth - set.safeColumns.length + set.trapColumns.length;
        assert.equal(set.thorns.length, expectThorns, count + 'p row ' + row + ' thorn count');
        for (const thorn of set.thorns) {
          assert.equal(thorn.x, c.x + 48 * thorn.column);
          if (thorn.trap) {
            // 0x18171f52c / 0x18171f528: one chip higher and the longer wait.
            assert.equal(thorn.y, c.y - 48);
            assert.ok(thorn.wait > c.thornWaitTime || row === 0);
          } else {
            assert.equal(thorn.y, c.y);
          }
        }
        previousSafe = set.safeColumns;
      }
    }
  }
});

test('the first row uses START_WAIT_TIME and the widest gap set', () => {
  const compiled = compileFor(4);
  const c = compiled.ceilings[0];
  const state = ThornCeiling.create(compiled, { rngState: 7n });
  const set = ThornCeiling.createThornSet(state, state.ceilings[0]);
  assert.equal(set.progress, 0);
  assert.equal(set.safeColumns.length <= c.firstSafeZoneCount, true);
  for (const thorn of set.thorns) if (!thorn.trap) assert.equal(thorn.wait, 5);
});

// --------------------------------------------------------------- live run
// Player collision rect from player-runtime-schema.json: 32 x 46 with the
// anchor at the feet, so the box top is 47 above and the bottom 1 above it.
function playersOnFloor(count, terrain) {
  return terrain.actors.filter((a) => a.typeName === 'Player').slice(0, count)
    .map((a, i) => ({ id: 'p' + i, x: a.x - 16, y: a.y - 47, w: 32, h: 46, dead: false, exit: false }));
}

function run(count, { ticks, seed = 0x853c49e6748fea9bn, players: override } = {}) {
  const terrain = terrainFor(count);
  const compiled = ThornCeiling.compile(terrain.actors, count);
  const state = ThornCeiling.create(compiled, { rngState: seed });
  const players = override ? override(terrain) : playersOnFloor(count, terrain);
  const ctx = { dt: 1 / 60, players, platforms: terrain.platforms, width: terrain.width, height: terrain.height };
  const events = [];
  const dead = [];
  let firstDeadTick = -1;
  for (let tick = 0; tick < ticks; tick++) {
    ThornCeiling.beforeStep(state, ctx);
    const result = ThornCeiling.afterStep(state, ctx);
    events.push(...result.events);
    if (result.deadPlayerIds.length) {
      if (firstDeadTick < 0) firstDeadTick = tick;
      for (const id of result.deadPlayerIds) {
        dead.push({ id, tick });
        const p = players.find((q) => q.id === id);
        if (p) p.dead = true;
      }
    }
  }
  return { terrain, compiled, state, players, events, dead, firstDeadTick };
}

test('nobody is harmed while the first row waits out START_WAIT_TIME', () => {
  for (const count of COUNTS) {
    // 300 ticks is exactly the five native seconds the first row hangs for.
    const { state, dead, events, players } = run(count, { ticks: 300 });
    assert.deepEqual(dead, [], count + 'p lost a player before the first row fell: ' + JSON.stringify(dead));
    assert.equal(events.length, 0, count + 'p produced events during the wait');
    const [status] = ThornCeiling.status(state);
    assert.equal(status.hitPoint, status.hitPointMax, count + 'p lost hit points');
    // The spawned player boxes are nowhere near the ceiling itself.
    for (const p of players) assert.ok(p.y > 400, count + 'p spawn is suspiciously high');
  }
});

test('a motionless player in the thorn run is only hit once the row falls', () => {
  // This is the mechanic, not a bug: the floor spawn sits inside the column run
  // and the gaps have to be walked into. The first contact must land after the
  // five second wait plus the fall, never at spawn time.
  for (const count of COUNTS) {
    const { firstDeadTick, compiled } = run(count, { ticks: 60 * 12 });
    const fallTicks = Math.ceil((624 - 47 - (120 + 18)) / (compiled.ceilings[0].thornSpeed ** 2));
    assert.ok(firstDeadTick >= 300, count + 'p was hit at tick ' + firstDeadTick + ', before the wait ended');
    assert.ok(firstDeadTick <= 300 + fallTicks + 2,
      count + 'p was hit at tick ' + firstDeadTick + ', expected about ' + (300 + fallTicks));
  }
});

test('a hazard box never overlaps a spawn box on the very first tick', () => {
  for (const count of COUNTS) {
    const terrain = terrainFor(count);
    const compiled = ThornCeiling.compile(terrain.actors, count);
    const state = ThornCeiling.create(compiled);
    const players = playersOnFloor(count, terrain);
    ThornCeiling.afterStep(state, { dt: 1 / 60, players, platforms: terrain.platforms, width: terrain.width, height: terrain.height });
    const boxes = ThornCeiling.hazards(state);
    assert.ok(boxes.length > 0, count + 'p produced no thorns at all');
    for (const b of boxes) for (const p of players) {
      const hit = b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y;
      assert.equal(hit, false, count + 'p hazard ' + b.id + ' already covers ' + p.id);
    }
  }
});

test('the ceiling walks start -> countdown -> avoid and opens Key1 at the end', () => {
  for (const count of [2, 5, 8]) {
    const c0 = compileFor(count).ceilings[0];
    // START_WAIT_TIME + m_AvoidTime plus room for the last row to clear.
    const ticks = Math.ceil((5 + c0.avoidTime + 12) * 60);
    // Keep everybody out of the thorn run so the avoid phase is survived.
    const { state, events, dead } = run(count, {
      ticks,
      players: (terrain) => [{ id: 'safe', x: 8, y: terrain.height - 48 - 47, w: 32, h: 46, dead: false, exit: false }]
    });
    assert.deepEqual(dead, [], count + 'p killed the sheltered player');
    const [status] = ThornCeiling.status(state);
    assert.equal(status.phaseName, 'cleared', count + 'p ended in phase ' + status.phase);
    const opened = events.filter((e) => e.event === 61);
    assert.equal(opened.length, 1, count + 'p sent ' + opened.length + ' SwitchOn events');
    assert.equal(opened[0].target, 'Key1');
    assert.equal(status.hitPoint, status.hitPointMax);
  }
});

test('each thorn costs exactly one hit point, and the last one kills', () => {
  const count = 8; // hitPointMax 3 on the wide ceiling
  const compiled = compileFor(count);
  assert.equal(compiled.ceilings[0].hitPointMax, 3);
  const terrain = terrainFor(count);
  const c = compiled.ceilings[0];
  const state = ThornCeiling.create(compiled, { rngState: 11n });
  // One victim parked under the whole column run, high enough that several
  // thorns of the same row reach it on the same tick.
  const victim = { id: 'victim', x: c.x - 24, y: 300, w: 48 * c.ceilingWidth, h: 46, dead: false, exit: false };
  const ctx = { dt: 1 / 60, players: [victim], platforms: terrain.platforms, width: terrain.width, height: terrain.height };
  const hits = [];
  const kills = [];
  for (let tick = 0; tick < 60 * 40 && !victim.dead; tick++) {
    ThornCeiling.beforeStep(state, ctx);
    const result = ThornCeiling.afterStep(state, ctx);
    for (const e of result.events) {
      if (e.reason === 'thornCeilingHit') hits.push({ tick, hitPoint: e.hitPoint });
      if (e.event === 43) kills.push({ tick, playerId: e.playerId, hitPoint: e.hitPoint });
    }
    if (result.deadPlayerIds.includes('victim')) victim.dead = true;
  }
  // One point per thorn: two survivable hits, then the fatal third.
  assert.equal(hits.length, c.hitPointMax - 1, 'expected ' + (c.hitPointMax - 1) + ' survivable hits');
  assert.deepEqual(hits.map((h) => h.hitPoint), [2, 1], 'the bar should drain one point at a time');
  assert.equal(kills.length, 1, 'expected exactly one QuakeDead');
  assert.equal(kills[0].hitPoint, 0);
  assert.equal(kills[0].playerId, 'victim');
  assert.equal(state.ceilings[0].hitPoint, 0, 'the bar should be empty');
  assert.equal(victim.dead, true);
});

test('a survivable hit makes the player flash instead of killing them', () => {
  const count = 8; // hitPointMax 3
  const compiled = compileFor(count);
  const terrain = terrainFor(count);
  const c = compiled.ceilings[0];
  // Learn the seeded first row, then replay it with a victim under one of its
  // thorns so that exactly one thorn can reach them.
  const probe = ThornCeiling.create(compiled, { rngState: 19n });
  const row = ThornCeiling.createThornSet(probe, probe.ceilings[0]);
  const target = row.thorns.find((t) => !t.trap);
  assert.ok(target, 'the seeded first row had no plain thorn');
  const state = ThornCeiling.create(compiled, { rngState: 19n });
  const victim = { id: 'victim', x: target.x - 8, y: 300, w: 16, h: 46, dead: false, exit: false };
  const ctx = { dt: 1 / 60, players: [victim], platforms: terrain.platforms, width: terrain.width, height: terrain.height };
  let hit = null;
  for (let tick = 0; tick < 60 * 8 && !hit; tick++) {
    ThornCeiling.beforeStep(state, ctx);
    const result = ThornCeiling.afterStep(state, ctx);
    assert.deepEqual(result.deadPlayerIds, [], 'a full bar should not kill');
    const e = result.events.find((x) => x.reason === 'thornCeilingHit');
    if (e) hit = { tick, event: e };
  }
  assert.ok(hit, 'the aimed thorn never reached the victim');
  assert.equal(hit.event.hitPoint, c.hitPointMax - 1);
  assert.equal(state.ceilings[0].hitPoint, c.hitPointMax - 1);
  // PlayerComponent.m_FlashTimer is 0x5555 FP, so the blink lasts a third of a
  // second and clears itself afterwards.
  assert.equal(state.flash.victim, 0x5555);
  for (let tick = 0; tick < 30; tick++) ThornCeiling.afterStep(state, ctx);
  assert.equal(state.flash.victim, undefined, 'the flash should have expired');
});

test('a single hit point ceiling kills on the very first contact', () => {
  const count = 2; // hitPointMax 1
  const compiled = compileFor(count);
  assert.equal(compiled.ceilings[0].hitPointMax, 1);
  const terrain = terrainFor(count);
  const c = compiled.ceilings[0];
  const state = ThornCeiling.create(compiled, { rngState: 3n });
  const victim = { id: 'victim', x: c.x - 16, y: 300, w: 48 * c.ceilingWidth, h: 46, dead: false, exit: false };
  const ctx = { dt: 1 / 60, players: [victim], platforms: terrain.platforms, width: terrain.width, height: terrain.height };
  let kill = null;
  for (let tick = 0; tick < 60 * 20 && !kill; tick++) {
    ThornCeiling.beforeStep(state, ctx);
    const result = ThornCeiling.afterStep(state, ctx);
    if (result.deadPlayerIds.length) kill = { tick, events: result.events.slice() };
  }
  assert.ok(kill, 'the single point ceiling never killed anybody');
  assert.equal(state.ceilings[0].hitPoint, 0);
  assert.ok(kill.events.some((e) => e.event === 43), 'expected a QuakeDead event');
});

test('a thorn disappears when it lands and the next row only follows then', () => {
  const compiled = compileFor(4);
  const terrain = terrainFor(4);
  const state = ThornCeiling.create(compiled, { rngState: 5n });
  const live = state.ceilings[0];
  const ctx = { dt: 1 / 60, players: [], platforms: terrain.platforms, width: terrain.width, height: terrain.height };
  ThornCeiling.afterStep(state, ctx);
  const firstRow = JSON.stringify(live.lastSet.thorns);
  let sawEmpty = false;
  let rows = 1;
  for (let tick = 0; tick < 60 * 30; tick++) {
    ThornCeiling.afterStep(state, ctx);
    const active = live.thorns.filter((t) => t.active).length;
    if (active === 0) sawEmpty = true;
    if (sawEmpty && active > 0) { rows++; sawEmpty = false; }
    // No thorn ever travels past the bottom of the map plus a chip.
    for (const t of live.thorns) if (t.active) assert.ok(t.yFp / F <= terrain.height + 48, 'thorn fell through the floor');
  }
  assert.ok(rows >= 3, 'expected several rows in thirty seconds, saw ' + rows);
  assert.notEqual(JSON.stringify(live.lastSet.thorns), firstRow, 'the rows never changed');
});

test('the same seed replays identically and a different seed does not', () => {
  const a = run(4, { ticks: 600, seed: 42n });
  const b = run(4, { ticks: 600, seed: 42n });
  const c = run(4, { ticks: 600, seed: 43n });
  const trace = (r) => JSON.stringify(r.state.ceilings[0].lastSet);
  assert.equal(trace(a), trace(b), 'identical seeds diverged');
  assert.notEqual(trace(a), trace(c), 'different seeds produced the same rows');
});

test('compile rejects what the original cannot express', () => {
  const actor = (datas, extra) => ({
    typeName: 'ThornCeiling', name: '', posX: 312, posY: 120, playerCount: 0, createThreshold: 0,
    datas, ...extra
  });
  const table = (values) => ({ t: 2, s: values.map((v) => String.fromCharCode(0x21 + v) + '!!!').join('') });
  const base = [{ t: 1, f: 13 }, { t: 1, f: 30 }, { t: 1, f: 3 }, { t: 1, f: 3 },
    table([3, 4, 5, 6, 7, 8, 9]), table([1, 1, 2, 2, 2, 3, 3]), table([60, 60, 60, 60, 60, 60, 60]),
    { t: 0 }, { t: 0 }, { t: 2, s: 'Key1' }, { t: 1, f: 3 },
    table([2, 3, 4, 5, 6, 6, 6]), table([100, 100, 100, 100, 100, 100, 100]), table([1, 1, 2, 2, 3, 3, 3])];
  assert.doesNotThrow(() => ThornCeiling.compile([actor(base.slice())], 4));
  assert.throws(() => ThornCeiling.compile([actor(base.slice())], 1), /2\.\.8/);
  assert.throws(() => ThornCeiling.compile([actor(base.slice(), { createThreshold: 1 })], 4), /Deferred/);
  const zeroAvoid = base.slice(); zeroAvoid[1] = { t: 1, f: 0 };
  assert.throws(() => ThornCeiling.compile([actor(zeroAvoid)], 4), /m_AvoidTime/);
  const badTable = base.slice(); badTable[4] = { t: 2, s: 'short' };
  assert.throws(() => ThornCeiling.compile([actor(badTable)], 4), /seven/);
  const wideCeiling = base.slice(); wideCeiling[0] = { t: 1, f: 300 };
  assert.throws(() => ThornCeiling.compile([actor(wideCeiling)], 4), /byte field/);
  // An absent trap wait slot falls back on the native 0.2 second minimum.
  const noWait = ThornCeiling.compile([actor(base.slice())], 4).ceilings[0];
  assert.equal(noWait.firstSafeZoneTrapWaitTimeFp, 0x3333);
  assert.equal(noWait.finalSafeZoneTrapWaitTimeFp, 0x3333);
  // A ceiling without a target name is reported, not silently accepted.
  const noTarget = base.slice(); noTarget[9] = { t: 0 };
  const warned = ThornCeiling.compile([actor(noTarget)], 4);
  assert.equal(warned.warnings.length, 1);
  assert.match(warned.warnings[0], /m_TargetName/);
  assert.throws(() => ThornCeiling.create({ schemaVersion: 2, ceilings: [] }), /Compiled ThornCeiling set required/);
  assert.throws(() => ThornCeiling.afterStep(ThornCeiling.create(ThornCeiling.compile([], 4)), { dt: -1 }), /delta/);
});

test('the module adds no solid and claims no full physics fidelity', () => {
  const state = ThornCeiling.create(compileFor(8));
  assert.deepEqual(ThornCeiling.solids(state), []);
  assert.deepEqual(ThornCeiling.beforeStep(state, { dt: 1 / 60 }).solids, []);
  assert.equal(ThornCeiling.completePhysicsFidelity, false);
  assert.equal(ThornCeiling.nativeConstants.mapChipSize, 48);
  assert.equal(ThornCeiling.nativeConstants.startWaitTime, 5);
  assert.equal(ThornCeiling.nativeConstants.fadeoutSpeed, 4);
  assert.equal(ThornCeiling.nativeConstants.hitPointFallback, 3);
  assert.deepEqual(ThornCeiling.nativeConstants.thornCollision[1].map((r) => [r.x, r.y, r.w, r.h]),
    [[-4, 10, 8, 8], [-12, 2, 24, 6]]);
});
