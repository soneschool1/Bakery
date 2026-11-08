import React, { useState } from 'react';
import { 
  Truck, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Edit2, 
  X, 
  Check, 
  Building2, 
  Package, 
  Phone, 
  MapPin, 
  User, 
  Tag, 
  Scale, 
  Coins,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function BranchTransferForm({ 
  branches, 
  products, 
  finishedStock, 
  cashier, 
  transfers, 
  onSendTransfer, 
  onReceiveTransfer, 
  onCreateBranch,
  onUpdateBranch,
  onCreateProduct,
  onUpdateProduct,
  isSubmitting 
}) {
  const { t } = useTranslation();

  // Branch & Stock Map (originating from Main Bakery)
  const mainBranch = branches.find(b => b.is_main);
  const mainBranchId = mainBranch?.id || '6aec3ad95663067312ab76c2';
  const otherBranches = branches.filter(b => !b.is_main && b.active);
  const stockMap = {};
  finishedStock.forEach(s => {
    if (s.branch_id === mainBranchId || s.branch_id === 'main' || (!s.branch_id && mainBranch)) {
      stockMap[s.product_id] = Math.max(0, s.available_quantity || 0);
    }
  });
  finishedStock.forEach(s => {
    if (stockMap[s.product_id] === undefined) {
      stockMap[s.product_id] = Math.max(0, s.available_quantity || 0);
    }
  });

  const [destinationBranchId, setDestinationBranchId] = useState(otherBranches[0]?.id || '');
  const selectedBranch = branches.find(b => b.id === destinationBranchId);

  // Transportation Cost (Paid once for the entire trip)
  const [transportCost, setTransportCost] = useState(250);
  const [remarks, setRemarks] = useState('');

  // Trip Shipment Manifest (Multi-Product Dispatch Basket)
  // Each item: { productId, name, category, weight_grams, quantity, maxAvailable }
  const [manifestItems, setManifestItems] = useState(() => {
    const activeProducts = products.filter(p => p.active);
    const initialProduct = activeProducts.find(p => (stockMap[p.id] || 0) > 0) || activeProducts[0];
    if (initialProduct) {
      const stock = stockMap[initialProduct.id] || 0;
      return [{
        productId: initialProduct.id,
        name: initialProduct.name,
        category: initialProduct.category || 'Bread',
        weight_grams: initialProduct.weight_grams || 100,
        quantity: Math.min(stock, 50) || (stock > 0 ? stock : 1),
        maxAvailable: stock,
      }];
    }
    return [];
  });

  // Selector for adding more products into the trip
  const activeProducts = products.filter(p => p.active);
  const [selectedProductId, setSelectedProductId] = useState(activeProducts[0]?.id || '');
  const [addQuantity, setAddQuantity] = useState(50);
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableStock = selectedProduct ? (stockMap[selectedProduct.id] || 0) : 0;

  // Modals for Adding / Editing Branches
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [branchFormData, setBranchFormData] = useState({
    name: '',
    location: '',
    contact_person: '',
    phone: '',
  });

  // Modals for Adding / Editing Products
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    category: 'Bread',
    weight_grams: 100,
    selling_price: 10,
  });

  // Add a product into the trip manifest
  function handleAddProductToTrip(productToAdd, qty) {
    if (!productToAdd) return;
    const maxStock = stockMap[productToAdd.id] || 0;
    if (maxStock <= 0) {
      alert(`Cannot add ${productToAdd.name} — 0 pieces available in shop stock.`);
      return;
    }

    const validQty = Math.max(1, Math.min(Number(qty) || 1, maxStock));

    setManifestItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === productToAdd.id);
      if (existingIndex >= 0) {
        // Update existing item in trip
        const updated = [...prev];
        const newQty = Math.min(maxStock, updated[existingIndex].quantity + validQty);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          maxAvailable: maxStock,
        };
        return updated;
      } else {
        // Add new item to trip
        return [
          ...prev,
          {
            productId: productToAdd.id,
            name: productToAdd.name,
            category: productToAdd.category || 'Bread',
            weight_grams: productToAdd.weight_grams || 100,
            quantity: validQty,
            maxAvailable: maxStock,
          }
        ];
      }
    });
  }

  // Update item quantity in the manifest
  function handleUpdateManifestQuantity(productId, newQty) {
    const maxStock = stockMap[productId] || 0;
    const cleanQty = Math.max(1, Math.min(Number(newQty) || 1, maxStock));

    setManifestItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: cleanQty, maxAvailable: maxStock };
      }
      return item;
    }));
  }

  // Remove an item from the manifest
  function handleRemoveManifestItem(productId) {
    setManifestItems(prev => prev.filter(item => item.productId !== productId));
  }

  // Calculations for the single trip
  const totalPiecesInTrip = manifestItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalWeightKg = manifestItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * (item.weight_grams || 100)), 0) / 1000;
  const totalBreadTypes = manifestItems.length;

  // Open Add Branch Modal
  function handleOpenAddBranch() {
    setIsEditingBranch(false);
    setBranchFormData({
      name: '',
      location: '',
      contact_person: '',
      phone: '',
    });
    setIsBranchModalOpen(true);
  }

  // Open Edit Branch Modal
  function handleOpenEditBranch() {
    if (!selectedBranch) return;
    setIsEditingBranch(true);
    setBranchFormData({
      name: selectedBranch.name || '',
      location: selectedBranch.location || '',
      contact_person: selectedBranch.contact_person || '',
      phone: selectedBranch.phone || '',
    });
    setIsBranchModalOpen(true);
  }

  // Submit Branch Form (Create or Update)
  async function handleSaveBranch(e) {
    e.preventDefault();
    if (!branchFormData.name.trim()) {
      alert('Branch name is required.');
      return;
    }

    try {
      if (isEditingBranch && selectedBranch) {
        if (onUpdateBranch) {
          await onUpdateBranch(selectedBranch.id, {
            ...selectedBranch,
            ...branchFormData,
          });
          alert('Destination branch updated successfully!');
        }
      } else {
        if (onCreateBranch) {
          const newBranch = await onCreateBranch({
            ...branchFormData,
            is_main: false,
            active: true,
          });
          if (newBranch?.id) {
            setDestinationBranchId(newBranch.id);
          }
          alert('New destination branch added successfully!');
        }
      }
      setIsBranchModalOpen(false);
    } catch (err) {
      alert(`Error saving branch: ${err.message}`);
    }
  }

  // Open Add Product Modal
  function handleOpenAddProduct() {
    setIsEditingProduct(false);
    setProductFormData({
      name: '',
      category: 'Bread',
      weight_grams: 100,
      selling_price: 10,
    });
    setIsProductModalOpen(true);
  }

  // Open Edit Product Modal
  function handleOpenEditProduct() {
    if (!selectedProduct) return;
    setIsEditingProduct(true);
    setProductFormData({
      name: selectedProduct.name || '',
      category: selectedProduct.category || 'Bread',
      weight_grams: selectedProduct.weight_grams || 100,
      selling_price: selectedProduct.selling_price || 10,
    });
    setIsProductModalOpen(true);
  }

  // Submit Product Form (Create or Update)
  async function handleSaveProduct(e) {
    e.preventDefault();
    if (!productFormData.name.trim()) {
      alert('Product name is required.');
      return;
    }

    try {
      if (isEditingProduct && selectedProduct) {
        if (onUpdateProduct) {
          await onUpdateProduct(selectedProduct.id, {
            ...selectedProduct,
            name: productFormData.name,
            category: productFormData.category,
            weight_grams: Number(productFormData.weight_grams) || 100,
            selling_price: Number(productFormData.selling_price) || 0,
          });
          alert('Product details updated successfully!');
        }
      } else {
        if (onCreateProduct) {
          const newProduct = await onCreateProduct({
            name: productFormData.name,
            category: productFormData.category,
            weight_grams: Number(productFormData.weight_grams) || 100,
            selling_price: Number(productFormData.selling_price) || 0,
            active: true,
          });
          if (newProduct?.id) {
            setSelectedProductId(newProduct.id);
          }
          alert('New product created successfully and available for transfer!');
        }
      }
      setIsProductModalOpen(false);
    } catch (err) {
      alert(`Error saving product: ${err.message}`);
    }
  }

  // Handle Dispatch Transfer Submission (One Trip, Multiple Products, Single Transport Fee)
  function handleSubmit(e) {
    e.preventDefault();
    if (!destinationBranchId) {
      alert('Please select a destination branch.');
      return;
    }

    if (manifestItems.length === 0) {
      alert('Please add at least one bread/product to this dispatch trip.');
      return;
    }

    // Validate stocks for all items in manifest
    for (const item of manifestItems) {
      const maxStock = stockMap[item.productId] || 0;
      if (item.quantity > maxStock) {
        alert(`Cannot transfer ${item.quantity} pcs of ${item.name}. Available in shop stock: ${maxStock} pcs.`);
        return;
      }
    }

    const payload = {
      from_branch_id: 'main',
      from_branch_name: 'Main Bakery & Shop',
      to_branch_id: destinationBranchId,
      to_branch_name: selectedBranch?.name || 'Destination Branch',
      product_id: manifestItems.length === 1 ? manifestItems[0].productId : 'multi',
      product_name: manifestItems.length === 1 
        ? manifestItems[0].name 
        : `${manifestItems.length} Bread Types (${manifestItems.map(m => `${m.name}: ${m.quantity} pcs`).join(', ')})`,
      quantity: totalPiecesInTrip,
      items: manifestItems.map(m => ({
        product_id: m.productId,
        product_name: m.name,
        quantity: Number(m.quantity),
        weight_grams: m.weight_grams || 0,
      })),
      transportation_cost: Number(transportCost) || 0,
      sent_by_id: cashier.id || cashier.username,
      sent_by_name: cashier.full_name || 'Tigist Haile',
      remarks: remarks || `Dispatched ${totalPiecesInTrip} pcs (${manifestItems.length} bread types) in one trip to ${selectedBranch?.name || 'Destination Branch'}`,
    };

    onSendTransfer(payload);
    setRemarks('');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Branch Transfer Dispatch Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
        
        {/* Header Banner */}
        <div className="pb-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl shrink-0">
              <Truck className="w-6 h-6 text-[#0E7452]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">
                {t('cashier.sendToBranch', 'Send Bread / Products to Other Branch')}
              </h2>
              <p className="text-xs text-stone-500 font-semibold mt-0.5">
                Send multiple types of bread in <strong className="text-emerald-800">one single delivery trip</strong> with a <strong className="text-emerald-800">single transportation fee</strong>.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-900 font-black bg-[#E8F6F2] px-3.5 py-1.5 rounded-full border border-[#CDEAE1] self-start sm:self-auto">
            <Package className="w-4 h-4 text-[#0E7452]" />
            <span>Combined Multi-Bread Dispatch</span>
          </div>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: Destination Branch */}
          <div className="bg-stone-50/80 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-800 uppercase flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-[#0E7452]" />
                <span>1. {t('cashier.destinationBranch', 'Destination Branch')} *</span>
              </label>
              
              {/* Branch Action Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleOpenAddBranch}
                  className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Add a new destination branch"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Branch</span>
                </button>

                {selectedBranch && (
                  <button
                    type="button"
                    onClick={handleOpenEditBranch}
                    className="text-[11px] font-black text-stone-600 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Edit selected branch details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            <select
              required
              value={destinationBranchId}
              onChange={(e) => setDestinationBranchId(e.target.value)}
              className="w-full text-xs font-bold bg-white border border-stone-300 rounded-xl px-3.5 py-3 text-stone-900 focus:border-[#0E7452] focus:outline-none shadow-2xs"
            >
              {otherBranches.length === 0 ? (
                <option value="">No branch available — click '+ New Branch'</option>
              ) : (
                otherBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.location || 'Branch'}) {b.contact_person ? `• Contact: ${b.contact_person}` : ''}
                  </option>
                ))
              )}
            </select>

            {selectedBranch && (
              <div className="text-[11px] text-stone-600 font-semibold flex flex-wrap items-center gap-4 pt-0.5">
                <span>📍 Location: <strong className="text-stone-800">{selectedBranch.location || 'Addis Ababa'}</strong></span>
                {selectedBranch.contact_person && <span>👤 Contact: <strong className="text-stone-800">{selectedBranch.contact_person}</strong></span>}
                {selectedBranch.phone && <span>📞 Phone: <strong className="text-stone-800">{selectedBranch.phone}</strong></span>}
              </div>
            )}
          </div>

          {/* SECTION 2: Multi-Product Picker & Quick Add Area */}
          <div className="bg-stone-50/80 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
              <div>
                <label className="text-xs font-black text-stone-800 uppercase flex items-center space-x-1.5">
                  <Package className="w-4 h-4 text-[#0E7452]" />
                  <span>2. Select Breads & Quantities for This Trip</span>
                </label>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                  Pick any bread from shop stock and add it to the shipment manifest below
                </p>
              </div>

              {/* Product Action Buttons */}
              <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Add a new bakery product"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Product</span>
                </button>

                {selectedProduct && (
                  <button
                    type="button"
                    onClick={handleOpenEditProduct}
                    className="text-[11px] font-black text-stone-600 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Edit selected product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Product & Quantity Selector Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-1">
                <label className="block text-[11px] font-black text-stone-600">Choose Bread Variety:</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find(prod => prod.id === e.target.value);
                    const stock = p ? (stockMap[p.id] || 0) : 0;
                    setAddQuantity(Math.min(stock, 50) || (stock > 0 ? stock : 1));
                  }}
                  className="w-full text-xs font-bold bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:border-[#0E7452] focus:outline-none shadow-2xs"
                >
                  {activeProducts.map((p) => {
                    const stock = stockMap[p.id] || 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category}) — {stock} pcs in shop • {p.weight_grams}g
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-stone-600">Quantity (Pcs):</label>
                  <span className="text-[10px] text-stone-400 font-bold">Max: {availableStock}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={availableStock}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(Number(e.target.value) || 0)}
                  className="w-full text-sm font-black bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:border-[#0E7452] focus:outline-none shadow-2xs"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={() => handleAddProductToTrip(selectedProduct, addQuantity)}
                  disabled={availableStock <= 0}
                  className="w-full bg-[#0E7452] hover:bg-[#0A573D] text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-emerald-200" />
                  <span>Add to Trip</span>
                </button>
              </div>
            </div>

            {/* Quick Add One-Click Chips for Active Products */}
            <div className="pt-1">
              <span className="text-[10px] font-black uppercase text-stone-400 block mb-1.5">
                ⚡ Quick-add from available shop stock:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeProducts.map((p) => {
                  const stock = stockMap[p.id] || 0;
                  const isAlreadyInTrip = manifestItems.some(item => item.productId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddProductToTrip(p, Math.min(stock, 50) || 1)}
                      disabled={stock <= 0}
                      className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isAlreadyInTrip
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : stock > 0
                          ? 'bg-white hover:bg-emerald-50 text-stone-700 border-stone-300'
                          : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        stock > 0 ? 'bg-stone-100 text-stone-600' : 'bg-stone-200 text-stone-400'
                      }`}>
                        {stock} in shop
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTIVE TRIP SHIPMENT MANIFEST TABLE */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-stone-800 flex items-center space-x-1">
                  <span>📦 Shipment Manifest for This Trip</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {manifestItems.length} bread varieties
                  </span>
                </span>
                <span className="text-[11px] font-bold text-stone-500">
                  Total pieces: <strong className="text-stone-900 font-black">{totalPiecesInTrip} pcs</strong>
                </span>
              </div>

              {manifestItems.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center text-stone-400 text-xs font-bold">
                  No bread varieties added to this delivery trip yet. Select a product above and click "Add to Trip".
                </div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-3">Bread Product</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Unit Weight</th>
                        <th className="py-2.5 px-3 text-center">Available Stock</th>
                        <th className="py-2.5 px-3 text-center w-36">Qty to Send (Pcs)</th>
                        <th className="py-2.5 px-3 text-right">Est. Weight</th>
                        <th className="py-2.5 px-3 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {manifestItems.map((item) => {
                        const maxStock = stockMap[item.productId] || 0;
                        const lineWeightKg = ((item.quantity * (item.weight_grams || 100)) / 1000).toFixed(1);
                        return (
                          <tr key={item.productId} className="hover:bg-emerald-50/20">
                            <td className="py-2.5 px-3 font-black text-stone-900">{item.name}</td>
                            <td className="py-2.5 px-3 text-stone-600">{item.category}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-stone-500">{item.weight_grams}g</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {maxStock} pcs
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center space-x-1 bg-stone-50 border border-stone-300 rounded-xl p-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateManifestQuantity(item.productId, item.quantity - 10)}
                                  className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 text-stone-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={maxStock}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateManifestQuantity(item.productId, e.target.value)}
                                  className="w-14 text-center font-black text-xs bg-white border-0 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateManifestQuantity(item.productId, item.quantity + 10)}
                                  className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 text-stone-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-stone-700">{lineWeightKg} kg</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveManifestItem(item.productId)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove product from this trip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-emerald-50/60 font-black text-xs border-t border-emerald-200 text-emerald-950">
                      <tr>
                        <td colSpan="4" className="py-2.5 px-3">
                          Total For This Single Trip:
                        </td>
                        <td className="py-2.5 px-3 text-center text-sm font-black text-[#0E7452]">
                          {totalPiecesInTrip} pcs
                        </td>
                        <td className="py-2.5 px-3 text-right text-stone-800">
                          {totalWeightKg.toFixed(1)} kg
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* SECTION 3: Single Transportation Fee & Trip Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-100">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-stone-800 uppercase flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-[#0E7452]" />
                <span>3. Transport Fee (ETB) — Paid Once For Trip *</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={transportCost}
                  onChange={(e) => setTransportCost(Number(e.target.value) || 0)}
                  className="w-full text-base font-black bg-white border border-emerald-300 rounded-xl px-3 py-2.5 text-[#0E7452] focus:border-[#0E7452] focus:outline-none shadow-2xs"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-stone-400">ETB</span>
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold flex items-center space-x-1 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Single trip charge: covers all {totalBreadTypes} bread types sent together.</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-stone-800 uppercase">
                Driver & Vehicle / Delivery Notes (Optional)
              </label>
              <input
                type="text"
                placeholder={t('cashier.driverDeliveryNotes', 'e.g. Driver Abebe (Plate #3-44812), morning delivery')}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-stone-300 rounded-xl px-3 py-3 text-stone-800 focus:bg-white focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* SECTION 4: Dispatch Summary & Submit Button */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-xs text-stone-600 font-medium">
              Destination: <strong className="text-stone-900 font-black">{selectedBranch?.name || 'Selected Branch'}</strong> • Total: <strong className="text-[#0E7452] font-black">{totalPiecesInTrip} pcs</strong> ({totalBreadTypes} types) • Transport: <strong className="text-[#0E7452] font-black">{formatETB(transportCost)}</strong>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || manifestItems.length === 0 || totalPiecesInTrip <= 0}
              className="bg-[#0E7452] hover:bg-[#0A573D] text-white font-black text-xs px-8 py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4 text-emerald-200" />
              <span>
                {isSubmitting ? 'Dispatching Trip...' : `CONFIRM & DISPATCH TRIP (${totalPiecesInTrip} PCS • ${formatETB(transportCost)})`}
              </span>
            </button>
          </div>

        </form>
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-[#0E7452]" />
            <h3 className="font-black text-stone-900 text-xs uppercase tracking-wider">
              {t('cashier.transferHistory', 'Branch Transfers Log')}
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-bold">{transfers.length} transfers recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/60 text-stone-500 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-4">Transfer #</th>
                <th className="py-2.5 px-4">{t('common.date', 'Date & Time')}</th>
                <th className="py-2.5 px-4">{t('cashier.destinationBranch', 'Destination Branch')}</th>
                <th className="py-2.5 px-4">Products Sent in Trip</th>
                <th className="py-2.5 px-4 text-center">Total Qty</th>
                <th className="py-2.5 px-4 text-right">Transport Fee (Once)</th>
                <th className="py-2.5 px-4">{t('common.status', 'Status')}</th>
                <th className="py-2.5 px-4 text-right">{t('common.actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-stone-400 font-bold">
                    No branch transfers recorded yet.
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => (
                  <tr key={tr.id || tr.transfer_number} className="hover:bg-emerald-50/20">
                    <td className="py-3 px-4 font-mono font-bold text-[#0E7452]">{tr.transfer_number}</td>
                    <td className="py-3 px-4 text-stone-600">{tr.transfer_date} {tr.transfer_time}</td>
                    <td className="py-3 px-4 font-black text-stone-900">{tr.to_branch_name}</td>
                    
                    {/* Products Sent Column (Multi-item breakdown) */}
                    <td className="py-3 px-4">
                      {tr.items && tr.items.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-[11px] font-black text-emerald-900 flex items-center space-x-1">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                              {tr.items.length} Products
                            </span>
                            <span>in 1 Trip</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tr.items.map((it, idx) => (
                              <span key={idx} className="bg-stone-100 text-stone-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-stone-200">
                                {it.product_name}: <strong className="text-[#0E7452]">{it.quantity}</strong> pcs
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-stone-800">{tr.product_name}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-black text-stone-900">{tr.quantity} pcs</td>
                    
                    {/* Single Transportation Fee */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-black text-stone-800">{formatETB(tr.transportation_cost)}</div>
                      <div className="text-[9px] text-emerald-700 font-bold uppercase">1 Trip Fee</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        tr.status === 'received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tr.status}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4 text-right">
                      {tr.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => onReceiveTransfer(tr.id, {
                            receiver_id: cashier.id || cashier.username,
                            receiver_name: cashier.full_name || 'Branch Attendant',
                          })}
                          className="bg-[#0E7452] hover:bg-[#0A573D] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          {t('cashier.receiveTransfer', 'Confirm Receipt')}
                        </button>
                      )}
                      {tr.status === 'received' && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center justify-end space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('cashier.confirmReceive', 'Received')}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT DESTINATION BRANCH */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#0E7452]" />
                <h3 className="font-black text-base text-stone-900">
                  {isEditingBranch ? `Edit Branch: ${selectedBranch?.name}` : 'Add New Destination Branch'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bole Medhanialem Branch"
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  Location / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Edna Mall, Addis Ababa"
                  value={branchFormData.location}
                  onChange={(e) => setBranchFormData({ ...branchFormData, location: e.target.value })}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Almaz Tadesse"
                    value={branchFormData.contact_person}
                    onChange={(e) => setBranchFormData({ ...branchFormData, contact_person: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0911234567"
                    value={branchFormData.phone}
                    onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="py-2.5 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-[#0E7452] hover:bg-[#0A573D] text-white font-black text-xs shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isEditingBranch ? 'Update Branch' : 'Save Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT PRODUCT TO SEND */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#0E7452]" />
                <h3 className="font-black text-base text-stone-900">
                  {isEditingProduct ? `Edit Product: ${selectedProduct?.name}` : 'Add New Bakery Product'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. French Baguette / Burger Bun"
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  Category
                </label>
                <select
                  value={productFormData.category}
                  onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                >
                  <option value="Bread">Bread 🥖</option>
                  <option value="Cookies">Cookies 🍪</option>
                  <option value="Cakes">Cakes 🎂</option>
                  <option value="Other Products">Other Products 🥐</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Standard Weight (g)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 100"
                    value={productFormData.weight_grams}
                    onChange={(e) => setProductFormData({ ...productFormData, weight_grams: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Selling Price (ETB)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    placeholder="e.g. 10"
                    value={productFormData.selling_price}
                    onChange={(e) => setProductFormData({ ...productFormData, selling_price: e.target.value })}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-emerald-800 font-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="py-2.5 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-[#0E7452] hover:bg-[#0A573D] text-white font-black text-xs shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isEditingProduct ? 'Update Product' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
