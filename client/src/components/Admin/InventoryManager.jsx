import React, { useState } from 'react';
import { Package, Plus, Edit2, AlertTriangle, Scale, Trash2, CheckCircle2 } from 'lucide-react';
import { formatETB } from '../../utils/formatters';

export default function InventoryManager({ 
  rawMaterials, 
  onAddMaterial, 
  onUpdateMaterial, 
  onDeleteMaterial, 
  onAdjustStock, 
  admin 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustModalMaterial, setAdjustModalMaterial] = useState(null);
  const [newStockQty, setNewStockQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Add Material Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('ingredient');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('g');
  const [newMinStock, setNewMinStock] = useState('1000');
  const [newPrice, setNewPrice] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  function handleCategoryChange(cat) {
    setNewCategory(cat);
    if (cat === 'ingredient') {
      setNewUnit('g');
      setNewMinStock('1000');
    } else {
      setNewUnit('pieces');
      setNewMinStock('300');
    }
  }

  function handleAddSubmit(e) {
    e.preventDefault();
    if (!newName) return;

    onAddMaterial({
      name: newName,
      category: newCategory,
      current_quantity: parseFloat(newQuantity) || 0,
      unit: newUnit,
      minimum_stock: parseFloat(newMinStock) || 0,
      purchase_price: parseFloat(newPrice) || 0,
      supplier: newSupplier,
    });

    setShowAddModal(false);
    setNewName('');
    setNewQuantity('');
    setNewPrice('');
    setNewSupplier('');
  }

  function handleAdjustSubmit(e) {
    e.preventDefault();
    if (!adjustModalMaterial || newStockQty === '' || !adjustReason) return;

    onAdjustStock({
      material_id: adjustModalMaterial.id,
      new_quantity: parseFloat(newStockQty),
      reason: adjustReason,
      admin_name: admin.full_name || 'Abebe Kebede',
    });

    setAdjustModalMaterial(null);
    setNewStockQty('');
    setAdjustReason('');
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Add Button */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              Raw Materials & Packaging Inventory Management
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Track ingredients (Flour, Yeast, Maj mix, Salt, Sugar, Selit, Tekur azmud, Plastic & Paper bags).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>Add New Material / Packaging</span>
        </button>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Min Stock</th>
                <th className="py-3 px-4 text-right">Purchase Price (ETB)</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rawMaterials.map((m) => {
                const isLow = m.current_quantity <= m.minimum_stock;
                return (
                  <tr key={m.id} className={isLow ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-amber-50/20'}>
                    <td className="py-3 px-4 font-extrabold text-stone-900 flex items-center space-x-2">
                      <span>{m.name}</span>
                      {isLow && (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>LOW</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 capitalize text-stone-600">{m.category}</td>
                    <td className={`py-3 px-4 text-right font-black ${isLow ? 'text-rose-700' : 'text-stone-900'}`}>
                      {m.current_quantity}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-stone-500">{m.unit}</td>
                    <td className="py-3 px-4 text-right font-semibold text-stone-600">{m.minimum_stock}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-800">{formatETB(m.purchase_price)}</td>
                    <td className="py-3 px-4 text-stone-600 truncate max-w-[150px]">{m.supplier || '-'}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setAdjustModalMaterial(m);
                          setNewStockQty(String(m.current_quantity));
                          setAdjustReason('');
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 font-bold"
                        title="Adjust Stock (Logged in Audit)"
                      >
                        Adjust
                      </button>
                      <button
                        onClick={() => onDeleteMaterial(m.id)}
                        className="p-1 text-stone-400 hover:text-rose-600"
                        title="Delete Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">Add New Inventory Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardamom, Butter, Cake Boxes"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="ingredient">Ingredient</option>
                    <option value="packaging">Packaging</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="g">g (Grams - All standard ingredients)</option>
                    <option value="kg">kg (Kilogram - Flour only)</option>
                    <option value="pieces">pieces (Packaging)</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 font-medium">
                * Note: Except for flour (kg), all ingredients in the bakery system are measured in grams (g).
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Initial Qty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="10"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Unit Cost (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Supplier Name</label>
                <input
                  type="text"
                  placeholder="Supplier / Mill Enterprise"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full text-xs bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-stone-100 font-bold py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#064e3b] text-white font-bold py-2 rounded-xl text-xs shadow-xs"
              >
                Save Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalMaterial && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAdjustSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">Manual Stock Adjustment</h3>
              <p className="text-xs text-stone-500">
                Adjust balance for {adjustModalMaterial.name} ({adjustModalMaterial.current_quantity} {adjustModalMaterial.unit})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">New Physical Quantity ({adjustModalMaterial.unit}) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newStockQty}
                onChange={(e) => setNewStockQty(e.target.value)}
                className="w-full text-lg font-black bg-stone-50 border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Reason for Adjustment (Required for Audit) *</label>
              <textarea
                required
                rows="3"
                placeholder="e.g. Verified during physical store inspection, bag was torn / spilled"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full text-xs bg-stone-50 border rounded-xl p-3"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalMaterial(null)}
                className="flex-1 bg-stone-100 font-bold py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs shadow-xs"
              >
                Apply Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
