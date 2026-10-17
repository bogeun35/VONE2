"""Mechanical part of registering a device module in source-stage-runtime.js.
usage: python register_module.py File.js RootGlobal Factory compiledKey stateField "compile expr" "empty compile expr"
The tick wiring, rendering, online state and packaging are done by hand."""
import pathlib, sys
f, root, Fac, key, field, comp, empty = sys.argv[1:8]
p = pathlib.Path(__file__).resolve().parent.parent / "source-migration" / "source-stage-runtime.js"
t = p.read_text(encoding='utf-8')
def sub(o, n):
    global t
    assert t.count(o) == 1, (o[:70], t.count(o))
    t = t.replace(o, n)
# 1. factory require + parameter (always appended after the last one, Dossuns)
last_req = "  common?require('./source-dossun-devices.js'):root.SourceDossunDevices"
tail = t[t.index(last_req):t.index("\n", t.index(last_req))]
# find the current last require line (the one ending with ');')
lines = t.split('\n')
idx = max(i for i, l in enumerate(lines) if l.startswith("  common?require('./") and l.endswith(');'))
lines[idx] = lines[idx][:-2] + ','
lines.insert(idx + 1, f"  common?require('./{f}'):root.{root});")
t = '\n'.join(lines)
head = t.index("function(Terrain,Actor,")
close = t.index(")", head)
t = t[:close] + ',' + Fac + t[close:]
# 2. compile
sub("  const dossuns=Dossuns.compile(", f"  const {key}={comp};\n  const dossuns=Dossuns.compile(")
# 3. supported + warnings
sub("supportedTypes]);", f"supportedTypes,...{Fac}.supportedTypes]);")
i = t.index("missingMechanics.push(...devices.warnings"); j = t.index(chr(10), i); line = t[i:j]
assert line.endswith("||[]));"), line[-40:]
t = t[:i] + line[:-2] + f",...({key}.warnings||[]));" + t[j:]
# 4. compiled object + create
sub(",blackouts,dossuns,", f",blackouts,dossuns,{key},")
sub("dossunState:Dossuns.create(compiled.dossuns||Dossuns.compile([],count,{}))",
    f"dossunState:Dossuns.create(compiled.dossuns||Dossuns.compile([],count,{{}})),{field}:{Fac}.create(compiled.{key}||{empty})")
p.write_text(t, encoding='utf-8')
print('registered', Fac, key, field)
