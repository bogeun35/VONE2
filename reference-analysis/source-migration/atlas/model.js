(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SourceAtlasModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function worldStages(data) {
    if (!data || !Array.isArray(data.stages)) throw new Error('라운드 데이터 형식이 올바르지 않습니다.');
    const stages = data.stages.filter(s => /^st_w_\d{2}_\d{2}$/.test(s.stageId || ''));
    const ids = new Set();
    stages.forEach(s => {
      if (ids.has(s.stageId)) throw new Error('중복 라운드: ' + s.stageId);
      ids.add(s.stageId);
      if (!s.json || !Array.isArray(s.json.stageInitParamList) || !s.json.stageInitParamList.length)
        throw new Error('변형 데이터 없음: ' + s.stageId);
    });
    return stages.sort((a, b) => a.stageId.localeCompare(b.stageId));
  }
  function actors(variant) {
    if (!variant || !Array.isArray(variant.actorCreateParamList)) throw new Error('오브젝트 데이터가 없습니다.');
    return variant.actorCreateParamList.map((a, index) => ({ ...a, index }))
      .filter(a => Number.isFinite(a.posX) && Number.isFinite(a.posY));
  }
  function bounds(items) {
    if (!items.length) return { minX: -100, minY: -100, width: 200, height: 200 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const a of items) { minX = Math.min(minX, a.posX); minY = Math.min(minY, a.posY); maxX = Math.max(maxX, a.posX); maxY = Math.max(maxY, a.posY); }
    return { minX: minX - 60, minY: minY - 60, width: Math.max(120, maxX - minX + 120), height: Math.max(120, maxY - minY + 120) };
  }
  function fit(box, width, height, flipY = false) {
    const scale = Math.max(0.0001, Math.min(Math.max(1, width - 80) / box.width, Math.max(1, height - 80) / box.height));
    return { scale, offsetX: (width - box.width * scale) / 2 - box.minX * scale,
      offsetY: flipY ? (height + box.height * scale) / 2 + box.minY * scale : (height - box.height * scale) / 2 - box.minY * scale, flipY };
  }
  function project(a, view) { return { x: a.posX * view.scale + view.offsetX, y: a.posY * view.scale * (view.flipY ? -1 : 1) + view.offsetY }; }
  function nearest(items, view, x, y, radius = 12) {
    let result = null, distance = radius * radius;
    for (const a of items) { const p = project(a, view); const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d <= distance) { result = a; distance = d; } }
    return result;
  }
  function wrap(index, delta, length) { return length ? ((index + delta) % length + length) % length : 0; }
  function populationView(variants, count, online, manualIndex, rules) {
    if (!Array.isArray(variants) || !variants.length) throw new Error('변형 데이터가 없습니다.');
    if (!Number.isInteger(count) || count < 2 || count > 8) throw new Error('인원은 2~8명이어야 합니다.');
    const variant = manualIndex == null ? rules.selectVariant(variants, count, online) : variants[wrap(manualIndex, 0, variants.length)];
    if (!variant) throw new Error('해당 인원의 변형이 없습니다.');
    const sourceActors = actors(variant);
    return { variant, index: variants.indexOf(variant), sourceActors,
      visibleActors: manualIndex == null ? sourceActors.filter(a => rules.actorPopulationAllowed(a.playerCount, count)) : sourceActors };
  }
  function geometryVariant(data, stageId, variant) {
    if (!data || !Array.isArray(data.stages)) throw new Error('지형 데이터 형식이 올바르지 않습니다.');
    const stage = data.stages.find(s => s.stageId === stageId);
    const match = stage && stage.variants.find(v => v.createIndex === variant.createIndex && v.needPlayerCount === variant.needPlayerCount && Boolean(v.isOnlineOnly) === Boolean(variant.isOnlineOnly));
    if (!match || !Array.isArray(match.grid) || match.grid.length !== match.height || match.grid.some(row => !Array.isArray(row) || row.length !== match.width)) throw new Error('지형 변형 불일치: ' + stageId);
    if (!Number.isFinite(match.chipSize) || match.chipSize <= 0) throw new Error('지형 타일 크기가 올바르지 않습니다.');
    return match;
  }
  function tilePosition(geometry, x, y) {
    return { posX: (geometry.tileOriginX || 0) + x * geometry.chipSize, posY: (geometry.tileOriginY || 0) + y * geometry.chipSize };
  }
  return { worldStages, actors, bounds, fit, project, nearest, wrap, populationView, geometryVariant, tilePosition };
});
