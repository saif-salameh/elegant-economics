// Widget for Indifference Curves and Budget Line
export function init(container) {
  const html = `
    <h4>Indifference Curves & Budget Line</h4>
    <label>Income: <input type='range' id='inc' min='10' max='200' value='100'></label>
    <span id='incVal'>100</span>
    <br/>
    <label>Price of Good X: <input type='range' id='priceX' min='1' max='20' value='5'></label>
    <span id='priceXVal'>5</span>
    <br/>
    <label>Price of Good Y: <input type='range' id='priceY' min='1' max='20' value='5'></label>
    <span id='priceYVal'>5</span>
    <br/>
    <p>Maximum X: <strong id='maxX'></strong> units</p>
    <p>Maximum Y: <strong id='maxY'></strong> units</p>
    <p>Budget line equation: <strong id='budgetEq'></strong></p>
  `;
  container.innerHTML = html;
  const inc = container.querySelector('#inc');
  const incVal = container.querySelector('#incVal');
  const priceX = container.querySelector('#priceX');
  const priceXVal = container.querySelector('#priceXVal');
  const priceY = container.querySelector('#priceY');
  const priceYVal = container.querySelector('#priceYVal');
  const maxX = container.querySelector('#maxX');
  const maxY = container.querySelector('#maxY');
  const budgetEq = container.querySelector('#budgetEq');

  function update() {
    const I = Number(inc.value);
    const Px = Number(priceX.value);
    const Py = Number(priceY.value);
    incVal.textContent = I;
    priceXVal.textContent = Px;
    priceYVal.textContent = Py;
    const mx = (I / Px).toFixed(2);
    const my = (I / Py).toFixed(2);
    maxX.textContent = mx;
    maxY.textContent = my;
    budgetEq.textContent = `${I} = ${Px}·X + ${Py}·Y`;
  }
  inc.addEventListener('input', update);
  priceX.addEventListener('input', update);
  priceY.addEventListener('input', update);
  update();
}
