// Utility to format values to selected currency
export function formatCurrency(amount, currencySymbol = '$') {
  return `${currencySymbol}${parseFloat(amount).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Global variable to prevent double-toast budget alerts during the same action
let budgetAlertsTriggered = {
  eighty: false,
  hundred: false
};

/**
 * Show a floating Toast notification
 * @param {string} message 
 * @param {'success'|'error'|'warning'|'info'} type 
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';
  if (type === 'warning') iconName = 'bell';

  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" aria-label="Cerrar"><i data-lucide="x"></i></button>
  `;

  container.appendChild(toast);
  
  // Initialize lucide icons inside toast
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        class: 'lucide-icon'
      },
      nameAttr: 'data-lucide',
      node: toast
    });
  }

  // Auto-remove toast
  const removeTimeout = setTimeout(() => {
    removeToast(toast);
  }, 4000);

  // Close button listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(removeTimeout);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}

/**
 * Open a Modal Dialog
 * @param {HTMLElement} modal 
 */
export function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  // Add focus to first input
  const firstInput = modal.querySelector('input, select');
  if (firstInput) setTimeout(() => firstInput.focus(), 150);
}

/**
 * Close a Modal Dialog
 * @param {HTMLElement} modal 
 */
export function closeModal(modal) {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

/**
 * Update Dashboard summary cards
 */
export function updateDashboard(state, currentTransactions) {
  const currency = state.settings.currency;
  
  // Calculate Totals
  let income = 0;
  let expenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  currentTransactions.forEach(t => {
    if (t.type === 'income') {
      income += t.amount;
      incomeCount++;
    } else {
      expenses += t.amount;
      expenseCount++;
    }
  });

  const balance = income - expenses;

  // Render text values
  const balanceEl = document.getElementById('total-balance');
  const incomeEl = document.getElementById('total-income');
  const expensesEl = document.getElementById('total-expenses');
  
  const incomeCountEl = document.getElementById('income-count');
  const expenseCountEl = document.getElementById('expense-count');

  balanceEl.textContent = formatCurrency(balance, currency);
  
  // Change balance text gradient if negative
  if (balance < 0) {
    balanceEl.style.background = 'linear-gradient(to right, #f43f5e 60%, #e11d48)';
    balanceEl.style.webkitBackgroundClip = 'text';
    balanceEl.style.webkitTextFillColor = 'transparent';
  } else {
    balanceEl.style.background = '';
    balanceEl.style.webkitBackgroundClip = '';
    balanceEl.style.webkitTextFillColor = '';
  }

  incomeEl.textContent = formatCurrency(income, currency);
  expensesEl.textContent = formatCurrency(expenses, currency);
  
  incomeCountEl.textContent = `${incomeCount} ${incomeCount === 1 ? 'transacción' : 'transacciones'}`;
  expenseCountEl.textContent = `${expenseCount} ${expenseCount === 1 ? 'transacción' : 'transacciones'}`;
}

/**
 * Update Budget Bar Progress
 */
export function updateBudget(state) {
  const currency = state.settings.currency;
  const globalBudget = state.budgets.global;
  const budgetSection = document.getElementById('budget-progress-section');
  const quickBadge = document.getElementById('quick-budget-badge');
  const quickBadgeText = document.getElementById('quick-budget-text');
  
  if (!globalBudget || globalBudget <= 0) {
    budgetSection.classList.add('hidden');
    quickBadge.classList.add('hidden');
    return;
  }
  
  // Show budget elements
  budgetSection.classList.remove('hidden');
  quickBadge.classList.remove('hidden');
  quickBadgeText.textContent = `Presupuesto: ${formatCurrency(globalBudget, currency)}`;

  // Calculate current month's expenses
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const thisMonthExpenses = state.transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const tDate = new Date(t.date + 'T00:00:00'); // prevent timezone shift
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Compute percentage
  const percentage = Math.min(100, Math.round((thisMonthExpenses / globalBudget) * 100)) || 0;
  
  // Update elements
  const bar = document.getElementById('global-budget-bar');
  const percentageEl = document.getElementById('budget-percentage');
  const spentTextEl = document.getElementById('budget-spent-text');
  const remainingTextEl = document.getElementById('budget-remaining-text');

  bar.style.width = `${percentage}%`;
  percentageEl.textContent = `${Math.round((thisMonthExpenses / globalBudget) * 100)}%`;
  
  spentTextEl.textContent = `Gastado: ${formatCurrency(thisMonthExpenses, currency)} de ${formatCurrency(globalBudget, currency)}`;
  
  const remaining = globalBudget - thisMonthExpenses;
  if (remaining >= 0) {
    remainingTextEl.textContent = `Restante: ${formatCurrency(remaining, currency)}`;
    remainingTextEl.className = '';
  } else {
    remainingTextEl.textContent = `Excedido por: ${formatCurrency(Math.abs(remaining), currency)}`;
    remainingTextEl.className = 'text-danger';
  }

  // Adjust progress bar colors
  bar.className = 'progress-bar';
  if (percentage >= 100) {
    bar.classList.add('danger');
    percentageEl.style.backgroundColor = 'var(--color-expense-bg)';
    percentageEl.style.color = 'var(--color-expense)';
    
    if (state.settings.visualAlerts && !budgetAlertsTriggered.hundred) {
      showToast('⚠️ ¡Has superado tu límite de presupuesto mensual!', 'error');
      budgetAlertsTriggered.hundred = true;
    }
  } else if (percentage >= 80) {
    bar.classList.add('warning');
    percentageEl.style.backgroundColor = 'var(--color-warning-bg)';
    percentageEl.style.color = 'var(--color-warning)';
    
    if (state.settings.visualAlerts && !budgetAlertsTriggered.eighty) {
      showToast('🔔 Atención: Has consumido más del 80% de tu presupuesto.', 'warning');
      budgetAlertsTriggered.eighty = true;
    }
  } else {
    percentageEl.style.backgroundColor = '';
    percentageEl.style.color = '';
    // Reset alert locks if we are back below threshold (e.g. deleted a transaction)
    if (percentage < 80) budgetAlertsTriggered.eighty = false;
    if (percentage < 100) budgetAlertsTriggered.hundred = false;
  }
}

/**
 * Render Transaction Lists
 */
export function renderTransactions(state, transactions, onEdit, onDelete) {
  const listEl = document.getElementById('transactions-list');
  const emptyStateEl = document.getElementById('transactions-empty-state');
  const currency = state.settings.currency;

  if (transactions.length === 0) {
    listEl.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    return;
  }

  listEl.classList.remove('hidden');
  emptyStateEl.classList.add('hidden');

  listEl.innerHTML = '';

  transactions.forEach(t => {
    // Find category details
    const category = state.categories.find(c => c.id === t.category) || {
      name: 'Desconocido',
      color: '#64748b',
      icon: 'tag'
    };

    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.dataset.id = t.id;

    // Formatting date
    const dateObj = new Date(t.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    item.innerHTML = `
      <div class="tx-icon-col" style="background-color: ${category.color}">
        <i data-lucide="${category.icon}"></i>
      </div>
      <div class="tx-info-col">
        <div class="tx-note">${escapeHtml(t.note)}</div>
        <div class="tx-meta-row">
          <span class="tx-category-badge" style="background-color: ${category.color}22; color: ${category.color}">
            ${category.name}
          </span>
          <span class="tx-date">${formattedDate}</span>
        </div>
      </div>
      <div class="tx-amount-col ${t.type === 'income' ? 'text-income' : 'text-expense'}">
        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, currency)}
      </div>
      <div class="tx-actions-col">
        <button class="action-icon-btn edit" title="Editar transacción" aria-label="Editar transacción">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="action-icon-btn delete" title="Eliminar transacción" aria-label="Eliminar transacción">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    // Bind event listeners for actions
    item.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      onEdit(t);
    });

    item.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(t.id);
    });

    listEl.appendChild(item);
  });

  // Render Lucide icons for new list items
  if (window.lucide) {
    window.lucide.createIcons({
      node: listEl
    });
  }
}

/**
 * Populate Categories dropdown filters
 */
export function populateFilterCategories(state, activeFilterId = 'all') {
  const select = document.getElementById('category-filter');
  if (!select) return;

  // Preserve selected category
  const currentValue = select.value || activeFilterId;
  
  select.innerHTML = '<option value="all">Todas las categorías</option>';
  
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });

  select.value = currentValue;
}

/**
 * Populate Categories dropdown in add/edit form
 */
export function populateFormCategories(state) {
  const select = document.getElementById('tx-category');
  if (!select) return;

  select.innerHTML = '';
  
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

/**
 * Render budgets list under settings panel
 */
export function renderBudgetSettings(state, onBudgetChange) {
  const container = document.getElementById('category-budgets-list');
  if (!container) return;

  const currency = state.settings.currency;
  container.innerHTML = '';

  // Get expenses categories only (or all except salary)
  const expenseCategories = state.categories.filter(c => c.id !== 'salario');

  expenseCategories.forEach(cat => {
    const budgetVal = state.budgets.categories[cat.id] || '';
    
    const row = document.createElement('div');
    row.className = 'category-budget-row';
    row.innerHTML = `
      <span class="cat-indicator-dot" style="background-color: ${cat.color}"></span>
      <span class="cat-budget-label">${cat.name}</span>
      <div class="cat-budget-input-wrapper">
        <span>${currency}</span>
        <input type="number" data-cat-id="${cat.id}" value="${budgetVal}" placeholder="Sin límite" min="0" step="5">
      </div>
    `;

    // Listen to input changes
    const input = row.querySelector('input');
    input.addEventListener('change', (e) => {
      onBudgetChange(cat.id, e.target.value);
    });

    container.appendChild(row);
  });
}

/**
 * Render active custom categories list under settings panel
 */
export function renderActiveCategories(state, onDeleteCategory) {
  const container = document.getElementById('active-categories-list');
  if (!container) return;

  container.innerHTML = '';

  state.categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-item-badge';
    card.style.backgroundColor = cat.color;
    
    card.innerHTML = `
      <div class="cat-badge-info">
        <i data-lucide="${cat.icon}"></i>
        <span>${cat.name}</span>
      </div>
      ${cat.isCustom ? `
        <button class="cat-delete-btn" title="Eliminar categoría" data-id="${cat.id}">
          <i data-lucide="x"></i>
        </button>
      ` : ''}
    `;

    if (cat.isCustom) {
      card.querySelector('.cat-delete-btn').addEventListener('click', () => {
        onDeleteCategory(cat.id);
      });
    }

    container.appendChild(card);
  });

  if (window.lucide) {
    window.lucide.createIcons({
      node: container
    });
  }
}

/**
 * Setup settings tabs switching listener
 */
export function initSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab-btn');
  const panels = document.querySelectorAll('.settings-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.tab;
      
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Activate active
      tab.classList.add('active');
      document.getElementById(targetPanel).classList.add('active');
    });
  });
}

/**
 * Simple HTML sanitizer
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render Debts section summary and listing
 */
export function renderDebts(state, onAddPayment, onAddIncrease, onDelete) {
  const debtsListEl = document.getElementById('debts-list');
  const emptyStateEl = document.getElementById('debts-empty-state');
  const currency = state.settings.currency;

  if (!debtsListEl || !emptyStateEl) return;

  const debts = state.debts || [];

  if (debts.length === 0) {
    debtsListEl.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    
    // Set counts to 0
    document.getElementById('total-debts-to-pay').textContent = formatCurrency(0, currency);
    document.getElementById('debts-to-pay-count').textContent = '0 activas';
    document.getElementById('total-debts-to-collect').textContent = formatCurrency(0, currency);
    document.getElementById('debts-to-collect-count').textContent = '0 activas';
    return;
  }

  debtsListEl.classList.remove('hidden');
  emptyStateEl.classList.add('hidden');

  // Calculate summaries
  let totalToPay = 0;
  let totalToCollect = 0;
  let activeToPayCount = 0;
  let activeToCollectCount = 0;

  debts.forEach(d => {
    if (d.status === 'active') {
      if (d.type === 'to_pay') {
        totalToPay += d.remainingAmount;
        activeToPayCount++;
      } else {
        totalToCollect += d.remainingAmount;
        activeToCollectCount++;
      }
    }
  });

  // Render summaries
  document.getElementById('total-debts-to-pay').textContent = formatCurrency(totalToPay, currency);
  document.getElementById('debts-to-pay-count').textContent = `${activeToPayCount} ${activeToPayCount === 1 ? 'activa' : 'activas'}`;
  
  document.getElementById('total-debts-to-collect').textContent = formatCurrency(totalToCollect, currency);
  document.getElementById('debts-to-collect-count').textContent = `${activeToCollectCount} ${activeToCollectCount === 1 ? 'activa' : 'activas'}`;

  debtsListEl.innerHTML = '';

  debts.forEach(d => {
    const card = document.createElement('div');
    card.className = `debt-item-card ${d.status === 'paid' ? 'paid' : ''}`;

    // Determine due status
    let dueHtml = '';
    let isOverdue = false;
    
    if (d.status === 'paid') {
      dueHtml = `<span class="debt-due-badge paid">Liquidada</span>`;
    } else if (d.dueDate) {
      // Due limit (end of day)
      const dueLimit = new Date(d.dueDate + 'T23:59:59');
      const now = new Date();
      if (dueLimit < now) {
        isOverdue = true;
        dueHtml = `<span class="debt-due-badge overdue">Atrasada</span>`;
      } else {
        const formattedDueDate = new Date(d.dueDate + 'T00:00:00').toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short'
        });
        dueHtml = `<span class="debt-due-badge pending">Vence: ${formattedDueDate}</span>`;
      }
    } else {
      dueHtml = `<span class="debt-due-badge pending">Sin límite</span>`;
    }

    // Calculate percentage paid
    const paidAmount = d.amount - d.remainingAmount;
    const progressPercent = Math.min(100, Math.round((paidAmount / d.amount) * 100)) || 0;

    const hasIncreases = d.originalAmount !== undefined && d.amount !== d.originalAmount;
    const originalText = hasIncreases ? `<span class="debt-amount-subtext" style="font-size: 11px; color: var(--text-muted); display: block;">Original: ${formatCurrency(d.originalAmount, currency)}</span>` : '';

    card.innerHTML = `
      <div class="debt-card-header">
        <div class="debt-card-title">
          <div class="debt-icon-badge ${d.type}">
            <i data-lucide="${d.type === 'to_pay' ? 'arrow-up-right' : 'arrow-down-left'}"></i>
          </div>
          <h4>${escapeHtml(d.person)}</h4>
        </div>
        ${dueHtml}
      </div>

      <div class="debt-card-amounts">
        <div class="debt-amount-col">
          <span class="debt-amount-label">Monto Total</span>
          <span class="debt-amount-val">${formatCurrency(d.amount, currency)}</span>
          ${originalText}
        </div>
        <div class="debt-amount-col text-right">
          <span class="debt-amount-label">Pendiente</span>
          <span class="debt-amount-val ${d.status === 'paid' ? 'text-income' : (isOverdue ? 'text-danger' : 'var(--text-primary)')}">
            ${formatCurrency(d.remainingAmount, currency)}
          </span>
        </div>
      </div>

      <div class="debt-progress-wrapper">
        <div class="debt-progress-label-row">
          <span>Progreso de Pago</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="debt-progress-track">
          <div class="debt-progress-fill ${d.status === 'paid' ? 'paid' : ''}" style="width: ${progressPercent}%"></div>
        </div>
      </div>

      ${d.note ? `<div class="debt-card-note">${escapeHtml(d.note)}</div>` : ''}

      <div class="debt-card-actions">
        <button class="btn btn-danger delete" title="Eliminar deuda">Eliminar</button>
        ${d.status !== 'paid' ? `
          <button class="btn btn-secondary increase-debt" title="Incrementar deuda">Incrementar</button>
          <button class="btn btn-primary add-payment">Abonar</button>
        ` : ''}
      </div>
    `;

    // Bind event handlers
    card.querySelector('.delete').addEventListener('click', () => {
      onDelete(d.id);
    });

    if (d.status !== 'paid') {
      card.querySelector('.add-payment').addEventListener('click', () => {
        onAddPayment(d);
      });
      card.querySelector('.increase-debt').addEventListener('click', () => {
        onAddIncrease(d);
      });
    }

    debtsListEl.appendChild(card);
  });

  // Render lucide icons inside debt cards
  if (window.lucide) {
    window.lucide.createIcons({
      node: debtsListEl
    });
  }
}
