'use strict';

// Development-only catalogue. Research evidence never implies playable content.
const fs = require('node:fs');
const path = require('node:path');
const clone = value => JSON.parse(JSON.stringify(value));
const pad = value => String(value).padStart(2, '0');
const IMPLEMENTATION_STATES = Object.freeze(['not_started', 'in_progress', 'implemented', 'verified']);
// Source inventory boundaries, not gameplay limits. Routes below derive from data.
const SOURCE_RANGES = Object.freeze({
  pico1: { world: [12, 4], battle: 4, endless: 4 },
  pico2: { world: [15, 4], dark: [4, 4], battle: 8, endless: 7 }
});
const PICO1_MODE_IDS = Object.freeze({
  battle: ['Height Battle', 'Region Battle', 'Jump Battle', 'Stop watch Battle'],
  endless: ['Endless Jump', 'Endless Puzzle', 'Endless Scroll', 'Endless Plane']
});

function assert(condition, message) { if (!condition) throw new Error(message); }
function expectedIds(game, mode) {
  const range = SOURCE_RANGES[game][mode];
  if (Array.isArray(range)) return Array.from({ length: range[0] }, (_, w) =>
    Array.from({ length: range[1] }, (_, s) => `${game}/${mode}/${pad(w + 1)}-${pad(s + 1)}`)).flat();
  return Array.from({ length: range }, (_, i) => `${game}/${mode}/${pad(i + 1)}`);
}
function validateInputRows(rows, game, mode) {
  assert(Array.isArray(rows), `Missing input list: ${game}/${mode}`);
  const expected = new Set(expectedIds(game, mode));
  const seen = new Set();
  for (const row of rows) {
    let id;
    if (Array.isArray(SOURCE_RANGES[game][mode])) {
      assert(/^\d+-\d+$/.test(row.id || ''), `Invalid source stage ID: ${game}/${mode}/${row.id}`);
      const [w, s] = row.id.split('-').map(Number);
      assert(row.worldNumber == null || row.worldNumber === w, `World mismatch: ${row.id}`);
      assert(row.stageNumber == null || row.stageNumber === s, `Stage mismatch: ${row.id}`);
      if (game === 'pico2' && mode === 'world') {
        assert(row.world === w && row.stage === s, `Number mismatch: ${row.id}`);
      }
      id = `${game}/${mode}/${pad(w)}-${pad(s)}`;
    } else {
      const n = game === 'pico1' ? PICO1_MODE_IDS[mode].indexOf(row.name) + 1 : row.index;
      assert(Number.isInteger(n) && n > 0, `Unknown mode identity: ${game}/${mode}/${row.name}`);
      id = `${game}/${mode}/${pad(n)}`;
    }
    assert(expected.has(id), `Out of source range: ${id}`);
    assert(!seen.has(id), `Duplicate source ID: ${id}`);
    seen.add(id);
  }
  assert(seen.size === expected.size, `Missing source IDs: ${[...expected].filter(id => !seen.has(id)).join(', ')}`);
}

