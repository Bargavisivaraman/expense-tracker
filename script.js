// =============================================
// SPENDSMART EXPENSE TRACKER — script.js
// by Bargavi Sivaraman
// =============================================

// ── STATE ──
let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
let budget   = parseFloat(localStorage.getItem('budget') || '0');

// ── CATEGORY CONFIG ──
const CAT = {
  food:          { icon: '🍔', color: '#ff6b6b', label: 'Food & Dining' },
  transport:     { icon: '🚗', color: '#4ecdc4', label: 'Transport' },
  shopping:      { icon: '🛍', color: '#a855f7', label: 'Shopping' },
  entertainment: { icon: '🎮', color: '#f59e0b', label: 'Entertainment' },
  health:        { icon: '💊', color: '#10b981', label: 'Health' },
  education:     { icon: '📚', color: '#3b82f6', label: 'Education' },
  bills:         { icon: '💡', color: '#f97316', label: 'Bills & Utilities' },
  other:         { icon: '📦', color: '#6b7280', label: 'Other' }
};

// ── CHARTS ──
let donutChart = null;
let lineChart  = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  setDefaultDate();
  if (budget > 0) {
    document.getElementById('budgetInput').value = budget;
  }
  initCharts();
  renderAll();
});

// ── DATE HELPERS ──
function setDate() {
  const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  document.getElementById('dateTag').textContent =
    new Date().toLocaleDateString('en-US', opts).toLowerCase();
}

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('expDate').value = today;
}

// ── BUDGET ──
function setBudget() {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (!val || val <= 0) { showNotif('⚠ enter a valid budget!'); return; }
  budget = val;
  localStorage.setItem('budget', budget);
  updateBudgetUI();
  showNotif('✓ budget set to $' + fmt(budget));
}

function updateBudgetUI() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - total;
  const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;

  document.getElementById('bSpent').textContent     = '$' + fmt(total);
  document.getElementById('bRemaining').textContent = '$' + fmt(Math.max(remaining, 0));
  document.getElementById('bTotal').textContent     = '$' + fmt(budget);
  document.getElementById('budgetBarFill').style.width = pct + '%';
  document.getElementById('budgetBarPct').textContent  = Math.round(pct) + '% used';

  const fill = document.getElementById('budgetBarFill');
  const alert = document.getElementById('budgetAlert');

  fill.classList.remove('warning', 'danger');
  alert.className = 'budget-alert';
  alert.textContent = '';

  if (pct >= 100) {
    fill.classList.add('danger');
    alert.className = 'budget-alert danger';
    alert.textContent = '🚨 BUDGET EXCEEDED! You've gone over your monthly limit.';
  } else if (pct >= 80) {
    fill.classList.add('warning');
    alert.className = 'budget-alert warning';
    alert.textContent = '⚠ Warning: You've used ' + Math.round(pct) + '% of your budget. Only $' + fmt(remaining) + ' left.';
  }
}

// ── ADD EXPENSE ──
function addExpense() {
  const name   = document.getElementById('expName').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const cat    = document.getElementById('expCategory').value;
  const date   = document.getElementById('expDate').value;

  if (!name)       { showNotif('⚠ enter a description!'); return; }
  if (!amount || amount <= 0) { showNotif('⚠ enter a valid amount!'); return; }
  if (!date)       { showNotif('⚠ select a date!'); return; }

  const expense = { id: Date.now(), name, amount, cat, date };
  expenses.unshift(expense);
  save();
  renderAll();

  // clear inputs
  document.getElementById('expName').value   = '';
  document.getElementById('expAmount').value = '';
  setDefaultDate();

  showNotif('✓ added $' + fmt(amount) + ' — ' + name);
}

// ── DELETE ──
function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  save();
  renderAll();
  showNotif('✓ expense removed');
}

// ── RENDER ALL ──
function renderAll() {
  updateBudgetUI();
  updateStats();
  renderList();
  updateCharts();
}

// ── STATS ──
function updateStats() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const count = expenses.length;
  const avg   = count > 0 ? total / count : 0;

  // top category
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });
  const topCat = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];

  document.getElementById('statTotal').textContent = '$' + fmt(total);
  document.getElementById('statCount').textContent = count;
  document.getElementById('statAvg').textContent   = '$' + fmt(avg);
  document.getElementById('statTop').textContent   = topCat ? CAT[topCat].icon + ' ' + CAT[topCat].label : '—';
}

