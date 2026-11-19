/*
 * Illustrative equal-weight Cobb–Douglas consumer model:
 *   Utility: U = √(A × B)
 *   Budget: p_A A + p_B B = I
 *   Optimal bundle: A* = I/(2p_A), B* = I/(2p_B)
 *   Indifference curves: B = U²/A. At the optimum, the budget line
 *   is tangent to the highest attainable indifference curve.
 */

export function init(widgetContainer) {
  const widgetId = `indifference-${Math.random().toString(36).slice(2, 9)}`;
  const root = document.createElement('section');
  root.className = 'indifference-widget';
  root.innerHTML = `
    <style>
      .indifference-widget { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 1rem; padding: clamp(1rem, 3vw, 1.5rem); }
      .indifference-widget * { box-sizing: border-box; }
      .indifference-widget .ic-chart { display: block; width: 100%; height: auto; }
      .indifference-widget .ic-grid { stroke: var(--border); stroke-width: 1; }
      .indifference-widget .ic-axis { stroke: var(--text); stroke-width: 1.5; }
      .indifference-widget .ic-budget { fill: none; stroke: var(--primary); stroke-width: 3; }
      .indifference-widget .ic-curve { fill: none; stroke: color-mix(in srgb, var(--accent) 55%, var(--text)); stroke-width: 2; }
      .indifference-widget .ic-curve.ic-highest { stroke: var(--accent); stroke-width: 3; }
      .indifference-widget .ic-optimal { fill: var(--primary); stroke: var(--bg); stroke-width: 2; }
      .indifference-widget .ic-guide { stroke: var(--muted); stroke-width: 1.5; stroke-dasharray: 4 4; }
      .indifference-widget .ic-label { fill: var(--text); font: 13px system-ui, sans-serif; }
      .indifference-widget .ic-title { font-weight: 650; }
      .indifference-widget .ic-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: .8rem 1.25rem; margin-top: .6rem; }
      .indifference-widget .ic-control { display: grid; gap: .35rem; }
      .indifference-widget label { font-weight: 600; }
      .indifference-widget input { accent-color: var(--primary); }
      .indifference-widget .ic-readout { margin: .9rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .indifference-widget .ic-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
    </style>
    <svg class="ic-chart" viewBox="0 0 660 430" role="img" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">Budget line and indifference curves</title>
      <desc id="${widgetId}-description">An illustrative consumer choice diagram. Adjust income and prices to move the budget line and optimal bundle.</desc>
      <g class="ic-grid-lines"></g>
      <line class="ic-axis" x1="76" y1="30" x2="76" y2="350"></line>
      <line class="ic-axis" x1="76" y1="350" x2="610" y2="350"></line>
      <g class="ic-curves"></g>
      <path class="ic-budget"></path>
      <line class="ic-guide ic-guide-a"></line>
      <line class="ic-guide ic-guide-b"></line>
      <circle class="ic-optimal" r="7"></circle>
      <g class="ic-labels"></g>
    </svg>
    <div class="ic-controls">
      <div class="ic-control">
        <label for="${widgetId}-income">Income: <output data-output="income">500</output></label>
        <input id="${widgetId}-income" data-control="income" type="range" min="100" max="1000" step="50" value="500">
      </div>
      <div class="ic-control">
        <label for="${widgetId}-price-a">Price of Good A: <output data-output="price-a">5</output></label>
        <input id="${widgetId}-price-a" data-control="price-a" type="range" min="1" max="10" step="1" value="5">
      </div>
      <div class="ic-control">
        <label for="${widgetId}-price-b">Price of Good B: <output data-output="price-b">5</output></label>
        <input id="${widgetId}-price-b" data-control="price-b" type="range" min="1" max="10" step="1" value="5">
      </div>
    </div>
    <p class="ic-readout" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="ic-caption">Illustrative model, not real data</p>
  `;

  const svg = root.querySelector('.ic-chart');
  const grid = root.querySelector('.ic-grid-lines');
  const curves = root.querySelector('.ic-curves');
  const budget = root.querySelector('.ic-budget');
  const guideA = root.querySelector('.ic-guide-a');
  const guideB = root.querySelector('.ic-guide-b');
  const optimalPoint = root.querySelector('.ic-optimal');
  const labels = root.querySelector('.ic-labels');
  const readout = root.querySelector('.ic-readout');
  const control = (name) => root.querySelector(`[data-control="${name}"]`);
  const output = (name) => root.querySelector(`[data-output="${name}"]`);
  const plot = { left: 76, right: 610, top: 30, bottom: 350 };
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  function render() {
    const income = Number(control('income').value);
    const priceA = Number(control('price-a').value);
    const priceB = Number(control('price-b').value);
    const interceptA = income / priceA;
    const interceptB = income / priceB;
    const axisMax = Math.max(50, Math.ceil(Math.max(interceptA, interceptB) * 1.12 / 10) * 10);
    const x = (quantity) => plot.left + quantity / axisMax * (plot.right - plot.left);
    const y = (quantity) => plot.bottom - quantity / axisMax * (plot.bottom - plot.top);
    const optimalA = income / (2 * priceA);
    const optimalB = income / (2 * priceB);
    const optimalUtility = Math.sqrt(optimalA * optimalB);

    grid.replaceChildren();
    labels.replaceChildren();
    const tickStep = axisMax / 5;
    for (let index = 0; index <= 5; index += 1) {
      const quantity = index * tickStep;
      const px = x(quantity);
      const py = y(quantity);
      grid.append(svgNode('line', { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: 'ic-grid' }));
      grid.append(svgNode('line', { x1: plot.left, y1: py, x2: plot.right, y2: py, class: 'ic-grid' }));
      const xTick = svgNode('text', { x: px, y: plot.bottom + 20, 'text-anchor': 'middle', class: 'ic-label' });
      xTick.textContent = quantity.toFixed(0);
      labels.append(xTick);
      const yTick = svgNode('text', { x: plot.left - 10, y: py + 4, 'text-anchor': 'end', class: 'ic-label' });
      yTick.textContent = quantity.toFixed(0);
      labels.append(yTick);
    }
    const labelA = svgNode('text', { x: (plot.left + plot.right) / 2, y: 408, 'text-anchor': 'middle', class: 'ic-label ic-title' });
    labelA.textContent = 'Good A';
    const labelB = svgNode('text', { x: 22, y: 22, class: 'ic-label ic-title' });
    labelB.textContent = 'Good B';
    labels.append(labelA, labelB);

    budget.setAttribute('d', `M ${x(0)} ${y(interceptB)} L ${x(interceptA)} ${y(0)}`);
    curves.replaceChildren();
    const utilityLevels = [optimalUtility * 0.55, optimalUtility * 0.78, optimalUtility];
    utilityLevels.forEach((utility, index) => {
      const path = svgNode('path', { class: `ic-curve${index === 2 ? ' ic-highest' : ''}` });
      const sampleCount = 100;
      const pathParts = [];
      let drawing = false;
      for (let step = 0; step <= sampleCount; step += 1) {
        const goodA = Math.max(utility * utility / axisMax, axisMax * step / sampleCount);
        const goodB = utility * utility / goodA;
        if (goodB > 0 && goodB <= axisMax && goodA >= 0 && goodA <= axisMax) {
          pathParts.push(`${drawing ? 'L' : 'M'} ${x(goodA)} ${y(goodB)}`);
          drawing = true;
        } else {
          drawing = false;
        }
      }
      path.setAttribute('d', pathParts.join(' '));
      curves.append(path);
    });

    optimalPoint.setAttribute('cx', x(optimalA));
    optimalPoint.setAttribute('cy', y(optimalB));
    guideA.setAttribute('x1', x(optimalA));
    guideA.setAttribute('x2', x(optimalA));
    guideA.setAttribute('y1', y(optimalB));
    guideA.setAttribute('y2', plot.bottom);
    guideB.setAttribute('x1', plot.left);
    guideB.setAttribute('x2', x(optimalA));
    guideB.setAttribute('y1', y(optimalB));
    guideB.setAttribute('y2', y(optimalB));

    output('income').value = String(income);
    output('price-a').value = String(priceA);
    output('price-b').value = String(priceB);
    readout.textContent = `Optimal bundle: ${optimalA.toFixed(1)} of Good A and ${optimalB.toFixed(1)} of Good B. The budget line is tangent to the highest attainable indifference curve (utility ${optimalUtility.toFixed(1)}).`;
    svg.setAttribute('aria-label', `Budget line and indifference curves. Income ${income}; Good A price ${priceA}; Good B price ${priceB}. Optimal bundle ${optimalA.toFixed(1)} Good A and ${optimalB.toFixed(1)} Good B.`);
  }

  root.querySelectorAll('input').forEach((element) => element.addEventListener('input', render));
  render();
  widgetContainer.replaceChildren(root);
}
