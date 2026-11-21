from flask import Flask, Response, jsonify, send_from_directory, abort, request
from pathlib import Path
from .models import EconomicsData
from .parser import parse_markdown

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.json.ensure_ascii = False
app.json.mimetype = 'application/json; charset=utf-8'

BASE_DIR = Path(__file__).resolve().parent.parent
CONTENT_PATH = BASE_DIR / 'content' / 'economics-library.md'
FINANCIAL_EXAMPLE_PATH = BASE_DIR / 'content' / 'zayd_trading_example.json'

econ_data = parse_markdown(CONTENT_PATH)

@app.route('/api/concepts')
def get_concepts():
    return jsonify([c.model_dump() for c in econ_data.concepts])

@app.route('/api/search')
def search_concepts():
    query = request.args.get('q', '').strip().casefold()
    if not query:
        return jsonify([])
    matches = [
        c for c in econ_data.concepts
        if query in c.title.casefold() or query in c.summary.casefold()
    ]
    return jsonify([c.model_dump() for c in matches])

@app.route('/api/concepts/<concept_id>')
def get_concept(concept_id):
    for c in econ_data.concepts:
        if c.id == concept_id:
            return jsonify(c.model_dump())
    abort(404)

@app.route('/api/sources')
def get_sources():
    return jsonify([s.model_dump() for s in econ_data.sources])

@app.route('/api/financial-example')
def get_financial_example():
    if not FINANCIAL_EXAMPLE_PATH.is_file():
        abort(404)
    return Response(FINANCIAL_EXAMPLE_PATH.read_bytes(), mimetype='application/json')

@app.route('/')
def serve_root():
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
