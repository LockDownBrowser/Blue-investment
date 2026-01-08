let assets = JSON.parse(localStorage.getItem('assets')) || { USDT: 10000 };
let trades = JSON.parse(localStorage.getItem('trades')) || [];
let prices = { USDT: 1 };
const fee = 0.005;

const symbolToId = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', USDT: 'tether',
    ADA: 'cardano', XRP: 'ripple', BNB: 'binancecoin', DOGE: 'dogecoin',
    DOT: 'polkadot-new', LINK: 'chainlink'
};

async function fetchPrices(symbols) {
    const needed = symbols.filter(s => !prices[s] && s !== 'USDT');
    if (needed.length === 0) return;
    const ids = needed.map(s => symbolToId[s] || s.toLowerCase()).join(',');
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await res.json();
        needed.forEach(s => {
            const id = symbolToId[s] || s.toLowerCase();
            if (data[id]) prices[s] = data[id].usd;
        });
    } catch (e) { console.error(e); }
}

function updateTotalUSD() {
    let total = 0;
    Object.keys(assets).forEach(c => {
        if (assets[c] > 0) total += assets[c] * (prices[c] || 0);
    });
    document.getElementById('total-usd').innerText = `Total: \[ {total.toFixed(2)} USD`;
}

function updateAssetsList() {
    const list = document.getElementById('assets');
    list.innerHTML = '';
    Object.keys(assets).sort().forEach(c => {
        if (assets[c] <= 0) return;
        const id = symbolToId[c] || c.toLowerCase();
        const value = assets[c] * (prices[c] || 0);
        const li = document.createElement('li');
        li.innerHTML = `<img src="https://cryptologos.cc/logos/\( {id}- \){c.toLowerCase()}-logo.png?v=029" width="36" onerror="this.src='https://via.placeholder.com/36'">
                        <div><strong>${c}</strong>: ${assets[c].toFixed(6)}<br>
                        <span style="color:#007bff;"> \]{value.toFixed(2)}</span></div>`;
        list.appendChild(li);
    });
}

async function addCrypto() {
    const sym = document.getElementById('crypto-type').value.toUpperCase();
    const amt = parseFloat(document.getElementById('amount').value);
    if (sym && amt > 0) {
        assets[sym] = (assets[sym] || 0) + amt;
        localStorage.setItem('assets', JSON.stringify(assets));
        await fetchPrices([sym]);
        updateAll();
        document.getElementById('secret-section').style.display = 'none';
    }
}

document.getElementById('secret-btn').onclick = () => {
    document.getElementById('secret-section').style.display = 'block';
};

function showTab(id) {
    document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    updateAll();
}

function updateAll() {
    updateTotalUSD();
    updateAssetsList();
    if (document.getElementById('trade').style.display === 'block') updateTradeUI();
    if (document.getElementById('manage').style.display === 'block') updateManageTrades();
    if (document.getElementById('transfer').style.display === 'block') updateTransferUI();
}

function updateTradeUI() {
    document.getElementById('available-usdt').innerText = `Available USDT: ${(assets.USDT || 0).toFixed(2)}`;
    const input = document.getElementById('trade-crypto');
    const sym = input.value.toUpperCase();
    document.getElementById('current-price').innerText = prices[sym] ? `Current Price: \[ {prices[sym].toFixed(2)}` : '';
    input.oninput = async () => {
        const s = input.value.toUpperCase();
        if (s && !prices[s]) await fetchPrices([s]);
        document.getElementById('current-price').innerText = prices[s] ? `Current Price: \]{prices[s].toFixed(2)}` : '';
    };
    const lev = document.getElementById('leverage');
    document.getElementById('lev-value').innerText = `${lev.value}x`;
    lev.oninput = () => document.getElementById('lev-value').innerText = `${lev.value}x`;
}

