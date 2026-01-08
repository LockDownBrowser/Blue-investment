let assets = JSON.parse(localStorage.getItem('assets')) || {};
let trades = JSON.parse(localStorage.getItem('trades')) || [];
let prices = {};
const fee = 0.005;
const symbolToId = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'USDT': 'tether',
    'ADA': 'cardano',
    'XRP': 'ripple',
    'BNB': 'binancecoin',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot-new',
    'LINK': 'chainlink'
};

async function fetchPrices(cryptos) {
    if (cryptos.length === 0) return;
    const uniqueCryptos = [...new Set(cryptos)];
    const ids = uniqueCryptos.map(c => symbolToId[c] || c.toLowerCase()).filter(id => id).join(',');
    if (!ids) return;
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await res.json();
        for (let id in data) {
            const symbol = Object.keys(symbolToId).find(key => symbolToId[key] === id) || id.toUpperCase();
            prices[symbol] = data[id].usd || 0;
        }
        prices['USDT'] = 1;
        updateTotalUSD();
    } catch (e) {
        console.error('Price fetch error:', e);
    }
}

function updateTotalUSD() {
    let total = 0;
    for (let crypto in assets) {
        total += (assets[crypto] || 0) * (prices[crypto] || 0);
    }
    document.getElementById('total-usd').innerText = `Total: \[ {total.toFixed(2)} USD`;
    updateAssetsList();
}

function updateAssetsList() {
    let list = document.getElementById('assets');
    list.innerHTML = '';
    for (let crypto in assets) {
        let id = symbolToId[crypto] || crypto.toLowerCase();
        let li = document.createElement('li');
        li.innerHTML = `<img src="https://cryptologos.cc/logos/\( {id}- \){crypto.toLowerCase()}-logo.png?v=029" alt="${crypto} logo" width="30" onerror="this.src='https://via.placeholder.com/30'"> ${crypto}: ${assets[crypto].toFixed(6)} ( \]{ (assets[crypto] * (prices[crypto] || 0)).toFixed(2) })`;
        list.appendChild(li);
    }
}

async function addCrypto() {
    let type = document.getElementById('crypto-type').value.toUpperCase();
    let amt = parseFloat(document.getElementById('amount').value);
    if (type && amt > 0) {
        assets[type] = (assets[type] || 0) + amt;
        localStorage.setItem('assets', JSON.stringify(assets));
        await fetchPrices([type]);
        document.getElementById('secret-section').style.display = 'none';
    }
}

document.getElementById('secret-btn').addEventListener('click', () => {
    document.getElementById('secret-section').style.display = 'block';
});

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    if (tabId === 'wallet') updateTotalUSD();
    if (tabId === 'manage') updateManageTrades();
    if (tabId === 'transfer') updateTransferOptions();
    if (tabId === 'trade') updateTradeForm();
}

function updateTradeForm() {
    document.getElementById('available-usdt').innerText = `Available: ${(assets['USDT'] || 0).toFixed(2)} USDT`;
    const levInput = document.getElementById('leverage');
    const levValue = document.getElementById('lev-value');
    levValue.textContent = `${levInput.value}x`;
    levInput.oninput = () => levValue.textContent = `${levInput.value}x`;
}

function updateTransferOptions() {
    let from = document.getElementById('from-crypto');
    let to = document.getElementById('to-crypto');
    from.innerHTML = '';
    to.innerHTML = '';
    let allCryptos = [...new Set([...Object.keys(assets), ...Object.keys(symbolToId)])];
    allCryptos.forEach(crypto => {
        let opt = document.createElement('option');
        opt.value = opt.text = crypto;
        from.appendChild(opt.cloneNode(true));
        to.appendChild(opt);
    });
    document.getElementById('transfer-amount').oninput = updateTransferEst;
}

function updateTransferEst() {
    let from = document.getElementById('from-crypto').value;
    let to = document.getElementById('to-crypto').value;
    let amt = parseFloat(document.getElementById('transfer-amount').value);
    if (from && to && amt > 0 && prices[from] && prices[to]) {
        let value = amt * prices[from];
        let feeAmt = value * fee;
        let received = (value - feeAmt) / prices[to];
        document.getElementById('transfer-est').innerText = `Est Received: ${received.toFixed(6)} ${to} (Fee: \[ {feeAmt.toFixed(2)})`;
    } else {
        document.getElementById('transfer-est').innerText = '';
    }
}

async function transferCrypto() {
    let from = document.getElementById('from-crypto').value;
    let to = document.getElementById('to-crypto').value;
    let amt = parseFloat(document.getElementById('transfer-amount').value);
    if (from !== to && (assets[from] || 0) >= amt && prices[from] && prices[to]) {
        let value = amt * prices[from];
        let feeAmt = value * fee;
        let received = (value - feeAmt) / prices[to];
        assets[from] -= amt;
        if (assets[from] <= 0) delete assets[from];
        assets[to] = (assets[to] || 0) + received;
        localStorage.setItem('assets', JSON.stringify(assets));
        updateTotalUSD();
        showTab('wallet');
    }
}

async function startTrade() {
    let crypto = document.getElementById('trade-crypto').value.toUpperCase();
    let usdt = parseFloat(document.getElementById('usdt-amount').value);
    let lev = parseInt(document.getElementById('leverage').value);
    if (crypto && usdt > 0 && lev >= 1 && (assets['USDT'] || 0) >= usdt) {
        await fetchPrices([crypto]);
        let entryPrice = prices[crypto];
        if (!entryPrice) return;
        assets['USDT'] -= usdt;
        let position = (usdt * lev) / entryPrice;
        let trade = { crypto, position, entryPrice, lev, start: Date.now() };
        trades.push(trade);
        localStorage.setItem('assets', JSON.stringify(assets));
        localStorage.setItem('trades', JSON.stringify(trades));
        document.getElementById('liq-est').innerText = `Liq Est: \]{(entryPrice * (1 - 1/lev)).toFixed(2)}`;
        showTab('manage');
    }
}

async function updateManageTrades() {
    let cryptos = trades.map(t => t.crypto);
    await fetchPrices(cryptos);
    let list = document.getElementById('manage-trades');
    list.innerHTML = '';
    trades.forEach((trade, idx) => {
        let currentPrice = prices[trade.crypto] || trade.entryPrice;
        let pnl = (currentPrice - trade.entryPrice) * trade.position;
        let roi = (pnl / (trade.position * trade.entryPrice / trade.lev)) * 100;
        let li = document.createElement('li');
        li.innerHTML = `${trade.crypto}: Pos ${trade.position.toFixed(6)}, ROI \( {roi.toFixed(2)}% <button onclick="closeTrade( \){idx})">Close</button>`;
        list.appendChild(li);
    });
}

async function closeTrade(idx) {
    let trade = trades[idx];
    await fetchPrices([trade.crypto]);
    let currentPrice = prices[trade.crypto] || trade.entryPrice;
    let pnl = (currentPrice - trade.entryPrice) * trade.position;
    assets['USDT'] = (assets['USDT'] || 0) + (trade.position * trade.entryPrice / trade.lev) + pnl;
    trades.splice(idx, 1);
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('trades', JSON.stringify(trades));
    updateManageTrades();
    showTab('wallet');
}

window.onload = async () => {
    await fetchPrices(Object.keys(assets));
    setInterval(async () => await fetchPrices(Object.keys(assets).concat(trades.map(t => t.crypto))), 30000); // Update every 30s
};