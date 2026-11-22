export function buildSourceNote(text, title = "About this source") {
  if (!text) return null;
  const note = document.createElement("aside");
  note.className = "source-page-note";
  note.setAttribute("role", "note");
  const heading = document.createElement("h3");
  const icon = document.createElement("span");
  icon.className = "source-note-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "i";
  heading.append(icon, document.createTextNode(title));
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  note.append(heading, paragraph);
  return note;
}
