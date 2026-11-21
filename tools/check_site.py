"""Code-only checks for the Flask-backed economics research site."""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app import app, econ_data  # noqa: E402
from backend.parser import _expand_code  # noqa: E402

EXPECTED_CONCEPT_COUNT = 149
EXPECTED_CATEGORY_IDS = {str(number) for number in range(1, 7)}


results: list[tuple[str, bool, str]] = []


def record(name: str, passed: bool, detail: str = "") -> None:
    results.append((name, passed, detail))


def check_page_responses(client) -> None:
    html_files = sorted((ROOT / "frontend").rglob("*.html"))
    failures = []
    missing_track_links = []
    for page in html_files:
        relative = page.relative_to(ROOT / "frontend").as_posix()
        route = "/" if relative == "index.html" else f"/{relative}"
        response = client.get(route)
        if response.status_code != 200:
            failures.append(f"{route}: HTTP {response.status_code}")
        source = page.read_text(encoding="utf-8")
        for track_href in ("/track_country_context.html", "/track_financial_statements.html"):
            if track_href not in source:
                missing_track_links.append(f"{relative}: {track_href}")
    record("HTML pages return HTTP 200", not failures, "; ".join(failures) or f"{len(html_files)} pages")
    record(
        "New category tracks appear in every page navigation",
        not missing_track_links,
        "; ".join(missing_track_links) or f"both links found on {len(html_files)} pages",
    )


def check_source_reading_lists(client) -> None:
    response = client.get("/api/sources")
    sources = response.get_json() if response.status_code == 200 else []
    by_id = {source.get("id"): source for source in sources}
    missing_fields = [
        str(source.get("id"))
        for source in sources
        if not isinstance(source.get("consulted"), list)
        or not isinstance(source.get("further_reading_leads"), list)
    ]
    record(
        "Sources API exposes both reading lists",
        response.status_code == 200 and not missing_fields,
        "; ".join(missing_fields) or f"{len(sources)} sources",
    )
    expected = (
        bool(by_id.get("4.2", {}).get("further_reading_leads"))
        and bool(by_id.get("5.1", {}).get("consulted"))
        and bool(by_id.get("5.2", {}).get("consulted"))
    )
    record(
        "Source 4.2 leads and 5.x consultations are parsed",
        expected,
        f"4.2 leads: {len(by_id.get('4.2', {}).get('further_reading_leads', []))}; 5.1 consulted: {len(by_id.get('5.1', {}).get('consulted', []))}; 5.2 consulted: {len(by_id.get('5.2', {}).get('consulted', []))}",
    )
    missing_cautions = [
        source_id
        for source_id, source in by_id.items()
        if (source_id == "4.2" or source_id.startswith(("5.", "6.")))
        and not any("before publishing" in note.lower() for note in source.get("caveats", []))
    ]
    record(
        "Publishing cautions exist for sources 4.2, 5.x, and 6.x",
        not missing_cautions,
        f"missing: {', '.join(missing_cautions) or 'none'}",
    )
    page = (ROOT / "frontend" / "sources.html").read_text(encoding="utf-8")
    record(
        "Sources page renders the reading-list section",
        'id="source-details"' in page and "further_reading_leads" in page,
        "source list container and lead field are present",
    )


