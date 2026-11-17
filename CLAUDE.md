# Project: Economics Research Website

## Goal
A website showcasing my economics research. Audience: students and
general readers in Jordan. It should feel organized but engaging.

## Source of truth
- `content/economics-library.md` is already converted from my docx
  (~8,100 words: 4 categories, 6 sources, ~80 concept notes).
- Use ONLY my content. Never invent facts or statistics.
- Do not rewrite or overwrite this file. Derived files go elsewhere.

## Site tracks
- Economics = Categories 1-2
- Financing = Category 4
- Category 3 (global economy today) bridges both

## Stack
- Frontend: plain HTML, CSS, vanilla JavaScript (no framework)
- Backend: Python (FastAPI preferred, Flask fine): parse the
  Markdown into structured data, serve a JSON API, provide search,
  serve the static frontend
- Charts: Chart.js or Plotly; diagrams: D3 or inline SVG
- Include requirements.txt and a README with run instructions

## Pages
Home, A-Z index page, track pages with card grids (title, one-line
summary, source tag, "interactive" badge), concept pages (summary,
highlights, interactive element, related concepts from the doc's
cross-source links, source link), Sources page, nav + breadcrumbs.

## Interactivity
One reusable JS module per widget, registered by concept ID.
Examples: supply/demand with shifter sliders, elasticity, PPF,
circular flow, indifference curves/budget line, production stages,
business cycle, yield curve. Label graphs "illustrative models"
unless they use numbers from my doc.

## Theming
CSS variables + a live theme switcher (saved in localStorage), each
with light/dark. Charts must read colors from the variables.
1. Royal purple / white / sunglow gold
2. Blue / white / lemon
3-5. Propose three more suited to an economics site.

## Content cautions (show visibly on relevant pages)
- Investopedia (4.2) was NOT read
- IMF chapter data is from 2004
- 2.1 is a rough translation of an academic paper
- FutureLearn country labels need verifying
- Source 1.1 examples use Ethiopia/birr: flag for replacement
- Add marked placeholders for Jordan-specific content

## Status so far
- DONE: docx converted to Markdown, saved at content/economics-library.md
- NOT DONE: everything else. No plan approved, no code written
  (verify by inspecting the folder).
- Known problem: `python` / `python3` commands failed on my
  machine, and pip install timed out. Python may not be installed
  or on PATH. Diagnose this before any Python work. Try `py
  --version` on Windows. Do not assume the sandbox has internet.

## Working rules
- Plan first, wait for my approval, then build in small steps.
- Build order: 1) backend + content parsing, 2) layout, cards,
  index, 3) theme system, 4) first three widgets (supply/demand,
  PPF, circular flow), 5) remaining widgets.
- Show me how to run it locally after each stage.
- Explain things simply; I'm new to Claude Code.

## Language
Always reply in English, including explanations and code comments.