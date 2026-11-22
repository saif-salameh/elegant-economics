// Simple wrapper for fetching data from the Flask API
const API_BASE = '/api';

export async function fetchConcepts() {
  const resp = await fetch(`${API_BASE}/concepts`);
  if (!resp.ok) throw new Error('Failed to load concepts');
  return resp.json();
}

export async function fetchConcept(id) {
  const resp = await fetch(`${API_BASE}/concepts/${id}`);
  if (!resp.ok) throw new Error('Concept not found');
  return resp.json();
}

export async function fetchSources() {
  const resp = await fetch(`${API_BASE}/sources`);
  if (!resp.ok) throw new Error('Failed to load sources');
  return resp.json();
}

export async function fetchSourcesPageData() {
  const url = "/api/sources-page-data";
  let resp;
  try {
    resp = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (error) {
    throw new Error(`${url} could not be reached (HTTP status unavailable): ${error.message}`);
  }
  if (!resp.ok) {
    let detail = "";
    try {
      const payload = await resp.json();
      detail = payload?.error ? ` ${payload.error}` : "";
    } catch {
      // Keep the HTTP status even if an error response is not JSON.
    }
    throw new Error(`${url} returned HTTP ${resp.status}.${detail}`);
  }
  try {
    return await resp.json();
  } catch (error) {
    throw new Error(`${url} returned invalid JSON (HTTP ${resp.status}): ${error.message}`);
  }
}

export async function fetchSource(id) {
  const resp = await fetch(`${API_BASE}/sources/${id}`);
  if (!resp.ok) throw new Error('Source not found');
  return resp.json();
}
