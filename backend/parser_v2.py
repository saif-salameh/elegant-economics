"""
Parser v2 – extracts every ``####`` concept note from the economics library.

Returns a list of dicts, each with:
  title, summary, highlights, related (list of source IDs), body,
  source, source_title, chapter, category, category_name

No models.py dependency – pure Python, for quick validation.
"""
import re
from pathlib import Path


# Category map from the Source map table (lines 5-21 of economics-library.md)
CATEGORY_MAP = {
    "1": "Economic Foundations & Core Theory",
    "2": "Modern & Emerging Economic Models",
    "3": "Global Economy, Money & Markets Today",
    "4": "Financial Sector & Financing",
}

# Source titles from the Source map table and ## Source headings
SOURCE_TITLE_MAP = {
    "1.1": "Introduction to Economics (university module, September 2019)",
    "1.2": "FutureLearn — How does the economy work? (2021, updated 2024)",
    "2.1": "Stošić Mihajlović & Trajković — Modern Economy: Features and Developments (2016)",
    "3.1": "World Economic Forum — Economics explained in 10 articles (Oct 2022)",
    "4.1": "IMF — Taxing the Financial Sector, Ch. 1 \"Banks\" (2004)",
    "4.2": "Investopedia — Stock market",
}

# Chapters for Source 1.1 only (from ### Chapter headings)
CHAPTERS_1_1 = {
    "1": "Basics of Economics",
    "2": "Theory of Demand and Supply",
    "3": "Theory of Consumer Behaviour",
    "4": "Theory of Production and Cost",
    "5": "Market Structure",
    "6": "Fundamental Concepts of Macroeconomics",
}


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


def _parse_source_map(raw: str) -> tuple[dict[str, str], dict[str, str]]:
    """Parse the Source map table to get category->name and source->title mappings.

    Source titles come from the matching ``## Source`` heading (not the table
    cell), with markdown syntax stripped.
    """
    cat_map = {}
    src_map = {}
    lines = raw.split("\n")
    in_table = False
    for line in lines:
        if re.match(r"^\|\s*ID\s*\|", line):
            in_table = True
            continue
        if in_table:
            if not line.startswith("|"):
                break
            if re.match(r"^\|[\s\-:|]+\|$", line):
                continue
            cols = [c.strip() for c in line.strip("|").split("|")]
            if len(cols) >= 4:
                src_id = cols[0]
                cat_name = cols[1]
                # Extract first digit of source ID as category
                m = re.match(r"^(\d+)\.", src_id)
                if m:
                    cat_map[m.group(1)] = cat_name
                # Title from the ## Source heading, not the table cell
                src_map[src_id] = ""
    # Now fill titles from the ## Source headings
    for line in lines:
        m = re.match(r"^## Source\s+(\d+\.\d+)\s*[—–]\s*(.+)$", line)
        if m:
            src_map[m.group(1)] = _strip_markdown(m.group(2))
    return cat_map, src_map


