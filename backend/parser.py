"""
Markdown parser for the economics library.

Extracts:
- Sources from the ``## Source map`` table (ID, Category, Title, Status).
- Concepts from every ``####`` concept note, inheriting the current
  ``# Category`` and ``## Source`` heading as they are scanned.

For each concept the body is split into a summary (text between
``**Summary:**`` and ``**Key highlights**``) and a list of highlights
(the ``- `` bullet lines). Source text is preserved as written; localization
cautions belong in the site presentation rather than parsed source content.
"""
import re
from pathlib import Path
from typing import List, Tuple

from .models import Concept, Source, EconomicsData


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


# Concept IDs that get an interactive widget, mapped to their widget module name.
WIDGET_MAP = {
    "1.1.8":   "ppf",
    "1.1.13":  "circular_flow",
    "1.1.14":  "supply_demand",
    "1.1.16":  "elasticity",
    "1.1.22":  "indifference_curve",
    "1.1.26":  "production_stages",
    "1.1.38":  "business_cycle",
    "3.1.9":   "yield_curve",
}


def _split_body(body: str) -> Tuple[str, List[str]]:
    """Split a concept body into (summary, highlights)."""
    summary = ""
    highlights: List[str] = []

    # Summary: text between "**Summary:**" and "**Key highlights**"
    m = re.search(r"\*\*Summary:\*\*\s*(.*?)\s*\*\*Key highlights\*\*", body, re.DOTALL)
    if m:
        summary = _strip_markdown(m.group(1))
    else:
        # Fallback: first paragraph
        first_para = body.split("\n\n")[0] if body else ""
        summary = _strip_markdown(first_para)

    # Highlights: every "- " bullet line
    raw_highlights = re.findall(r"^\s*[-*]\s+(.*)", body, re.MULTILINE)
    highlights = [_strip_markdown(h) for h in raw_highlights]

    return summary, highlights


def _parse_sources(text: str) -> list[Source]:
    """Parse the source-map table."""
    sources = []
    lines = text.split("\n")
    in_table = False
    for line in lines:
        if re.match(r"^\|\s*ID\s*\|", line):
            in_table = True
            continue
        if in_table:
            if not line.startswith("|"):
                break  # end of table
            if re.match(r"^\|[\s\-:|]+\|$", line):
                continue  # separator row
            cols = [c.strip() for c in line.strip("|").split("|")]
            if len(cols) >= 4:
                src_id, category, title, status = cols[:4]
                sources.append(Source(
                    id=src_id, category=category, title=title, status=status, caveats=[],
                ))
    return sources


def _parse_source_map(raw: str) -> tuple[dict[str, str], dict[str, str]]:
    """Parse the Source map table to get category->name and source->title mappings.

    Source titles come from the matching ``## Source`` heading (not the table
    cell), with markdown syntax stripped.
    """
    cat_map: dict[str, str] = {}
    src_map: dict[str, str] = {}
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
                source_title = _strip_markdown(cols[2])
                m = re.match(r"^(\d+)\.", src_id)
                if m:
                    cat_map[m.group(1)] = cat_name
                src_map[src_id] = source_title
    # Fill titles from the ## Source headings
    for line in lines:
        m = re.match(r"^## Source\s+(\d+\.\d+)\s*[—–�]\s*(.+)$", line)
        if m:
            src_map[m.group(1)] = _strip_markdown(m.group(2))
    return cat_map, src_map


def _extract_related(body: str) -> list[str]:
    """Pull related concept IDs from a 'Related:' line, e.g. 1.1.10–1.1.12."""
    related: list[str] = []
    m = re.search(r"^\s*Related\s*:\s*(.+)$", body, re.MULTILINE | re.IGNORECASE)
    if not m:
        return related
    text = m.group(1)
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


