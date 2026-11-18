const SOURCE_NOTES = {
  "1.1": "Examples in Source 1.1 use Ethiopia and birr; flag them for replacement.",
  "1.2": "FutureLearn country labels need verifying.",
  "2.1": "This source is a rough translation of an academic paper.",
  "4.1": "The IMF chapter data is from 2004.",
  "4.2": "Investopedia (4.2) was not read.",
};

export function buildSourceNote(concept) {
  const sourceId = String(concept.source_id || "").split(".").slice(0, 2).join(".");
  const noteText = SOURCE_NOTES[sourceId];
  if (!noteText) return null;

  const note = document.createElement("aside");
  note.className = "source-note";
  note.setAttribute("aria-labelledby", "source-note-title");

  const heading = document.createElement("h2");
  heading.id = "source-note-title";
  heading.textContent = "Source note";

  const paragraph = document.createElement("p");
  paragraph.textContent = noteText;

  note.append(heading, paragraph);
  return note;
}
