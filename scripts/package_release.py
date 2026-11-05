#!/usr/bin/env python3
"""Package a locally validated release candidate; no publishing or signing."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
OUT = ROOT / 'release'
OUT.mkdir(exist_ok=True)

# Fail closed if the static and unit gates have not been met.
subprocess.run(['npm.cmd' if sys.platform == 'win32' else 'npm', 'run', 'release:check'], cwd=ROOT, check=True)

ignore = {'dist', 'release', '.git', 'node_modules', '__pycache__', '.pytest_cache'}
def source_files():
    return sorted((p for p in ROOT.rglob('*') if p.is_file() and not (set(p.relative_to(ROOT).parts) & ignore)), key=lambda p: str(p))

def make_zip(name, members, base, prefix=''):
    target = OUT / name
    with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
        for path in members:
            rel = path.relative_to(base).as_posix()
            # Fixed archive timestamps make repeated packaging reproducible.
            from zipfile import ZipInfo
            item = ZipInfo(prefix + rel, date_time=(2026, 1, 1, 0, 0, 0))
            item.compress_type = ZIP_DEFLATED
            item.external_attr = 0o644 << 16
            archive.writestr(item, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(target) as archive:
        bad = archive.testzip()
        if bad: raise RuntimeError(f'ZIP integrity failure in {name}: {bad}')
    return target

artifacts = [make_zip(f'ClaudeRekindle-{VERSION}-source.zip', source_files(), ROOT, 'claude-rekindle/')]
for platform in ('chrome', 'firefox', 'tampermonkey'):
    base = ROOT / 'dist' / platform
    artifacts.append(make_zip(f'ClaudeRekindle-{VERSION}-{platform}.zip', sorted(p for p in base.rglob('*') if p.is_file()), base))
checksums = '\n'.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}' for p in artifacts) + '\n'
(OUT / 'SHA256SUMS.txt').write_text(checksums, encoding='utf-8')
print('\nRelease candidate archives, not store-signed:')
for path in artifacts: print(f'  {path.name} ({path.stat().st_size:,} bytes)')
print('  SHA256SUMS.txt')
