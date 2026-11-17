export function init(widgetContainer) {
  const container = document.createElement('div');
  container.innerHTML = `<p><em>Yield‑curve widget – interactive illustration …</em></p>`;
  widgetContainer.appendChild(container);
}