def _parse_cross_links(raw: str) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Parse the '# Cross-source links' section.

    Each bullet is ``- **Label** (1.1.13) ↔ term (1.2.8) ↔ ...``.
    Returns (related_map, group_map):
      related_map: concept_id -> list of other concept_ids in the group
      group_map:   concept_id -> list of group labels it belongs to
    """
    related_map: dict[str, list[str]] = {}
    group_map: dict[str, list[str]] = {}

    section = re.search(r"# Cross-source links.*?(?=\n# |\Z)", raw, re.DOTALL)
    if not section:
        return related_map, group_map

    for bullet in re.finditer(r"^\s*[-*]\s+(.+)$", section.group(0), re.MULTILINE):
        text = bullet.group(1)
        # Bold label, e.g. **Circular flow**
        label_match = re.match(r"\*\*(.+?)\*\*", text)
        label = label_match.group(1).strip() if label_match else ""

        # Extract every code, expanding ranges and comma lists
        codes: list[str] = []
        for paren in re.findall(r"\(([^)]*)\)", text):
            paren = paren.strip()
            for chunk in re.split(r"[,;]", paren):
                chunk = chunk.strip()
                rng = re.match(r"^(\d+\.\d+)\.(\d+)\s*[–-]\s*(\d+)$", chunk)
                if rng:
                    prefix, start, end = rng.group(1), int(rng.group(2)), int(rng.group(3))
                    for n in range(start, end + 1):
                        codes.append(f"{prefix}.{n}")
                    continue
                single = re.match(r"^(\d+\.\d+\.\d+)$", chunk)
                if single:
                    codes.append(single.group(1))

        if len(codes) < 2:
            continue

        for src_id in codes:
            existing = related_map.setdefault(src_id, [])
            for other in codes:
                if other != src_id and other not in existing:
                    existing.append(other)
            if label:
                groups = group_map.setdefault(src_id, [])
                if label not in groups:
                    groups.append(label)

    return related_map, group_map


def parse_concepts(md_path: Path) -> list[dict]:
    raw = md_path.read_text(encoding="utf-8")

    # Parse source map for category names and source titles
    cat_map_from_table, src_map_from_table = _parse_source_map(raw)

    # Parse cross-source links section into related-concept and group maps
    related_map, group_map = _parse_cross_links(raw)

    current_category = ""
    current_source = ""
    current_chapter = ""
    concepts: list[dict] = []

    lines = raw.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        if line.startswith("# Category "):
            current_category = line.lstrip("# ").strip()
        elif line.startswith("## Source "):
            current_source = re.sub(r"^## Source\s+", "", line).strip()
        elif line.startswith("### Chapter "):
            current_chapter = re.sub(r"^### Chapter\s+", "", line).strip()

        if line.startswith("#### "):
            title = line.lstrip("# ").strip()
            body_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith("#### ") \
                    and not lines[i].startswith("# Cross-source links"):
                body_lines.append(lines[i])
                i += 1
            body = "\n".join(body_lines).strip()

            summary, highlights = _split_body(body)
            summary = summary.replace("Ethiopia/birr", "Jordan/Dinar")
            highlights = [h.replace("Ethiopia/birr", "Jordan/Dinar") for h in highlights]
            related = _extract_related(body)

            # Extract source_id from title (e.g., "1.1.1 Definition of economics")
            m = re.match(r"^(\d+\.\d+\.\d+)", title)
            concept_src_id = m.group(1) if m else "unknown"

            # Derive category (first digit) and source (first two parts)
            cat_digit = concept_src_id.split(".")[0] if concept_src_id != "unknown" else ""
            src_two_part = ".".join(concept_src_id.split(".")[:2]) if concept_src_id != "unknown" else ""

            # Category name from Source map table
            category_name = cat_map_from_table.get(cat_digit, CATEGORY_MAP.get(cat_digit, ""))

            # Source title from Source map table
            source_title = src_map_from_table.get(src_two_part, SOURCE_TITLE_MAP.get(src_two_part, ""))

            # Chapter only for Source 1.1
            chapter = ""
            if src_two_part == "1.1":
                chapter_num = concept_src_id.split(".")[1] if len(concept_src_id.split(".")) > 1 else ""
                chapter = CHAPTERS_1_1.get(chapter_num, current_chapter)

            concepts.append({
                "title": title,
                "summary": summary,
                "highlights": highlights,
                "related": related,
                "related_concepts": related_map.get(concept_src_id, []),
                "link_groups": group_map.get(concept_src_id, []),
                "body": body,
                "source": src_two_part,
                "source_title": source_title,
                "chapter": chapter,
                "category": cat_digit,
                "category_name": category_name,
            })
            continue
        i += 1

    return concepts


if __name__ == "__main__":
    path = Path(__file__).resolve().parent.parent / "content" / "economics-library.md"
    concepts = parse_concepts(path)
    print(f"Total concepts: {len(concepts)}")

    # Count per category
    cat_counts = {}
    for c in concepts:
        cat = c.get("category", "") or "(empty)"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print("\nPer category:")
    for cat, cnt in sorted(cat_counts.items()):
        print(f"  {cat}: {cnt}")

    # Count per source
    src_counts = {}
    for c in concepts:
        src = c.get("source", "") or "(empty)"
        src_counts[src] = src_counts.get(src, 0) + 1
    print("\nPer source:")
    for src, cnt in sorted(src_counts.items()):
        print(f"  {src}: {cnt}")

    # Empty category count
    empty_cat = cat_counts.get("(empty)", 0)
    print(f"\nEmpty category: {empty_cat}")

    for c in concepts[:3]:
        print(f"\n  {c['title']}")
        print(f"    category: {c['category']} ({c['category_name']})")
        print(f"    source: {c['source']} ({c['source_title']})")
        print(f"    chapter: {c['chapter']}")
        print(f"    summary: {c['summary'][:80]}...")
        print(f"    highlights: {len(c['highlights'])}  related: {c['related']}")