def _expand_code(chunk: str) -> list[str]:
    """Parse a concept code or an inclusive range of concept codes."""
    chunk = chunk.strip()
    single = re.fullmatch(r"\d+\.\d+\.\d+", chunk)
    if single:
        return [chunk]

    match = re.fullmatch(
        r"(\d+\.\d+)\.(\d+)\s*[–-]\s*(?:(\d+\.\d+)\.)?(\d+)",
        chunk,
    )
    if not match:
        return []
    prefix, start, end_prefix, end = match.groups()
    if end_prefix and end_prefix != prefix:
        return []
    start_num, end_num = int(start), int(end)
    if end_num < start_num:
        return []
    return [f"{prefix}.{number}" for number in range(start_num, end_num + 1)]


def _parse_cross_links(text: str) -> dict[str, list[str]]:
    """Expand codes in the cross-source section into concept relationships."""
    links: dict[str, list[str]] = {}
    section = re.search(
        r"# Cross-source links.*?(?=\n# |\Z)", text, re.DOTALL
    )
    if not section:
        return links
    for bullet in re.finditer(r"^\s*[-*]\s+(.+)$", section.group(0), re.MULTILINE):
        codes: list[str] = []
        for parenthetical in re.findall(r"\(([^)]*)\)", bullet.group(1)):
            for chunk in re.split(r"[,;]", parenthetical):
                codes.extend(_expand_code(chunk))
        codes = list(dict.fromkeys(codes))
        if len(codes) < 2:
            continue
        for src_id in codes:
            existing = links.setdefault(src_id, [])
            for other in codes:
                if other != src_id and other not in existing:
                    existing.append(other)
    return links


def parse_markdown(md_path: Path) -> EconomicsData:
    raw = md_path.read_text(encoding="utf-8")
    sources = _parse_sources(raw)
    cross_links = _parse_cross_links(raw)

    # Parse source map for category names and source titles
    cat_map, src_map = _parse_source_map(raw)

    # Scan line by line, tracking current category and source heading
    current_chapter = ""
    concepts: list[Concept] = []

    lines = raw.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        chapter_heading = re.match(r"^### Chapter\s+(\d+)\s*[—–�]\s*(.+)$", line)
        if chapter_heading:
            number, heading_name = chapter_heading.groups()
            current_chapter = CHAPTERS_1_1.get(number, heading_name.strip())

        if line.startswith("#### "):
            title = line.lstrip("# ").strip()
            body_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith("#### ") \
                    and not lines[i].startswith("# Cross-source links"):
                body_lines.append(lines[i])
                i += 1
            body = "\n".join(body_lines).strip()

            m = re.match(r"^(\d+\.\d+\.\d+)", title)
            src_id = m.group(1) if m else "unknown"

            summary, highlights = _split_body(body)
            related = _extract_related(body)
            related.extend(cross_links.get(src_id, []))
            # de-duplicate while preserving order
            seen: set[str] = set()
            related = [r for r in related if not (r in seen or seen.add(r))]

            concept_id = re.sub(r"[^a-zA-Z0-9]", "-", title).lower().strip("-")
            widget = WIDGET_MAP.get(src_id)
            has_interactive = widget is not None

            # Derive category (first digit) and source (first two parts)
            parts = src_id.split(".")
            cat_digit = parts[0] if len(parts) >= 1 else ""
            src_two_part = ".".join(parts[:2]) if len(parts) >= 2 else ""

            category_name = cat_map.get(cat_digit, "")
            source_title = src_map.get(src_two_part, "")

            # Chapter only for Source 1.1
            chapter = ""
            if src_two_part == "1.1" and len(parts) >= 3:
                chapter = current_chapter

            concepts.append(Concept(
                id=concept_id,
                title=title,
                summary=summary,
                highlights=highlights,
                source_id=src_id,
                category=cat_digit,
                category_name=category_name,
                source_title=source_title,
                chapter=chapter,
                has_interactive=has_interactive,
                widget=widget,
                related_concepts=related,
            ))
            continue
        i += 1

    return EconomicsData(concepts=concepts, sources=sources, categories=[])
