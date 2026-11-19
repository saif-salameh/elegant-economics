/*
 * Illustrative straight-line curves:
 *   Demand: Q_d = max(0, 100 - kP); Supply: Q_s = 10 + kP
 *   Point elasticity magnitude: |(dQ/dP) × (P/Q)| = kP/Q
 *   Total revenue: TR = P × Q at the selected price.
 * The displayed elastic, unitary, and inelastic labels follow the
 * price-elasticity categories in the notes: >1, =1, and between 0 and 1.
 */

export function init(widgetContainer) {
  const widgetId = `elasticity-${Math.random().toString(36).slice(2, 9)}`;
  const root = document.createElement('section');
  root.className = 'elasticity-widget';
  root.innerHTML = `
    <style>
      .elasticity-widget { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 1rem; padding: clamp(1rem, 3vw, 1.5rem); }
      .elasticity-widget * { box-sizing: border-box; }
      .elasticity-widget .el-chart { display: block; width: 100%; height: auto; }
      .elasticity-widget .el-grid { stroke: var(--border); stroke-width: 1; }
      .elasticity-widget .el-axis { stroke: var(--text); stroke-width: 1.5; }
      .elasticity-widget .el-curve { fill: none; stroke: var(--primary); stroke-width: 3.5; }
      .elasticity-widget .el-tangent { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 5 4; }
      .elasticity-widget .el-point { fill: var(--accent); stroke: var(--bg); stroke-width: 2; }
      .elasticity-widget .el-label { fill: var(--text); font: 13px system-ui, sans-serif; }
      .elasticity-widget .el-axis-title { font-weight: 650; }
      .elasticity-widget .el-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: .8rem 1.25rem; margin-top: .75rem; }
      .elasticity-widget .el-control { display: grid; gap: .35rem; }
      .elasticity-widget label { font-weight: 600; }
      .elasticity-widget input, .elasticity-widget select { accent-color: var(--primary); color: var(--text); }
      .elasticity-widget select { background: var(--bg); border: 1px solid var(--border); border-radius: .45rem; padding: .45rem; }
      .elasticity-widget .el-readout { margin: .8rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .elasticity-widget .el-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
    </style>
    <svg class="el-chart" viewBox="0 0 660 410" role="img" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">Price elasticity and total revenue</title>
      <desc id="${widgetId}-description">An illustrative curve with a price slider and adjustable steepness. The readout reports point elasticity and total revenue.</desc>
      <g class="el-grid-lines"></g>
      <line class="el-axis" x1="76" y1="30" x2="76" y2="342"></line>
      <line class="el-axis" x1="76" y1="342" x2="610" y2="342"></line>
      <path class="el-curve"></path>
      <line class="el-tangent"></line>
      <circle class="el-point" r="7"></circle>
      <g class="el-labels"></g>
    </svg>
    <div class="el-controls">
      <div class="el-control">
        <label for="${widgetId}-curve">Curve</label>
        <select id="${widgetId}-curve" data-control="curve">
          <option value="demand">Demand</option>
          <option value="supply">Supply</option>
        </select>
      </div>
      <div class="el-control">
        <label for="${widgetId}-price">Price: <output data-value="price">40</output></label>
        <input id="${widgetId}-price" data-control="price" type="range" min="5" max="80" step="1" value="40">
      </div>
      <div class="el-control">
        <label for="${widgetId}-steepness">Steepness: <output data-value="steepness">0.8</output></label>
        <input id="${widgetId}-steepness" data-control="steepness" type="range" min="0.4" max="1.2" step="0.1" value="0.8">
      </div>
    </div>
    <p class="el-readout" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="el-caption">Illustrative model, not real data</p>
  `;

  const svg = root.querySelector('.el-chart');
  const grid = root.querySelector('.el-grid-lines');
  const labels = root.querySelector('.el-labels');
  const curve = root.querySelector('.el-curve');
  const tangent = root.querySelector('.el-tangent');
  const point = root.querySelector('.el-point');
  const readout = root.querySelector('.el-readout');
  const control = (name) => root.querySelector(`[data-control="${name}"]`);
  const valueOutput = (name) => root.querySelector(`[data-value="${name}"]`);
  const plot = { left: 76, right: 610, top: 30, bottom: 342 };
  const maxQuantity = 150;
  const maxPrice = 100;
  const x = (quantity) => plot.left + quantity / maxQuantity * (plot.right - plot.left);
  const y = (price) => plot.bottom - price / maxPrice * (plot.bottom - plot.top);
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  for (let quantity = 0; quantity <= maxQuantity; quantity += 30) {
    const px = x(quantity);
    grid.append(svgNode('line', { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: 'el-grid' }));
    const tick = svgNode('text', { x: px, y: plot.bottom + 21, 'text-anchor': 'middle', class: 'el-label' });
    tick.textContent = String(quantity);
    labels.append(tick);
  }
  for (let price = 0; price <= maxPrice; price += 20) {
    const py = y(price);
    grid.append(svgNode('line', { x1: plot.left, y1: py, x2: plot.right, y2: py, class: 'el-grid' }));
    const tick = svgNode('text', { x: plot.left - 10, y: py + 4, 'text-anchor': 'end', class: 'el-label' });
    tick.textContent = String(price);
    labels.append(tick);
  }
  const priceTitle = svgNode('text', { x: 24, y: 22, class: 'el-label el-axis-title' });
  priceTitle.textContent = 'Price';
  labels.append(priceTitle);
  const quantityTitle = svgNode('text', { x: (plot.left + plot.right) / 2, y: 398, 'text-anchor': 'middle', class: 'el-label el-axis-title' });
  quantityTitle.textContent = 'Quantity';
  labels.append(quantityTitle);
  const curveLabel = svgNode('text', { class: 'el-label el-axis-title' });
  labels.append(curveLabel);

  function render() {
    const price = Number(control('price').value);
    const steepness = Number(control('steepness').value);
    const kind = control('curve').value;
    const isDemand = kind === 'demand';
    const quantityAtPrice = (p) => isDemand
      ? Math.max(0, 100 - steepness * p)
      : 10 + steepness * p;
    const quantity = quantityAtPrice(price);
    const elasticity = quantity > 0 ? steepness * price / quantity : Number.POSITIVE_INFINITY;
    const roundedElasticity = Number(elasticity.toFixed(2));
    const label = roundedElasticity === 1
      ? 'unitary (=1)'
      : roundedElasticity > 1 ? 'elastic (>1)' : 'inelastic (<1)';
    const revenue = price * quantity;

    const curvePoints = [];
    const curvePriceMax = isDemand ? Math.min(maxPrice, 100 / steepness) : maxPrice;
    for (let p = 0; p < curvePriceMax; p += 2) {
      curvePoints.push(`${p === 0 ? 'M' : 'L'} ${x(quantityAtPrice(p))} ${y(p)}`);
    }
    curvePoints.push(`L ${x(quantityAtPrice(curvePriceMax))} ${y(curvePriceMax)}`);
    curve.setAttribute('d', curvePoints.join(' '));
    curveLabel.setAttribute('x', x(quantityAtPrice(72)) + 8);
    curveLabel.setAttribute('y', y(72) - 8);
    curveLabel.textContent = isDemand ? 'Demand' : 'Supply';

    point.setAttribute('cx', x(quantity));
    point.setAttribute('cy', y(price));
    tangent.setAttribute('x1', x(Math.max(0, quantity - 18)));
    tangent.setAttribute('x2', x(Math.min(maxQuantity, quantity + 18)));
    const tangentQuantity1 = Math.max(0, quantity - 18);
    const tangentQuantity2 = Math.min(maxQuantity, quantity + 18);
    const priceFromQuantity = (q) => isDemand ? (100 - q) / steepness : (q - 10) / steepness;
    tangent.setAttribute('y1', y(priceFromQuantity(tangentQuantity1)));
    tangent.setAttribute('y2', y(priceFromQuantity(tangentQuantity2)));
    valueOutput('price').value = String(price);
    valueOutput('steepness').value = steepness.toFixed(1);
    const revenueName = isDemand ? 'Total revenue' : 'Total sales revenue';
    readout.textContent = `${kind === 'demand' ? 'Demand' : 'Supply'} point elasticity: ${Number.isFinite(elasticity) ? roundedElasticity.toFixed(2) : 'unbounded'} — ${label}. ${revenueName}: ${revenue.toFixed(1)} (price × quantity).`;
    svg.setAttribute('aria-label', `${kind} curve at price ${price} and quantity ${quantity.toFixed(1)}; elasticity ${Number.isFinite(elasticity) ? elasticity.toFixed(2) : 'unbounded'}, ${label}; ${revenueName.toLowerCase()} ${revenue.toFixed(1)}.`);
  }

  root.querySelectorAll('input, select').forEach((element) => {
    element.addEventListener('input', render);
    element.addEventListener('change', render);
  });
  render();
  widgetContainer.replaceChildren(root);
}
