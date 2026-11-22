async function fetchJson(path) {
  let response;
  try {
    response = await fetch(path, { headers: { Accept: "application/json" } });
  } catch (error) {
    throw new Error(`Could not load ${path} (HTTP status unavailable): ${error.message}`);
  }
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${path} returned invalid JSON (HTTP ${response.status}): ${error.message}`);
  }
}

export async function fetchConcepts() {
  const concepts = await fetchJson("data/concepts.json");
  if (!Array.isArray(concepts)) throw new Error("data/concepts.json must contain a concept array.");
  return concepts;
}

export async function fetchConcept(id) {
  const concepts = await fetchConcepts();
  const concept = concepts.find(item => item.id === id || item.source_id === id);
  if (!concept) throw new Error(`Concept not found: ${id}`);
  return concept;
}

export async function fetchSources() {
  const sources = await fetchJson("data/sources.json");
  if (!Array.isArray(sources)) throw new Error("data/sources.json must contain a source array.");
  return sources;
}

export async function fetchSourcesPageData() {
  const data = await fetchJson("data/sources-page-data.json");
  if (!data || !Array.isArray(data.citations) || !Array.isArray(data.other_references)) {
    throw new Error("data/sources-page-data.json has an unexpected data shape.");
  }
  return data;
}

export async function fetchFinancialExample() {
  return fetchJson("data/zayd_trading_example.json");
}

export async function fetchSource(id) {
  const sources = await fetchSources();
  const source = sources.find(item => item.id === id);
  if (!source) throw new Error(`Source not found: ${id}`);
  return source;
}
