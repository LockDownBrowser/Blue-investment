let assets = JSON.parse(localStorage.getItem('assets')) || {};
let trades = JSON.parse(localStorage.getItem('trades')) || [];
let prices = { BTC: 50000, SOL: 150, ETH: 3000, USDT: 1 }; // Mock prices
const fee = 0.005;

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
        let li = document.createElement('li');
        let logo = `https://cryptologos.cc/logos/\( {crypto.toLowerCase()}- \){crypto.toLowerCase()}-logo.png?v=029`;
        li.innerHTML = `<img src="${logo}" width="20" onerror="this.src='https://via.placeholder.com/20'"> ${crypto}: ${assets[crypto]} ( \]{((assets[crypto] * prices[crypto]) || 0).toFixed(2)})`;
        list.appendChild(li);
    }
}

function addCrypto() {
    let type = document.getElementById('crypto-type').value.toUpperCase();
    let amt = parseFloat(document.getElementById('amount').value);
    if (type && amt > 0) {
        assets[type] = (assets[type] || 0) + amt;
        localStorage.setItem('assets', JSON.stringify(assets));
        updateTotalUSD();
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
}

function updateTransferOptions() {
    let from = document.getElementById('from-crypto');
    let to = document.getElementById('to-crypto');
    from.innerHTML = to.innerHTML = '';
    for (let crypto in prices) {
        let opt = document.createElement('option');
        opt.value = opt.text = crypto;
        from.appendChild(opt.cloneNode(true));
        to.appendChild(opt);
    }
    document.getElementById('transfer-amount').addEventListener('input', updateTransferEst);
}

function updateTransferEst() {
    let from = document.getElementById('from-crypto').value;
    let to = document.getElementById('to-crypto').value;
    let amt = parseFloat(document.getElementById('transfer-amount').value);
    if (from && to && amt > 0) {
        let value = amt * prices[from];
        let feeAmt = value * fee;
        let received = (value - feeAmt) / prices[to];
        document.getElementById('transfer-est').innerText = `Est Received: ${received.toFixed(4)} ${to} (Fee: \[ {feeAmt.toFixed(2)})`;
    }
}

function transferCrypto() {
    let from = document.getElementById('from-crypto').value;
    let to = document.getElementById('to-crypto').value;
    let amt = parseFloat(document.getElementById('transfer-amount').value);
    if (from !== to && assets[from] >= amt) {
        let value = amt * prices[from];
        let feeAmt = value * fee;
        let received = (value - feeAmt) / prices[to];
        assets[from] -= amt;
        assets[to] = (assets[to] || 0) + received;
        localStorage.setItem('assets', JSON.stringify(assets));
        updateTotalUSD();
        document.getElementById('transfer-est').innerText = '';
    }
}

function startTrade() {
    let crypto = document.getElementById('trade-crypto').value.toUpperCase();
    let usdt = parseFloat(document.getElementById('usdt-amount').value);
    let lev = parseFloat(document.getElementById('leverage').value);
    if (crypto && usdt > 0 && lev >= 1 && (assets['USDT'] || 0) >= usdt) {
        assets['USDT'] -= usdt;
        let entryPrice = prices[crypto];
        let position = (usdt * lev) / entryPrice;
        let trade = { crypto, position, entryPrice, lev, start: Date.now() };
        trades.push(trade);
        localStorage.setItem('assets', JSON.stringify(assets));
        localStorage.setItem('trades', JSON.stringify(trades));
        document.getElementById('liq-est').innerText = `Liq Est: \]{(entryPrice * (1 - 1/lev)).toFixed(2)}`;
    }
}

function updateManageTrades() {
    let list = document.getElementById('manage-trades');
    list.innerHTML = '';
    trades.forEach((trade, idx) => {
        let currentPrice = prices[trade.crypto];
        let pnl = (currentPrice - trade.entryPrice) * trade.position;
        let roi = (pnl / (trade.position * trade.entryPrice / trade.lev)) * 100;
        let li = document.createElement('li');
        li.innerHTML = `${trade.crypto}: Pos ${trade.position.toFixed(4)}, ROI \( {roi.toFixed(2)}% <button onclick="closeTrade( \){idx})">Close</button>`;
        list.appendChild(li);
    });
}

function closeTrade(idx) {
    let trade = trades[idx];
    let currentPrice = prices[trade.crypto];
    let pnl = (currentPrice - trade.entryPrice) * trade.position;
    assets['USDT'] = (assets['USDT'] || 0) + (trade.position * trade.entryPrice / trade.lev) + pnl;
    trades.splice(idx, 1);
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('trades', JSON.stringify(trades));
    updateManageTrades();
    updateTotalUSD();
}

updateTotalUSD();