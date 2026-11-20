/*
 * Illustrative yield-curve shapes only; no yield values are modeled.
 * A yield curve graphs expected bond returns across maturities. The notes
 * say it can help gauge the economy's direction, reflects bond investors'
 * feelings about risk, and is often discussed alongside recession risk.
 */

export function init(widgetContainer) {
  const widgetId = `yield-curve-${Math.random().toString(36).slice(2, 9)}`;
  const root = document.createElement('section');
  root.className = 'yield-curve-widget';
  root.innerHTML = `
    <style>
      .yield-curve-widget { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 1rem; padding: clamp(1rem, 3vw, 1.5rem); }
      .yield-curve-widget * { box-sizing: border-box; }
      .yield-curve-widget .yc-chart { display: block; width: 100%; height: auto; }
      .yield-curve-widget .yc-grid { stroke: var(--border); stroke-width: 1; }
      .yield-curve-widget .yc-axis { stroke: var(--text); stroke-width: 1.5; }
      .yield-curve-widget .yc-line { fill: none; stroke: var(--primary); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .yield-curve-widget .yc-label { fill: var(--text); font: 13px system-ui, sans-serif; }
      .yield-curve-widget .yc-title { font-weight: 650; }
      .yield-curve-widget .yc-controls { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: .75rem; }
      .yield-curve-widget button { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 999px; padding: .55rem 1rem; font: inherit; cursor: pointer; }
      .yield-curve-widget button[aria-pressed="true"] { color: var(--bg); background: var(--primary); border-color: var(--primary); }
      .yield-curve-widget button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
      .yield-curve-widget .yc-readout { margin: .85rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .yield-curve-widget .yc-notes,
      .yield-curve-widget .yc-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
    </style>
    <svg class="yc-chart" viewBox="0 0 680 410" role="img" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">Illustrative yield curve</title>
      <desc id="${widgetId}-description">A schematic curve of expected bond returns across maturities. Choose normal, flat, or inverted to change its shape.</desc>
      <g class="yc-grid-lines"></g>
      <line class="yc-axis" x1="72" y1="32" x2="72" y2="330"></line>
      <line class="yc-axis" x1="72" y1="330" x2="625" y2="330"></line>
      <path class="yc-line"></path>
      <g class="yc-labels"></g>
    </svg>
    <div class="yc-controls" role="group" aria-label="Choose a yield curve shape">
      <button type="button" data-shape="normal" aria-pressed="true">Normal</button>
      <button type="button" data-shape="flat" aria-pressed="false">Flat</button>
      <button type="button" data-shape="inverted" aria-pressed="false">Inverted</button>
    </div>
    <p class="yc-readout" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="yc-notes">The notes describe the yield curve as expected returns across bond maturities, a way to gauge the economy’s direction, and a picture of bond investors’ feelings about risk. It is often discussed alongside recession risk. Source 3.1.9.</p>
    <p class="yc-caption">Illustrative model, not real data</p>
  `;

  const curve = root.querySelector('.yc-line');
  const grid = root.querySelector('.yc-grid-lines');
  const labels = root.querySelector('.yc-labels');
  const readout = root.querySelector('.yc-readout');
  const buttons = [...root.querySelectorAll('[data-shape]')];
  const plot = { left: 72, right: 625, top: 32, bottom: 330 };
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const shapes = {
    normal: { title: 'Normal', values: [0.30, 0.42, 0.54, 0.66, 0.78] },
    flat: { title: 'Flat', values: [0.53, 0.53, 0.53, 0.53, 0.53] },
    inverted: { title: 'Inverted', values: [0.78, 0.66, 0.54, 0.42, 0.30] },
  };
  const x = (index) => plot.left + index / 4 * (plot.right - plot.left);
  const y = (relativeReturn) => plot.bottom - relativeReturn * (plot.bottom - plot.top);

  for (let index = 0; index <= 4; index += 1) {
    const px = x(index);
    grid.append(svgNode('line', { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: 'yc-grid' }));
    grid.append(svgNode('line', { x1: plot.left, y1: y(index / 4), x2: plot.right, y2: y(index / 4), class: 'yc-grid' }));
  }
  const yieldLabel = svgNode('text', { x: 18, y: 22, class: 'yc-label yc-title' });
  yieldLabel.textContent = 'Expected bond return';
  const maturityLabel = svgNode('text', { x: (plot.left + plot.right) / 2, y: 390, 'text-anchor': 'middle', class: 'yc-label yc-title' });
  maturityLabel.textContent = 'Maturity';
  const shorterLabel = svgNode('text', { x: plot.left, y: plot.bottom + 22, class: 'yc-label' });
  shorterLabel.textContent = 'Shorter';
  const longerLabel = svgNode('text', { x: plot.right, y: plot.bottom + 22, 'text-anchor': 'end', class: 'yc-label' });
  longerLabel.textContent = 'Longer';
  labels.append(yieldLabel, maturityLabel, shorterLabel, longerLabel);

  function selectShape(name) {
    const shape = shapes[name];
    const points = shape.values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`);
    curve.setAttribute('d', points.join(' '));
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.shape === name)));
    const geometry = name === 'normal' ? 'upward-sloping' : name === 'flat' ? 'flat' : 'downward-sloping';
    readout.textContent = `${shape.title} shape selected: the illustrative curve is ${geometry} from shorter to longer maturities.`;
    root.querySelector('.yc-chart').setAttribute('aria-label', `${shape.title} illustrative yield-curve shape across maturities.`);
  }

  buttons.forEach((button) => button.addEventListener('click', () => selectShape(button.dataset.shape)));
  selectShape('normal');
  widgetContainer.replaceChildren(root);
}
