const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  getUsers: () => request('/users'),
  createUser: (user) => request('/users', { method: 'POST', body: user }),
  updateUser: (id, user) => request(`/users/${id}`, { method: 'PUT', body: user }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params = '') => request(`/products${params ? '?' + params : ''}`),
  createProduct: (product) => request('/products', { method: 'POST', body: product }),
  updateProduct: (id, product) => request(`/products/${id}`, { method: 'PUT', body: product }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Inventory
  getRawMaterials: () => request('/inventory/raw-materials'),
  createRawMaterial: (mat) => request('/inventory/raw-materials', { method: 'POST', body: mat }),
  updateRawMaterial: (id, mat) => request(`/inventory/raw-materials/${id}`, { method: 'PUT', body: mat }),
  deleteRawMaterial: (id) => request(`/inventory/raw-materials/${id}`, { method: 'DELETE' }),
  adjustStock: (adjustment) => request('/inventory/adjust', { method: 'POST', body: adjustment }),
  getFinishedStock: (branchId = '') => request(`/inventory/finished-stock${branchId ? '?branch_id=' + branchId : ''}`),
  adjustFinishedStock: (adjustment) => request('/inventory/finished-stock/adjust', { method: 'POST', body: adjustment }),
  getStockChecks: () => request('/inventory/stock-checks'),
  createStockCheck: (check) => request('/inventory/stock-checks', { method: 'POST', body: check }),
  approveStockCheck: (id, adminName) => request(`/inventory/stock-checks/${id}/approve`, { method: 'POST', body: { admin_name: adminName } }),

  // Production
  getProductionBatches: (params = '') => request(`/production/batches${params ? '?' + params : ''}`),
  createProductionBatch: (batch) => request('/production/batches', { method: 'POST', body: batch }),
  editProductionBatch: (id, data) => request(`/production/batches/${id}`, { method: 'PUT', body: data }),
  cancelProductionBatch: (id, data) => request(`/production/batches/${id}/cancel`, { method: 'POST', body: data }),

  // Sales
  getSales: (params = '') => request(`/sales${params ? '?' + params : ''}`),
  createSale: (sale) => request('/sales', { method: 'POST', body: sale }),
  updateSale: (id, sale) => request(`/sales/${id}`, { method: 'PUT', body: sale }),
  deleteSale: (id, params = '') => request(`/sales/${id}${params ? '?' + params : ''}`, { method: 'DELETE' }),
  getSalesSummary: (date = '') => request(`/sales/summary${date ? '?date=' + date : ''}`),

  // Branches & Transfers
  getBranches: () => request('/branches'),
  createBranch: (branch) => request('/branches', { method: 'POST', body: branch }),
  updateBranch: (id, branch) => request(`/branches/${id}`, { method: 'PUT', body: branch }),
  getBranchTransfers: (params = '') => request(`/branches/transfers${params ? '?' + params : ''}`),
  createBranchTransfer: (transfer) => request('/branches/transfers', { method: 'POST', body: transfer }),
  receiveBranchTransfer: (id, data) => request(`/branches/transfers/${id}/receive`, { method: 'POST', body: data }),

  // Expenses
  getVariableExpenses: (params = '') => request(`/expenses/variable${params ? '?' + params : ''}`),
  createVariableExpense: (expense) => request('/expenses/variable', { method: 'POST', body: expense }),
  updateVariableExpense: (id, expense) => request(`/expenses/variable/${id}`, { method: 'PUT', body: expense }),
  deleteVariableExpense: (id, params = '') => request(`/expenses/variable/${id}${params ? '?' + params : ''}`, { method: 'DELETE' }),
  getFixedExpenses: () => request('/expenses/fixed'),
  createFixedExpense: (exp) => request('/expenses/fixed', { method: 'POST', body: exp }),
  updateFixedExpense: (id, exp) => request(`/expenses/fixed/${id}`, { method: 'PUT', body: exp }),
  deleteFixedExpense: (id) => request(`/expenses/fixed/${id}`, { method: 'DELETE' }),
  getFixedExpensePayments: (month = '') => request(`/expenses/fixed/payments${month ? '?month=' + month : ''}`),
  recordFixedExpensePayment: (data) => request('/expenses/fixed/payments', { method: 'POST', body: data }),

  // Reconciliation & Deposits
  getDailyClosingSummary: (date = '') => request(`/reconciliation/summary${date ? '?date=' + date : ''}`),
  getDailyClosings: () => request('/reconciliation/closings'),
  createDailyClosing: (closing) => request('/reconciliation/closings', { method: 'POST', body: closing }),
  reviewDailyClosing: (id, review) => request(`/reconciliation/closings/${id}/review`, { method: 'POST', body: review }),
  getBankDeposits: () => request('/reconciliation/deposits'),
  createBankDeposit: (deposit) => request('/reconciliation/deposits', { method: 'POST', body: deposit }),
  getFlourTracker: () => request('/reconciliation/flour-tracker'),
  updateFlourThreshold: (thresholdKg) => request('/reconciliation/flour-tracker/threshold', { method: 'PUT', body: { threshold_kg: thresholdKg } }),

  // Suggestions
  getSuggestions: (role = '', category = '') => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (category) params.append('category', category);
    return request(`/suggestions?${params.toString()}`);
  },
  createSuggestion: (s) => request('/suggestions', { method: 'POST', body: s }),
  updateSuggestion: (id, s) => request(`/suggestions/${id}`, { method: 'PUT', body: s }),
  deleteSuggestion: (id) => request(`/suggestions/${id}`, { method: 'DELETE' }),

  // Dashboard & Reports
  getDashboardData: (params = '') => request(`/reports/dashboard${params ? '?' + params : ''}`),
  getReportData: (reportType, params = '') => request(`/reports/${reportType}${params ? '?' + params : ''}`),

  // Notifications & Audit
  getNotifications: (role = '') => request(`/notifications${role ? '?role=' + role : ''}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  getAuditLogs: () => request('/audit-logs'),
};

// SSE Listener
export function setupSSE(onEvent) {
  let eventSource = null;
  let retryTimeout = null;

  function connect() {
    eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      onEvent({ type: 'sse_status', connected: true });
    };

    eventSource.onerror = () => {
      onEvent({ type: 'sse_status', connected: false });
      eventSource.close();
      retryTimeout = setTimeout(connect, 3000);
    };

    const eventTypes = [
      'connected',
      'production_created',
      'production_updated',
      'production_cancelled',
      'stock_updated',
      'sale_created',
      'sale_updated',
      'sale_deleted',
      'transfer_created',
      'transfer_received',
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'raw_material_updated',
      'raw_material_created',
      'deposit_reminder',
      'deposit_created',
      'flour_tracker_updated',
      'cash_closing_created',
      'cash_closing_reviewed',
      'stock_check_created',
      'stock_check_approved',
      'low_stock',
      'product_created',
      'product_updated',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch (err) {
          onEvent({ type, data: e.data });
        }
      });
    });
  }

  connect();

  return () => {
    if (eventSource) eventSource.close();
    if (retryTimeout) clearTimeout(retryTimeout);
  };
}
