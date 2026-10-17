'use strict';
const fs=require('node:fs'),path=require('node:path');
const dir=__dirname,read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const resources=read('resources_assets.json'),globals=read('globalgamemanagers_assets.json'),settings=read('globalgamemanagers.json');
const byId=new Map(resources.objects.map(o=>[o.path_id,o]));
const scripts=new Map(globals.objects.filter(o=>o.type==='MonoScript').map(o=>[o.path_id,o.fields]));
const fields=o=>o?.fields||o?.partial_fields_only||{};
const prefabs=[];
for(const obj of resources.objects){
 if(obj.type!=='GameObject')continue;
 const go=fields(obj),components=go.m_Component.map(c=>byId.get(c.component.m_PathID)).filter(Boolean),transform=components.find(c=>c.type==='Transform');
 if(!transform||fields(transform).m_Father?.m_PathID)continue;
 prefabs.push({name:go.m_Name,game_object_path_id:obj.path_id,local_position:fields(transform).m_LocalPosition,local_scale:fields(transform).m_LocalScale,
  components:components.map(c=>{const f=fields(c),script=c.type==='MonoBehaviour'?scripts.get(f.m_Script?.m_PathID):null;return {type:c.type,path_id:c.path_id,...(script?{script:script.m_ClassName,namespace:script.m_Namespace,assembly:script.m_AssemblyName}:{}),fields_complete:!!c.fields}})});
}
fs.writeFileSync(path.join(dir,'prefab-catalog.json'),JSON.stringify({notice:'Prefab roots, NOT instantiated level layouts or a level count. Local transforms are prefab defaults.',prefabs},null,2));
const build=settings.objects.find(o=>o.type==='BuildSettings').fields;
const relevantScripts=globals.objects.filter(o=>o.type==='MonoScript'&&['Assembly-CSharp','PhotonQuantumCode','PhotonQuantum'].includes(o.fields?.m_AssemblyName)&&/Player|Lift|Bridge|Door|Switch|Box|Coin|Timer|Rope|Stage|Physics/.test(o.fields.m_ClassName)).map(o=>({path_id:o.path_id,...o.fields}));
fs.writeFileSync(path.join(dir,'gameplay-script-catalog.json'),JSON.stringify({notice:'Class existence is confirmed; field values, runtime use and stage placement are not established by class names.',scripts:relevantScripts},null,2));
const findings={source:'Installed PICO PARK 2, read only',unity_version:build.m_Version,
 scene_count:build.scenes.length,scene_paths:build.scenes,scene_count_is_not_stage_count:true,
 resource_counts:resources.type_counts,resource_partial_mono_behaviours:resources.objects.filter(o=>o.type==='MonoBehaviour'&&!o.fields).length,
 prefab_root_count:prefabs.length,physics_constants_confirmed:false,stage_geometry_confirmed:false,
 settings_candidates:[6165,6168,6169,6173].map(id=>({path_id:id,name:fields(byId.get(id)).m_Name,script:scripts.get(fields(byId.get(id)).m_Script?.m_PathID)?.m_ClassName,fields_complete:!!byId.get(id)?.fields})),
 generator_attempt:{tool:'TypeTreeGeneratorAPI 0.0.10',input_files:['GameAssembly.dll','il2cpp_data/Metadata/global-metadata.dat'],result:'failed to generate MonoBehaviour trees: Sequence contains no matching element / failed to dump nodes raw',claim:'No gameplay constants were recovered by this attempt.'},
 cautions:['Unity global gravity -9.81 is a project setting, not proof of the Quantum player movement formula.','StreamingAssets/Stage/PP2 contains 94 files; this alone is not a verified stage count.','No image, music or native game code was exported or run.','Unknown trailing MonoBehaviour bytes have not been interpreted as gameplay values.']};
fs.writeFileSync(path.join(dir,'findings.json'),JSON.stringify(findings,null,2));
fs.writeFileSync(path.join(dir,'findings.txt'),[
 'PICO PARK 2 installed-data inspection — read only',
 'Confirmed: Unity '+build.m_Version+'; 14 BuildSettings scenes are Boot/UI/Title/Select/Stage UI, not 14 gameplay levels.',
 'Confirmed: resources.assets contains 1847 GameObjects and 2348 MonoBehaviours; 2101 MonoBehaviours have only known base headers readable.',
 'Confirmed: '+prefabs.length+' root prefab objects catalogued. These are reusable object definitions, not stage placements.',
 'Confirmed: PhotonQuantum/PhotonQuantumCode class names include player, bridge, lift, switches, boxes and timer components.',
 'Unconfirmed: actual player speed/jump/gravity, collision dimensions in the gameplay simulation, per-stage geometry, file-to-stage mapping.',
 'Candidate config objects: 6165 DefaultCharacterController2D, 6168 DefaultPhysicsMaterial, 6169 SimulationConfig, 6173 DeterministicConfig. Values are still unreadable.',
 'TypeTreeGeneratorAPI metadata attempt failed; see typed-inspection.log. Unknown data has not been guessed.',
 'Do not use -9.81 from Unity project settings as the player movement gravity; deterministic Quantum components are present.',
 'Do not equate the 94 PP2 files with 94 stages.',
 'No image/audio/native code export. No modification of installed game files.'
].join('\n')+'\n');
console.log(JSON.stringify({prefab_roots:prefabs.length,relevant_script_names:relevantScripts.length,settings_candidates:findings.settings_candidates}));
