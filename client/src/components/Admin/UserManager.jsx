import React, { useState } from 'react';
import { Users, UserPlus, Shield, Wheat, Store, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export default function UserManager({ 
  users, 
  branches, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser 
}) {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('baker');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'main');

  function handleAddSubmit(e) {
    e.preventDefault();
    if (!username || !password || !fullName) return;

    onAddUser({
      username,
      password,
      full_name: fullName,
      role,
      phone,
      branch_id: branchId,
      active: true,
    });

    setShowAddModal(false);
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('admin.userManager.title', 'User & Role Management')}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('admin.userManager.subtitle', 'Create employee logins and assign roles (Administrator, Baker / Production, Cashier / Sales).')}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-emerald-300" />
          <span>{t('admin.userManager.addEmployeeBtn', 'Add Employee Account')}</span>
        </button>
      </div>

      {/* Users List Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">{t('admin.userManager.colFullName', 'Full Name')}</th>
                <th className="py-3 px-4">{t('admin.userManager.colUsername', 'Username')}</th>
                <th className="py-3 px-4">{t('admin.userManager.colRole', 'Role / Department')}</th>
                <th className="py-3 px-4">{t('admin.userManager.colPhone', 'Phone')}</th>
                <th className="py-3 px-4">{t('admin.userManager.colStatus', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('admin.userManager.colActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => {
                const roleLabel = u.role === 'admin' 
                  ? t('admin.userManager.roleAdmin', 'Administrator / Owner')
                  : u.role === 'baker'
                  ? t('admin.userManager.roleBaker', 'Baker (Production)')
                  : t('admin.userManager.roleCashier', 'Cashier (Sales/POS)');
                return (
                  <tr key={u.id || u.username} className="hover:bg-amber-50/20">
                    <td className="py-3.5 px-4 font-extrabold text-stone-900 flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs ${
                        u.role === 'admin' ? 'bg-stone-800' :
                        u.role === 'baker' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        {u.role === 'admin' ? <Shield className="w-4 h-4" /> :
                         u.role === 'baker' ? <Wheat className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                      </div>
                      <span>{u.full_name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-700">@{u.username}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-stone-100 text-stone-800' :
                        u.role === 'baker' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {roleLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{u.phone || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.active ? t('common.active', 'Active') : t('common.inactive', 'Deactivated')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.active ? (
                        <button
                          onClick={() => onDeleteUser(u.id)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          {t('admin.userManager.deactivate', 'Deactivate')}
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateUser(u.id, { active: true })}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                        >
                          {t('admin.userManager.activate', 'Activate')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">
                {t('admin.userManager.addEmployeeTitle', 'Create New Employee Account')}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('admin.userManager.fullNameLabel', 'Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Almaz Bekele"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('admin.userManager.usernameLabel', 'Username *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="almaz"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('admin.userManager.passwordLabel', 'Temporary Password *')}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('admin.userManager.rolePermission', 'Role Permission *')}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="baker">{t('admin.userManager.roleBaker', 'Baker (Production)')}</option>
                    <option value="cashier">{t('admin.userManager.roleCashier', 'Cashier (Sales/POS)')}</option>
                    <option value="admin">{t('admin.userManager.roleAdmin', 'Administrator / Owner')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('admin.userManager.phoneLabel', 'Phone Number')}
                  </label>
                  <input
                    type="text"
                    placeholder="+251..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-stone-100 font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-700 text-white font-bold py-2 rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {t('admin.userManager.saveEmployee', 'Create Account')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
