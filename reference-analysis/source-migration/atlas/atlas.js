(async function () {
  'use strict';
  const M = SourceAtlasModel, $ = id => document.getElementById(id), P = globalThis.SourcePopulationRules;
  const canvas = $('map'), ctx = canvas.getContext('2d');
  let stages = [], stageIndex = 0, variantIndex = 0, allActors = [], shown = [], selected = null;
  let geometryData, geometry, attributes = [];
  let view = { scale: 1, offsetX: 0, offsetY: 0, flipY: false }, size = { width: 1, height: 1 }, drag;
  const colors = ['#7cdfdc', '#ffbc78', '#bc9dff', '#ff83a3', '#b6e179', '#79b8ff', '#f1d679'];
  function color(type) { let h = 0; for (const c of type || '') h = (h * 31 + c.charCodeAt(0)) >>> 0; return colors[h % colors.length]; }
  function option(value, label) { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; }
  function draw() {
    ctx.clearRect(0, 0, size.width, size.height); ctx.lineWidth = 1;
    const step = 48 * 2 ** Math.max(0, Math.ceil(Math.log2(22 / (48 * view.scale))));
    const s = step * view.scale;
    ctx.strokeStyle = '#182439';ctx.beginPath();
    for (let x = ((view.offsetX % s) + s) % s; x < size.width; x += s) {ctx.moveTo(x,0);ctx.lineTo(x,size.height);}
    for (let y = ((view.offsetY % s) + s) % s; y < size.height; y += s) {ctx.moveTo(0,y);ctx.lineTo(size.width,y);}
    ctx.stroke();
    if(geometry && $('tiles').checked)for(let y=0;y<geometry.height;y++)for(let x=0;x<geometry.width;x++){
      const id=geometry.grid[y][x];if(id===0||id===1)continue;
      const attr=attributes[id],p=M.project(M.tilePosition(geometry,x,y),view),tileSize=geometry.chipSize*view.scale;
      const py=view.flipY?p.y-tileSize:p.y;if(p.x+tileSize<0||p.x>size.width||py+tileSize<0||py>size.height)continue;
      const flags=attr?.flagNames||[];ctx.fillStyle=flags.includes('Ice')?'#376b92':flags.includes('Break')?'#986d35':flags.includes('Fall')?'#773345':attr?.solid?'#34445b':'#142438';
      ctx.fillRect(p.x,py,tileSize,tileSize);if(tileSize>10){ctx.strokeStyle='#8eabcf22';ctx.lineWidth=1;ctx.strokeRect(p.x,py,tileSize,tileSize);}
      if(tileSize>32){ctx.fillStyle='#adc1dd';ctx.font='9px system-ui';ctx.fillText(String(id),p.x+3,py+12);}
    }
    for (const a of shown) {
      const p = M.project(a, view); if(p.x < -20 || p.x > size.width + 20 || p.y < -20 || p.y > size.height + 20) continue;
      ctx.fillStyle = color(a.typeName); ctx.beginPath();ctx.arc(p.x,p.y,a===selected?7:4,0,Math.PI*2);ctx.fill();
      if (a===selected) {ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
      if (view.scale > 0.45 && !/Mediator|MapRect/.test(a.typeName || '')) {ctx.font='10px system-ui';ctx.fillText(a.typeName || String(a.type),p.x+7,p.y-7);}
    }
  }
  function fit() {let points=shown;if(geometry&&$('tiles').checked)points=shown.concat(M.tilePosition(geometry,0,0),M.tilePosition(geometry,geometry.width,geometry.height));view=M.fit(M.bounds(points),size.width,size.height,view.flipY);draw();}
  function resize() {const box=canvas.getBoundingClientRect();size={width:box.width,height:box.height};const dpr=window.devicePixelRatio||1;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);fit();}
  function detail(a) {
    selected=a; $('actor').value=a?String(a.index):'';const box=$('detail');box.replaceChildren();
    if(!a){box.textContent='점을 누르면 속성이 표시됩니다.';draw();return;}
    const name=document.createElement('strong');name.textContent=(a.typeName||a.type)+' · '+(a.name||'#'+a.index);box.append(name);
    const p=document.createElement('p');p.className='coordinates';p.textContent=`(${a.posX}, ${a.posY})`;box.append(p);
    const dl=document.createElement('dl');
    for(const key of ['type','createThreshold','playerCount']){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=String(a[key]);dl.append(dt,dd);}box.append(dl);
    const pre=document.createElement('pre');pre.textContent='datas (원본 슬롯)\n'+JSON.stringify(a.datas,null,2);box.append(pre);draw();
  }
  function filter() {shown=allActors.filter(a=>!$('type').value || (a.typeName||String(a.type))===$('type').value);$('actor').replaceChildren(option('','선택'),...shown.map(a=>option(String(a.index),`${a.typeName||a.type} · ${a.name||'#'+a.index}`)));detail(null);fit();}
  function load() {
    const stage=stages[stageIndex], variants=stage.json.stageInitParamList;
    const manual=$('mode').value==='manual',count=Number($('count').value);
    const population=M.populationView(variants,count,$('online').checked,manual?variantIndex:null,P);
    variantIndex=population.index;$('stage').value=String(stageIndex);
    $('variant').replaceChildren(...variants.map((v,i)=>option(String(i),`${i+1} / ${variants.length} · createIndex ${v.createIndex}`)));$('variant').value=String(variantIndex);
    const variant=population.variant;allActors=population.visibleActors;
    geometry=M.geometryVariant(geometryData,stage.stageId,variant);
    $('geometry-note').textContent=`원본 지형 ${geometry.width} × ${geometry.height} · ${geometry.chipSize}px · 원점 (0, 0), Y↓ 확인. 회색 충돌 / 파랑 얼음 / 주황 파괴 / 빨강 낙하. MapRect에 의한 지형 변경은 아직 반영하지 않았습니다.`;
    $('type').replaceChildren(option('','전체'),...Array.from(new Set(allActors.map(a=>a.typeName||String(a.type)))).sort().map(t=>option(t,t)));
    $('title').textContent=stage.stageId.slice(5).split('_').map(Number).join(' — ');
    $('summary').textContent=`${stageIndex+1} / ${stages.length} 라운드 · ${manual?'원본 전체':count+'인 '+($('online').checked?'온라인':'오프라인')} · 오브젝트 ${allActors.length} / ${population.sourceActors.length}개 · 변형 ${variantIndex+1} / ${variants.length}`;
    const settings={...variant};delete settings.actorCreateParamList;if(settings.mapInitParam)settings.mapInitParam={...settings.mapInitParam,mapData:'[손실 없는 baseMap 지형 레이어로 표시]'};
    $('settings').textContent=JSON.stringify(settings,null,2);filter();
  }
  function moveStage(delta){if(!stages.length)return;stageIndex=M.wrap(stageIndex,delta,stages.length);variantIndex=0;load();}
  $('prev').onclick=()=>moveStage(-1);$('next').onclick=()=>moveStage(1);$('fit').onclick=fit;
  $('stage').onchange=()=>{stageIndex=Number($('stage').value);variantIndex=0;load();};
  $('variant').onchange=()=>{variantIndex=Number($('variant').value);$('mode').value='manual';load();};$('type').onchange=filter;
  $('count').onchange=()=>{$('mode').value='auto';load();};$('mode').onchange=load;$('online').onchange=load;
  $('tiles').onchange=fit;
  $('actor').onchange=()=>detail(shown.find(a=>String(a.index)===$('actor').value)||null);
  $('flip').onclick=()=>{view.flipY=!view.flipY;$('flip').textContent=view.flipY?'Y↑':'Y↓';fit();};
  document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||!stages.length)return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveStage(e.key==='ArrowLeft'?-1:1);}
    else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();$('mode').value='manual';variantIndex=M.wrap(variantIndex,e.key==='ArrowUp'?-1:1,stages[stageIndex].json.stageInitParamList.length);load();}
    else if(e.key==='['||e.key===']'){e.preventDefault();$('count').value=String(Math.max(2,Math.min(8,Number($('count').value)+(e.key==='['?-1:1))));$('mode').value='auto';load();}
    else if(e.key.toLowerCase()==='f'){e.preventDefault();fit();}
  });
  canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,f=Math.exp(-e.deltaY*0.001);const next=Math.max(.002,Math.min(8,view.scale*f)),ratio=next/view.scale;view.offsetX=x-(x-view.offsetX)*ratio;view.offsetY=y-(y-view.offsetY)*ratio;view.scale=next;draw();},{passive:false});
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};});
  canvas.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;view.offsetX+=dx;view.offsetY+=dy;drag.x=e.clientX;drag.y=e.clientY;draw();}});
  canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect();detail(M.nearest(shown,view,e.clientX-r.left,e.clientY-r.top));}drag=null;});canvas.addEventListener('pointercancel',()=>drag=null);
  new ResizeObserver(resize).observe(canvas);
  try {if(!P)throw new Error('인원 선택 규칙 연결 실패');const responses=await Promise.all(['/source-data','/source-geometry'].map(url=>fetch(url,{cache:'no-store'})));for(const response of responses)if(!response.ok)throw new Error('원본 데이터 연결 실패 ('+response.status+')');const datasets=await Promise.all(responses.map(r=>r.json()));stages=M.worldStages(datasets[0]);geometryData=datasets[1];attributes=geometryData.tileAttributes;if(!stages.length)throw new Error('월드 라운드가 없습니다.');$('stage').replaceChildren(...stages.map((s,i)=>option(String(i),s.stageId.slice(5).split('_').map(Number).join(' — '))));$('status').textContent=`원본 월드 ${stages.length}개 · 무음`;load();}
  catch(error){$('status').textContent=error.message;$('detail').textContent='로컬 서버의 /source-data 연결을 확인하세요.';document.querySelectorAll('nav button,nav select').forEach(el=>el.disabled=true);}
})();