function buildRegistry(pico1, pico2) {
  const inputs = { pico1, pico2 };
  const lists = {
    pico1: { world: pico1.stages, battle: pico1.additionalModes?.battle?.variants, endless: pico1.additionalModes?.endless?.variants },
    pico2: { world: pico2.world, dark: pico2.dark, battle: pico2.battle, endless: pico2.endless }
  };
  const entries = [], chapters = [];
  for (const [game, modes] of Object.entries(lists)) for (const [mode, rows] of Object.entries(modes)) {
    validateInputRows(rows, game, mode);
    const groups = new Map();
    for (const row of rows) {
      const staged = Array.isArray(SOURCE_RANGES[game][mode]);
      const [world, stage] = staged ? row.id.split('-').map(Number) : [null, null];
      const ordinal = staged ? stage : game === 'pico1' ? PICO1_MODE_IDS[mode].indexOf(row.name) + 1 : row.index;
      const sourceId = `${game}/${mode}/${staged ? `${pad(world)}-${pad(stage)}` : pad(ordinal)}`;
      const chapterId = `${game}/${mode}${staged ? `/chapter-${pad(world)}` : ''}`;
      const modeEvidence = game === 'pico1' && !staged ? pico1.additionalModes[mode] : null;
      const entry = {
        sourceId, game, mode, originalId: staged ? row.id : row.name,
        chapterId, sourceOrder: { world, stage, ordinal },
        title: row.name || `${game === 'pico1' ? row.world : row.theme || mode} ${row.id}`,
        evidence: {
          status: row.evidenceStatus || row.status || modeEvidence?.status || 'unverified',
          mechanic: row.mechanic ?? row.rule ?? null,
          solutionActions: clone(row.solutionActions || (row.solution_action ? [row.solution_action] : [])),
          sources: clone(row.sources || row.source || modeEvidence?.sources || (modeEvidence?.source ? [modeEvidence.source] : [])),
          videos: clone(row.videos || []),
          limitations: clone(row.unresolved || (row.notes ? [row.notes] : [])),
          geometry: row.geometry || 'unverified', populationScaling: row.population_scaling || 'unverified',
          raw: clone(row), modeContext: modeEvidence ? clone(modeEvidence) : null
        },
        implementation: { status: 'not_started', artifact: null, verification: null },
        gameplayReview: { status: 'not_reviewed', findings: [] }
      };
      entries.push(entry);
      if (!groups.has(chapterId)) groups.set(chapterId, {
        id: chapterId, game, mode, sourceWorld: world,
        label: staged ? `${world}. ${game === 'pico1' ? row.world : row.theme || mode}` : mode,
        sourceIds: []
      });
      groups.get(chapterId).sourceIds.push(sourceId);
    }
    chapters.push(...groups.values());
  }
  // Canonical source order is independent of JSON row order and edited route order.
  entries.sort((a,b) => a.sourceId.localeCompare(b.sourceId));
  for (const chapter of chapters) chapter.sourceIds.sort();
  chapters.sort((a,b) => a.id.localeCompare(b.id));
  return { schemaVersion: 1, kind: 'development-reference-catalogue',
    sourceDocuments: clone(inputs), entries, chapters };
}

