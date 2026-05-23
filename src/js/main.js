import * as state from './state.js';
import * as ui from './ui.js';
import { updateCharts } from './charts.js';

// DOM Selectors
let modalTransaction, modalSettings, modalDebt, modalDebtPayment;
let formTransaction, formCategory, formDebt, formDebtPayment;
let searchFilter, typeFilter, categoryFilter, timeFilter;

// Filter State
const filters = {
  search: '',
  type: 'all',
  category: 'all',
  time: 'this-month'
};

// Initial setup on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  // Load local state
  state.loadState();

  // Initialize DOM elements
  initDomElements();

  // Initialize UI components and tabs
  ui.initSettingsTabs();

  // Bind Event Listeners
  bindEvents();

  // Register state subscriber to trigger UI redraws
  state.subscribe(onStateChange);
});

/**
 * Capture all required DOM elements
 */
function initDomElements() {
  modalTransaction = document.getElementById('transaction-modal');
  modalSettings = document.getElementById('settings-modal');
  modalDebt = document.getElementById('debt-modal');
  modalDebtPayment = document.getElementById('debt-payment-modal');
  
  formTransaction = document.getElementById('transaction-form');
  formCategory = document.getElementById('new-category-form');
  formDebt = document.getElementById('debt-form');
  formDebtPayment = document.getElementById('debt-payment-form');
  
  searchFilter = document.getElementById('search-filter');
  typeFilter = document.getElementById('type-filter');
  categoryFilter = document.getElementById('category-filter');
  timeFilter = document.getElementById('time-filter');
}

/**
 * Core event binding
 */
