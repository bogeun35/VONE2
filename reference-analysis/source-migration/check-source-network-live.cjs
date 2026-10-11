'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { handler } = require('./atlas-preview.cjs');
const reportPath = path.join(__dirname, 'source-network-live-report.json');
const report = { timestamp: new Date().toISOString(), backend: 'Firebase RTDB via actual browser compat SDK', code: crypto.randomBytes(4).toString('hex').toUpperCase(), contexts: 8, checks: {}, errors: [], passed: false };
const pages = [];
let browser, server;
async function until(page, predicate, arg) { await page.waitForFunction(predicate, arg, { timeout: 45000 }); }
async function all(predicate, arg) { await Promise.all(pages.map(p => until(p, predicate, arg))); }
async function run() {
  server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/play/`;
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--mute-audio'] });
  for (let i = 0; i < 8; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    pages.push(page);
    page.setDefaultTimeout(45000);
    await page.goto(url);
    if (!await page.evaluate(() => typeof window.SourceParkNetwork === 'function')) await page.addScriptTag({ path: path.join(__dirname, 'play/network.js') });
    await page.evaluate(() => {
      window.liveTest = { room: null, errors: [], callbacks: 0 };
      window.liveNet = new SourceParkNetwork(room => { liveTest.room = room; liveTest.callbacks++; }, error => liveTest.errors.push(error));
    });
    await page.evaluate(({ code, create }) => liveNet.enter(code, create), { code: report.code, create: i === 0 });
  }
  await all(() => liveTest.room && Object.keys(liveTest.room.players || {}).length === 8);
  report.checks.eightIsolatedClientsJoined = true;
  await Promise.all(pages.map(page => page.evaluate(() => liveNet.ready(true))));
  await all(() => Object.values(liveTest.room.players).every(player => player.ready));
  report.checks.allReadyReceived = true;
  const ids = await pages[0].evaluate(() => Object.keys(liveTest.room.players).sort());
  const snapshot = { status: 'play', runId: report.code, count: 8, ids, players: ids.map(id => ({ id })) };
  await pages[0].evaluate(snapshot => liveNet.start(snapshot), snapshot);
  await all(runId => liveTest.room.status === 'game' && liveTest.room.snapshot.runId === runId && liveTest.room.snapshot.players.length === 8, report.code);
  report.checks.startSnapshotReceivedByEight = true;
  const peerId = await pages[7].evaluate(() => liveNet.id);
  assert.equal(await pages[7].evaluate(() => liveNet.input({ right: true, up: true, jump: true })), true);
  await until(pages[0], id => liveNet.inputs[id] && liveNet.inputs[id].up && liveNet.inputs[id].jump && liveNet.inputs[id].right && liveNet.inputs[id].jumpSeq === 1, peerId);
  report.checks.peerInputReceivedByHost = true;
  await pages[7].evaluate(() => liveNet.input({ up: false, jump: false }));
  await until(pages[0], id => liveNet.inputs[id] && !liveNet.inputs[id].jump && liveNet.inputs[id].jumpSeq === 1 && liveNet.inputs[id].seq === 2, peerId);
  report.checks.jumpEdgeRetainedAfterRelease = true;
  assert.equal(await pages[0].evaluate(snapshot => liveNet.publish({ ...snapshot, status: 'clear', tick: 7 }), snapshot), true);
  await all(runId => liveTest.room.status === 'clear' && liveTest.room.snapshot.runId === runId && liveTest.room.snapshot.tick === 7, report.code);
  report.checks.clearSnapshotReceivedByEight = true;
  report.callbackCounts = await Promise.all(pages.map(page => page.evaluate(() => liveTest.callbacks)));
  report.errors = (await Promise.all(pages.map(page => page.evaluate(() => liveTest.errors)))).flat();
  assert.deepEqual(report.errors, []);
}
async function cleanup() {
  if (pages.length) {
    for (const page of pages.slice(1).reverse()) {
      try { await page.evaluate(() => liveNet.leave()); } catch (error) { report.errors.push('cleanup: ' + error.message); }
    }
    try {
      await pages[0].evaluate(() => liveNet.leave());
      const value = await pages[0].evaluate(async code => (await liveNet.db.ref('games/park_source_' + code).once('value')).val(), report.code);
      assert.equal(value, null, 'temporary test room must be deleted after all clients leave');
      report.checks.emptyRoomDeleted = true;
    } catch (error) { report.errors.push('cleanup: ' + error.message); }
  }
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
(async () => {
  try { await run(); } catch (error) { report.errors.push(error.stack || String(error)); }
  finally { await cleanup(); }
  report.passed = Object.keys(report.checks).length === 7 && report.errors.length === 0;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
})();