// ── LIST ──
function renderList() {
  const list    = document.getElementById('expenseList');
  const catFilter = document.getElementById('filterCat').value;
  const sort    = document.getElementById('filterSort').value;

  let filtered = [...expenses];
  if (catFilter !== 'all') filtered = filtered.filter(e => e.cat === catFilter);

  filtered.sort((a, b) => {
    if (sort === 'newest')  return new Date(b.date) - new Date(a.date);
    if (sort === 'oldest')  return new Date(a.date) - new Date(b.date);
    if (sort === 'highest') return b.amount - a.amount;
    if (sort === 'lowest')  return a.amount - b.amount;
    return 0;
  });

  list.innerHTML = '';

  if (!filtered.length) {
    list.innerHTML = '<div class="list-empty">// no transactions found</div>';
    return;
  }

  filtered.forEach(e => {
    const item = document.createElement('div');
    item.className = 'expense-item';
    const d = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    item.innerHTML = `
      <div class="exp-cat-icon">${CAT[e.cat].icon}</div>
      <div class="exp-info">
        <div class="exp-name">${esc(e.name)}</div>
        <div class="exp-meta">${CAT[e.cat].label} · ${dateStr}</div>
      </div>
      <div class="exp-amount">-$${fmt(e.amount)}</div>
      <button class="exp-delete" onclick="deleteExpense(${e.id})">✕</button>
    `;
    list.appendChild(item);
  });
}

// ── CHARTS ──
function initCharts() {
  const donutCtx = document.getElementById('donutChart').getContext('2d');
  const lineCtx  = document.getElementById('lineChart').getContext('2d');

  const chartDefaults = {
    font: { family: 'JetBrains Mono' },
    color: 'rgba(100,150,120,0.7)'
  };
  Chart.defaults.font.family = 'JetBrains Mono';
  Chart.defaults.color = 'rgba(100,150,120,0.7)';

  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 10 }, padding: 12, boxWidth: 10 } },
        tooltip: { callbacks: { label: ctx => ' $' + fmt(ctx.parsed) } }
      }
    }
  });

  lineChart = new Chart(lineCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'daily spending', data: [], borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.06)', borderWidth: 2, pointBackgroundColor: '#00ff88', pointRadius: 4, pointHoverRadius: 6, tension: 0.4, fill: true }] },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' $' + fmt(ctx.parsed.y) } } },
      scales: {
        x: { grid: { color: 'rgba(0,255,136,0.05)' }, ticks: { font: { size: 9 }, maxRotation: 0 } },
        y: { grid: { color: 'rgba(0,255,136,0.05)' }, ticks: { font: { size: 9 }, callback: v => '$' + v } }
      }
    }
  });
}

function updateCharts() {
  // donut — by category
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });
  const cats = Object.keys(catTotals);

  document.getElementById('donutEmpty').style.display = cats.length ? 'none' : 'block';
  document.getElementById('donutChart').style.display = cats.length ? 'block' : 'none';

  donutChart.data.labels   = cats.map(c => CAT[c].icon + ' ' + CAT[c].label);
  donutChart.data.datasets[0].data = cats.map(c => catTotals[c]);
  donutChart.data.datasets[0].backgroundColor = cats.map(c => CAT[c].color);
  donutChart.update();

  // line — daily totals for last 14 days
  const days = 14;
  const dailyMap = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = 0;
  }
  expenses.forEach(e => { if (dailyMap[e.date] !== undefined) dailyMap[e.date] += e.amount; });

  const hasData = expenses.length > 0;
  document.getElementById('lineEmpty').style.display = hasData ? 'none' : 'block';
  document.getElementById('lineChart').style.display = hasData ? 'block' : 'none';

  const labels = Object.keys(dailyMap).map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  lineChart.data.labels = labels;
  lineChart.data.datasets[0].data = Object.values(dailyMap);
  lineChart.update();
}

// ── RESET ──
function resetAll() {
  if (!confirm('Reset all expenses and budget? This cannot be undone.')) return;
  expenses = [];
  budget = 0;
  localStorage.removeItem('expenses');
  localStorage.removeItem('budget');
  document.getElementById('budgetInput').value = '';
  renderAll();
  showNotif('✓ all data cleared');
}

// ── HELPERS ──
function save() { localStorage.setItem('expenses', JSON.stringify(expenses)); }
function fmt(n) { return parseFloat(n).toFixed(2); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showNotif(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3000);
}
