# Economics Research Website

A small research website that presents the concepts in `content/economics-library.md` for students and general readers in Jordan. The source library is the content authority; the pages and widgets are derived from it. The site uses Flask, plain HTML/CSS, and vanilla JavaScript.

## Project structure

- `backend/` — Flask application, Markdown parser, data models, and Python dependencies.
- `content/economics-library.md` — the source notes. Do not overwrite this file with generated content.
- `frontend/` — HTML pages, CSS, theme controls, reusable card component, and widgets.
- `tools/check_site.py` — code-only project checks using Flask's test client.
- `run.bat` — Windows launcher.

## Run on Windows

1. Install Python 3.10 or newer and make sure `python` works in Command Prompt or PowerShell.
2. From the project folder, install the backend dependencies:

   ```bat
   python -m pip install -r backend\requirements.txt
   ```

3. Start the development server with `run.bat`, or run this command from the project folder:

   ```bat
   python -m flask --app backend.app run
   ```

4. Open the local address printed by Flask (normally `http://127.0.0.1:5000/`).

## API

- `GET /api/concepts` — all parsed concept records.
- `GET /api/concepts/<concept_id>` — one concept, such as `/api/concepts/1.1.13`.
- `GET /api/search?q=<text>` — title and summary search; an empty query returns an empty list.
- `GET /api/sources` — source records.

## Add a widget

Create a vanilla JavaScript module under `frontend/js/widgets/`, for example `my_widget.js`. Export `init(widgetContainer)` and build the widget inside that container. Keep it self-contained, use CSS variables for colors, and avoid network requests and external libraries. Then add the concept ID and filename (without `.js`) to `WIDGET_MAP` in `backend/parser.py`; the API uses that mapping to set `has_interactive` and `widget` for concept cards and detail pages.

## Themes

`frontend/js/theme.js` applies the saved palette before page content renders and stores the selection in local storage under `economics-theme`. The palette is stored as a key such as `theme-1`; dark mode appends ` dark` to the `data-theme` attribute, producing values such as `theme-1 dark`. `frontend/css/variables.css` has matching selectors for all five palettes in light and dark mode. The legacy aliases `purple-gold` and `blue-lemon` (and their dark values) are also supported. Theme controls are added to page headers by the theme script.

## Content cautions and limitations

- Investopedia (source 4.2) was not read; its notes need review.
- IMF chapter data is from 2004.
- Source 2.1 is a rough translation of an academic paper.
- FutureLearn country labels need verification.
- Source 1.1 examples use Ethiopia and birr; replace or contextualize them for the Jordan audience.
- Jordan-specific context remains a marked placeholder until suitable material is supplied.
- Widgets are illustrative models, not real data. Their explanatory text is limited to the source notes where applicable.

## Checks

Run the code-only checks (this does not start a web server):

```bat
python tools\check_site.py
```
