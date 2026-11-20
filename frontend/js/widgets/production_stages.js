/*
 * Illustrative short-run production model with labour L as the variable input:
 *   Total product: T(L) = 8L + 2L² - 0.04L³
 *   Average product: APL = T(L)/L = 8 + 2L - 0.04L² (limit at L=0 is 8)
 *   Marginal product: MPL = dT/dL = 8 + 4L - 0.12L²
 *   Stage I ends where APL peaks (L=25); Stage II ends where MPL=0
 *   (L=(4+√19.84)/0.24 ≈ 35.2). These boundaries illustrate the
 *   three stages described in concepts 1.1.25 and 1.1.26.
 */

export function init(widgetContainer) {
  const widgetId = `production-stages-${Math.random().toString(36).slice(2, 9)}`;
  const root = document.createElement('section');
  root.className = 'production-stages-widget';
  root.innerHTML = `
    <style>
      .production-stages-widget { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 1rem; padding: clamp(1rem, 3vw, 1.5rem); }
      .production-stages-widget * { box-sizing: border-box; }
      .production-stages-widget .ps-chart { display: block; width: 100%; height: auto; }
      .production-stages-widget .ps-grid { stroke: var(--border); stroke-width: 1; }
      .production-stages-widget .ps-axis { stroke: var(--text); stroke-width: 1.5; }
      .production-stages-widget .ps-region-one { fill: color-mix(in srgb, var(--primary) 10%, var(--bg)); }
      .production-stages-widget .ps-region-two { fill: color-mix(in srgb, var(--accent) 13%, var(--bg)); }
      .production-stages-widget .ps-region-three { fill: color-mix(in srgb, var(--muted) 14%, var(--bg)); }
      .production-stages-widget .ps-total { fill: none; stroke: var(--primary); stroke-width: 3.5; }
      .production-stages-widget .ps-average { fill: none; stroke: color-mix(in srgb, var(--accent) 55%, var(--text)); stroke-width: 3; }
      .production-stages-widget .ps-marginal { fill: none; stroke: var(--text); stroke-width: 2.5; stroke-dasharray: 7 4; }
      .production-stages-widget .ps-point-total { fill: var(--primary); }
      .production-stages-widget .ps-point-average { fill: color-mix(in srgb, var(--accent) 55%, var(--text)); }
      .production-stages-widget .ps-point-marginal { fill: var(--text); }
      .production-stages-widget .ps-label { fill: var(--text); font: 12px system-ui, sans-serif; }
      .production-stages-widget .ps-title { font-weight: 650; }
      .production-stages-widget .ps-legend { font: 13px system-ui, sans-serif; fill: var(--text); }
      .production-stages-widget .ps-controls { margin-top: .75rem; }
      .production-stages-widget label { display: block; font-weight: 600; margin-bottom: .35rem; }
      .production-stages-widget input { accent-color: var(--primary); width: 100%; }
      .production-stages-widget .ps-readout { margin: .85rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .production-stages-widget .ps-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
    </style>
    <svg class="ps-chart" viewBox="0 0 740 470" role="img" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">Short-run production stages</title>
      <desc id="${widgetId}-description">Total, average, and marginal product curves over stages one, two, and three of short-run production.</desc>
      <g class="ps-regions"></g>
      <g class="ps-grid-lines"></g>
      <line class="ps-axis" x1="78" y1="48" x2="78" y2="370"></line>
      <line class="ps-axis" x1="78" y1="370" x2="660" y2="370"></line>
      <line class="ps-axis" x1="660" y1="48" x2="660" y2="370"></line>
      <path class="ps-total"></path>
      <path class="ps-average"></path>
      <path class="ps-marginal"></path>
      <circle class="ps-point-total" r="5"></circle>
      <circle class="ps-point-average" r="5"></circle>
      <circle class="ps-point-marginal" r="5"></circle>
      <g class="ps-labels"></g>
    </svg>
    <div class="ps-controls">
      <label for="${widgetId}-labour">Labour (variable input): <output data-output="labour">30</output></label>
      <input id="${widgetId}-labour" data-control="labour" type="range" min="0" max="45" step="1" value="30">
    </div>
    <p class="ps-readout" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="ps-caption">Illustrative model, not real data</p>
  `;

  const svg = root.querySelector('.ps-chart');
  const regions = root.querySelector('.ps-regions');
  const grid = root.querySelector('.ps-grid-lines');
  const labels = root.querySelector('.ps-labels');
  const totalCurve = root.querySelector('.ps-total');
  const averageCurve = root.querySelector('.ps-average');
  const marginalCurve = root.querySelector('.ps-marginal');
  const pointTotal = root.querySelector('.ps-point-total');
  const pointAverage = root.querySelector('.ps-point-average');
  const pointMarginal = root.querySelector('.ps-point-marginal');
  const readout = root.querySelector('.ps-readout');
  const labourInput = root.querySelector('[data-control="labour"]');
  const labourOutput = root.querySelector('[data-output="labour"]');
  const plot = { left: 78, right: 660, top: 48, bottom: 370 };
  const labourMax = 45;
  const totalMax = 1100;
  const productMin = -60;
  const productMax = 60;
  const stageOneEnd = 25;
  const stageTwoEnd = (4 + Math.sqrt(19.84)) / 0.24;
  const x = (labour) => plot.left + labour / labourMax * (plot.right - plot.left);
  const yTotal = (product) => plot.bottom - product / totalMax * (plot.bottom - plot.top);
  const yProduct = (product) => plot.bottom - (product - productMin) / (productMax - productMin) * (plot.bottom - plot.top);
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  function totalProduct(labour) {
    return 8 * labour + 2 * labour ** 2 - 0.04 * labour ** 3;
  }
  function averageProduct(labour) {
    return 8 + 2 * labour - 0.04 * labour ** 2;
  }
  function marginalProduct(labour) {
    return 8 + 4 * labour - 0.12 * labour ** 2;
  }

  function render() {
    regions.replaceChildren();
    grid.replaceChildren();
    labels.replaceChildren();
    const stageBounds = [0, stageOneEnd, stageTwoEnd, labourMax];
    const stageClass = ['ps-region-one', 'ps-region-two', 'ps-region-three'];
    for (let stage = 0; stage < 3; stage += 1) {
      regions.append(svgNode('rect', {
        x: x(stageBounds[stage]), y: plot.top,
        width: x(stageBounds[stage + 1]) - x(stageBounds[stage]),
        height: plot.bottom - plot.top, class: stageClass[stage],
      }));
      const stageLabel = svgNode('text', {
        x: (x(stageBounds[stage]) + x(stageBounds[stage + 1])) / 2,
        y: plot.top + 17, 'text-anchor': 'middle', class: 'ps-label ps-title',
      });
      stageLabel.textContent = `Stage ${['I', 'II', 'III'][stage]}`;
      labels.append(stageLabel);
    }
    for (let labour = 0; labour <= labourMax; labour += 5) {
      const px = x(labour);
      grid.append(svgNode('line', { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: 'ps-grid' }));
      const tick = svgNode('text', { x: px, y: plot.bottom + 20, 'text-anchor': 'middle', class: 'ps-label' });
      tick.textContent = String(labour);
      labels.append(tick);
    }
    for (let product = 0; product <= totalMax; product += 200) {
      const py = yTotal(product);
      grid.append(svgNode('line', { x1: plot.left, y1: py, x2: plot.right, y2: py, class: 'ps-grid' }));
      const tick = svgNode('text', { x: plot.left - 10, y: py + 4, 'text-anchor': 'end', class: 'ps-label' });
      tick.textContent = String(product);
      labels.append(tick);
    }
    for (let product = productMin; product <= productMax; product += 20) {
      const tick = svgNode('text', { x: plot.right + 10, y: yProduct(product) + 4, class: 'ps-label' });
      tick.textContent = String(product);
      labels.append(tick);
    }
    const titleLeft = svgNode('text', { x: 18, y: 25, class: 'ps-label ps-title' });
    titleLeft.textContent = 'Total product';
    const titleRight = svgNode('text', { x: plot.right - 88, y: 25, class: 'ps-label ps-title' });
    titleRight.textContent = 'Average / marginal';
    const xTitle = svgNode('text', { x: (plot.left + plot.right) / 2, y: 417, 'text-anchor': 'middle', class: 'ps-label ps-title' });
    xTitle.textContent = 'Labour';
    labels.append(titleLeft, titleRight, xTitle);
    const legendY = 452;
    const legendItems = [
      ['ps-total', 'Total product'],
      ['ps-average', 'Average product'],
      ['ps-marginal', 'Marginal product'],
    ];
    legendItems.forEach(([className, text], index) => {
      const sample = svgNode('line', { x1: 165 + index * 170, y1: legendY - 4, x2: 195 + index * 170, y2: legendY - 4, class: className });
      const legendText = svgNode('text', { x: 202 + index * 170, y: legendY, class: 'ps-legend' });
      legendText.textContent = text;
      labels.append(sample, legendText);
    });

    const totalSegments = [];
    const averageSegments = [];
    const marginalSegments = [];
    for (let step = 0; step <= 90; step += 1) {
      const labour = labourMax * step / 90;
      totalSegments.push(`${step === 0 ? 'M' : 'L'} ${x(labour)} ${yTotal(totalProduct(labour))}`);
      averageSegments.push(`${step === 0 ? 'M' : 'L'} ${x(labour)} ${yProduct(averageProduct(labour))}`);
      marginalSegments.push(`${step === 0 ? 'M' : 'L'} ${x(labour)} ${yProduct(marginalProduct(labour))}`);
    }
    totalCurve.setAttribute('d', totalSegments.join(' '));
    averageCurve.setAttribute('d', averageSegments.join(' '));
    marginalCurve.setAttribute('d', marginalSegments.join(' '));

    const labour = Number(labourInput.value);
    const total = totalProduct(labour);
    const average = averageProduct(labour);
    const marginal = marginalProduct(labour);
    pointTotal.setAttribute('cx', x(labour));
    pointTotal.setAttribute('cy', yTotal(total));
    pointAverage.setAttribute('cx', x(labour));
    pointAverage.setAttribute('cy', yProduct(average));
    pointMarginal.setAttribute('cx', x(labour));
    pointMarginal.setAttribute('cy', yProduct(marginal));
    labourOutput.value = String(labour);

    let stage, explanation;
    if (labour < stageOneEnd) {
      stage = 'Stage I';
      explanation = 'Average product is rising and the fixed input is under-used; this stage is not efficient.';
    } else if (labour < stageTwoEnd) {
      stage = 'Stage II';
      explanation = 'Marginal product is positive but declining; this is the efficient stage.';
    } else {
      stage = 'Stage III';
      explanation = 'Further labour additions reduce total output.';
    }
    readout.textContent = `${stage}. ${explanation} At ${labour} units of labour: total product ${total.toFixed(1)}, average product ${average.toFixed(1)}, marginal product ${marginal.toFixed(1)}.`;
    svg.setAttribute('aria-label', `Production stage ${stage} at ${labour} labour units. Total product ${total.toFixed(1)}, average product ${average.toFixed(1)}, marginal product ${marginal.toFixed(1)}.`);
  }

  labourInput.addEventListener('input', render);
  render();
  widgetContainer.replaceChildren(root);
}
