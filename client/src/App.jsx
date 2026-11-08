import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import FlourAlertBanner from './components/FlourAlertBanner';
import NotificationDrawer from './components/NotificationDrawer';
import ReceiptModal from './components/ReceiptModal';
import BankDepositForm from './components/Cashier/BankDepositForm';
import BakerDashboard from './components/Baker/BakerDashboard';
import CashierDashboard from './components/Cashier/CashierDashboard';
import AdminPanel from './components/Admin/AdminPanel';
import LoginPage from './components/Auth/LoginPage';
import { api, setupSSE } from './services/api';
import { useTranslation } from './i18n/LanguageContext';
import { 
  Wheat, 
  Store, 
  ShieldCheck, 
  RefreshCw, 
  LayoutGrid, 
  Package, 
  ShoppingCart, 
  FileText, 
  Settings, 
  Landmark,
  LogOut 
} from 'lucide-react';

export default function App() {
  const { t } = useTranslation();
  // Authentication State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('harbuu_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active Viewing Persona (Admin can switch between personas; regular users are locked to their account)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('harbuu_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [allUsers, setAllUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedStock, setFinishedStock] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [closings, setClosings] = useState([]);
  const [closingSummary, setClosingSummary] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [flourTracker, setFlourTracker] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stockChecks, setStockChecks] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  // Filters & UI State
  const [dateRange, setDateRange] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Load All System Data
  const loadAllData = useCallback(async () => {
    try {
      const [
        usersRes,
        productsRes,
        materialsRes,
        stockRes,
        batchesRes,
        branchesRes,
        transfersRes,
        closingsRes,
        summaryRes,
        depositsRes,
        varExpRes,
        fixExpRes,
        flourRes,
        sugRes,
        notifRes,
        auditRes,
        stockChecksRes,
      ] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getProducts().catch(() => []),
        api.getRawMaterials().catch(() => []),
        api.getFinishedStock().catch(() => []),
        api.getProductionBatches().catch(() => []),
        api.getBranches().catch(() => []),
        api.getBranchTransfers().catch(() => []),
        api.getDailyClosings().catch(() => []),
        api.getDailyClosingSummary().catch(() => null),
        api.getBankDeposits().catch(() => []),
        api.getVariableExpenses().catch(() => []),
        api.getFixedExpenses().catch(() => []),
        api.getFlourTracker().catch(() => null),
        api.getSuggestions().catch(() => []),
        api.getNotifications().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getStockChecks().catch(() => []),
      ]);

      setAllUsers(usersRes);
      if (usersRes.length > 0 && authUser && !currentUser?.id) {
        const matched = usersRes.find(u => u.username === authUser.username) || authUser;
        setCurrentUser(matched);
      }
      setProducts(productsRes);
      setRawMaterials(materialsRes);
      setFinishedStock(stockRes);
      setBatches(batchesRes);
      setBranches(branchesRes);
      setTransfers(transfersRes);
      setClosings(closingsRes);
      setClosingSummary(summaryRes);
      setDeposits(depositsRes);
      setVariableExpenses(varExpRes);
      setFixedExpenses(fixExpRes);
      setFlourTracker(flourRes);
      setSuggestions(sugRes);
      setNotifications(notifRes);
      setAuditLogs(auditRes);
      setStockChecks(stockChecksRes);

      loadDashboard();
    } catch (err) {
      console.error('Initial data fetch error:', err);
    }
  }, [currentUser?.id, authUser]);

  const loadDashboard = useCallback(async () => {
    try {
      let params = `range=${dateRange}`;
      if (dateRange === 'custom' && customStart && customEnd) {
        params += `&start_date=${customStart}&end_date=${customEnd}`;
      }
      const data = await api.getDashboardData(params);
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    loadDashboard();
  }, [dateRange, loadDashboard]);

  const loadAllDataRef = useRef(loadAllData);
  useEffect(() => {
    loadAllDataRef.current = loadAllData;
  }, [loadAllData]);

  // Real-time Server-Sent Events setup
  useEffect(() => {
    const cleanup = setupSSE((event) => {
      if (event.type === 'sse_status') {
        setSseConnected(event.connected);
      } else {
        // Any data change triggers seamless refresh
        if (loadAllDataRef.current) {
          loadAllDataRef.current();
        }
      }
    });
    return cleanup;
  }, []);

  // Authentication handlers
  function handleLoginSuccess(user) {
    setAuthUser(user);
    setCurrentUser(user);
    try {
      localStorage.setItem('harbuu_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  }

  function handleLogout() {
    setAuthUser(null);
    setCurrentUser(null);
    try {
      localStorage.removeItem('harbuu_auth_user');
    } catch (e) {
      console.error(e);
    }
  }

  // Actions
  async function handleCreateBatch(batchPayload) {
    setIsSubmitting(true);
    try {
      await api.createProductionBatch(batchPayload);
      await loadAllData();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditBatch(batchId, editPayload) {
    try {
      await api.editProductionBatch(batchId, editPayload);
      await loadAllData();
    } catch (err) {
      alert(`Edit error: ${err.message}`);
    }
  }

  async function handleCancelBatch(batchId, cancelPayload) {
    try {
      await api.cancelProductionBatch(batchId, cancelPayload);
      await loadAllData();
    } catch (err) {
      alert(`Cancel error: ${err.message}`);
    }
  }

  async function handleCompleteSale(salePayload, printReceipt = true) {
    setIsSubmitting(true);
    try {
      const createdSale = await api.createSale(salePayload);
      if (printReceipt) {
        setActiveReceipt(createdSale);
      }
      await loadAllData();
      return createdSale;
    } catch (err) {
      alert(`Sale error: ${err.message}`);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendTransfer(transferPayload) {
    setIsSubmitting(true);
    try {
      await api.createBranchTransfer(transferPayload);
      await loadAllData();
      alert('Transfer dispatched successfully!');
    } catch (err) {
      alert(`Transfer error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReceiveTransfer(transferId, payload) {
    try {
      await api.receiveBranchTransfer(transferId, payload);
      await loadAllData();
      alert('Transfer received and branch inventory updated!');
    } catch (err) {
      alert(`Receive error: ${err.message}`);
    }
  }

  async function handleCreateBranch(branchPayload) {
    try {
      const created = await api.createBranch(branchPayload);
      await loadAllData();
      return created;
    } catch (err) {
      alert(`Branch creation error: ${err.message}`);
      throw err;
    }
  }

  async function handleUpdateBranch(id, branchPayload) {
    try {
      const updated = await api.updateBranch(id, branchPayload);
      await loadAllData();
      return updated;
    } catch (err) {
      alert(`Branch update error: ${err.message}`);
      throw err;
    }
  }

  async function handleSubmitClosing(closingPayload) {
    setIsSubmitting(true);
    try {
      await api.createDailyClosing(closingPayload);
      await loadAllData();
      alert('Daily closing submitted successfully for administrator approval!');
    } catch (err) {
      alert(`Closing error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReviewClosing(closingId, status) {
    try {
      await api.reviewDailyClosing(closingId, {
        status,
        admin_name: currentUser?.full_name || 'Abebe Kebede',
      });
      await loadAllData();
      alert(`Closing ${status}!`);
    } catch (err) {
      alert(`Review error: ${err.message}`);
    }
  }

  async function handleRecordDeposit(depositPayload) {
    setIsSubmitting(true);
    try {
      await api.createBankDeposit(depositPayload);
      await loadAllData();
      setShowDepositModal(false);
      alert('Bank deposit recorded successfully!');
    } catch (err) {
      alert(`Deposit error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddExpense(expensePayload) {
    setIsSubmitting(true);
    try {
      await api.createVariableExpense(expensePayload);
      await loadAllData();
      alert('Expense recorded successfully!');
    } catch (err) {
      alert(`Expense error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitStockCheck(checkPayload) {
    setIsSubmitting(true);
    try {
      await api.createStockCheck(checkPayload);
      await loadAllData();
      alert('Weekly stock check submitted for administrator review!');
    } catch (err) {
      alert(`Stock check error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApproveStockCheck(checkId) {
    try {
      await api.approveStockCheck(checkId, currentUser?.full_name || 'Abebe Kebede');
      await loadAllData();
      alert('Weekly stock check approved and physical inventory synchronized!');
    } catch (err) {
      alert(`Approve error: ${err.message}`);
    }
  }

  // Admin CRUD handlers
  async function handleAddMaterial(mat) {
    try {
      const created = await api.createRawMaterial(mat);
      await loadAllData();
      return created;
    } catch (err) { 
      alert(err.message); 
      throw err;
    }
  }

  async function handleDeleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await api.deleteRawMaterial(id);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleAdjustStock(adj) {
    try {
      await api.adjustStock(adj);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleAdjustFinishedStock(adj) {
    try {
      await api.adjustFinishedStock(adj);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleAddProduct(prod) {
    try {
      await api.createProduct(prod);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleUpdateProduct(id, prod) {
    try {
      await api.updateProduct(id, prod);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleDeleteProduct(id) {
    if (!confirm('Deactivate this product?')) return;
    try {
      await api.deleteProduct(id);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleAddFixedExpense(fe) {
    try {
      await api.createFixedExpense(fe);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleDeleteFixedExpense(id) {
    if (!confirm('Deactivate this fixed expense?')) return;
    try {
      await api.deleteFixedExpense(id);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleAddSuggestion(sug) {
    try {
      const res = await api.createSuggestion(sug);
      await loadAllData();
      return res;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  async function handleUpdateSuggestion(id, sug) {
    try {
      const res = await api.updateSuggestion(id, sug);
      await loadAllData();
      return res;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  async function handleDeleteSuggestion(id) {
    try {
      const res = await api.deleteSuggestion(id);
      await loadAllData();
      return res;
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  async function handleAddUser(usr) {
    try {
      const created = await api.createUser(usr);
      await loadAllData();
      return created;
    } catch (err) { 
      alert(`User creation error: ${err.message}`); 
      throw err;
    }
  }

  async function handleUpdateUser(id, usr) {
    try {
      const updated = await api.updateUser(id, usr);
      await loadAllData();
      return updated;
    } catch (err) { 
      alert(`User update error: ${err.message}`); 
      throw err;
    }
  }

  async function handleDeleteUser(id, permanent = false) {
    try {
      await api.deleteUser(id, permanent ? 'permanent=true' : '');
      await loadAllData();
    } catch (err) { 
      alert(`User action error: ${err.message}`); 
      throw err;
    }
  }

  async function handleMarkNotificationRead(id) {
    try {
      await api.markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) { console.error(err); }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  }

  // If not authenticated, render Login Page
  if (!authUser || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 flex flex-col font-sans antialiased">
      
      {/* 1. Global Navbar with Role Switcher & Live SSE */}
      <Navbar
        authUser={authUser}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        allUsers={allUsers}
        flourTracker={flourTracker}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        sseConnected={sseConnected}
        onLogout={handleLogout}
      />

      {/* 2. Flour Consumption Milestone Reminder Alert Banner */}
      <FlourAlertBanner
        flourTracker={flourTracker}
        onOpenDepositModal={() => setShowDepositModal(true)}
      />

      {/* 3. Main Workspace & Pinterest Floating Icon Dock */}
      <div className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex gap-6 items-start">
        
        {/* Left Floating Icon Dock (Visible for Baker & Cashier; Admin uses SINO sidebar) */}
        {currentUser?.role !== 'admin' && (
          <aside className="hidden xl:flex flex-col items-center justify-between py-5 px-2 bg-white border border-gray-100/90 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] w-15 shrink-0 sticky top-24">
            <div className="flex flex-col items-center space-y-3.5">
              {authUser.role === 'admin' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const adminUser = allUsers.find(u => u.role === 'admin') || authUser;
                      setCurrentUser(adminUser);
                    }}
                    title={t('common.dockExecutive', 'Executive Dashboard & Graphs')}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      currentUser?.role === 'admin'
                        ? 'bg-[#0E7452] text-white shadow-md shadow-[#0E7452]/25'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const bakerUser = allUsers.find(u => u.role === 'baker') || { role: 'baker', full_name: 'Dawit Alemu (Head Baker)' };
                      setCurrentUser(bakerUser);
                    }}
                    title={t('common.dockBaker', 'Inspect Baker Production Desk')}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      currentUser?.role === 'baker'
                        ? 'bg-[#0E7452] text-white shadow-md shadow-[#0E7452]/25'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Wheat className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cashierUser = allUsers.find(u => u.role === 'cashier') || { 
                        id: '6af07ccc1810e6c735504360',
                        username: 'cashier',
                        role: 'cashier', 
                        full_name: 'Tigist Haile (Cashier)',
                        branch_id: '6af07ccc1810e6c73550435a'
                      };
                      setCurrentUser(cashierUser);
                    }}
                    title={t('common.dockCashier', 'Inspect Cashier POS')}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      currentUser?.role === 'cashier'
                        ? 'bg-[#0E7452] text-white shadow-md shadow-[#0E7452]/25'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </>
              ) : authUser.role === 'baker' ? (
                /* Baker only sees isolated Baker desk */
                <div 
                  title={t('common.dockBakerDesk', 'Head Baker Desk')} 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#0E7452] text-white shadow-md shadow-[#0E7452]/25"
                >
                  <Wheat className="w-5 h-5" />
                </div>
              ) : (
                /* Cashier only sees isolated Cashier desk */
                <div 
                  title={t('common.dockCashierDesk', 'Cashier POS Desk')} 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#0E7452] text-white shadow-md shadow-[#0E7452]/25"
                >
                  <ShoppingCart className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center space-y-3 pt-5 mt-4 border-t border-gray-100">
              {authUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    const adminUser = allUsers.find(u => u.role === 'admin') || authUser;
                    setCurrentUser(adminUser);
                  }}
                  title={t('common.dockSettings', 'Settings & Payroll')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                title={t('common.dockSignOut', 'Sign Out')}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Main Content View */}
        <main className="flex-1 min-w-0">
        
        {/* Baker Interface */}
        {currentUser?.role === 'baker' && (
          <BakerDashboard
            baker={currentUser}
            products={products}
            rawMaterials={rawMaterials}
            batches={batches}
            suggestions={suggestions}
            onCreateBatch={handleCreateBatch}
            onEditBatch={handleEditBatch}
            onSubmitStockCheck={handleSubmitStockCheck}
            onApproveStockCheck={handleApproveStockCheck}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Cashier Interface */}
        {currentUser?.role === 'cashier' && (
          <CashierDashboard
            cashier={currentUser}
            products={products}
            finishedStock={finishedStock}
            branches={branches}
            rawMaterials={rawMaterials}
            transfers={transfers}
            closings={closings}
            closingSummary={closingSummary}
            deposits={deposits}
            expenses={variableExpenses}
            flourTracker={flourTracker}
            suggestions={suggestions}
            stockChecks={stockChecks}
            onCompleteSale={handleCompleteSale}
            onSendTransfer={handleSendTransfer}
            onReceiveTransfer={handleReceiveTransfer}
            onSubmitClosing={handleSubmitClosing}
            onReviewClosing={handleReviewClosing}
            onRecordDeposit={handleRecordDeposit}
            onAddExpense={handleAddExpense}
            onSubmitStockCheck={handleSubmitStockCheck}
            onApproveStockCheck={handleApproveStockCheck}
            onCreateBranch={handleCreateBranch}
            onUpdateBranch={handleUpdateBranch}
            onCreateProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onAddMaterial={handleAddMaterial}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Admin Interface */}
        {currentUser?.role === 'admin' && (
          <AdminPanel
            admin={currentUser}
            dashboardData={dashboardData}
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            onRefreshDashboard={loadDashboard}
            batches={batches}
            rawMaterials={rawMaterials}
            finishedStock={finishedStock}
            products={products}
            fixedExpenses={fixedExpenses}
            expenses={variableExpenses}
            suggestions={suggestions}
            users={allUsers}
            branches={branches}
            auditLogs={auditLogs}
            stockChecks={stockChecks}
            onCancelBatch={handleCancelBatch}
            onEditBatch={handleEditBatch}
            onAddMaterial={handleAddMaterial}
            onUpdateMaterial={api.updateRawMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onAdjustStock={handleAdjustStock}
            onAdjustFinishedStock={handleAdjustFinishedStock}
            onApproveStockCheck={handleApproveStockCheck}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddFixedExpense={handleAddFixedExpense}
            onUpdateFixedExpense={api.updateFixedExpense}
            onDeleteFixedExpense={handleDeleteFixedExpense}
            onAddSuggestion={handleAddSuggestion}
            onUpdateSuggestion={handleUpdateSuggestion}
            onDeleteSuggestion={handleDeleteSuggestion}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onSwitchRole={(role) => {
              const target = allUsers.find(u => u.role === role) || {
                id: role === 'cashier' ? '6af07ccc1810e6c735504360' : '6af07ccc1810e6c73550435f',
                role,
                full_name: role === 'baker' ? 'Dawit Alemu (Head Baker)' : 'Tigist Haile (Cashier)',
                username: role,
                branch_id: '6af07ccc1810e6c73550435a',
              };
              setCurrentUser(target);
            }}
          />
        )}

        </main>
      </div>

      {/* 4. Global Modals & Drawers */}
      
      {/* Receipt Modal for Cashier Sale Completion */}
      <ReceiptModal
        sale={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />

      {/* Standalone Bank Deposit Modal (when triggered from flour alert) */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold cursor-pointer"
            >
              ✕
            </button>
            <BankDepositForm
              deposits={deposits}
              flourTracker={flourTracker}
              cashier={currentUser}
              onRecordDeposit={handleRecordDeposit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}



    </div>
  );
}
