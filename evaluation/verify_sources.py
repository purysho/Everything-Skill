"""Recompute pinned documentation and licence hashes from upstream archives."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen
from zipfile import ZipFile


HERE = Path(__file__).resolve().parent


def raw(source, path):
    url = f"https://raw.githubusercontent.com/{source['repo']}/{source['revision']}/{path}"
    with urlopen(Request(url, headers={"User-Agent": "Everything-Skill-Evaluation"}), timeout=25) as response:
        data = response.read(4_000_001)
    if len(data) > 4_000_000:
        raise ValueError(f"Pinned document exceeds the size budget: {path}")
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archives", type=Path, help="Directory containing owner_repository.zip archives.")
    args = parser.parse_args()
    sources = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
    rows = [line.split("\t") for line in (HERE / "corpus.tsv").read_text(encoding="utf-8").splitlines()]
    hashes = {}
    for key, source in sources.items():
        archive_path = args.archives / (source["repo"].replace("/", "_") + ".zip")
        with ZipFile(archive_path) as archive:
            folder = archive.namelist()[0].split("/")[0]
            if not folder.endswith("-" + source["revision"]):
                raise ValueError(f"Archive does not name the pinned revision for {key}")
            names = set(archive.namelist())
            notice = archive.read(f"{folder}/{source['notice']}")
            expected = b"PYTHON SOFTWARE FOUNDATION LICENSE" if key == "python" else b"Redistribution and use"
            if expected.lower() not in notice.lower():
                raise ValueError(f"Expected licence notice not present for {key}")

            def verify(row):
                _, name, _, _, *override = row
                path = source["path"] + name + ".rst"
                if override:
                    path = "doc/source/" + override[0] + ".rst"
                entry = f"{folder}/{path}"
                content = archive.read(entry) if entry in names else raw(source, path)
                if not content.strip() or re.search(rb"(?im)^\s*[^\w\n]*SPDX-License-Identifier:", content):
                    raise ValueError(f"Independently review missing text or a file-level licence: {key}:{name}")
                return name, sha256(content).hexdigest()

            with ThreadPoolExecutor(max_workers=6) as pool:
                pages = dict(pool.map(verify, (row for row in rows if row[0] == key)))
            hashes[key] = {"notice": sha256(notice).hexdigest(), "pages": pages}
    print(json.dumps(hashes, indent=2))


if __name__ == "__main__":
    main()
