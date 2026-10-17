"""Packaging side of registering a module / opening a round.
usage: python package_module.py --file X.js [--file Y.js] [--state key:field] [--stage st_w_03_01:'2편 3–1']
Adds files to package copy list, deploy app list, play/index.html (before
source-stage-runtime.js), scan MODULES (device files only); states to
online.js DEVICE_STATES; stages to the package catalogue. Idempotent."""
import pathlib, sys, re
B = pathlib.Path(__file__).resolve().parent.parent / "source-migration"
args = sys.argv[1:]
files, states, stages = [], [], []
for i in range(0, len(args), 2):
    k, v = args[i], args[i + 1]
    {'--file': files, '--state': states, '--stage': stages}[k].append(v)
def edit(name, fn):
    p = B / name; t = p.read_text(encoding='utf-8'); n = fn(t)
    if n != t: p.write_text(n, encoding='utf-8'); print('edited', name)
for f in files:
    def pkg(t):
        if f"'{f}'" in t: return t
        return t.replace("'source-dossun-devices.js'])fs.copyFileSync", f"'source-dossun-devices.js','{f}'])fs.copyFileSync".replace("'source-dossun-devices.js','", "'source-dossun-devices.js','", 1)) if "'source-dossun-devices.js'])fs.copyFileSync" in t else re.sub(r"'\]\)fs\.copyFileSync", f"','{f}'])fs.copyFileSync", t, count=1)
    edit('package-source-play.cjs', pkg)
    def dep(t):
        if f"'{f}'" in t: return t
        return t.replace("'source-dossun-devices.js',", f"'source-dossun-devices.js','{f}',", 1)
    edit('deploy-source-play.cjs', dep)
    def html(t):
        if f'src="{f}' in t: return t
        m = re.search(r'<script src="source-stage-runtime\.js[^"]*"></script>', t)
        assert m, 'runtime script tag not found'
        return t[:m.start()] + f'<script src="{f}?v=1"></script>' + t[m.start():]
    edit('play/index.html', html)
    if f.endswith('-devices.js'):
        def scan(t):
            if f"'{f}'" in t: return t
            return re.sub(r"(const MODULES=\[.*?)\];", lambda m: m.group(1) + f",'{f}'];", t, count=1, flags=re.S)
        edit('scan-remaining-work.cjs', scan)
for s in states:
    key, field = s.split(':')
    def onl(t):
        if f"'{field}'" in t: return t
        return re.sub(r"(const DEVICE_STATES=\[.*?)\];", lambda m: m.group(1) + f",['{key}','{field}']];", t, count=1, flags=re.S)
    edit('play/online.js', onl)
for s in stages:
    sid, title = s.split(':', 1)
    def cat(t):
        if f"'{sid}'" in t: return t
        return t.replace("];\n", f",{{id:'{sid}',title:'{title}'}}];\n", 1) if t.startswith("'use strict'") and False else re.sub(r"(const stages=\[.*?)\];", lambda m: m.group(1) + f",{{id:'{sid}',title:'{title}'}}];", t, count=1, flags=re.S)
    edit('package-source-play.cjs', cat)
