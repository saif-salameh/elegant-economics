import { fetchSourcesPageData } from "../api.js";

let notesDataPromise;

function buildNote(text) {
  if (!text) return null;
  const note = document.createElement("aside");
  note.className = "source-note";
  note.setAttribute("role", "note");
  const heading = document.createElement("h2");
  const icon = document.createElement("span");
  icon.className = "source-note-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "i";
  heading.append(icon, document.createTextNode("About this source"));
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  note.append(heading, paragraph);
  return note;
}

export async function buildSourceNotes(concept) {
  notesDataPromise ||= fetchSourcesPageData();
  const data = await notesDataPromise;
  const sourceId = String(concept.source_id || "").split(".").slice(0, 2).join(".");
  const notes = [];
  const sourceNote = buildNote(data.source_notes?.[sourceId]);
  if (sourceNote) notes.push(sourceNote);
  if (sourceId.startsWith("6.")) {
    const categoryNote = buildNote(data.category_notes?.["6"]);
    if (categoryNote) notes.push(categoryNote);
  }
  return notes;
}
