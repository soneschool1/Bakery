import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export default function SuggestionsConfigurator({ 
  suggestions, 
  onAddSuggestion, 
  onDeleteSuggestion 
}) {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState('baker');
  const [category, setCategory] = useState('recipe');
  const [title, setTitle] = useState('');
  const [payloadText, setPayloadText] = useState('{\n  "flour_kg": 50,\n  "maj_g": 500,\n  "yeast_g": 300,\n  "salt_g": 500,\n  "pieces_produced": 500\n}');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title) return;

    let parsed = {};
    try {
      parsed = JSON.parse(payloadText);
    } catch (err) {
      alert('Payload must be valid JSON: ' + err.message);
      return;
    }

    onAddSuggestion({
      role_target: roleTarget,
      category,
      title,
      payload: parsed,
      display_order: suggestions.length + 1,
      active: true,
    });

    setShowAddModal(false);
    setTitle('');
  }

  const bakerSuggestions = suggestions.filter(s => s.role_target === 'baker');
  const cashierSuggestions = suggestions.filter(s => s.role_target === 'cashier');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('admin.suggestionsConfigurator.title', 'Employee Quick Suggestions & Preset Buttons Configurator')}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('admin.suggestionsConfigurator.subtitle', 'Add custom 1-tap quick action buttons for Baker and Cashier to make their daily tasks fast.')}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>{t('admin.suggestionsConfigurator.newQuickAction', 'New Quick Action')}</span>
        </button>
      </div>

      {/* Two Columns: Baker vs Cashier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Baker Suggestions */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-3">
          <div className="pb-3 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-sm">
              {t('admin.suggestionsConfigurator.bakerPresetsTitle', 'Baker Quick Recipes & Batch Presets')}
            </h3>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
              {t('admin.suggestionsConfigurator.buttonsCount', '{count} buttons').replace('{count}', bakerSuggestions.length)}
            </span>
          </div>

          <div className="space-y-2">
            {bakerSuggestions.map((s) => (
              <div key={s.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-900">{s.title}</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                    {t('admin.suggestionsConfigurator.categoryLabel', 'Category')}: {s.category} | {JSON.stringify(s.payload).slice(0, 45)}...
                  </div>
                </div>
                <button
                  onClick={() => onDeleteSuggestion(s.id)}
                  className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                  title={t('admin.suggestionsConfigurator.removeButton', 'Remove button')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cashier Suggestions */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-3">
          <div className="pb-3 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-sm">
              {t('admin.suggestionsConfigurator.cashierExpensesSales', 'Cashier Expense & Sales Combos')}
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
              {t('admin.suggestionsConfigurator.buttonsCount', '{count} buttons').replace('{count}', cashierSuggestions.length)}
            </span>
          </div>

          <div className="space-y-2">
            {cashierSuggestions.map((s) => (
              <div key={s.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-900">{s.title}</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                    {t('admin.suggestionsConfigurator.categoryLabel', 'Category')}: {s.category} | {JSON.stringify(s.payload).slice(0, 45)}...
                  </div>
                </div>
                <button
                  onClick={() => onDeleteSuggestion(s.id)}
                  className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                  title={t('admin.suggestionsConfigurator.removeButton', 'Remove button')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Add Suggestion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">
                {t('admin.suggestionsConfigurator.addNewActionTitle', 'Create Quick Action Button')}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('admin.suggestionsConfigurator.targetRoleLabel', 'Target Employee Role')}
                </label>
                <select
                  value={roleTarget}
                  onChange={(e) => setRoleTarget(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                >
                  <option value="baker">{t('admin.userManager.roleBaker', 'Baker (Production)')}</option>
                  <option value="cashier">{t('admin.userManager.roleCashier', 'Cashier (POS / Closing)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('admin.suggestionsConfigurator.categoryLabel', 'Category')}
                </label>
                <input
                  type="text"
                  placeholder="recipe, expense, combo"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('admin.suggestionsConfigurator.buttonTitleLabel', 'Button Title *')}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Standard 50kg Table Bread Batch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('admin.suggestionsConfigurator.payloadLabel', 'Preset Payload (JSON) *')}
              </label>
              <textarea
                required
                rows="5"
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full font-mono text-xs bg-stone-50 border rounded-xl p-3 text-stone-800"
              />
              <span className="text-[10px] text-stone-400">
                {t('admin.suggestionsConfigurator.jsonHelper', 'JSON object with autofill keys')}
              </span>
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
                {t('admin.suggestionsConfigurator.savePresetBtn', 'Save Action Button')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