function loadRegistry(directory = path.resolve(__dirname, '..')) {
  const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8').replace(/^\uFEFF/, ''));
  return buildRegistry(read('pico1-stages.json'), read('pico2-stages.json'));
}
function createEditorialPlan(registry) {
  // Preserve every reference in an unassigned section; no editorial cuts yet.
  return { schemaVersion: 1, status: 'draft', sections: [
    { id: 'reference', role: 'unassigned', chapters: registry.chapters.map(chapter => ({
      id: chapter.id, label: chapter.label, items: chapter.sourceIds.map(sourceId => ({
        instanceId: `reference:${sourceId}`, sourceIds: [sourceId], edit: { kind: 'unchanged', rationale: null, review: 'not_reviewed' }
      }))
    })) },
    { id: 'main', role: 'main', chapters: [] },
    { id: 'epilogue', role: 'epilogue', chapters: [] },
    { id: 'second-run', role: 'second_run', chapters: [] }
  ], excludedReferences: [] };
}
function flattenPlan(plan, sectionId) {
  return plan.sections.filter(s => sectionId == null || s.id === sectionId).flatMap(s => s.chapters.flatMap(c => c.items));
}
function nextItem(plan, instanceId, sectionId) {
  const items = flattenPlan(plan, sectionId), index = items.findIndex(item => item.instanceId === instanceId);
  assert(index !== -1, `Unknown route instance: ${instanceId}`);
  return items[index + 1] || null; // Final item ends the route, never wraps.
}
function assertPlayable(entry) {
  assert(entry.implementation.status === 'verified', `Not verified for play: ${entry.sourceId}`);
  assert(entry.implementation.artifact && entry.implementation.verification?.passed === true &&
    entry.implementation.verification?.report, `Missing implementation evidence: ${entry.sourceId}`);
  return true;
}
function validateRegistry(registry) {
  const expected = Object.entries(SOURCE_RANGES).flatMap(([game,modes]) => Object.keys(modes).flatMap(mode => expectedIds(game,mode)));
  const seen = new Set();
  for (const entry of registry.entries) {
    assert(expected.includes(entry.sourceId), `Out of source range: ${entry.sourceId}`);
    const [sourceGame, sourceMode, sourcePosition] = entry.sourceId.split('/');
    assert(entry.game === sourceGame && entry.mode === sourceMode, `Source identity mismatch: ${entry.sourceId}`);
    const staged = Array.isArray(SOURCE_RANGES[sourceGame][sourceMode]);
    const [world, stage] = sourcePosition.split('-').map(Number);
    const chapterId = `${sourceGame}/${sourceMode}${staged ? `/chapter-${pad(world)}` : ''}`;
    assert(entry.chapterId === chapterId, `Source chapter mismatch: ${entry.sourceId}`);
    if (staged) assert(entry.originalId === `${world}-${stage}` && entry.sourceOrder.world === world && entry.sourceOrder.stage === stage, `Source ordinal mismatch: ${entry.sourceId}`);
    else assert(entry.sourceOrder.ordinal === world, `Source ordinal mismatch: ${entry.sourceId}`);
    assert(!seen.has(entry.sourceId), `Duplicate source ID: ${entry.sourceId}`); seen.add(entry.sourceId);
    assert(entry.evidence && typeof entry.evidence.status === 'string', `Missing research evidence: ${entry.sourceId}`);
    const impl = entry.implementation;
    assert(impl && IMPLEMENTATION_STATES.includes(impl.status), `Invalid implementation status: ${entry.sourceId}`);
    if (impl.status === 'not_started') assert(impl.artifact === null && impl.verification === null, `Unstarted entry claims implementation: ${entry.sourceId}`);
    if (impl.status === 'implemented' || impl.status === 'verified') assert(typeof impl.artifact === 'string' && impl.artifact.length > 0, `Missing artifact: ${entry.sourceId}`);
    if (impl.status === 'verified') assertPlayable(entry);
  }
  assert(seen.size === expected.length, 'Missing catalogue entries');
  const chapterIds = new Set(), covered = new Set();
  for (const chapter of registry.chapters) {
    assert(!chapterIds.has(chapter.id), `Duplicate chapter: ${chapter.id}`); chapterIds.add(chapter.id);
    for (const id of chapter.sourceIds) {
      assert(seen.has(id), `Unknown chapter entry: ${id}`);
      assert(!covered.has(id), `Duplicate chapter entry: ${id}`); covered.add(id);
      assert(registry.entries.find(e=>e.sourceId===id).chapterId === chapter.id, `Wrong chapter: ${id}`);
    }
  }
  assert(covered.size === seen.size, 'Missing chapter entries');
  return true;
}
function validatePlan(plan, registry) {
  const catalogue = new Set(registry.entries.map(e=>e.sourceId));
  const instances = new Set(), covered = new Set(), sectionIds = new Set();
  for(const section of plan.sections) {
    assert(!sectionIds.has(section.id), `Duplicate section: ${section.id}`); sectionIds.add(section.id);
    assert(['unassigned','main','epilogue','second_run'].includes(section.role), 'Invalid section role');
    const chapterIds = new Set();
    for(const chapter of section.chapters) {
      assert(!chapterIds.has(chapter.id), `Duplicate plan chapter: ${chapter.id}`); chapterIds.add(chapter.id);
      for(const item of chapter.items) {
        assert(item.instanceId && !instances.has(item.instanceId), `Duplicate/missing route instance: ${item.instanceId}`); instances.add(item.instanceId);
        assert(Array.isArray(item.sourceIds) && item.sourceIds.length > 0, 'Missing route references');
        assert(new Set(item.sourceIds).size === item.sourceIds.length, 'Duplicate reference within route item');
        for(const id of item.sourceIds) {assert(catalogue.has(id), `Unknown source reference: ${id}`);covered.add(id);}
        assert(['unchanged','combine','shorten','revisit'].includes(item.edit?.kind), 'Invalid editorial action');
        if(item.edit.kind === 'unchanged') assert(item.sourceIds.length === 1, 'Combined sources require explicit combine edit');
        else assert(typeof item.edit.rationale === 'string' && item.edit.rationale.trim(), 'Editorial change requires rationale');
      }
    }
  }
  const excluded=new Set();
  for(const omission of plan.excludedReferences) {
    assert(catalogue.has(omission.sourceId) && !covered.has(omission.sourceId) && !excluded.has(omission.sourceId), 'Invalid/duplicate exclusion');
    assert(omission.rationale && omission.review === 'approved', 'Exclusion requires explicit reviewed decision'); excluded.add(omission.sourceId);
  }
  assert(covered.size + excluded.size === catalogue.size, 'Unaccounted references: route cuts must be explicit');
  return true;
}
module.exports = { buildRegistry, loadRegistry, createEditorialPlan, flattenPlan, nextItem, assertPlayable, validateRegistry, validatePlan, IMPLEMENTATION_STATES };
