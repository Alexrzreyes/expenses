let categoryChartInstance = null;
let historyChartInstance = null;

// Month names list helper
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Update and render all charts based on current state and filtered transactions
 * @param {Object} state 
 * @param {Array} currentTransactions 
 */
export function updateCharts(state, currentTransactions) {
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const currencySymbol = state.settings.currency;

  updateCategoryChart(state, currentTransactions, textColor);
  updateHistoryChart(state, textColor, gridColor, currencySymbol);
}

/**
 * Chart 1: Doughnut Chart of Expenses by Category
 */
function updateCategoryChart(state, currentTransactions, textColor) {
  const canvas = document.getElementById('category-chart');
  const overlay = document.getElementById('no-chart-data');
  if (!canvas) return;

  // Filter only expenses from transactions
  const expenses = currentTransactions.filter(t => t.type === 'expense');

  if (expenses.length === 0) {
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    overlay.classList.remove('hidden');
    canvas.style.opacity = '0';
    return;
  }

  overlay.classList.add('hidden');
  canvas.style.opacity = '1';

  // Group expenses by category
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  // Prepare chart datasets
  const labels = [];
  const data = [];
  const backgroundColor = [];

  Object.entries(categoryTotals).forEach(([catId, amount]) => {
    const category = state.categories.find(c => c.id === catId) || {
      name: 'Otros',
      color: '#64748b'
    };
    labels.push(category.name);
    data.push(amount);
    backgroundColor.push(category.color);
  });

  // Destroy previous instance to avoid layout glitch
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  // Create new chart instance
  categoryChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderWidth: 2,
        borderColor: document.body.classList.contains('dark-theme') ? '#0f172a' : '#ffffff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            color: textColor
          }
        },
        tooltip: {
          backgroundColor: document.body.classList.contains('dark-theme') ? '#1e293b' : '#ffffff',
          titleColor: document.body.classList.contains('dark-theme') ? '#f8fafc' : '#0f172a',
          bodyColor: document.body.classList.contains('dark-theme') ? '#94a3b8' : '#475569',
          borderColor: 'rgba(99, 102, 241, 0.15)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return ` ${state.settings.currency}${value.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

/**
 * Chart 2: Double Bar Chart of Monthly Trends (Last 6 Months)
 */
function updateHistoryChart(state, textColor, gridColor, currencySymbol) {
  const canvas = document.getElementById('history-chart');
  const overlay = document.getElementById('no-history-data');
  if (!canvas) return;

  if (state.transactions.length === 0) {
    if (historyChartInstance) {
      historyChartInstance.destroy();
      historyChartInstance = null;
    }
    overlay.classList.remove('hidden');
    canvas.style.opacity = '0';
    return;
  }

  overlay.classList.add('hidden');
  canvas.style.opacity = '1';

  // Compute last 6 months starting keys
  const monthsData = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsData.push({
      year: d.getFullYear(),
      month: d.getMonth(), // 0-indexed
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`,
      income: 0,
      expense: 0
    });
  }

  // Populate data from transaction lists
  state.transactions.forEach(t => {
    const tDate = new Date(t.date + 'T00:00:00');
    const tYear = tDate.getFullYear();
    const tMonth = tDate.getMonth();

    const monthBucket = monthsData.find(m => m.year === tYear && m.month === tMonth);
    if (monthBucket) {
      if (t.type === 'income') {
        monthBucket.income += t.amount;
      } else {
        monthBucket.expense += t.amount;
      }
    }
  });

  const labels = monthsData.map(m => m.label);
  const incomeData = monthsData.map(m => m.income);
  const expenseData = monthsData.map(m => m.expense);

  if (historyChartInstance) {
    historyChartInstance.destroy();
  }

  historyChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 4,
          maxBarThickness: 16
        },
        {
          label: 'Gastos',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.85)',
          borderRadius: 4,
          maxBarThickness: 16
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 10,
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            color: textColor
          }
        },
        tooltip: {
          backgroundColor: document.body.classList.contains('dark-theme') ? '#1e293b' : '#ffffff',
          titleColor: document.body.classList.contains('dark-theme') ? '#f8fafc' : '#0f172a',
          bodyColor: document.body.classList.contains('dark-theme') ? '#94a3b8' : '#475569',
          borderColor: 'rgba(99, 102, 241, 0.15)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${currencySymbol}${context.raw.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            font: { family: "'Inter', sans-serif", size: 10 }
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: { family: "'Inter', sans-serif", size: 10 },
            callback: function(value) {
              return currencySymbol + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}
