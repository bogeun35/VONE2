'use strict';
const fs=require('node:fs'),path=require('node:path');
const registry=require('../campaign/registry').loadRegistry(),ko=require('../campaign/labels.ko.cjs');
const rows=registry.entries.map(e=>({id:e.sourceId,title:ko.entryTitle(e),mechanic:ko.mechanic(e),evidence:e.evidence.status,sourceActions:e.evidence.solutionActions}));
const source=fs.readFileSync(path.join(__dirname,'demo-stages.template.js'),'utf8');
fs.writeFileSync(path.join(__dirname,'demo-stages.js'),source.replace('/*CATALOGUE*/[]',JSON.stringify(rows,null,1)));
console.log(`Generated ${rows.length} reference descriptors`);