def check_concepts_and_details(client) -> list[dict]:
    response = client.get("/api/concepts")
    if response.status_code != 200:
        record(f"Concept API returns {EXPECTED_CONCEPT_COUNT} concepts", False, f"HTTP {response.status_code}")
        return []
    concepts = response.get_json() or []
    record(
        f"Concept API returns {EXPECTED_CONCEPT_COUNT} concepts",
        len(concepts) == EXPECTED_CONCEPT_COUNT,
        f"found {len(concepts)}",
    )
    concept_codes = {str(concept.get("source_id", "")) for concept in concepts}
    category_ids = {str(concept.get("category", "")) for concept in concepts}
    missing_explanations = [
        str(concept.get("source_id", "(unknown)"))
        for concept in concepts
        if not str(concept.get("definition", "")).strip()
        or not str(concept.get("overview", "")).strip()
        or str(concept.get("definition", "")).strip().lower().startswith("definition:")
    ]
    record(
        "Every concept has separate definition and overview fields",
        not missing_explanations,
        f"missing or mislabeled: {', '.join(missing_explanations) or 'none'}",
    )
    record(
        "Concepts cover Categories 1–6",
        category_ids == EXPECTED_CATEGORY_IDS,
        f"found Categories {', '.join(sorted(category_ids, key=lambda value: int(value) if value.isdigit() else 99))}",
    )
    parsed_categories = {str(category.id) for category in econ_data.categories}
    record(
        "Parser exposes Categories 1–6",
        parsed_categories == EXPECTED_CATEGORY_IDS,
        f"found Categories {', '.join(sorted(parsed_categories, key=int))}",
    )
    failures = []
    for concept in concepts:
        concept_id = str(concept.get("id", ""))
        detail = client.get(f"/api/concepts/{quote(concept_id, safe='')}")
        if detail.status_code != 200 or (detail.get_json() or {}).get("id") != concept_id:
            failures.append(f"{concept_id}: HTTP {detail.status_code}")
    record("Every concept detail API route resolves", not failures, "; ".join(failures) or f"{len(concepts)} detail records")

    last = concepts[-1] if concepts else {}
    last_content = " ".join([
        str(last.get("summary", "")),
        " ".join(str(item) for item in last.get("highlights", [])),
        str(last.get("notes", "") or ""),
        " ".join(str(item) for item in last.get("related_concepts", [])),
    ])
    record(
        "Last concept is 6.5.4 without cross-source section text",
        last.get("source_id") == "6.5.4" and "# Cross-source links" not in last_content,
        f"last source ID: {last.get('source_id', '(missing)')}",
    )

    raw = (ROOT / "content" / "economics-library.md").read_text(encoding="utf-8")
    section = re.search(r"^# Cross-source links\b.*?(?=^# |\Z)", raw, re.M | re.S)
    unresolved: list[str] = []
    malformed: list[str] = []
    if section:
        for bullet in re.findall(r"^\s*[-*]\s+(.+)$", section.group(0), re.M):
            for parenthetical in re.findall(r"\(([^)]*)\)", bullet):
                for token in re.split(r"[,;]", parenthetical):
                    expanded = _expand_code(token)
                    if not expanded:
                        malformed.append(token.strip())
                    unresolved.extend(code for code in expanded if code not in concept_codes)
    else:
        malformed.append("cross-source section not found")
    record(
        "Every cross-source link code resolves",
        not unresolved and not malformed,
        f"unresolved: {', '.join(sorted(set(unresolved))) or 'none'}; malformed: {', '.join(sorted(set(malformed))) or 'none'}",
    )

    related_unresolved = sorted({
        str(code)
        for concept in concepts
        for code in concept.get("related_concepts", [])
        if str(code) not in concept_codes
    })
    record(
        "All parsed related concept codes resolve",
        not related_unresolved,
        f"unresolved: {', '.join(related_unresolved) or 'none'}",
    )
    return concepts


def check_widget_files(concepts: list[dict]) -> None:
    missing = []
    for concept in concepts:
        widget = concept.get("widget")
        if not widget:
            continue
        candidate = (ROOT / "frontend" / "js" / "widgets" / f"{widget}.js").resolve()
        if ROOT / "frontend" / "js" / "widgets" not in candidate.parents or not candidate.is_file():
            missing.append(f"{concept.get('id')}: {widget}.js")
    record("All API widget files exist", not missing, "; ".join(missing) or "all mapped files exist")