async function startTrade() {
    const sym = document.getElementById('trade-crypto').value.toUpperCase();
    const usdt = parseFloat(document.getElementById('usdt-amount').value);
    const lev = parseInt(document.getElementById('leverage').value);
    if (!sym || !usdt || usdt > (assets.USDT || 0)) return;
    await fetchPrices([sym]);
    const price = prices[sym];
    if (!price) return;
    assets.USDT -= usdt;
    const pos = (usdt * lev) / price;
    trades.push({ sym, pos, entry: price, lev });
    saveData();
    document.getElementById('liq-est').innerText = `Liquidation: \[ {(price * (1 - 1/lev)).toFixed(2)}`;
    showTab('manage');
}

async function updateManageTrades() {
    await fetchPrices(trades.map(t => t.sym));
    const list = document.getElementById('manage-trades');
    list.innerHTML = '';
    trades.forEach((t, i) => {
        const curr = prices[t.sym] || t.entry;
        const pnl = (curr - t.entry) * t.pos;
        const roi = (pnl / (t.pos * t.entry / t.lev)) * 100;
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>\( {t.sym}/USDT Long × \){t.lev}</strong><br>
            Position: ${t.pos.toFixed(6)} ${t.sym}<br>
            Entry: \]{t.entry.toFixed(2)} → Current: \[ {curr.toFixed(2)}<br>
            PnL: <span style="color:${pnl>=0?'green':'red'}"> \]{pnl.toFixed(2)}</span> 
            ROI: <span style="color:\( {roi>=0?'green':'red'}"> \){roi.toFixed(2)}%</span><br>
            <button onclick="closeTrade(${i})">Close</button>`;
        list.appendChild(li);
    });
}

async function closeTrade(i) {
    const t = trades[i];
    await fetchPrices([t.sym]);
    const curr = prices[t.sym] || t.entry;
    const pnl = (curr - t.entry) * t.pos;
    assets.USDT = (assets.USDT || 0) + (t.pos * t.entry / t.lev) + pnl;
    trades.splice(i, 1);
    saveData();
    updateAll();
}

function updateTransferUI() {
    const from = document.getElementById('from-crypto');
    const to = document.getElementById('to-crypto');
    from.innerHTML = to.innerHTML = '';
    Object.keys(prices).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = opt.text = c;
        from.appendChild(opt.cloneNode(true));
        to.appendChild(opt);
    });
    document.getElementById('transfer-amount').oninput = updateEst;
    updateEst();
}

function updateEst() {
    const from = document.getElementById('from-crypto').value;
    const to = document.getElementById('to-crypto').value;
    const amt = parseFloat(document.getElementById('transfer-amount').value);
    if (from && to && amt > 0 && prices[from] && prices[to]) {
        const val = amt * prices[from];
        const received = (val * (1 - fee)) / prices[to];
        document.getElementById('transfer-est').innerText = `Receive ≈ ${received.toFixed(6)} ${to} (0.5% fee)`;
    } else {
        document.getElementById('transfer-est').innerText = '';
    }
}

async function transferCrypto() {
    const from = document.getElementById('from-crypto').value;
    const to = document.getElementById('to-crypto').value;
    const amt = parseFloat(document.getElementById('transfer-amount').value);
    if (from === to || (assets[from] || 0) < amt) return;
    await fetchPrices([from, to]);
    const val = amt * prices[from];
    const received = (val * (1 - fee)) / prices[to];
    assets[from] -= amt;
    if (assets[from] <= 0) delete assets[from];
    assets[to] = (assets[to] || 0) + received;
    saveData();
    showTab('wallet');
}

function saveData() {
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('trades', JSON.stringify(trades));
}

window.onload = async () => {
    const allSymbols = [...new Set([...Object.keys(assets), ...trades.map(t => t.sym)])];
    await fetchPrices(allSymbols);
    updateAll();
    setInterval(async () => {
        const all = [...new Set([...Object.keys(assets), ...trades.map(t => t.sym)])];
        await fetchPrices(all);
        updateAll();
    }, 15000);
};