/*
 * Illustrative business-cycle curve around a long-term GDP trend:
 *   Activity(p) = trend - amplitude × cos(2πp), with 0 ≤ p ≤ 1.
 * The displayed phases follow concept 1.1.38: peak (boom), recession,
 * trough, and recovery. The curve is schematic, not a measured series.
 */

export function init(widgetContainer) {
  const widgetId = `business-cycle-${Math.random().toString(36).slice(2, 9)}`;
  const root = document.createElement('section');
  root.className = 'business-cycle-widget';
  root.innerHTML = `
    <style>
      .business-cycle-widget { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 1rem; padding: clamp(1rem, 3vw, 1.5rem); }
      .business-cycle-widget * { box-sizing: border-box; }
      .business-cycle-widget .bc-chart { display: block; width: 100%; height: auto; }
      .business-cycle-widget .bc-grid { stroke: var(--border); stroke-width: 1; }
      .business-cycle-widget .bc-axis { stroke: var(--text); stroke-width: 1.5; }
      .business-cycle-widget .bc-trend { stroke: var(--muted); stroke-width: 2; stroke-dasharray: 6 5; }
      .business-cycle-widget .bc-wave { fill: none; stroke: var(--primary); stroke-width: 4; stroke-linecap: round; }
      .business-cycle-widget .bc-peak { fill: color-mix(in srgb, var(--accent) 14%, var(--bg)); }
      .business-cycle-widget .bc-recession { fill: color-mix(in srgb, var(--primary) 11%, var(--bg)); }
      .business-cycle-widget .bc-trough { fill: color-mix(in srgb, var(--muted) 17%, var(--bg)); }
      .business-cycle-widget .bc-recovery { fill: color-mix(in srgb, var(--primary) 17%, var(--bg)); }
      .business-cycle-widget .bc-phase { cursor: pointer; stroke: var(--color-clear); stroke-width: 2; }
      .business-cycle-widget .bc-phase:hover,
      .business-cycle-widget .bc-phase:focus,
      .business-cycle-widget .bc-phase.is-active { stroke: var(--primary); stroke-width: 3; outline: none; }
      .business-cycle-widget .bc-marker { fill: var(--accent); stroke: var(--text); stroke-width: 2; }
      .business-cycle-widget .bc-label { fill: var(--text); font: 13px system-ui, sans-serif; }
      .business-cycle-widget .bc-title { font-weight: 650; }
      .business-cycle-widget .bc-controls { margin-top: .75rem; }
      .business-cycle-widget label { display: block; font-weight: 600; margin-bottom: .35rem; }
      .business-cycle-widget input { accent-color: var(--primary); width: 100%; }
      .business-cycle-widget .bc-readout { margin: .85rem 0 0; padding: .75rem 1rem; border-left: .25rem solid var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
      .business-cycle-widget .bc-context,
      .business-cycle-widget .bc-caption { color: var(--muted); font-size: .9rem; margin: .75rem 0 0; }
    </style>
    <svg class="bc-chart" viewBox="0 0 700 410" role="group" aria-labelledby="${widgetId}-title ${widgetId}-description">
      <title id="${widgetId}-title">The business cycle</title>
      <desc id="${widgetId}-description">A schematic wave around a long-term GDP trend. Use the slider or focus a phase to move through the cycle and read the notes.</desc>
      <g class="bc-phase-regions"></g>
      <g class="bc-grid-lines"></g>
      <line class="bc-axis" x1="64" y1="42" x2="64" y2="315"></line>
      <line class="bc-axis" x1="64" y1="315" x2="650" y2="315"></line>
      <line class="bc-trend" x1="64" y1="185" x2="650" y2="185"></line>
      <path class="bc-wave"></path>
      <circle class="bc-marker" r="8"></circle>
      <g class="bc-phase-labels"></g>
      <g class="bc-labels"></g>
    </svg>
    <div class="bc-controls">
      <label for="${widgetId}-position">Move through the cycle: <output data-output="position">0%</output></label>
      <input id="${widgetId}-position" data-control="position" type="range" min="0" max="100" step="1" value="0">
    </div>
    <p class="bc-readout" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="bc-context">Cycles vary in duration and intensity and fluctuate around a long-term GDP trend. <span>Source 1.1.38</span></p>
    <p class="bc-caption">Illustrative model, not real data</p>
  `;

  const svg = root.querySelector('.bc-chart');
  const phaseRegions = root.querySelector('.bc-phase-regions');
  const grid = root.querySelector('.bc-grid-lines');
  const phaseLabels = root.querySelector('.bc-phase-labels');
  const labels = root.querySelector('.bc-labels');
  const wave = root.querySelector('.bc-wave');
  const marker = root.querySelector('.bc-marker');
  const range = root.querySelector('[data-control="position"]');
  const output = root.querySelector('[data-output="position"]');
  const readout = root.querySelector('.bc-readout');
  const plot = { left: 64, right: 650, top: 42, bottom: 315, trendY: 185 };
  const amplitude = 92;
  const x = (progress) => plot.left + progress * (plot.right - plot.left);
  const y = (progress) => plot.trendY - amplitude * Math.cos(2 * Math.PI * progress);
  const phaseDefinitions = [
    { id: 'peak', title: 'Peak (boom)', start: 0, end: 0.12, css: 'bc-peak', explanation: 'Booms see output growing faster than potential.' },
    { id: 'recession', title: 'Recession', start: 0.12, end: 0.5, css: 'bc-recession', explanation: 'Recessions bring falling output and rising unemployment; a severe one reaches depression.' },
    { id: 'trough', title: 'Trough', start: 0.5, end: 0.62, css: 'bc-trough', explanation: 'The notes name the trough as a phase but do not describe it further.' },
    { id: 'recovery', title: 'Recovery', start: 0.62, end: 1, css: 'bc-recovery', explanation: 'The notes name recovery as a phase but do not describe it further.' },
  ];
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  function phaseAt(progress) {
    if (progress >= 1) return phaseDefinitions[0];
    return phaseDefinitions.find((phase) => progress >= phase.start && progress < phase.end) ?? phaseDefinitions[0];
  }

  function setPosition(progress) {
    const safeProgress = Math.max(0, Math.min(1, progress));
    const activePhase = phaseAt(safeProgress);
    marker.setAttribute('cx', x(safeProgress));
    marker.setAttribute('cy', y(safeProgress));
    marker.setAttribute('aria-label', `Current phase: ${activePhase.title}`);
    range.value = String(Math.round(safeProgress * 100));
    output.value = `${range.value}%`;
    phaseRegions.querySelectorAll('.bc-phase').forEach((phase) => {
      const active = phase.dataset.phase === activePhase.id;
      phase.classList.toggle('is-active', active);
      phase.setAttribute('aria-pressed', String(active));
    });
    readout.textContent = `${activePhase.title}. ${activePhase.explanation}`;
    svg.setAttribute('aria-label', `Business cycle: ${activePhase.title}. ${activePhase.explanation}`);
  }

  for (let tick = 0; tick <= 4; tick += 1) {
    const progress = tick / 4;
    const px = x(progress);
    grid.append(svgNode('line', { x1: px, y1: plot.top, x2: px, y2: plot.bottom, class: 'bc-grid' }));
    const tickLabel = svgNode('text', { x: px, y: plot.bottom + 20, 'text-anchor': 'middle', class: 'bc-label' });
    tickLabel.textContent = `Time ${tick}`;
    labels.append(tickLabel);
  }
  for (let value = 0; value <= 2; value += 1) {
    const py = plot.top + value * ((plot.bottom - plot.top) / 2);
    grid.append(svgNode('line', { x1: plot.left, y1: py, x2: plot.right, y2: py, class: 'bc-grid' }));
  }
  const activityLabel = svgNode('text', { x: 15, y: 22, class: 'bc-label bc-title' });
  activityLabel.textContent = 'Economic activity';
  const timeLabel = svgNode('text', { x: (plot.left + plot.right) / 2, y: 385, 'text-anchor': 'middle', class: 'bc-label bc-title' });
  timeLabel.textContent = 'Time';
  const trendLabel = svgNode('text', { x: plot.right - 4, y: plot.trendY - 8, 'text-anchor': 'end', class: 'bc-label' });
  trendLabel.textContent = 'Long-term GDP trend';
  labels.append(activityLabel, timeLabel, trendLabel);

  phaseDefinitions.forEach((phase) => {
    const segments = [];
    const sampleCount = 32;
    for (let step = 0; step <= sampleCount; step += 1) {
      const progress = phase.start + (phase.end - phase.start) * step / sampleCount;
      segments.push(`${step === 0 ? 'M' : 'L'} ${x(progress)} ${y(progress)}`);
    }
    const path = svgNode('path', {
      d: `${segments.join(' ')} L ${x(phase.end)} ${plot.trendY} L ${x(phase.start)} ${plot.trendY} Z`,
      class: `bc-phase ${phase.css}`,
      tabindex: '0',
      role: 'button',
      'aria-label': `${phase.title}. ${phase.explanation}`,
      'aria-pressed': 'false',
      'data-phase': phase.id,
      'data-midpoint': (phase.start + phase.end) / 2,
    });
    phaseRegions.append(path);
    const text = svgNode('text', { x: x((phase.start + phase.end) / 2), y: 59, 'text-anchor': 'middle', class: 'bc-label bc-title' });
    text.textContent = phase.title;
    phaseLabels.append(text);
    const selectPhase = () => setPosition(Number(path.dataset.midpoint));
    path.addEventListener('mouseenter', selectPhase);
    path.addEventListener('focus', selectPhase);
    path.addEventListener('click', selectPhase);
    path.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectPhase();
      }
    });
  });

  const wavePoints = [];
  for (let step = 0; step <= 120; step += 1) {
    const progress = step / 120;
    wavePoints.push(`${step === 0 ? 'M' : 'L'} ${x(progress)} ${y(progress)}`);
  }
  wave.setAttribute('d', wavePoints.join(' '));
  range.addEventListener('input', () => setPosition(Number(range.value) / 100));
  setPosition(0);
  widgetContainer.replaceChildren(root);
}
