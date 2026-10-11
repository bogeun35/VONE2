const assert = require('node:assert/strict');
const { test } = require('node:test');
const SourceParkNetwork = require('./network.js');

// In-memory compat RTDB exercising transactions, listeners and disconnect cleanup.
class Backend {
  constructor() { this.data = { '.info': { connected: true } }; this.listeners = new Map(); this.disconnects = new Map(); }
  ref(path) { return new Ref(this, path); }
  value(path) { return path.split('/').reduce((value, key) => value && value[key], this.data) ?? null; }
  set(path, value) {
    const keys = path.split('/');
    const key = keys.pop();
    let parent = this.data;
    for (const part of keys) parent = parent[part] || (parent[part] = {});
    if (value === null) delete parent[key]; else parent[key] = structuredClone(value);
    for (const [watched, listeners] of this.listeners) {
      if (watched === path || path.startsWith(watched + '/') || watched.startsWith(path + '/')) {
        for (const listener of [...listeners]) listener({ val: () => structuredClone(this.value(watched)) });
      }
    }
  }
  disconnect(id) {
    for (const [path, values] of [...this.disconnects]) if (this.value(path)?.playerId === id) {
      this.disconnects.delete(path);
      for (const [key, value] of Object.entries(values)) this.set(path + '/' + key, value);
    }
  }
}
class Ref {
  constructor(db, path) { this.db = db; this.path = path; }
  child(path) { return this.db.ref(this.path + '/' + path); }
  on(_event, listener) {
    if (!this.db.listeners.has(this.path)) this.db.listeners.set(this.path, new Set());
    this.db.listeners.get(this.path).add(listener);
    listener({ val: () => structuredClone(this.db.value(this.path)) });
  }
  off(_event, listener) { this.db.listeners.get(this.path)?.delete(listener); }
  async once() { return { val: () => structuredClone(this.db.value(this.path)) }; }
  async set(value) { this.db.set(this.path, value); }
  async update(values) { for (const [key, value] of Object.entries(values)) this.db.set(this.path + '/' + key, value); }
  async transaction(transform) {
    const value = transform(structuredClone(this.db.value(this.path)));
    if (value === undefined) return { committed: false };
    this.db.set(this.path, value);
    return { committed: true };
  }
  onDisconnect() {
    return {
      remove: async () => this.db.disconnects.set(this.path, true),
      update: async values => this.db.disconnects.set(this.path, values),
      cancel: async () => this.db.disconnects.delete(this.path)
    };
  }
}
function peer(db, onRoom = () => {}) {
  const errors = [];
  const network = new SourceParkNetwork(onRoom, error => errors.push(error));
  network.db = db;
  network.errors = errors;
  return network;
}

test('only lobby host can select a stage, readiness resets and stale-stage start is rejected', async () => {
  const db = new Backend(), host = peer(db), guest = peer(db);
  await host.enter('MAPS', true); await guest.enter('MAPS'); await guest.ready(true);
  await assert.rejects(guest.selectStage('st_w_01_02'), /방장/);
  await host.selectStage('st_w_01_02');
  assert.equal(guest.room.stageId, 'st_w_01_02');
  assert.equal(guest.room.players[guest.id].ready, false);
  await guest.ready(true);
  await assert.rejects(host.start({stageId:'st_w_01_01',status:'play'}));
  assert.equal(host.room.status,'lobby');
  await host.start({stageId:'st_w_01_02',status:'play'});
  assert.equal(guest.room.snapshot.stageId,'st_w_01_02');
  await assert.rejects(host.selectStage('st_w_01_03'), /대기실/);
  await guest.leave(); await host.leave();
  assert.equal(db.value('games/park_source_MAPS'),null);
});

