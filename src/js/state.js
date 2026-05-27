// Default Categories for the Application
const DEFAULT_CATEGORIES = [
  { id: 'comida', name: 'Comida y Bebida', color: '#ef4444', icon: 'coffee', isCustom: false },
  { id: 'transporte', name: 'Transporte', color: '#3b82f6', icon: 'car', isCustom: false },
  { id: 'hogar', name: 'Hogar', color: '#eab308', icon: 'home', isCustom: false },
  { id: 'entretenimiento', name: 'Entretenimiento', color: '#a855f7', icon: 'clapperboard', isCustom: false },
  { id: 'salud', name: 'Salud', color: '#10b981', icon: 'dumbbell', isCustom: false },
  { id: 'educacion', name: 'Educación', color: '#06b6d4', icon: 'tag', isCustom: false },
  { id: 'servicios', name: 'Servicios y Pagos', color: '#f97316', icon: 'wrench', isCustom: false },
  { id: 'salario', name: 'Salario / Ingresos', color: '#22c55e', icon: 'tag', isCustom: false },
  { id: 'otros', name: 'Otros', color: '#64748b', icon: 'tag', isCustom: false }
];

// Initial State definition
const INITIAL_STATE = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  budgets: {
    global: 0, // 0 means disabled
    categories: {} // categoryId -> amount
  },
  settings: {
    currency: '$',
    theme: 'dark',
    visualAlerts: true
  },
  debts: []
};

// Current active state in memory
let state = { ...INITIAL_STATE };

// Pub/Sub listeners to sync UI on state changes
const listeners = [];

/**
 * Register a listener to be called when the state updates.
 * @param {Function} callback 
 */
export function subscribe(callback) {
  listeners.push(callback);
  // Call immediately to do initial render
  callback(state);
}

/**
 * Notify all subscribers of a state change
 */
function notify() {
  listeners.forEach(callback => callback({ ...state }));
}

/**
 * Load state from localStorage or initialize with default values
 */
export function loadState() {
  try {
    const serializedState = localStorage.getItem('gastosflow_state');
    if (serializedState) {
      const parsed = JSON.parse(serializedState);
      
      // Merge with initial state to ensure structure completeness if version changes
      state = {
        transactions: parsed.transactions || [],
        categories: parsed.categories || DEFAULT_CATEGORIES,
        budgets: parsed.budgets || { global: 0, categories: {} },
        settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
        debts: (parsed.debts || []).map(d => {
          let dDate = d.date;
          if (!dDate) {
            const timestamp = parseInt(d.id.split('_')[1]);
            if (!isNaN(timestamp)) {
              dDate = new Date(timestamp).toISOString().split('T')[0];
            } else {
              dDate = new Date().toISOString().split('T')[0];
            }
          }
          return {
            ...d,
            originalAmount: d.originalAmount !== undefined ? d.originalAmount : d.amount,
            date: dDate,
            increases: d.increases || [],
            payments: d.payments || []
          };
        })
      };
    } else {
      state = { ...INITIAL_STATE };
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
    state = { ...INITIAL_STATE };
  }
  notify();
  return state;
}

/**
 * Save current state to localStorage and notify listeners
 */
export function saveState() {
  try {
    localStorage.setItem('gastosflow_state', JSON.stringify(state));
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
  notify();
}

/**
 * Get current state copy
 */
export function getState() {
  return { ...state };
}

/* ==========================================================================
   TRANSACTIONS MANAGEMENT (CRUD)
   ========================================================================== */

export function addTransaction({ amount, type, category, date, note }) {
  const newTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: parseFloat(amount),
    type, // 'income' | 'expense'
    category,
    date, // YYYY-MM-DD
    note: note.trim() || (type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
  };

  state.transactions.unshift(newTransaction);
  saveState();
  return newTransaction;
}

export function updateTransaction(id, updatedData) {
  const index = state.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    state.transactions[index] = {
      ...state.transactions[index],
      ...updatedData,
      amount: parseFloat(updatedData.amount)
    };
    saveState();
    return state.transactions[index];
  }
  return null;
}

export function deleteTransaction(id) {
  const initialLength = state.transactions.length;
  state.transactions = state.transactions.filter(t => t.id !== id);
  if (state.transactions.length !== initialLength) {
    saveState();
    return true;
  }
  return false;
}

/* ==========================================================================
   CATEGORIES MANAGEMENT
   ========================================================================== */

export function addCategory({ name, color, icon }) {
  const id = `cat_${Date.now()}`;
  const newCategory = {
    id,
    name: name.trim(),
    color,
    icon,
    isCustom: true
  };
  
  state.categories.push(newCategory);
  saveState();
  return newCategory;
}

export function deleteCategory(id) {
  // Can only delete custom categories
  const category = state.categories.find(c => c.id === id);
  if (!category || !category.isCustom) return false;

  // Remove category
  state.categories = state.categories.filter(c => c.id !== id);
  
  // Re-map transactions with deleted category to 'otros'
  state.transactions = state.transactions.map(t => {
    if (t.category === id) {
      return { ...t, category: 'otros' };
    }
    return t;
  });

  // Remove category budget if exists
  if (state.budgets.categories[id]) {
    delete state.budgets.categories[id];
  }

  saveState();
  return true;
}

/* ==========================================================================
   BUDGETS MANAGEMENT
   ========================================================================== */

export function setGlobalBudget(amount) {
  state.budgets.global = Math.max(0, parseFloat(amount) || 0);
  saveState();
}

export function setCategoryBudget(categoryId, amount) {
  const parsedAmount = Math.max(0, parseFloat(amount) || 0);
  if (parsedAmount === 0) {
    delete state.budgets.categories[categoryId];
  } else {
    state.budgets.categories[categoryId] = parsedAmount;
  }
  saveState();
}

/* ==========================================================================
   SETTINGS MANAGEMENT
   ========================================================================== */

export function updateSettings(newSettings) {
  state.settings = {
    ...state.settings,
    ...newSettings
  };
  saveState();
}

/* ==========================================================================
   DEBTS MANAGEMENT
   ========================================================================== */

export function addDebt({ type, person, amount, date, dueDate, note }) {
  const parsedAmount = parseFloat(amount);
  const newDebt = {
    id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type, // 'to_pay' (Debo a...) | 'to_collect' (Me deben...)
    person: person.trim(),
    amount: parsedAmount,
    originalAmount: parsedAmount,
    remainingAmount: parsedAmount,
    date: date || new Date().toISOString().split('T')[0],
    dueDate: dueDate || '',
    note: note.trim(),
    status: 'active', // 'active' | 'paid'
    payments: [],
    increases: []
  };

  state.debts.unshift(newDebt);
  saveState();
  return newDebt;
}

export function addDebtIncrease(debtId, { amount, date, logTransaction }) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return null;

  const increaseAmount = parseFloat(amount);
  const increase = {
    id: `inc_${Date.now()}`,
    amount: increaseAmount,
    date
  };

  if (!debt.increases) {
    debt.increases = [];
  }
  debt.increases.push(increase);

  // Initialize originalAmount if not present
  if (debt.originalAmount === undefined) {
    const totalPreviousIncreases = debt.increases.slice(0, -1).reduce((sum, inc) => sum + inc.amount, 0);
    debt.originalAmount = debt.amount - totalPreviousIncreases;
  }

  // Recalculate amounts
  const totalIncreased = debt.increases.reduce((sum, inc) => sum + inc.amount, 0);
  const totalPaid = (debt.payments || []).reduce((sum, p) => sum + p.amount, 0);

  debt.amount = debt.originalAmount + totalIncreased;
  debt.remainingAmount = Math.max(0, debt.amount - totalPaid);

  if (debt.remainingAmount > 0) {
    debt.status = 'active';
  }

  // Optionally register transaction
  if (logTransaction) {
    const txType = debt.type === 'to_pay' ? 'income' : 'expense';
    const txNote = debt.type === 'to_pay'
      ? `Incremento de deuda: ${debt.person}`
      : `Incremento de préstamo: ${debt.person}`;

    addTransaction({
      amount: increaseAmount,
      type: txType,
      category: 'otros',
      date,
      note: txNote
    });
  } else {
    saveState();
  }

  return debt;
}

