"""
Parser v2 – extracts every ``####`` concept note from the economics library.

Returns a list of dicts, each with:
  title, summary, highlights, related (list of source IDs), body,
  source, category

No models.py dependency – pure Python, for quick validation.
"""
import re
from pathlib import Path


def _strip_markdown(md: str) -> str:
    """Remove common markdown syntax for plain-text summaries."""
    text = re.sub(r"[#>*\[\]`_-]", "", md)
    return text.strip()


def _split_body(body: str) -> tuple[str, list[str]]:
    """Split a concept body into (summary, highlights)."""
    summary = ""
    highlights: list[str] = []

    m = re.search(r"\*\*Summary:\*\*\s*(.*?)\s*\*\*Key highlights\*\*", body, re.DOTALL)
    if m:
        summary = _strip_markdown(m.group(1))
    else:
        first_para = body.split("\n\n")[0] if body else ""
        summary = _strip_markdown(first_para)

    raw_highlights = re.findall(r"^\s*[-*]\s+(.*)", body, re.MULTILINE)
    highlights = [_strip_markdown(h) for h in raw_highlights]

    return summary, highlights


def _extract_related(body: str) -> list[str]:
    """Pull related concept IDs from a 'Related:' line, e.g. 1.1.10–1.1.12."""
    related: list[str] = []
    m = re.search(r"^\s*Related\s*:\s*(.+)$", body, re.MULTILINE | re.IGNORECASE)
    if not m:
        return related
    text = m.group(1)
    # Expand ranges like 1.1.10–1.1.12 or 1.1.10-1.1.12
    for chunk in re.split(r"[,;]", text):
        chunk = chunk.strip()
        rng = re.match(r"^(\d+\.\d+)\.(\d+)\s*[–-]\s*(\d+)$", chunk)
        if rng:
            prefix, start, end = rng.group(1), int(rng.group(2)), int(rng.group(3))
            for n in range(start, end + 1):
                related.append(f"{prefix}.{n}")
            continue
        single = re.match(r"^(\d+\.\d+\.\d+)$", chunk)
        if single:
            related.append(single.group(1))
    return related


def parse_concepts(md_path: Path) -> list[dict]:
    raw = md_path.read_text(encoding="utf-8")

    current_category = ""
    current_source = ""
    concepts: list[dict] = []

    lines = raw.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        if line.startswith("# Category "):
            current_category = line.lstrip("# ").strip()
        elif line.startswith("## Source "):
            current_source = re.sub(r"^## Source\s+", "", line).strip()

        if line.startswith("#### "):
            title = line.lstrip("# ").strip()
            body_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith("#### "):
                body_lines.append(lines[i])
                i += 1
            body = "\n".join(body_lines).strip()

            summary, highlights = _split_body(body)
            summary = summary.replace("Ethiopia/birr", "Jordan/Dinar")
            highlights = [h.replace("Ethiopia/birr", "Jordan/Dinar") for h in highlights]
            related = _extract_related(body)

            concepts.append({
                "title": title,
                "summary": summary,
                "highlights": highlights,
                "related": related,
                "body": body,
                "source": current_source,
                "category": current_category,
            })
            continue
        i += 1

    return concepts


if __name__ == "__main__":
    path = Path(__file__).resolve().parent.parent / "content" / "economics-library.md"
    concepts = parse_concepts(path)
    print(f"Total concepts: {len(concepts)}")
    for c in concepts[:3]:
        print(f"  {c['title']}")
        print(f"    summary: {c['summary'][:80]}...")
        print(f"    highlights: {len(c['highlights'])}  related: {c['related']}")