test('2–8 player room lifecycle, readiness, inputs, authority and empty-room cleanup', async () => {
  const db = new Backend();
  const host = peer(db);
  await assert.rejects(host.enter('BAD!'), /방 코드/);
  await host.enter('test', true);
  assert.equal(host.code, 'TEST');
  assert.equal(host.room.protocol, 'source-park-v2');
  assert.equal(host.room.players[host.id].ready, true);
  await assert.rejects(host.start({ status: 'play' }), /2~8/);
  const peers = Array.from({ length: 7 }, () => peer(db));
  for (const network of peers) await network.enter('TEST');
  await assert.rejects(peer(db).enter('TEST'), /참가/);
  await assert.rejects(host.start({ status: 'play' }), /준비/);
  for (const network of peers) await network.ready(true);
  await host.start({ status: 'play', actor: { optional: undefined } });
  assert.equal(host.room.status, 'game');
  assert.equal(host.room.snapshot.actor.optional, null);
  await assert.rejects(peer(db).enter('TEST'), /참가/);
  await assert.rejects(peers[0].start({ status: 'play' }), /방장/);
  assert.equal(await peers[0].publish({ status: 'dead' }), false);
  await peers[0].input({ jump: true, right: true });
  await peers[0].input({ jump: true });
  assert.equal(host.inputs[peers[0].id].jumpSeq, 1);
  await peers[0].input({ jump: false });
  await peers[0].input({ jump: true });
  assert.equal(host.inputs[peers[0].id].jumpSeq, 2);
  assert.equal(host.inputs[peers[0].id].seq, 4);
  await host.publish({ status: 'clear' });
  assert.equal(host.room.status, 'clear');
  await host.lobby();
  assert.equal(host.room.status, 'lobby');
  assert.equal(host.room.snapshot, null);
  assert.equal(peers[0].room.players[peers[0].id].ready, false);
  await host.leave();
  const promoted = peers.find(network => network.host);
  assert.ok(promoted);
  assert.equal(promoted.room.players[promoted.id].ready, true);
  for (const network of peers) await network.leave();
  assert.equal(db.value('games/park_source_TEST'), null);
  assert.equal(db.disconnects.size, 0);
  assert.equal([...db.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
});

test('disconnect elects a successor and callback errors remain contained', async () => {
  const db = new Backend();
  const host = peer(db);
  const guest = peer(db, () => { throw Error('callback failure'); });
  await host.enter('ROOM', true);
  await guest.enter('ROOM');
  db.disconnect(host.id);
  await Promise.resolve();
  assert.equal(guest.host, true);
  assert.equal(guest.room.host, guest.id);
  assert.ok(guest.errors.includes('callback failure'));
  await host.leave();
  await guest.leave();
});

test('leave waits for delayed snapshot and input acknowledgements before deleting room', async () => {
  const db = new Backend();
  const host = peer(db);
  await host.enter('RACE', true);
  const originalSet = Ref.prototype.set;
  const originalUpdate = Ref.prototype.update;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  Ref.prototype.set = async function (value) { await gate; return originalSet.call(this, value); };
  Ref.prototype.update = async function (values) { await gate; return originalUpdate.call(this, values); };
  try {
    const input = host.input({ right: true });
    const snapshot = host.publish({ status: 'play', tick: 1 });
    let left = false;
    const leave = host.leave().then(() => { left = true; });
    assert.equal(host.ref, null);
    assert.equal(await host.input({ left: true }), false);
    assert.equal(await host.publish({ status: 'dead' }), false);
    await Promise.resolve();
    assert.equal(left, false);
    assert.ok(db.value('games/park_source_RACE').players[host.id]);
    release();
    await Promise.all([input, snapshot, leave]);
    assert.equal(db.value('games/park_source_RACE'), null);
    assert.equal(host.pending.size, 0);
    assert.equal(db.disconnects.size, 0);
  } finally { Ref.prototype.set = originalSet; Ref.prototype.update = originalUpdate; release(); }
});

test('leave drains start and host election transactions as well', async () => {
  const db = new Backend();
  const host = peer(db);
  const guest = peer(db);
  await host.enter('TXNS', true);
  await guest.enter('TXNS');
  await guest.ready(true);
  const original = Ref.prototype.transaction;
  let release;
  let gate = new Promise(resolve => { release = resolve; });
  Ref.prototype.transaction = async function (transform) { await gate; return original.call(this, transform); };
  try {
    const start = host.start({ status: 'play' });
    const leaving = host.leave();
    await Promise.resolve();
    assert.equal(host.pending.size, 1);
    release();
    await Promise.all([start, leaving]);
    assert.equal(guest.host, true);
    // Force a missing host to exercise the asynchronously issued election operation.
    gate = new Promise(resolve => { release = resolve; });
    db.set('games/park_source_TXNS/host', 'absent');
    const finalLeave = guest.leave();
    await Promise.resolve();
    assert.equal(guest.pending.size, 1);
    release();
    await finalLeave;
    assert.equal(db.value('games/park_source_TXNS'), null);
  } finally { Ref.prototype.transaction = original; release(); }
});

test('leave submits cached-null transaction and retries with actual server membership', async () => {
  const db = new Backend();
  const host = peer(db);
  const guest = peer(db);
  await host.enter('COLD', true);
  await guest.enter('COLD');
  let serverRetries = 0;
  for (const network of [host, guest]) {
    const ref = network.ref;
    const original = ref.transaction.bind(ref);
    ref.transaction = async transform => {
      // Firebase invokes the callback from its cold local cache first. An
      // undefined proposal aborts; a null proposal reaches the server, whose
      // non-null value then causes a retry with authoritative room contents.
      const proposal = transform(null);
      if (proposal === undefined) return { committed: false };
      assert.equal(proposal, null);
      assert.ok(db.value(ref.path));
      serverRetries++;
      return original(transform);
    };
  }
  await host.leave();
  const remaining = db.value('games/park_source_COLD');
  assert.deepEqual(Object.keys(remaining.players), [guest.id]);
  assert.equal(remaining.host, guest.id);
  await guest.leave();
  assert.equal(serverRetries, 2);
  assert.equal(db.value('games/park_source_COLD'), null);
  assert.deepEqual(host.errors, []);
  assert.deepEqual(guest.errors, []);
});

test('leave reports an uncommitted cleanup instead of silently accepting it', async () => {
  const db = new Backend();
  const host = peer(db);
  await host.enter('FAIL', true);
  host.ref.transaction = async () => ({ committed: false });
  await host.leave();
  assert.ok(host.errors.includes('방 나가기 처리가 완료되지 않았어요'));
  // Keep server-side disconnect cleanup armed if explicit removal failed.
  assert.equal(db.disconnects.size, 1);
});

test('acknowledged member removal survives metadata transaction contention and delay', async () => {
  const db = new Backend();
  const host = peer(db);
  const guest = peer(db);
  await host.enter('BUSY', true);
  await guest.enter('BUSY');
  await guest.input({ right: true });
  const ref = guest.ref;
  const update = ref.update.bind(ref);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let acknowledged = false;
  ref.update = async values => {
    assert.deepEqual(values, { ['players/' + guest.id]: null, ['inputs/' + guest.id]: null, ['connections/' + guest.connectionId]: null });
    await gate;
    await update(values);
    acknowledged = true;
  };
  ref.transaction = async () => {
    assert.equal(acknowledged, true);
    // A busy room root may exhaust Firebase transaction retries while a host
    // publishes snapshots. Own membership must already be removed at this point.
    throw Error('maxretry');
  };
  const leaving = guest.leave();
  await host.publish({ status: 'play', tick: 1 });
  await host.publish({ status: 'play', tick: 2 });
  assert.ok(db.value(ref.path).players[guest.id]);
  release();
  await leaving;
  assert.deepEqual(Object.keys(db.value(ref.path).players), [host.id]);
  assert.equal(db.value(ref.path).inputs[guest.id], undefined);
  assert.ok(guest.errors.includes('maxretry'));
  await host.leave();
  assert.equal(db.value(ref.path), null);
});
