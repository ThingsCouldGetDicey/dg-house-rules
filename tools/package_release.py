#!/usr/bin/env python3
"""Deterministic Foundry module package excluding tests, keys and local data."""
from __future__ import annotations
import argparse
from pathlib import Path
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
EXPECTED=[
    "module.json", "LICENSE", "README.md",
    "scripts/main.js", "scripts/features/roll-target-visibility.js",
    "scripts/features/darkness-playlist.js",
    "scripts/features/journal-theme.js",
    "styles/darkness-playlist.css",
    "styles/king-in-yellow-journal.css",
]
EXPECTED += [f"styles/il-art/{act}{suffix}.svg" for act in ("reference","nyc","bookshop","boston","missing-room","map","hotel","carcosa") for suffix in ("","-frame")]
REPO="https://github.com/ThingsCouldGetDicey/dg-house-rules"
STABLE_MANIFEST=REPO+"/releases/latest/download/module.json"

def package(*,output="dist",tag=None):
    manifest=json.loads((ROOT/"module.json").read_text(encoding="utf-8"))
    info=json.loads((ROOT/"package.json").read_text(encoding="utf-8"))
    if manifest.get("id")!="dg-house-rules":
        raise ValueError("Module identifier has changed")
    version=manifest.get("version")
    if not isinstance(version,str) or not version or info.get("version")!=version:
        raise ValueError("Version must match package.json")
    exact_tag="v"+version
    if tag is not None and tag!=exact_tag:
        raise ValueError("Release tag and module version do not match")
    if manifest.get("manifest")!=STABLE_MANIFEST:
        raise ValueError("Stable release manifest URL mismatch")
    if manifest.get("download")!=REPO+"/releases/download/"+exact_tag+"/dg-house-rules.zip":
        raise ValueError("Version-specific ZIP URL mismatch")
    if manifest.get("compatibility",{}).get("minimum")!="14":
        raise ValueError("Expected Foundry v14 compatibility declaration")
    if "scripts/main.js" not in manifest.get("esmodules",[]):
        raise ValueError("Module entrypoint is missing")
    for rel in EXPECTED:
        p=ROOT/rel
        if not p.is_file() or p.is_symlink() or p.stat().st_size==0:
            raise ValueError("Missing, symlinked or empty required module file: "+rel)

    dest=(ROOT/output).resolve()
    if dest==ROOT or not dest.is_relative_to(ROOT):
        raise ValueError("Output must be a subdirectory of module project")
    dest.mkdir(parents=True,exist_ok=True)
    archive=dest/"dg-house-rules.zip"
    with zipfile.ZipFile(archive,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for rel in EXPECTED:
            contents=(ROOT/rel).read_bytes()
            entry=zipfile.ZipInfo(rel,date_time=(2020,1,1,0,0,0))
            entry.compress_type=zipfile.ZIP_DEFLATED
            entry.external_attr=(0o644 << 16)
            z.writestr(entry,contents,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    raw=(ROOT/"module.json").read_bytes()
    (dest/"module.json").write_bytes(raw)
    with zipfile.ZipFile(archive) as z:
        if sorted(z.namelist())!=sorted(EXPECTED):
            raise ValueError("Unexpected paths in release ZIP")
        if z.read("module.json")!=raw:
            raise ValueError("ZIP manifest and release manifest disagree")
    print(f"Built {archive.relative_to(ROOT)} + {dest.relative_to(ROOT)}/module.json; v{version}")
    return archive

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--tag",default=None)
    p.add_argument("--out",default="dist")
    args=p.parse_args()
    package(output=args.out,tag=args.tag)
