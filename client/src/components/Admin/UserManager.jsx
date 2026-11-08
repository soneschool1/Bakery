import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Wheat, 
  Store, 
  CheckCircle, 
  XCircle, 
  Edit2, 
  Trash2, 
  Search, 
  Building2, 
  Phone, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  Check, 
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export default function UserManager({ 
  users = [], 
  branches = [], 
  admin = {},
  onAddUser, 
  onUpdateUser, 
  onDeleteUser 
}) {
  const { t } = useTranslation();

  const safeUsers = Array.isArray(users) ? users : [];
  const safeBranches = Array.isArray(branches) ? branches : [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'admin', 'baker', 'cashier'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  // Add Form state
  const [addFullName, setAddFullName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('baker');
  const [addPhone, setAddPhone] = useState('');
  const [addBranchId, setAddBranchId] = useState(safeBranches[0]?.id || safeBranches[0]?._id || 'main');
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit Form state
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('baker');
  const [editPhone, setEditPhone] = useState('');
  const [editBranchId, setEditBranchId] = useState('main');
  const [editActive, setEditActive] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = safeUsers.length;
    const active = safeUsers.filter(u => u.active).length;
    const admins = safeUsers.filter(u => u.role === 'admin').length;
    const bakers = safeUsers.filter(u => u.role === 'baker').length;
    const cashiers = safeUsers.filter(u => u.role === 'cashier').length;
    return { total, active, admins, bakers, cashiers };
  }, [safeUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return safeUsers.filter((u) => {
      const matchSearch = 
        !searchTerm.trim() ||
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone || '').includes(searchTerm);

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && u.active) || 
        (statusFilter === 'inactive' && !u.active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [safeUsers, searchTerm, roleFilter, statusFilter]);

  // Open Edit Modal
  function handleOpenEdit(user) {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditUsername(user.username || '');
    setEditPassword('');
    setEditRole(user.role || 'baker');
    setEditPhone(user.phone || '');
    setEditBranchId(user.branch_id || safeBranches[0]?.id || 'main');
    setEditActive(user.active !== false);
    setShowEditPassword(false);
    setModalNotice('');
  }

  // Handle Add Submit
  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!addUsername.trim() || !addPassword.trim() || !addFullName.trim()) {
      alert('Please fill in Full Name, Username, and Password.');
      return;
    }

    setIsSubmitting(true);
    setModalNotice('');

    try {
      if (onAddUser) {
        await onAddUser({
          username: addUsername.trim(),
          password: addPassword.trim(),
          full_name: addFullName.trim(),
          role: addRole,
          phone: addPhone.trim(),
          branch_id: addBranchId,
          active: true,
        });
      }

      setShowAddModal(false);
      setAddUsername('');
      setAddPassword('');
      setAddFullName('');
      setAddPhone('');
      setAddRole('baker');
    } catch (err) {
      setModalNotice(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Edit Submit
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUsername.trim() || !editFullName.trim()) {
      alert('Full Name and Username are required.');
      return;
    }

    setIsSubmitting(true);
    setModalNotice('');

    try {
      const payload = {
        full_name: editFullName.trim(),
        username: editUsername.trim(),
        role: editRole,
        phone: editPhone.trim(),
        branch_id: editBranchId,
        active: editActive,
      };

      // Only include password if a new one was entered
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const userId = editingUser.id || editingUser._id;
      if (onUpdateUser) {
        await onUpdateUser(userId, payload);
      }

      setEditingUser(null);
    } catch (err) {
      setModalNotice(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Toggle user activation status
  async function handleToggleStatus(user) {
    const userId = user.id || user._id;
    const isSelf = (admin.id && admin.id === userId) || (admin.username && admin.username === user.username);
    if (isSelf) {
      alert('You cannot deactivate your own active Administrator account.');
      return;
    }

    const nextStatus = !user.active;
    const actionName = nextStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionName} employee @${user.username}?`)) {
      return;
    }

    try {
      if (onUpdateUser) {
        await onUpdateUser(userId, { active: nextStatus });
      }
    } catch (err) {
      alert(`Failed to ${actionName} user: ${err.message}`);
    }
  }

  // Confirm Permanent Delete
  async function handleConfirmDelete() {
    if (!userToDelete) return;
    const userId = userToDelete.id || userToDelete._id;
    const isSelf = (admin.id && admin.id === userId) || (admin.username && admin.username === userToDelete.username);
    if (isSelf) {
      alert('You cannot delete your own Administrator account.');
      setUserToDelete(null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (onDeleteUser) {
        await onDeleteUser(userId, true);
      }
      setUserToDelete(null);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Card with Summary & Add Action */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-[#064e3b]">
              <Users className="w-5 h-5 text-[#064e3b]" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">
                {t('admin.userManager.title', 'User & Role Management')}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                {t('admin.userManager.subtitle', 'Create employee logins and assign roles (Administrator, Baker / Production, Cashier / Sales).')}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setModalNotice('');
          }}
          className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-sm transition-all flex items-center space-x-2 cursor-pointer active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4 text-emerald-300" />
          <span>{t('admin.userManager.addEmployeeBtn', 'Add New Employee Account')}</span>
        </button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Users</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Accounts</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">Administrators</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{stats.admins}</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Bakers</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{stats.bakers}</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cashiers</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.cashiers}</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, username, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:border-[#064e3b]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Role Filter Pills */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl">
            {['all', 'admin', 'baker', 'cashier'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                  roleFilter === r
                    ? 'bg-[#064e3b] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/70 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">{t('admin.userManager.colFullName', 'Employee Name')}</th>
                <th className="py-3.5 px-4">{t('admin.userManager.colUsername', 'Username')}</th>
                <th className="py-3.5 px-4">{t('admin.userManager.colRole', 'Role & Permissions')}</th>
                <th className="py-3.5 px-4">{t('admin.userManager.colPhone', 'Phone Number')}</th>
                <th className="py-3.5 px-4">Branch Location</th>
                <th className="py-3.5 px-4">{t('admin.userManager.colStatus', 'Status')}</th>
                <th className="py-3.5 px-4 text-right">{t('admin.userManager.colActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-stone-400 font-bold">
                    No employees matching the current search / filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const userId = u.id || u._id;
                  const isSelf = (admin.id && admin.id === userId) || (admin.username && admin.username === u.username);
                  const branchObj = safeBranches.find(b => b.id === u.branch_id || b._id === u.branch_id);
                  const branchName = branchObj ? branchObj.name : 'Main Bakery & Shop';

                  const roleLabel = u.role === 'admin' 
                    ? t('admin.userManager.roleAdmin', 'Administrator / Owner')
                    : u.role === 'baker'
                    ? t('admin.userManager.roleBaker', 'Head Baker (Production)')
                    : t('admin.userManager.roleCashier', 'Cashier (Sales/POS)');

                  return (
                    <tr key={userId || u.username} className="hover:bg-amber-50/20 transition-colors">
                      
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-black text-stone-900">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs ${
                            u.role === 'admin' ? 'bg-stone-900' :
                            u.role === 'baker' ? 'bg-amber-600' : 'bg-[#064e3b]'
                          }`}>
                            {u.role === 'admin' ? <Shield className="w-4 h-4 text-amber-400" /> :
                             u.role === 'baker' ? <Wheat className="w-4 h-4 text-amber-200" /> : <Store className="w-4 h-4 text-emerald-300" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span>{u.full_name}</span>
                              {isSelf && (
                                <span className="bg-stone-200 text-stone-800 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-400 font-normal">
                              ID: {userId ? String(userId).slice(-6) : '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-700">
                        @{u.username}
                      </td>

                      {/* Role Pill */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center space-x-1 ${
                          u.role === 'admin' ? 'bg-stone-100 text-stone-800 border border-stone-300' :
                          u.role === 'baker' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          <span>{roleLabel}</span>
                        </span>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4">
                        {u.phone ? (
                          <span className="font-mono font-bold text-stone-700 inline-flex items-center space-x-1">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <span>{u.phone}</span>
                          </span>
                        ) : (
                          <span className="text-stone-300 italic">None</span>
                        )}
                      </td>

                      {/* Branch Assignment */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1 text-stone-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-stone-400" />
                          <span className="truncate max-w-[140px]">{branchName}</span>
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          <span>{u.active ? t('common.active', 'Active') : t('common.inactive', 'Deactivated')}</span>
                        </span>
                      </td>

                      {/* Action Buttons: Edit, Deactivate/Activate, Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          
                          {/* 1. Edit User Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 transition-colors cursor-pointer"
                            title="Edit employee details or reset password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Toggle Status Button */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf 
                                ? 'opacity-30 cursor-not-allowed bg-stone-100 text-stone-400' 
                                : u.active
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900'
                            }`}
                            title={isSelf ? 'Cannot deactivate self' : u.active ? 'Deactivate user' : 'Activate user'}
                          >
                            {u.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>

                          {/* 3. Delete Permanently Button */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setUserToDelete(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf 
                                ? 'opacity-30 cursor-not-allowed bg-stone-100 text-stone-400' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-900'
                            }`}
                            title={isSelf ? 'Cannot delete self' : 'Permanently delete user'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ADD NEW EMPLOYEE ACCOUNT                             */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form 
            onSubmit={handleAddSubmit} 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#064e3b]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-stone-900 text-base">
                  {t('admin.userManager.addEmployeeTitle', 'Create New Employee Account')}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} 
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalNotice && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {modalNotice}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                  {t('admin.userManager.fullNameLabel', 'Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Almaz Bekele"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    {t('admin.userManager.usernameLabel', 'Username *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. almaz"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    {t('admin.userManager.passwordLabel', 'Password *')}
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl pl-3.5 pr-9 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    {t('admin.userManager.rolePermission', 'Role Permission *')}
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  >
                    <option value="baker">{t('admin.userManager.roleBaker', 'Head Baker (Production)')}</option>
                    <option value="cashier">{t('admin.userManager.roleCashier', 'Cashier (Sales/POS)')}</option>
                    <option value="admin">{t('admin.userManager.roleAdmin', 'Administrator / Owner')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    {t('admin.userManager.phoneLabel', 'Phone Number (for login)')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0911223344"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                  Assigned Branch
                </label>
                <select
                  value={addBranchId}
                  onChange={(e) => setAddBranchId(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                >
                  {safeBranches.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name} ({b.location || 'Branch'}) {b.is_main ? '★ Main Shop' : ''}
                    </option>
                  ))}
                  {safeBranches.length === 0 && (
                    <option value="main">Main Bakery & Shop</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 font-bold py-3 rounded-2xl text-xs text-stone-700 cursor-pointer transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#064e3b] hover:bg-emerald-900 text-white font-black py-3 rounded-2xl text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : t('admin.userManager.saveEmployee', 'Create Account')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT EMPLOYEE ACCOUNT & ROLE                         */}
      {/* ============================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form 
            onSubmit={handleEditSubmit} 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">
                    Edit Employee: {editingUser.full_name}
                  </h3>
                  <div className="text-[10px] text-stone-400 font-mono">@{editingUser.username}</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingUser(null)} 
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalNotice && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {modalNotice}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1 flex items-center justify-between">
                    <span>Reset Password</span>
                    <span className="text-[9px] text-stone-400 font-normal lowercase">(leave blank to keep)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Enter new password to change..."
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl pl-3.5 pr-9 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    Role & Permissions *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  >
                    <option value="baker">{t('admin.userManager.roleBaker', 'Head Baker (Production)')}</option>
                    <option value="cashier">{t('admin.userManager.roleCashier', 'Cashier (Sales/POS)')}</option>
                    <option value="admin">{t('admin.userManager.roleAdmin', 'Administrator / Owner')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    Phone Number (for login)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0911223344"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  >
                    {safeBranches.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>
                        {b.name} {b.is_main ? '★ Main Shop' : ''}
                      </option>
                    ))}
                    {safeBranches.length === 0 && (
                      <option value="main">Main Bakery & Shop</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={editActive ? 'true' : 'false'}
                    onChange={(e) => setEditActive(e.target.value === 'true')}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:bg-white focus:outline-none focus:border-[#064e3b]"
                  >
                    <option value="true">Active Account (Allowed to log in)</option>
                    <option value="false">Deactivated (Login blocked)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 font-bold py-3 rounded-2xl text-xs text-stone-700 cursor-pointer transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#064e3b] hover:bg-emerald-900 text-white font-black py-3 rounded-2xl text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save User Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE USER CONFIRMATION                             */}
      {/* ============================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-base">Permanently Delete Account?</h3>
                <p className="text-xs text-stone-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-xs space-y-1">
              <div className="font-black text-stone-900">{userToDelete.full_name}</div>
              <div className="font-mono text-stone-600">@{userToDelete.username} ({userToDelete.role})</div>
              {userToDelete.phone && <div className="text-stone-500">Phone: {userToDelete.phone}</div>}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 font-bold py-3 rounded-2xl text-xs text-stone-700 cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-2xl text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
