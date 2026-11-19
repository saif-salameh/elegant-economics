export function init(widgetContainer) {
  const widgetId = `circular-flow-${Math.random().toString(36).slice(2, 9)}`;
  const root = document.createElement('section');
  root.className = 'circular-flow-widget';
  root.innerHTML = `
    <style>
      .circular-flow-widget {
        color: var(--text);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: clamp(1rem, 3vw, 1.5rem);
      }
      .circular-flow-widget * { box-sizing: border-box; }
      .circular-flow-widget .cf-chart { display: block; width: 100%; height: auto; }
      .circular-flow-widget .cf-goods-line { fill: none; stroke: var(--primary); marker-end: url(#${widgetId}-goods-arrow); }
      .circular-flow-widget .cf-money-line { fill: none; stroke: var(--accent); marker-end: url(#${widgetId}-money-arrow); }
      .circular-flow-widget .cf-line { stroke-width: 3; stroke-linecap: round; }
      .circular-flow-widget .cf-flow { cursor: pointer; outline: none; }
      .circular-flow-widget .cf-flow:focus .cf-line,
      .circular-flow-widget .cf-flow.is-active .cf-line { stroke-width: 5; }
      .circular-flow-widget .cf-arrow-goods { fill: var(--primary); }
      .circular-flow-widget .cf-arrow-money { fill: var(--accent); }
      .circular-flow-widget .cf-dot-goods { fill: var(--primary); }
      .circular-flow-widget .cf-dot-money { fill: var(--accent); }
      .circular-flow-widget .cf-flow-label { font: 650 14px system-ui, sans-serif; text-anchor: middle; paint-order: stroke; stroke: var(--bg); stroke-width: 5px; stroke-linejoin: round; }
      .circular-flow-widget .cf-goods-label { fill: var(--primary); }
      .circular-flow-widget .cf-money-label { fill: color-mix(in srgb, var(--accent) 55%, var(--text)); }
      .circular-flow-widget .cf-node { cursor: pointer; outline: none; }
      .circular-flow-widget .cf-node rect { fill: var(--bg); stroke: var(--border); stroke-width: 2; }
      .circular-flow-widget .cf-node text { fill: var(--text); font: 650 16px system-ui, sans-serif; text-anchor: middle; }
      .circular-flow-widget .cf-node:focus rect,
      .circular-flow-widget .cf-node.is-active rect { stroke: var(--primary); stroke-width: 4; }
      .circular-flow-widget .cf-market rect { fill: color-mix(in srgb, var(--primary) 9%, var(--bg)); }
      .circular-flow-widget .cf-government rect { fill: color-mix(in srgb, var(--accent) 12%, var(--bg)); }
      .circular-flow-widget .cf-tools { display: flex; align-items: center; flex-wrap: wrap; gap: .7rem; margin-top: .5rem; }
      .circular-flow-widget .cf-tools label { font-weight: 600; }
      .circular-flow-widget select { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: .5rem; padding: .5rem .7rem; font: inherit; }
      .circular-flow-widget select:focus-visible,
      .circular-flow-widget .cf-reference:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
      .circular-flow-widget .cf-info { margin: .85rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .circular-flow-widget .cf-source { color: var(--muted); display: block; font-size: .88rem; margin-top: .25rem; }
      .circular-flow-widget .cf-context,
      .circular-flow-widget .cf-coverage { color: var(--muted); font-size: .92rem; margin: .75rem 0 0; }
      .circular-flow-widget .cf-reference { color: var(--primary); background: transparent; border: 1px solid var(--border); border-radius: 999px; cursor: pointer; font: inherit; margin-top: .6rem; padding: .4rem .75rem; }
      .circular-flow-widget .cf-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
      @media (prefers-reduced-motion: reduce) {
        .circular-flow-widget .cf-dot { display: none; }
      }
    </style>
    <svg class="cf-chart" viewBox="0 0 900 590" role="group" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">Circular flow of the economy</title>
      <desc id="${widgetId}-description">Households and firms meet through product and factor markets. Focus or select an arrow or node for an explanation from the source notes.</desc>
      <defs>
        <marker id="${widgetId}-goods-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" class="cf-arrow-goods"></path>
        </marker>
        <marker id="${widgetId}-money-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" class="cf-arrow-money"></path>
        </marker>
      </defs>
      <g class="cf-flows">
        <g class="cf-flow" data-kind="goods" tabindex="0" role="button" aria-pressed="false" aria-label="Goods and services from firms to households through the product market" data-explanation="Firms sell goods and households buy them." data-source="Source 1.1.13">
          <path class="cf-line cf-goods-line" d="M 680 244 C 575 185 325 185 220 244"></path>
          <circle class="cf-dot cf-dot-goods" r="5"><animateMotion dur="4s" repeatCount="indefinite" path="M 680 244 C 575 185 325 185 220 244"></animateMotion></circle>
        </g>
        <g class="cf-flow" data-kind="money" tabindex="0" role="button" aria-pressed="false" aria-label="Household spending to firms through the product market" data-explanation="Household consumption is firms’ revenue in the two-sector model." data-source="Source 1.1.13">
          <path class="cf-line cf-money-line" d="M 220 275 C 325 145 575 145 680 275"></path>
          <circle class="cf-dot cf-dot-money" r="5"><animateMotion dur="4.6s" repeatCount="indefinite" path="M 220 275 C 325 145 575 145 680 275"></animateMotion></circle>
        </g>
        <g class="cf-flow" data-kind="goods" tabindex="0" role="button" aria-pressed="false" aria-label="Resources from households to firms through the factor market" data-explanation="Households sell resources and firms buy them." data-source="Source 1.1.13">
          <path class="cf-line cf-goods-line" d="M 220 298 C 325 470 575 470 680 298"></path>
          <circle class="cf-dot cf-dot-goods" r="5"><animateMotion dur="4.2s" repeatCount="indefinite" path="M 220 298 C 325 470 575 470 680 298"></animateMotion></circle>
        </g>
        <g class="cf-flow" data-kind="money" tabindex="0" role="button" aria-pressed="false" aria-label="Income to households from firms through the factor market" data-explanation="Household income equals firms’ spending on factors in the two-sector model." data-source="Source 1.1.13">
          <path class="cf-line cf-money-line" d="M 680 270 C 575 410 325 410 220 270"></path>
          <circle class="cf-dot cf-dot-money" r="5"><animateMotion dur="4.8s" repeatCount="indefinite" path="M 680 270 C 575 410 325 410 220 270"></animateMotion></circle>
        </g>
      </g>
      <g aria-hidden="true">
        <text class="cf-flow-label cf-goods-label" data-kind="goods" x="450" y="154">Goods and services → Households</text>
        <text class="cf-flow-label cf-money-label" data-kind="money" x="450" y="260">Spending → Firms</text>
        <text class="cf-flow-label cf-goods-label" data-kind="goods" x="450" y="356">Resources (factors) → Firms</text>
        <text class="cf-flow-label cf-money-label" data-kind="money" x="450" y="457">Income → Households</text>
      </g>
      <g class="cf-nodes">
        <g class="cf-node" tabindex="0" role="button" aria-pressed="false" aria-label="Households" data-explanation="In a closed economy, households, firms, and government are decision-makers." data-source="Source 1.1.13">
          <rect x="50" y="235" width="170" height="76" rx="18"></rect><text x="135" y="280">Households</text>
        </g>
        <g class="cf-node" tabindex="0" role="button" aria-pressed="false" aria-label="Firms" data-explanation="Firms buy resources and sell goods." data-source="Source 1.1.13">
          <rect x="680" y="235" width="170" height="76" rx="18"></rect><text x="765" y="280">Firms</text>
        </g>
        <g class="cf-node cf-market" tabindex="0" role="button" aria-pressed="false" aria-label="Product market" data-explanation="Households and firms meet in the product market for goods and services." data-source="Source 1.1.13">
          <rect x="360" y="165" width="180" height="70" rx="16"></rect><text x="450" y="207">Product market</text>
        </g>
        <g class="cf-node cf-market" tabindex="0" role="button" aria-pressed="false" aria-label="Factor market" data-explanation="Households and firms meet in the factor market over inputs." data-source="Source 1.1.13">
          <rect x="360" y="365" width="180" height="70" rx="16"></rect><text x="450" y="407">Factor market</text>
        </g>
        <g class="cf-node cf-government" tabindex="0" role="button" aria-pressed="false" aria-label="Government" data-explanation="Government provides public goods and can influence households, firms, and markets." data-source="Source 1.1.13">
          <rect x="360" y="485" width="180" height="70" rx="16"></rect><text x="450" y="527">Government</text>
        </g>
      </g>
    </svg>
    <div class="cf-tools">
      <label for="${widgetId}-flow-view">Flow view</label>
      <select id="${widgetId}-flow-view" aria-label="Choose which flows to show">
        <option value="both">Show both</option>
        <option value="money">Show money flow</option>
        <option value="goods">Show goods flow</option>
      </select>
    </div>
    <p class="cf-info" role="status" aria-live="polite" aria-atomic="true">Focus or select an arrow or node to see a source-based explanation.</p>
    <span class="cf-source" aria-live="polite"></span>
    <p class="cf-context">People combine skills and interests and trade because they expect to be better off. <span class="cf-source">Source 1.2.8</span></p>
    <button class="cf-reference" type="button" data-explanation="The glossary defines the stock market as an interconnected system of businesses, investors, and securities where shares are traded." data-source="Source 1.2.1">Glossary note: stock market</button>
    <p class="cf-coverage">Savings, taxes, banks, and detailed trade flows: Not covered in this source.</p>
    <p class="cf-caption">Illustrative model, based on the notes</p>
  `;

  const flowView = root.querySelector('select');
  const info = root.querySelector('.cf-info');
  const source = root.querySelector(':scope > .cf-source');
  const interactiveItems = [...root.querySelectorAll('.cf-flow, .cf-node, .cf-reference')];

  function selectItem(item) {
    interactiveItems.forEach((candidate) => {
      const active = candidate === item;
      candidate.classList.toggle('is-active', active);
      if (candidate.matches('.cf-flow, .cf-node')) candidate.setAttribute('aria-pressed', String(active));
    });
    info.textContent = item.dataset.explanation;
    source.textContent = item.dataset.source;
  }

  interactiveItems.forEach((item) => {
    item.addEventListener('focus', () => selectItem(item));
    item.addEventListener('click', () => selectItem(item));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectItem(item);
      }
    });
  });

  flowView.addEventListener('change', () => {
    root.querySelectorAll('.cf-flow, .cf-flow-label').forEach((flow) => {
      const visible = flowView.value === 'both' || flow.dataset.kind === flowView.value;
      flow.style.display = visible ? '' : 'none';
      if (flow.matches('.cf-flow')) {
        flow.setAttribute('aria-hidden', String(!visible));
        flow.setAttribute('tabindex', visible ? '0' : '-1');
      }
    });
  });

  widgetContainer.replaceChildren(root);
}