function bindEvents() {
  // --- Navigation Tabs Switcher ---
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.target;
      
      // Toggle tabs active class
      document.querySelectorAll('.nav-tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      // Toggle views visibility
      document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
      document.getElementById(targetView).classList.remove('hidden');

      // If we switched to dashboard, redraw charts to solve layout scale-ins
      if (targetView === 'view-dashboard') {
        const activeState = state.getState();
        const filtered = getFilteredTransactions(activeState.transactions);
        updateCharts(activeState, filtered);
      }
    });
  });

  // --- Modals Toggles ---
  document.getElementById('btn-open-add-modal').addEventListener('click', () => openTransactionModal());
  document.getElementById('btn-empty-add-trigger').addEventListener('click', () => openTransactionModal());
  document.getElementById('btn-close-transaction-modal').addEventListener('click', () => ui.closeModal(modalTransaction));
  document.getElementById('btn-cancel-transaction').addEventListener('click', () => ui.closeModal(modalTransaction));
  
  document.getElementById('settings-toggle-btn').addEventListener('click', () => openSettingsModal());
  document.getElementById('btn-close-settings-modal').addEventListener('click', () => ui.closeModal(modalSettings));

  // Debts modal toggle events
  document.getElementById('btn-open-debt-modal').addEventListener('click', () => openDebtModal());
  document.getElementById('btn-close-debt-modal').addEventListener('click', () => ui.closeModal(modalDebt));
  document.getElementById('btn-cancel-debt').addEventListener('click', () => ui.closeModal(modalDebt));

  // Debt Payment modal toggle events
  document.getElementById('btn-close-debt-payment-modal').addEventListener('click', () => ui.closeModal(modalDebtPayment));
  document.getElementById('btn-cancel-debt-payment').addEventListener('click', () => ui.closeModal(modalDebtPayment));

  // Close modals clicking outside card content
  window.addEventListener('click', (e) => {
    if (e.target === modalTransaction) ui.closeModal(modalTransaction);
    if (e.target === modalSettings) ui.closeModal(modalSettings);
    if (e.target === modalDebt) ui.closeModal(modalDebt);
    if (e.target === modalDebtPayment) ui.closeModal(modalDebtPayment);
  });

  // --- Filters ---
  searchFilter.addEventListener('input', (e) => {
    filters.search = e.target.value.toLowerCase().trim();
    runFiltering();
  });
  
  typeFilter.addEventListener('change', (e) => {
    filters.type = e.target.value;
    runFiltering();
  });
  
  categoryFilter.addEventListener('change', (e) => {
    filters.category = e.target.value;
    runFiltering();
  });
  
  timeFilter.addEventListener('change', (e) => {
    filters.time = e.target.value;
    runFiltering();
  });

  // --- Form Submissions ---
  // Save Transaction Form (Add or Edit)
  formTransaction.addEventListener('submit', (e) => {
    e.preventDefault();
    handleTransactionSubmit();
  });

  // Create custom category Form
  formCategory.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCategorySubmit();
  });

  // Save Debt Form
  formDebt.addEventListener('submit', (e) => {
    e.preventDefault();
    handleDebtSubmit();
  });

  // Save Debt Payment Form
  formDebtPayment.addEventListener('submit', (e) => {
    e.preventDefault();
    handleDebtPaymentSubmit();
  });

  // --- Setting Actions ---
  // Global budget change trigger
  document.getElementById('btn-save-global-budget').addEventListener('click', () => {
    const input = document.getElementById('setting-global-budget');
    const val = parseFloat(input.value) || 0;
    state.setGlobalBudget(val);
    ui.showToast('Presupuesto global actualizado correctamente.', 'success');
  });

  // Currency select change
  document.getElementById('setting-currency').addEventListener('change', (e) => {
    state.updateSettings({ currency: e.target.value });
    ui.showToast(`Moneda cambiada a ${e.target.value}`, 'success');
  });

  // Alerts checkbox change
  document.getElementById('setting-visual-alerts').addEventListener('change', (e) => {
    state.updateSettings({ visualAlerts: e.target.checked });
  });

  // Theme switcher trigger
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Toggle class physically
    document.body.classList.remove(`${currentTheme}-theme`);
    document.body.classList.add(`${nextTheme}-theme`);
    
    state.updateSettings({ theme: nextTheme });
  });

  // --- Data backups & Reset ---
  // Download JSON backup file
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const jsonStr = state.exportToJSON();
    downloadFile(jsonStr, 'gastosflow-respaldo.json', 'application/json');
    ui.showToast('Copia de respaldo JSON descargada.', 'success');
  });

  // Download CSV report file
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    const csvStr = state.exportToCSV();
    downloadFile(csvStr, 'gastosflow-reporte.csv', 'text/csv;charset=utf-8;');
    ui.showToast('Reporte de transacciones CSV descargado.', 'success');
  });

  // Load JSON backup picker
  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const success = state.importFromJSON(event.target.result);
        if (success) {
          ui.showToast('Datos importados correctamente desde el respaldo.', 'success');
          ui.closeModal(modalSettings);
          // Reset file input value so same file can be picked again if needed
          e.target.value = '';
        }
      } catch (err) {
        ui.showToast(`Error al importar respaldo: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  });

  // Wipe data Reset App
  document.getElementById('btn-reset-app').addEventListener('click', () => {
    const confirmWipe = confirm('⚠️ ¿Estás absolutamente seguro de querer restablecer GastosFlow? Todos tus datos serán borrados de forma permanente.');
    if (confirmWipe) {
      state.resetApp();
      ui.showToast('Aplicación restablecida a valores por defecto.', 'warning');
      ui.closeModal(modalSettings);
    }
  });
}

/**
 * Filter evaluation against date range rules
 */
function isTransactionInTimeRange(dateStr, range) {
  const txDate = new Date(dateStr + 'T00:00:00'); // parse date in local timezone
  const now = new Date();
  
  // Clean dates comparison starting from start of day
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'this-month':
      return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
      
    case 'last-month': {
      let targetMonth = now.getMonth() - 1;
      let targetYear = now.getFullYear();
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
      return txDate.getFullYear() === targetYear && txDate.getMonth() === targetMonth;
    }
      
    case 'last-7-days': {
      const timeDiff = todayStart - txDate;
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 7;
    }
      
    case 'last-30-days': {
      const timeDiff = todayStart - txDate;
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 30;
    }
      
    case 'all-time':
    default:
      return true;
  }
}

/**
 * Apply active search, category, type, and date filters
 */
function getFilteredTransactions(transactions) {
  return transactions.filter(t => {
    // 1. Search Query
    const searchMatch = !filters.search || 
      t.note.toLowerCase().includes(filters.search);
      
    // 2. Type Filter
    const typeMatch = filters.type === 'all' || 
      t.type === filters.type;
      
    // 3. Category Filter
    const catMatch = filters.category === 'all' || 
      t.category === filters.category;
      
    // 4. Date Range Filter
    const dateMatch = isTransactionInTimeRange(t.date, filters.time);

    return searchMatch && typeMatch && catMatch && dateMatch;
  });
}

/**
 * Run manual filtering sync (called on search inputs / selectors changes)
 */
function runFiltering() {
  const activeState = state.getState();
  const filtered = getFilteredTransactions(activeState.transactions);
  
  // Re-draw list and stats (but keep filters dropdowns untouched)
  ui.updateDashboard(activeState, filtered);
  ui.renderTransactions(activeState, filtered, openEditTransactionModal, handleDeleteTransaction);
  updateCharts(activeState, filtered);
}

/**
 * Main subscriber trigger when state is saved/changed
 */
function onStateChange(activeState) {
  // Sync Theme variables
  syncTheme(activeState.settings.theme);

  // Sync Currency settings
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = activeState.settings.currency;
  });

  // Populate dynamic elements
  ui.populateFilterCategories(activeState);
  ui.populateFormCategories(activeState);

  // Apply filters and updates UI list, dashboard values, and budget alert thresholds
  const filtered = getFilteredTransactions(activeState.transactions);
  ui.updateDashboard(activeState, filtered);
  ui.updateBudget(activeState);
  ui.renderTransactions(activeState, filtered, openEditTransactionModal, handleDeleteTransaction);
  
  // Settings sync
  document.getElementById('setting-currency').value = activeState.settings.currency;
  document.getElementById('setting-visual-alerts').checked = activeState.settings.visualAlerts;
  document.getElementById('setting-global-budget').value = activeState.budgets.global || '';
  
  // Render sub lists in settings panel
  ui.renderBudgetSettings(activeState, (catId, value) => {
    state.setCategoryBudget(catId, value);
  });
  ui.renderActiveCategories(activeState, handleDeleteCategory);

  // Render debts panel
  ui.renderDebts(activeState, handleOpenAddPayment, handleDeleteDebt);

  // Dynamic visual charts redraw
  updateCharts(activeState, filtered);
}

/**
 * Set dark/light class on body
 */
function syncTheme(theme) {
  if (theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }
}

/* ==========================================================================
   TRANSACTIONS HANDLERS
   ========================================================================== */

function openTransactionModal() {
  formTransaction.reset();
  document.getElementById('edit-transaction-id').value = '';
  document.getElementById('transaction-modal-title').textContent = 'Nueva Transacción';
  
  // Set date field default to today
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  
  ui.openModal(modalTransaction);
}

function openEditTransactionModal(transaction) {
  document.getElementById('edit-transaction-id').value = transaction.id;
  document.getElementById('transaction-modal-title').textContent = 'Editar Transacción';

  // Toggle switch type state
  if (transaction.type === 'income') {
    document.getElementById('switch-type-income').checked = true;
  } else {
    document.getElementById('switch-type-expense').checked = true;
  }

  document.getElementById('tx-amount').value = transaction.amount;
  document.getElementById('tx-category').value = transaction.category;
  document.getElementById('tx-date').value = transaction.date;
  document.getElementById('tx-note').value = transaction.note;

  ui.openModal(modalTransaction);
}

function handleTransactionSubmit() {
  const id = document.getElementById('edit-transaction-id').value;
  
  // Read form values
  const type = formTransaction.querySelector('input[name="tx-type"]:checked').value;
  const amount = formTransaction.querySelector('input[name="amount"]').value;
  const category = formTransaction.querySelector('select[name="category"]').value;
  const date = formTransaction.querySelector('input[name="date"]').value;
  const note = formTransaction.querySelector('input[name="note"]').value;

  const data = { amount, type, category, date, note };

  if (id) {
    state.updateTransaction(id, data);
    ui.showToast('Transacción actualizada con éxito.', 'success');
  } else {
    state.addTransaction(data);
    ui.showToast('Transacción guardada con éxito.', 'success');
  }

  ui.closeModal(modalTransaction);
}

function handleDeleteTransaction(id) {
  const confirmDel = confirm('¿Estás seguro de que deseas eliminar esta transacción?');
  if (confirmDel) {
    state.deleteTransaction(id);
    ui.showToast('Transacción eliminada de forma permanente.', 'success');
  }
}

/* ==========================================================================
   SETTINGS HANDLERS (CATEGORIES)
   ========================================================================== */

function openSettingsModal() {
  ui.openModal(modalSettings);
}

function handleCategorySubmit() {
  const name = document.getElementById('new-cat-name').value;
  const color = formCategory.querySelector('input[name="cat-color"]:checked').value;
  const icon = formCategory.querySelector('input[name="cat-icon"]:checked').value;

  state.addCategory({ name, color, icon });
  ui.showToast(`Categoría "${name}" creada.`, 'success');
  formCategory.reset();
}

function handleDeleteCategory(id) {
  const confirmDel = confirm('¿Seguro que deseas eliminar esta categoría? Las transacciones que la usen se reasignarán a la categoría "Otros".');
  if (confirmDel) {
    state.deleteCategory(id);
    ui.showToast('Categoría eliminada.', 'success');
  }
}

/* ==========================================================================
   DEBTS HANDLERS
   ========================================================================== */

function openDebtModal() {
  formDebt.reset();
  document.getElementById('edit-debt-id').value = '';
  document.getElementById('debt-modal-title').textContent = 'Nueva Deuda / Préstamo';
  ui.openModal(modalDebt);
}

function handleDebtSubmit() {
  const type = formDebt.querySelector('input[name="debt-type"]:checked').value;
  const person = document.getElementById('debt-person').value;
  const amount = document.getElementById('debt-amount').value;
  const dueDate = document.getElementById('debt-due-date').value;
  const note = document.getElementById('debt-note').value;

  const data = { type, person, amount, dueDate, note };

  state.addDebt(data);
  ui.showToast('Deuda guardada correctamente.', 'success');
  ui.closeModal(modalDebt);
}

function handleDeleteDebt(id) {
  const confirmDel = confirm('¿Estás seguro de que deseas eliminar esta deuda/préstamo? Se borrará de forma permanente.');
  if (confirmDel) {
    state.deleteDebt(id);
    ui.showToast('Deuda eliminada.', 'success');
  }
}

function handleOpenAddPayment(debt) {
  formDebtPayment.reset();
  
  document.getElementById('payment-debt-id').value = debt.id;
  document.getElementById('payment-amount').value = debt.remainingAmount;
  document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
  
  const textInfo = debt.type === 'to_pay' ? 'Pagar a' : 'Cobrar a';
  const currency = state.getState().settings.currency;
  document.getElementById('payment-debt-info').innerHTML = `
    <span><strong>${textInfo}:</strong> ${debt.person}</span>
    <span><strong>Pendiente:</strong> ${ui.formatCurrency(debt.remainingAmount, currency)}</span>
  `;

  ui.openModal(modalDebtPayment);
}

function handleDebtPaymentSubmit() {
  const debtId = document.getElementById('payment-debt-id').value;
  const amount = document.getElementById('payment-amount').value;
  const date = document.getElementById('payment-date').value;
  const logTransaction = document.getElementById('payment-log-transaction').checked;

  state.addDebtPayment(debtId, { amount, date, logTransaction });
  ui.showToast('Abono registrado correctamente.', 'success');
  ui.closeModal(modalDebtPayment);
}

/* ==========================================================================
   HELPER DOWNLOAD FILE
   ========================================================================== */

function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
