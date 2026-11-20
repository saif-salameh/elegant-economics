// Theme switching: palette dropdown + light/dark toggle.
// Sets data-theme on <html> to e.g. "theme-3 dark" and persists to localStorage.
// Dark mode is expressed by appending "dark" to the data-theme value,
// which the CSS selectors in variables.css match (e.g. [data-theme="theme-3 dark"]).

const PALETTES = [
  { id: "theme-1",       label: "Purple / Gold" },
  { id: "theme-2",       label: "Blue / Lemon" },
  { id: "theme-3",       label: "Forest / Terracotta" },
  { id: "theme-4",       label: "Slate / Amber" },
  { id: "theme-5",       label: "Burgundy / Rose" },
  { id: "purple-gold",   label: "Purple / Gold (alias)" },
  { id: "blue-lemon",    label: "Blue / Lemon (alias)" },
];

const STORAGE_KEY = "economics-theme";
const htmlElement = document.documentElement;

// ---- Helpers ----
function savedChoice() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.palette && typeof parsed.dark === "boolean") {
      return parsed;
    }
  } catch (e) {
    /* ignore corrupt storage */
  }
  return null;
}

function saveChoice(palette, dark) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ palette, dark }));
  } catch (e) {
    /* storage unavailable */
  }
}

function applyChoice(palette, dark, save) {
  // Dark mode is signalled by appending "dark" to data-theme, which is what
  // the CSS selectors in variables.css match.
  htmlElement.setAttribute("data-theme", dark ? `${palette} dark` : palette);
  if (save) saveChoice(palette, dark);
}

// ---- Apply saved choice before render (run as early as possible) ----
(function applySavedOnLoad() {
  const saved = savedChoice();
  if (saved) {
    applyChoice(saved.palette, saved.dark, false);
  }
})();

// ---- Build the controls (called after DOM is ready) ----
function buildControls() {
  const header = document.querySelector("header");
  if (!header) return;

  const saved = savedChoice();
  let palette = (saved && saved.palette) || "theme-1";
  let dark = (saved && saved.dark) || false;

  const wrap = document.createElement("div");
  wrap.className = "theme-controls";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "0.5rem";

  const select = document.createElement("select");
  select.id = "theme-palette";
  select.setAttribute("aria-label", "Colour palette");
  PALETTES.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    if (p.id === palette) opt.selected = true;
    select.appendChild(opt);
  });

  const toggle = document.createElement("button");
  toggle.id = "theme-mode";
  toggle.setAttribute("aria-label", "Toggle light/dark mode");
  toggle.textContent = dark ? "🌙 Dark" : "☀️ Light";
  toggle.style.cursor = "pointer";
  toggle.style.padding = "0.4rem 0.7rem";
  toggle.style.border = "1px solid var(--primary)";
  toggle.style.background = "var(--color-clear)";
  toggle.style.color = "var(--bg)";
  toggle.style.borderRadius = "4px";

  // Palette change: keep current light/dark state, persist, update toggle text.
  select.addEventListener("change", () => {
    palette = select.value;
    applyChoice(palette, dark, true);
  });

  // Dark toggle: keep current palette, persist, update toggle text.
  toggle.addEventListener("click", () => {
    dark = !dark;
    applyChoice(palette, dark, true);
    toggle.textContent = dark ? "🌙 Dark" : "☀️ Light";
  });

  wrap.appendChild(select);
  wrap.appendChild(toggle);
  header.appendChild(wrap);
}

// Replace the legacy #theme-switcher button if present
function upgradeLegacySwitcher() {
  const legacy = document.getElementById("theme-switcher");
  if (legacy) legacy.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  upgradeLegacySwitcher();
  buildControls();
});
