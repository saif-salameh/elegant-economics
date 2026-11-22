import { fetchConcepts } from "../api.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function addBandPair(parent, labelText, valueText, className = "") {
  const pair = document.createElement("span");
  pair.className = `band-pair ${className}`.trim();

  const label = document.createElement("span");
  label.className = "band-label";
  label.textContent = labelText;

  const value = document.createElement("span");
  value.className = "band-value";
  value.textContent = valueText;

  pair.append(label, value);
  parent.append(pair);
}

function addInteractiveIcon(parent) {
  const badge = document.createElement("span");
  badge.className = "interactive-chip";
  badge.setAttribute("aria-label", "Interactive concept");
  badge.title = "Interactive concept";

  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");

  const outline = document.createElementNS(SVG_NAMESPACE, "rect");
  outline.setAttribute("x", "4");
  outline.setAttribute("y", "4");
  outline.setAttribute("width", "16");
  outline.setAttribute("height", "16");
  outline.setAttribute("rx", "3");

  const details = document.createElementNS(SVG_NAMESPACE, "path");
  details.setAttribute("d", "M9 4V2m6 2V2M9 22v-2m6 2v-2M4 9H2m2 6H2m20-6h-2m2 6h-2M9 9h6v6H9z");

  icon.append(outline, details);
  badge.append(icon);
  parent.append(badge);
}

export function buildConceptCard(concept, { featured = false, compact = false } = {}) {
  const conceptNumber = String(concept.source_id || "");
  const category = String(concept.category || conceptNumber.split(".")[0] || "1");
  const titleText = String(concept.title || "Untitled concept")
    .replace(/^\d+\.\d+\.\d+\s*/, "");
  const categoryName = String(concept.category_name || `Category ${category}`);

  const link = document.createElement("a");
  link.className = [
    "glass-card-link",
    featured ? "featured-card-link" : "",
    compact ? "compact-card-link" : "",
  ].filter(Boolean).join(" ");
  link.href = `concept_detail.html?id=${encodeURIComponent(concept.id)}`;
  link.setAttribute("aria-label", `${titleText}. ${categoryName}. Concept ${conceptNumber}.`);

  const card = document.createElement("article");
  card.className = [
    "glass-card",
    featured ? "featured-card" : "grid-card",
    compact ? "compact-card" : "",
  ].filter(Boolean).join(" ");
  card.dataset.category = category;

  const head = document.createElement("div");
  head.className = "card-head";

  const sourceTag = document.createElement("span");
  sourceTag.className = "source-tag";
  sourceTag.textContent = `Source ${conceptNumber.split(".").slice(0, 2).join(".")}`;
  head.append(sourceTag);
  if (concept.has_interactive) addInteractiveIcon(head);

  const copy = document.createElement("div");
  copy.className = "card-copy";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = titleText;

  const summary = document.createElement("p");
  summary.className = "card-summary";
  summary.textContent = String(concept.definition || concept.summary || "").replace(/^\s*Definition:\s*/i, "");
  copy.append(title, summary);

  const band = document.createElement("div");
  band.className = "card-band";
  addBandPair(band, "Category", categoryName);
  addBandPair(band, "Concept", conceptNumber, "concept-pair");

  card.append(head, copy, band);
  link.append(card);
  return link;
}

export { fetchConcepts };

const foldForSearch = value => String(value ?? "")
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replaceAll("ß", "ss")
  .replaceAll("ς", "σ");

export async function searchConcepts(query, availableConcepts) {
  const needle = foldForSearch(query).trim();
  if (!needle) return [];
  const concepts = Array.isArray(availableConcepts) ? availableConcepts : await fetchConcepts();
  return concepts.filter(concept => {
    const searchableText = [
      concept.title,
      concept.definition,
      concept.overview,
      ...(Array.isArray(concept.highlights) ? concept.highlights : []),
    ].map(foldForSearch).join(" ");
    return searchableText.includes(needle);
  });
}

export function showCardLoadError(container, error) {
  const message = document.createElement("p");
  message.className = "card-load-error";
  message.setAttribute("role", "alert");
  message.textContent = error.message;
  container.replaceChildren(message);
}
