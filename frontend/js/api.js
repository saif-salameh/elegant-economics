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

export async function fetchSource(id) {
  const resp = await fetch(`${API_BASE}/sources/${id}`);
  if (!resp.ok) throw new Error('Source not found');
  return resp.json();
}
