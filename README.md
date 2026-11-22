# Economics Research Website

A static website presenting economics and financial-statement concepts for students and general readers in Jordan. The published site is built into `docs/` and runs without a Python backend. It uses plain HTML, CSS, and JavaScript, with concept and citation data stored as JSON.

## Project structure

- `content/economics-library.md` — source of truth for source and concept notes. Edit this file to update the library; do not edit generated concept data by hand.
- `content/sources-page-data.json` — citations and source notes used on the Sources page.
- `content/zayd_trading_example.json` — fictional company data for the financial-statement widgets.
- `backend/parser.py` — parses the Markdown and maps concept IDs to widgets.
- `frontend/` — source HTML, CSS, JavaScript, favicon, and static-hosting files.
- `tools/build_static.py` — builds the publishable site and JSON data into `docs/`.
- `tools/check_site.py` — checks the source data and generated static site.
- `docs/` — generated site to preview and deploy. It contains pages, styles, scripts, widgets, and `data/` JSON files; it does not contain `content/`, `backend/`, or `tools/`.

## Edit and build the site on Windows

1. Install Python 3.10 or newer and make sure `python` works in Command Prompt or PowerShell.
2. From the project root, install the parser dependencies:

   ```bat
   python -m pip install -r backend\requirements.txt
   ```

3. Edit and save `content/economics-library.md` as UTF-8. Keep its category, source, and concept headings intact so the parser can identify the notes. Edit the source-page JSON files in `content/` when their citations, notes, or example figures need to change.
4. Build the static site from the project root:

   ```bat
   python tools\build_static.py
   ```

   The build writes `docs/data/concepts.json`, `sources.json`, `sources-page-data.json`, and `zayd_trading_example.json`, then copies the site files into `docs/`.
5. Preview it from the project root with Python's static file server:

   ```bat
   python -m http.server 8000 --directory docs
   ```

   Open `http://localhost:8000/`. Stop the preview with `Ctrl+C`.

The site loads JSON through relative `data/` paths. Concept search runs in the browser over titles, definitions, overviews, and highlights, so the published site needs no API server.

## Deploy

Deploy the **contents of `docs/`** to any static web host. For GitHub Pages, select the repository branch and the `/docs` folder as the publishing source. Keep the generated `data/`, `js/`, and `css/` folders alongside the HTML pages. The build includes a `404.html`, favicon, `.nojekyll`, and `robots.txt`.

## Add a concept widget

Create a vanilla JavaScript module in `frontend/js/widgets/`, export `init(widgetContainer)`, then map each applicable concept source ID to the filename (without `.js`) in `WIDGET_MAP` in `backend/parser.py`. Rebuild the site so the widget and updated concept mapping are copied into `docs/`. Widgets use inline SVG and CSS variables, and should not depend on external libraries or services.

## Themes

`frontend/js/theme.js` applies the saved palette before page content renders and stores the choice in local storage under `economics-theme`. The palette uses a key such as `theme-1`; dark mode appends ` dark` to `data-theme`, producing values such as `theme-1 dark`. `frontend/css/variables.css` defines five palettes in light and dark modes. Legacy aliases `purple-gold` and `blue-lemon` are also supported.

## Content cautions and limitations

- Investopedia (source 4.2) was not read; its notes need review.
- IMF chapter data is from 2004.
- Source 2.1 is a rough translation of an academic paper.
- FutureLearn country labels need verification.
- Source 1.1 examples use Ethiopia and birr; replace or contextualize them for the Jordan audience.
- Jordan-specific context remains a marked placeholder until suitable material is supplied.
- Widgets are illustrative models, not real data. Their explanatory text is limited to the source notes where applicable.

## Checks

After rebuilding, run the code-only checks from the project root:

```bat
python tools\check_site.py
```

The checker validates the source records and generated `docs/` output; it does not start a web server.
