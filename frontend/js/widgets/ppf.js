/*
 * Illustrative production possibilities frontier:
 *   B = B_max × (1 - (A / A_max)^2), for 0 ≤ A ≤ A_max.
 * This concave curve has increasing opportunity cost: as A rises,
 * each additional unit of A gives up more B. A growth factor expands
 * both maxima while preserving the curve's shape.
 */

let nextWidgetId = 0;

export function init(widgetContainer) {
  const widgetId = `ppf-${++nextWidgetId}`;
  const root = document.createElement('section');
  root.className = 'ppf-widget';
  root.innerHTML = `
    <style>
      .ppf-widget {
        color: var(--text);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: clamp(1rem, 3vw, 1.5rem);
      }
      .ppf-widget * { box-sizing: border-box; }
      .ppf-widget .ppf-chart { display: block; width: 100%; height: auto; overflow: visible; touch-action: manipulation; }
      .ppf-widget .ppf-grid { stroke: var(--border); stroke-width: 1; }
      .ppf-widget .ppf-axis { stroke: var(--text); stroke-width: 1.5; }
      .ppf-widget .ppf-frontier { fill: none; stroke: var(--primary); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .ppf-widget .ppf-choice-point { fill: var(--accent); stroke: var(--text); stroke-width: 2; cursor: grab; touch-action: none; }
      .ppf-widget .ppf-choice-point:active { cursor: grabbing; }
      .ppf-widget .ppf-choice-point:focus-visible { stroke: var(--primary); stroke-width: 4; }
      .ppf-widget .ppf-test-point { fill: color-mix(in srgb, var(--accent) 60%, var(--text)); stroke: var(--bg); stroke-width: 2; }
      .ppf-widget .ppf-label { fill: var(--text); font: 13px system-ui, sans-serif; }
      .ppf-widget .ppf-title { font-weight: 650; }
      .ppf-widget .ppf-tools { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: .75rem; }
      .ppf-widget button { color: var(--bg); background: var(--primary); border: 1px solid var(--primary); border-radius: 999px; padding: .6rem 1rem; font: inherit; cursor: pointer; }
      .ppf-widget button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
      .ppf-widget .ppf-readout { margin: .8rem 0 0; padding: .7rem .9rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .ppf-widget .ppf-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
      @media (prefers-reduced-motion: no-preference) {
        .ppf-widget button { transition: transform 120ms ease, filter 120ms ease; }
        .ppf-widget button:hover { transform: translateY(-1px); filter: brightness(1.08); }
      }
    </style>
    <svg class="ppf-chart" viewBox="0 0 640 410" role="group" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">Production possibilities frontier</title>
      <desc id="${widgetId}-description">An illustrative frontier for Good A and Good B. Drag or focus the point on the curve to explore opportunity cost. Click in the chart to classify a production point.</desc>
      <g class="ppf-grid-lines"></g>
      <line class="ppf-axis" x1="76" y1="32" x2="76" y2="342"></line>
      <line class="ppf-axis" x1="76" y1="342" x2="604" y2="342"></line>
      <path class="ppf-frontier"></path>
      <circle class="ppf-test-point" r="7" visibility="hidden"></circle>
      <circle class="ppf-choice-point" r="9" tabindex="0" role="slider" aria-label="Production choice along the frontier" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></circle>
      <g class="ppf-labels"></g>
    </svg>
    <div class="ppf-tools">
      <button type="button" data-action="grow">Grow the economy</button>
      <button type="button" data-action="shrink">Shrink the economy</button>
      <button type="button" data-action="reset">Reset</button>
    </div>
    <p class="ppf-readout ppf-movement" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="ppf-readout ppf-test-status" role="status" aria-live="polite" aria-atomic="true">Click inside the chart to test a production point.</p>
    <p class="ppf-caption">Illustrative model, not real data</p>
  `;

  const svg = root.querySelector('.ppf-chart');
  const grid = root.querySelector('.ppf-grid-lines');
  const labels = root.querySelector('.ppf-labels');
  const frontier = root.querySelector('.ppf-frontier');
  const choicePoint = root.querySelector('.ppf-choice-point');
  const testPoint = root.querySelector('.ppf-test-point');
  const movementReadout = root.querySelector('.ppf-movement');
  const testStatus = root.querySelector('.ppf-test-status');
  const growButton = root.querySelector('[data-action="grow"]');
  const shrinkButton = root.querySelector('[data-action="shrink"]');
  const plot = { left: 76, right: 604, top: 32, bottom: 342 };
  const axisMax = 150;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const x = (a) => plot.left + (a / axisMax) * (plot.right - plot.left);
  const y = (b) => plot.bottom - (b / axisMax) * (plot.bottom - plot.top);
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  let growth = 1;
  let choiceShare = 0.4;
  let testChoice = null;
  let dragging = false;
  let draggedPoint = false;
  let animationId = null;

  function frontierValues(share, scale = growth) {
    const maxA = 100 * scale;
    const maxB = 100 * scale;
    return { a: maxA * share, b: maxB * (1 - share * share) };
  }

  function zoneFor(a, b) {
    const maxA = 100 * growth;
    const maxB = 100 * growth;
    if (a > maxA || b > maxB) return 'unattainable with current resources';
    const frontierB = maxB * (1 - (a / maxA) ** 2);
    if (Math.abs(b - frontierB) <= 2.5) return 'efficient (on the frontier)';
    if (b < frontierB) return 'inefficient (unemployed resources)';
    return 'unattainable with current resources';
  }

  function drawAxes() {
    for (let value = 0; value <= axisMax; value += 30) {
      const px = x(value);
      const py = y(value);
      grid.append(svgNode('line', { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: 'ppf-grid' }));
      grid.append(svgNode('line', { x1: plot.left, y1: py, x2: plot.right, y2: py, class: 'ppf-grid' }));
      const xTick = svgNode('text', { x: px, y: plot.bottom + 21, 'text-anchor': 'middle', class: 'ppf-label' });
      xTick.textContent = String(value);
      labels.append(xTick);
      const yTick = svgNode('text', { x: plot.left - 11, y: py + 4, 'text-anchor': 'end', class: 'ppf-label' });
      yTick.textContent = String(value);
      labels.append(yTick);
    }
    const aLabel = svgNode('text', { x: (plot.left + plot.right) / 2, y: 394, 'text-anchor': 'middle', class: 'ppf-label ppf-title' });
    aLabel.textContent = 'Good A';
    labels.append(aLabel);
    const bLabel = svgNode('text', { x: 20, y: 22, class: 'ppf-label ppf-title' });
    bLabel.textContent = 'Good B';
    labels.append(bLabel);
  }

  function render() {
    const samples = 60;
    const points = [];
    for (let index = 0; index <= samples; index += 1) {
      const share = index / samples;
      const value = frontierValues(share);
      points.push(`${index === 0 ? 'M' : 'L'} ${x(value.a)} ${y(value.b)}`);
    }
    frontier.setAttribute('d', points.join(' '));

    const choice = frontierValues(choiceShare);
    choicePoint.setAttribute('cx', x(choice.a));
    choicePoint.setAttribute('cy', y(choice.b));
    choicePoint.setAttribute('aria-valuemax', String(100 * growth));
    choicePoint.setAttribute('aria-valuenow', choice.a.toFixed(1));
    choicePoint.setAttribute('aria-valuetext', `Good A ${choice.a.toFixed(1)}, Good B ${choice.b.toFixed(1)}`);
    svg.setAttribute('aria-label', `Production possibilities frontier. Current production choice: ${choice.a.toFixed(1)} of Good A and ${choice.b.toFixed(1)} of Good B.`);

    if (testChoice) {
      testPoint.setAttribute('cx', x(testChoice.a));
      testPoint.setAttribute('cy', y(testChoice.b));
      testPoint.setAttribute('visibility', 'visible');
      testStatus.textContent = `Test point: ${testChoice.a.toFixed(1)} Good A, ${testChoice.b.toFixed(1)} Good B — ${zoneFor(testChoice.a, testChoice.b)}.`;
    } else {
      testPoint.setAttribute('visibility', 'hidden');
    }
    growButton.disabled = growth >= 1.5;
    growButton.setAttribute('aria-disabled', String(growth >= 1.5));
    shrinkButton.disabled = growth <= 0.5;
    shrinkButton.setAttribute('aria-disabled', String(growth <= 0.5));
  }

  function moveChoice(nextShare) {
    const previous = frontierValues(choiceShare);
    choiceShare = clamp(nextShare, 0, 1);
    const current = frontierValues(choiceShare);
    if (Math.abs(current.a - previous.a) < 0.01) return;
    const deltaA = current.a - previous.a;
    const deltaB = current.b - previous.b;
    if (deltaA > 0) {
      movementReadout.textContent = `Gain ${deltaA.toFixed(1)} of Good A, give up ${Math.abs(deltaB).toFixed(1)} of Good B.`;
    } else {
      movementReadout.textContent = `Gain ${Math.abs(deltaB).toFixed(1)} of Good B, give up ${Math.abs(deltaA).toFixed(1)} of Good A.`;
    }
    render();
  }

  function shareFromPointer(event) {
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const localPoint = screenPoint.matrixTransform(svg.getScreenCTM().inverse());
    const a = clamp((localPoint.x - plot.left) / (plot.right - plot.left), 0, 1) * axisMax;
    moveChoice(a / (100 * growth));
  }

  function pointFromPointer(event) {
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    return screenPoint.matrixTransform(svg.getScreenCTM().inverse());
  }

  drawAxes();
  render();
  movementReadout.textContent = 'Drag the point or use the arrow keys to explore opportunity cost.';
  widgetContainer.replaceChildren(root);

  choicePoint.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    dragging = true;
    draggedPoint = false;
    choicePoint.setPointerCapture(event.pointerId);
  });
  choicePoint.addEventListener('pointermove', (event) => {
    if (dragging) {
      draggedPoint = true;
      shareFromPointer(event);
    }
  });
  choicePoint.addEventListener('pointerup', (event) => {
    dragging = false;
    if (choicePoint.hasPointerCapture(event.pointerId)) choicePoint.releasePointerCapture(event.pointerId);
  });
  choicePoint.addEventListener('pointercancel', () => { dragging = false; });
  choicePoint.addEventListener('keydown', (event) => {
    const step = 5 / (100 * growth);
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveChoice(choiceShare + step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveChoice(choiceShare - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveChoice(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveChoice(1);
    }
  });
  svg.addEventListener('click', (event) => {
    if (dragging || draggedPoint) {
      draggedPoint = false;
      return;
    }
    const location = pointFromPointer(event);
    if (location.x < plot.left || location.x > plot.right || location.y < plot.top || location.y > plot.bottom) return;
    testChoice = {
      a: ((location.x - plot.left) / (plot.right - plot.left)) * axisMax,
      b: ((plot.bottom - location.y) / (plot.bottom - plot.top)) * axisMax,
    };
    render();
  });

  function changeEconomySize(to, message) {
    if (Math.abs(to - growth) < 0.001 || animationId !== null) return;
    const from = growth;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (prefersReducedMotion) {
      growth = to;
      render();
      movementReadout.textContent = message;
      return;
    }
    const startedAt = performance.now();
    const duration = 520;
    const animate = (now) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      growth = from + (to - from) * eased;
      render();
      if (progress < 1) animationId = requestAnimationFrame(animate);
      else {
        animationId = null;
        movementReadout.textContent = message;
      }
    };
    animationId = requestAnimationFrame(animate);
  }

  growButton.addEventListener('click', () => {
    changeEconomySize(Math.min(1.5, growth * 1.2), 'The economy has grown; the frontier moved outward.');
  });
  shrinkButton.addEventListener('click', () => {
    changeEconomySize(Math.max(0.5, growth / 1.2), 'The economy has shrunk; the frontier moved inward.');
  });

  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    growth = 1;
    choiceShare = 0.4;
    testChoice = null;
    testStatus.textContent = 'Click inside the chart to test a production point.';
    movementReadout.textContent = 'The model has been reset.';
    render();
  });
}
