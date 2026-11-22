// Elasticity of Demand widget
export function init(container) {
  // Simple elasticity calculator: %ΔQ = elasticity * %ΔP
  const html = `
    <h4>Elasticity of Demand</h4>
    <label>Price change (%): <input type='range' id='priceChange' min='-50' max='50' value='0'></label>
    <span id='priceVal'>0</span>%
    <br/>
    <label>Elasticity coefficient: <input type='range' id='elasticity' min='-5' max='5' step='0.1' value='-1'></label>
    <span id='elasticityVal'>-1</span>
    <br/>
    <p>Resulting quantity change: <strong id='result'>0</strong>%</p>
  `;
  container.innerHTML = html;
  const priceInput = container.querySelector('#priceChange');
  const priceVal = container.querySelector('#priceVal');
  const elasInput = container.querySelector('#elasticity');
  const elasVal = container.querySelector('#elasticityVal');
  const result = container.querySelector('#result');
  function update() {
    const p = Number(priceInput.value);
    const e = Number(elasInput.value);
    priceVal.textContent = p;
    elasVal.textContent = e;
    const q = (e * p).toFixed(1);
    result.textContent = q;
  }
  priceInput.addEventListener('input', update);
  elasInput.addEventListener('input', update);
  update();
}
