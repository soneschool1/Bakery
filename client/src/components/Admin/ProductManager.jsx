import React, { useState } from 'react';
import { Wheat, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function ProductManager({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct 
}) {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Form states
  const [category, setCategory] = useState('Bread');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('100');
  const [price, setPrice] = useState('10');
  const [unit, setUnit] = useState('piece');
  const [description, setDescription] = useState('');

  function handleAddSubmit(e) {
    e.preventDefault();
    if (!name || !price) return;

    onAddProduct({
      category,
      name,
      weight_grams: parseFloat(weight) || 0,
      selling_price: parseFloat(price) || 0,
      selling_unit: unit,
      description,
      active: true,
      recipe: [],
    });

    setShowAddModal(false);
    setName('');
    setDescription('');
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    if (!editProduct) return;

    onUpdateProduct(editProduct.id, {
      name: editProduct.name,
      weight_grams: parseFloat(editProduct.weight_grams) || 0,
      selling_price: parseFloat(editProduct.selling_price) || 0,
      description: editProduct.description,
      active: editProduct.active,
    });

    setEditProduct(null);
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Wheat className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('admin.productManager.title', 'Products, Bread Types & Selling Prices Configurator')}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 break-words">
            {t('admin.productManager.subtitle', 'Configure bread varieties (weight, selling price in ETB), cookies, cakes and unit specifications.')}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>{t('admin.productManager.addNewBtn', 'Add New Product Type')}</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">{t('admin.productManager.colName', 'Product Name')}</th>
                <th className="py-3 px-4">{t('admin.productManager.colCategory', 'Category')}</th>
                <th className="py-3 px-4 text-center">{t('admin.productManager.colWeight', 'Unit Weight')}</th>
                <th className="py-3 px-4 text-right">{t('admin.productManager.colPrice', 'Selling Price (ETB)')}</th>
                <th className="py-3 px-4">{t('admin.productManager.colUnit', 'Unit')}</th>
                <th className="py-3 px-4">{t('admin.productManager.colStatus', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('admin.productManager.colActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-amber-50/20">
                  <td className="py-3 px-4 font-extrabold text-stone-900">
                    <div>{p.name}</div>
                    <div className="text-[10px] text-stone-400 font-normal">{p.description}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-600">{p.category}</td>
                  <td className="py-3 px-4 text-center font-bold text-stone-800">{p.weight_grams}g</td>
                  <td className="py-3 px-4 text-right font-black text-amber-800">{formatETB(p.selling_price)}</td>
                  <td className="py-3 px-4 capitalize text-stone-600">{p.selling_unit || 'piece'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {p.active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => setEditProduct(p)}
                      className="p-1 text-stone-600 hover:text-stone-900 font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-1 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">{t('admin.productManager.addProduct', 'Add New Bakery Product')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.categoryLabel', 'Product Category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="Bread">{t('admin.productManager.breadCat', 'Bread')}</option>
                    <option value="Cookies">{t('admin.productManager.cookiesCat', 'Tea Cookies')}</option>
                    <option value="Cakes">{t('admin.productManager.cakeCat', 'Cake')}</option>
                    <option value="Other Products">{t('admin.productManager.otherCat', 'Other Pastry')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.unitLabel', 'Selling Unit')}</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="piece">Piece</option>
                    <option value="slice">Slice</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.nameLabel', 'Product Variety Name *')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bread 4 (Whole Wheat 400g)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.weightLabel', 'Weight in Grams (Per Piece)')}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.sellingPrice', 'Selling Price (ETB) *')}</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2 text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.descriptionLabel', 'Description')}</label>
                <input
                  type="text"
                  placeholder="Special ingredients, flavor, crust"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#064e3b] text-white font-bold py-2 rounded-xl text-xs shadow-xs"
              >
                {t('admin.productManager.saveProductBtn', 'Save Product')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">{t('admin.productManager.editProduct', 'Edit Bakery Product')}</h3>
              <button onClick={() => setEditProduct(null)} className="text-stone-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.nameLabel', 'Product Variety Name *')}</label>
                <input
                  type="text"
                  required
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.weightLabel', 'Weight in Grams (Per Piece)')}</label>
                  <input
                    type="number"
                    value={editProduct.weight_grams}
                    onChange={(e) => setEditProduct({ ...editProduct, weight_grams: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.productManager.sellingPrice', 'Selling Price (ETB) *')}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editProduct.selling_price}
                    onChange={(e) => setEditProduct({ ...editProduct, selling_price: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2 text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-xs font-bold text-stone-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={editProduct.active}
                    onChange={(e) => setEditProduct({ ...editProduct, active: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>{t('admin.productManager.activeLabel', 'Active for POS Cashier sales')}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="flex-1 bg-stone-100 font-bold py-2 rounded-xl text-xs"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs shadow-xs"
              >
                {t('common.save', 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
