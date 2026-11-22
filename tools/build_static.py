"""Build a self-contained, static site in docs/."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.parser import parse_markdown  # noqa: E402

CONTENT_DIR = ROOT / "content"
FRONTEND_DIR = ROOT / "frontend"
OUTPUT_DIR = ROOT / "docs"
DATA_DIR = OUTPUT_DIR / "data"

CONCEPT_FIELDS = (
    "id",
    "title",
    "source_id",
    "category",
    "category_name",
    "chapter",
    "definition",
    "overview",
    "highlights",
    "related_concepts",
    "widget",
    "has_interactive",
)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def build_data() -> None:
    parsed = parse_markdown(CONTENT_DIR / "economics-library.md")
    concepts = [
        {field: getattr(concept, field) for field in CONCEPT_FIELDS}
        for concept in parsed.concepts
    ]
    sources = [source.model_dump() for source in parsed.sources]
    write_json(DATA_DIR / "concepts.json", concepts)
    write_json(DATA_DIR / "sources.json", sources)

    for filename in ("sources-page-data.json", "zayd_trading_example.json"):
        source = CONTENT_DIR / filename
        if not source.is_file():
            raise FileNotFoundError(f"Required static data file is missing: {source}")
        shutil.copyfile(source, DATA_DIR / filename)


def copy_frontend() -> int:
    copied = 0
    for source in FRONTEND_DIR.rglob("*"):
        if not source.is_file():
            continue
        if source.suffix.lower() not in {".html", ".css", ".js", ".svg"} \
                and source.name not in {".nojekyll", "robots.txt"}:
            continue
        relative = source.relative_to(FRONTEND_DIR)
        destination = OUTPUT_DIR / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        copied += 1
    return copied


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    build_data()
    copied = copy_frontend()
    concepts = json.loads((DATA_DIR / "concepts.json").read_text(encoding="utf-8"))
    sources = json.loads((DATA_DIR / "sources.json").read_text(encoding="utf-8"))
    print(f"Built {len(concepts)} concepts and {len(sources)} sources in {DATA_DIR.relative_to(ROOT)}")
    print(f"Copied {copied} HTML, CSS, and JavaScript files into {OUTPUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