def check_backend_requirements() -> None:
    requirements = ROOT / "backend" / "requirements.txt"
    declared = set()
    for line in requirements.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            declared.add(re.split(r"[<>=!~\[]", line, maxsplit=1)[0].lower().replace("_", "-"))
    distributions = {"flask": "flask", "pydantic": "pydantic"}
    imported = set()
    for source in (ROOT / "backend").glob("*.py"):
        tree = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported.update(alias.name.split(".", 1)[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                imported.add(node.module.split(".", 1)[0])
    stdlib = getattr(sys, "stdlib_module_names", set())
    needed = {distributions.get(name.lower(), name.lower().replace("_", "-")) for name in imported if name not in stdlib and name != "backend"}
    missing = sorted(needed - declared)
    record("Backend imports are covered by requirements.txt", not missing, f"missing: {', '.join(missing)}" if missing else f"runtime imports: {', '.join(sorted(needed))}")


COLOR_FUNCTION = re.compile(r"\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\(", re.I)
HEX_COLOR = re.compile(r"(?<![\w-])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])", re.I)
COLOR_PROPERTY = re.compile(
    r"(?:^|[;{])\s*(?:color|background(?:-color)?|border(?:-[\w-]+)?-color|outline(?:-color)?|fill|stroke|text-decoration-color|box-shadow)\s*:\s*([^;}]+)",
    re.I | re.M,
)
NAMED_COLORS = set("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split())


def check_hardcoded_colors() -> None:
    offenders = []
    frontend = ROOT / "frontend"
    for path in [*frontend.rglob("*.css"), *frontend.rglob("*.html"), *frontend.rglob("*.js")]:
        if path == frontend / "css" / "variables.css":
            continue
        text = path.read_text(encoding="utf-8")
        for match in HEX_COLOR.finditer(text):
            offenders.append(f"{path.relative_to(ROOT)}:{text.count(chr(10), 0, match.start()) + 1} {match.group(0)}")
        for match in COLOR_FUNCTION.finditer(text):
            offenders.append(f"{path.relative_to(ROOT)}:{text.count(chr(10), 0, match.start()) + 1} {match.group(0)}")
        for match in COLOR_PROPERTY.finditer(text):
            value = match.group(1)
            named = [word for word in re.findall(r"\b[a-z]+\b", value.lower()) if word in NAMED_COLORS]
            if named:
                offenders.append(f"{path.relative_to(ROOT)}:{text.count(chr(10), 0, match.start()) + 1} named color {named[0]}")
    record("No hard-coded colors outside variables.css", not offenders, "; ".join(offenders[:15]) or "none found")


def check_external_assets_and_chartjs() -> None:
    frontend = ROOT / "frontend"
    external = []
    all_frontend = []
    for path in [*frontend.rglob("*.js"), *frontend.rglob("*.css"), *frontend.rglob("*.html")]:
        text = path.read_text(encoding="utf-8")
        all_frontend.append((path, text))
        if path.suffix in {".js", ".css"}:
            for match in re.finditer(r"https?://[^\s\"'<>)]*", text, re.I):
                url = match.group(0).rstrip(";,}")
                if url not in {"http://www.w3.org/2000/svg", "http://www.w3.org/1999/xhtml"}:
                    external.append(f"{path.relative_to(ROOT)}:{text.count(chr(10), 0, match.start()) + 1} {url}")
        else:
            for match in re.finditer(r"<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)\s*=\s*['\"](https?://[^'\"]+)", text, re.I):
                external.append(f"{path.relative_to(ROOT)} {match.group(1)}")
            for block in re.finditer(r"<(script|style)\b[^>]*>(.*?)</\1\s*>", text, re.I | re.S):
                for match in re.finditer(r"https?://[^\s\"'<>)]*", block.group(2), re.I):
                    url = match.group(0).rstrip(";,}")
                    if url not in {"http://www.w3.org/2000/svg", "http://www.w3.org/1999/xhtml"}:
                        external.append(f"{path.relative_to(ROOT)} inline {block.group(1)}: {url}")
    record("No external HTTP(S) script or stylesheet URLs", not external, "; ".join(external[:15]) or "none found")
    chartjs = [f"{path.relative_to(ROOT)}:{text.lower().find('chart.js') + 1}" for path, text in all_frontend if "chart.js" in text.lower()]
    record("No Chart.js references", not chartjs, "; ".join(chartjs) or "none found")


def check_utf8_meta() -> None:
    missing = []
    for page in sorted((ROOT / "frontend").rglob("*.html")):
        text = page.read_text(encoding="utf-8")
        if not re.search(r"<meta\s+[^>]*charset\s*=\s*['\"]?utf-8", text, re.I):
            missing.append(str(page.relative_to(ROOT)))
    record("Every HTML page declares UTF-8", not missing, "; ".join(missing) or "all pages declare UTF-8")


def main() -> int:
    check_backend_requirements()
    with app.test_client() as client:
        check_page_responses(client)
        concepts = check_concepts_and_details(client)
        check_source_reading_lists(client)
    check_widget_files(concepts)
    check_hardcoded_colors()
    check_external_assets_and_chartjs()
    check_utf8_meta()
    for name, passed, detail in results:
        print(f"{'PASS' if passed else 'FAIL'}  {name}: {detail}")
    passed_count = sum(passed for _, passed, _ in results)
    print(f"\n{passed_count}/{len(results)} checks passed")
    return 0 if passed_count == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