export function deleteDebt(id) {
  const initialLength = state.debts.length;
  state.debts = state.debts.filter(d => d.id !== id);
  if (state.debts.length !== initialLength) {
    saveState();
    return true;
  }
  return false;
}

export function reorderDebt(id, direction) {
  const index = state.debts.findIndex(d => d.id === id);
  if (index === -1) return false;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.debts.length) return false;

  const temp = state.debts[index];
  state.debts[index] = state.debts[targetIndex];
  state.debts[targetIndex] = temp;

  saveState();
  return true;
}

export function addDebtPayment(debtId, { amount, date, logTransaction }) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return null;

  const paymentAmount = parseFloat(amount);
  const payment = {
    id: `pay_${Date.now()}`,
    amount: paymentAmount,
    date
  };

  debt.payments.push(payment);
  
  // Calculate remaining
  const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
  debt.remainingAmount = Math.max(0, debt.amount - totalPaid);

  if (debt.remainingAmount <= 0) {
    debt.status = 'paid';
  }

  // Optionally register transaction
  if (logTransaction) {
    const txType = debt.type === 'to_pay' ? 'expense' : 'income';
    const txNote = debt.type === 'to_pay' 
      ? `Abono a deuda: ${debt.person}` 
      : `Cobro de deudor: ${debt.person}`;
    
    addTransaction({
      amount: paymentAmount,
      type: txType,
      category: 'otros',
      date,
      note: txNote
    });
  } else {
    saveState();
  }

  return debt;
}

/* ==========================================================================
   IMPORT & EXPORT DATA
   ========================================================================== */

export function exportToJSON() {
  return JSON.stringify(state, null, 2);
}

export function importFromJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validation
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error('Formato inválido: Falta lista de transacciones');
    }
    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error('Formato inválido: Falta lista de categorías');
    }

    state = {
      transactions: parsed.transactions,
      categories: parsed.categories,
      budgets: parsed.budgets || { global: 0, categories: {} },
      settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
      debts: parsed.debts || []
    };
    saveState();
    return true;
  } catch (error) {
    console.error('Error importing JSON data:', error);
    throw error;
  }
}

export function exportToCSV() {
  const headers = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'];
  
  // Create mapping of categoryId -> CategoryName for readability
  const categoryMap = state.categories.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {});

  const rows = state.transactions.map(t => [
    t.id,
    t.date,
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    categoryMap[t.category] || 'Desconocido',
    `"${t.note.replace(/"/g, '""')}"`, // escape quotes for CSV compatibility
    t.amount.toFixed(2)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/* ==========================================================================
   RESET APPLICATION
   ========================================================================== */

export function resetApp() {
  localStorage.removeItem('gastosflow_state');
  state = {
    transactions: [],
    categories: [...DEFAULT_CATEGORIES],
    budgets: { global: 0, categories: {} },
    settings: { ...INITIAL_STATE.settings },
    debts: []
  };
  saveState();
}
