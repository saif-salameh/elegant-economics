/*
 * Illustrative linear model (quantities are limited to 0–100):
 *   Demand: P_d = 100 + d - 0.8Q
 *   Supply: P_s = 10 + s + 0.8Q
 *   Equilibrium: Q_e = (90 + d - s) / 1.6; P_e = 100 + d - 0.8Q_e
 *   At controlled price P_c: Q_d = clamp((100 + d - P_c) / 0.8, 0, 100)
 *                            Q_s = clamp((P_c - 10 - s) / 0.8, 0, 100)
 */

let nextWidgetId = 0;

export function init(widgetContainer) {
  const widgetId = `supply-demand-${++nextWidgetId}`;
  const root = document.createElement('section');
  root.className = 'supply-demand-widget';
  root.innerHTML = `
    <style>
      .supply-demand-widget {
        color: var(--text);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: clamp(1rem, 3vw, 1.5rem);
      }
      .supply-demand-widget * { box-sizing: border-box; }
      .supply-demand-widget .sd-chart { display: block; width: 100%; height: auto; overflow: visible; }
      .supply-demand-widget .sd-grid { stroke: var(--border); stroke-width: 1; }
      .supply-demand-widget .sd-axis { stroke: var(--text); stroke-width: 1.5; }
      .supply-demand-widget .sd-demand { fill: none; stroke: var(--primary); stroke-width: 3; }
      .supply-demand-widget .sd-supply { fill: none; stroke: color-mix(in srgb, var(--accent) 55%, var(--text)); stroke-width: 3; }
      .supply-demand-widget .sd-equilibrium { fill: var(--primary); stroke: var(--bg); stroke-width: 2; }
      .supply-demand-widget .sd-control { stroke: var(--muted); stroke-width: 2; stroke-dasharray: 6 5; }
      .supply-demand-widget .sd-imbalance { fill: color-mix(in srgb, var(--accent) 34%, var(--bg)); stroke: var(--accent); stroke-width: 1; }
      .supply-demand-widget .sd-text { fill: var(--text); font: 13px system-ui, sans-serif; }
      .supply-demand-widget .sd-line-label { font-weight: 650; }
      .supply-demand-widget .sd-controls { display: grid; gap: .9rem 1.25rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); margin-top: 1rem; }
      .supply-demand-widget .sd-control-group { display: grid; gap: .35rem; }
      .supply-demand-widget .sd-equilibrium-toggle { display: flex; align-items: center; gap: .55rem; }
      .supply-demand-widget .sd-equilibrium-toggle input { width: 1rem; height: 1rem; }
      .supply-demand-widget label { font-weight: 600; }
      .supply-demand-widget input, .supply-demand-widget select { accent-color: var(--primary); color: var(--text); }
      .supply-demand-widget select { background: var(--bg); border: 1px solid var(--border); border-radius: .45rem; padding: .45rem; }
      .supply-demand-widget .sd-readout { margin: 1rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .supply-demand-widget .sd-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
      @media (prefers-reduced-motion: no-preference) {
        .supply-demand-widget .sd-demand, .supply-demand-widget .sd-supply, .supply-demand-widget .sd-imbalance { transition: d 120ms ease, points 120ms ease; }
      }
    </style>
    <svg class="sd-chart" viewBox="0 0 640 390" role="img" aria-labelledby="${widgetId}-title ${widgetId}-desc">
      <title id="${widgetId}-title">Supply and demand</title>
      <desc id="${widgetId}-desc">An illustrative supply and demand chart. Use the controls below to shift each curve and set a price ceiling or floor.</desc>
      <defs>
        <clipPath id="${widgetId}-plot-clip">
          <rect class="sd-shade-clip-rect" x="70" y="25" width="520" height="300"></rect>
        </clipPath>
      </defs>
      <g class="sd-grid-lines"></g>
      <g class="sd-shading" clip-path="url(#${widgetId}-plot-clip)"></g>
      <line class="sd-axis sd-y-axis" x1="70" y1="25" x2="70" y2="325"></line>
      <line class="sd-axis sd-x-axis" x1="70" y1="325" x2="590" y2="325"></line>
      <path class="sd-demand"></path>
      <path class="sd-supply"></path>
      <line class="sd-control"></line>
      <circle class="sd-equilibrium" r="6"></circle>
      <g class="sd-labels"></g>
    </svg>
    <div class="sd-controls">
      <div class="sd-control-group">
        <label for="${widgetId}-demand">Demand shift: <output data-output="demand">0</output></label>
        <input id="${widgetId}-demand" data-input="demand" type="range" min="-20" max="20" step="1" value="0">
      </div>
      <div class="sd-control-group">
        <label for="${widgetId}-supply">Supply shift: <output data-output="supply">0</output></label>
        <input id="${widgetId}-supply" data-input="supply" type="range" min="-20" max="20" step="1" value="0">
      </div>
      <div class="sd-control-group">
        <label for="${widgetId}-mode">Price control</label>
        <select id="${widgetId}-mode" data-input="mode">
          <option value="ceiling">Price ceiling</option>
          <option value="floor">Price floor</option>
        </select>
      </div>
      <div class="sd-control-group">
        <label for="${widgetId}-price">Controlled price: <output data-output="price">45</output></label>
        <input id="${widgetId}-price" data-input="price" type="range" min="0" max="120" step="1" value="45">
      </div>
      <label class="sd-equilibrium-toggle" for="${widgetId}-show-equilibrium">
        <input id="${widgetId}-show-equilibrium" data-input="show-equilibrium" type="checkbox" checked>
        Show market equilibrium
      </label>
    </div>
    <p class="sd-readout" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="sd-caption">Illustrative model, not real data</p>
  `;

  const svg = root.querySelector('svg');
  const grid = root.querySelector('.sd-grid-lines');
  const shading = root.querySelector('.sd-shading');
  const shadeClipRect = root.querySelector('.sd-shade-clip-rect');
  const labels = root.querySelector('.sd-labels');
  const demandPath = root.querySelector('.sd-demand');
  const supplyPath = root.querySelector('.sd-supply');
  const controlLine = root.querySelector('.sd-control');
  const equilibriumPoint = root.querySelector('.sd-equilibrium');
  const readout = root.querySelector('.sd-readout');
  const input = (name) => root.querySelector(`[data-input="${name}"]`);
  const output = (name) => root.querySelector(`[data-output="${name}"]`);
  const plot = { left: 70, right: 590, top: 25, bottom: 325 };
  const x = (quantity) => plot.left + (quantity / 100) * (plot.right - plot.left);
  const y = (price) => plot.bottom - (price / 120) * (plot.bottom - plot.top);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  for (let tick = 0; tick <= 100; tick += 20) {
    const tickX = x(tick);
    const vline = svgNode('line', { x1: tickX, y1: plot.top, x2: tickX, y2: plot.bottom, class: 'sd-grid' });
    grid.append(vline);
    const text = svgNode('text', { x: tickX, y: plot.bottom + 21, 'text-anchor': 'middle', class: 'sd-text' });
    text.textContent = String(tick);
    labels.append(text);
  }
  for (let tick = 0; tick <= 120; tick += 20) {
    const tickY = y(tick);
    grid.append(svgNode('line', { x1: plot.left, y1: tickY, x2: plot.right, y2: tickY, class: 'sd-grid' }));
    const text = svgNode('text', { x: plot.left - 12, y: tickY + 4, 'text-anchor': 'end', class: 'sd-text' });
    text.textContent = String(tick);
    labels.append(text);
  }
  const priceLabel = svgNode('text', { x: 22, y: 20, class: 'sd-text sd-line-label' });
  priceLabel.textContent = 'Price';
  labels.append(priceLabel);
  const quantityLabel = svgNode('text', { x: (plot.left + plot.right) / 2, y: 377, 'text-anchor': 'middle', class: 'sd-text sd-line-label' });
  quantityLabel.textContent = 'Quantity';
  labels.append(quantityLabel);
  const demandLabel = svgNode('text', { class: 'sd-text sd-line-label', 'text-anchor': 'start' });
  demandLabel.textContent = 'Demand';
  labels.append(demandLabel);
  const supplyLabel = svgNode('text', { class: 'sd-text sd-line-label', 'text-anchor': 'start' });
  supplyLabel.textContent = 'Supply';
  labels.append(supplyLabel);
  const eqLabel = svgNode('text', { class: 'sd-text sd-line-label' });
  labels.append(eqLabel);

  function render() {
    const d = Number(input('demand').value);
    const s = Number(input('supply').value);
    const controlledPrice = Number(input('price').value);
    const mode = input('mode').value;
    const showEquilibrium = input('show-equilibrium').checked;
    const equilibriumQuantity = clamp((90 + d - s) / 1.6, 0, 100);
    const equilibriumPrice = clamp(100 + d - 0.8 * equilibriumQuantity, 0, 120);
    const demand = (q) => clamp(100 + d - 0.8 * q, 0, 120);
    const supply = (q) => clamp(10 + s + 0.8 * q, 0, 120);

    demandPath.setAttribute('d', `M ${x(0)} ${y(demand(0))} L ${x(100)} ${y(demand(100))}`);
    supplyPath.setAttribute('d', `M ${x(0)} ${y(supply(0))} L ${x(100)} ${y(supply(100))}`);
    equilibriumPoint.setAttribute('cx', x(equilibriumQuantity));
    equilibriumPoint.setAttribute('cy', y(equilibriumPrice));
    equilibriumPoint.style.display = showEquilibrium ? '' : 'none';
    eqLabel.setAttribute('x', x(equilibriumQuantity) + 10);
    eqLabel.setAttribute('y', y(equilibriumPrice) - 10);
    eqLabel.textContent = 'E';
    eqLabel.style.display = showEquilibrium ? '' : 'none';
    demandLabel.setAttribute('x', x(84) + 8);
    demandLabel.setAttribute('y', y(demand(84)) - 7);
    supplyLabel.setAttribute('x', x(84) + 8);
    supplyLabel.setAttribute('y', y(supply(84)) + 16);

    const isBinding = mode === 'ceiling' ? controlledPrice < equilibriumPrice : controlledPrice > equilibriumPrice;
    shading.replaceChildren();
    controlLine.style.display = 'none';
    const controlY = y(controlledPrice);
    shadeClipRect.setAttribute('y', mode === 'ceiling' ? plot.top : controlY);
    shadeClipRect.setAttribute('height', mode === 'ceiling' ? controlY - plot.top : plot.bottom - controlY);

    let imbalanceText = 'Price control is not binding.';
    if (isBinding) {
      const rawDemanded = (100 + d - controlledPrice) / 0.8;
      const rawSupplied = (controlledPrice - 10 - s) / 0.8;
      const quantityDemanded = clamp(rawDemanded, 0, 100);
      const quantitySupplied = clamp(rawSupplied, 0, 100);
      const quantityGap = Math.abs(quantityDemanded - quantitySupplied);
      // Use one shared, clamped horizontal span for both the dotted control
      // line and the shaded triangle base. The curve domain is Q = 0..100.
      const baseStart = x(Math.min(quantitySupplied, quantityDemanded));
      const baseEnd = x(Math.max(quantitySupplied, quantityDemanded));
      const baseY = controlY;
      controlLine.setAttribute('x1', baseStart);
      controlLine.setAttribute('x2', baseEnd);
      controlLine.setAttribute('y1', baseY);
      controlLine.setAttribute('y2', baseY);
      controlLine.style.display = '';
      const points = `${baseStart},${baseY} ${baseEnd},${baseY} ${x(equilibriumQuantity)},${y(equilibriumPrice)}`;
      shading.append(svgNode('polygon', { points, class: 'sd-imbalance' }));
      imbalanceText = `${mode === 'ceiling' ? 'Shortage' : 'Surplus'}: ${quantityGap.toFixed(1)} quantity units.`;
    }

    output('demand').value = `${d > 0 ? '+' : ''}${d}`;
    output('supply').value = `${s > 0 ? '+' : ''}${s}`;
    output('price').value = String(controlledPrice);
    readout.textContent = `Equilibrium price: ${equilibriumPrice.toFixed(1)}; equilibrium quantity: ${equilibriumQuantity.toFixed(1)}. ${imbalanceText}`;
    svg.setAttribute('aria-label', `Supply and demand chart. Equilibrium price ${equilibriumPrice.toFixed(1)}, quantity ${equilibriumQuantity.toFixed(1)}. ${imbalanceText}`);
  }

  root.querySelectorAll('input, select').forEach((control) => control.addEventListener('input', render));
  root.querySelector('[data-input="mode"]').addEventListener('change', render);
  render();
  widgetContainer.replaceChildren(root);
}
