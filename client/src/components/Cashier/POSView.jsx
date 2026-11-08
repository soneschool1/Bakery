import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Sparkles, 
  Wheat,
  Printer,
  Check,
  X
} from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function POSView({ 
  finishedStock, 
  products, 
  suggestions, 
  cashier, 
  branches = [],
  onCompleteSale, 
  isSubmitting 
}) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'bank', 'telebirr'
  const [customerName, setCustomerName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedCartItemId, setSelectedCartItemId] = useState(null);
  const [saleNotice, setSaleNotice] = useState('');

  const cartInputRefs = useRef({});

  const cashierSuggestions = suggestions.filter(s => s.role_target === 'cashier' && s.category === 'sales_combo');
  const categories = ['all', 'Bread', 'Cookies', 'Cakes', 'Other Products'];

  const categoryLabels = {
    all: t('pos.allCategories', 'All Items'),
    Bread: t('pos.breadCat', 'Bread'),
    Cookies: t('pos.cookiesCat', 'Cookies'),
    Cakes: t('pos.cakesCat', 'Cakes'),
    'Other Products': t('pos.otherCat', 'Other Products'),
  };

  // Resolve active branch for the cashier
  const activeBranch = useMemo(() => {
    if (!branches || branches.length === 0) return null;
    if (cashier?.branch_id && cashier.branch_id !== 'main') {
      return branches.find(b => b.id === cashier.branch_id) || null;
    }
    return branches.find(b => b.is_main) || null;
  }, [branches, cashier]);

  const activeBranchId = activeBranch?.id || cashier?.branch_id || '6aec3ad95663067312ab76c2';
  const activeBranchName = activeBranch?.name || cashier?.branch_name || 'Main Bakery & Shop';

  // Map product stock for cashier's active branch (strictly branch-aware, preventing cross-branch clobbering)
  const stockMap = useMemo(() => {
    const map = {};
    // 1. Populate from matching branch stock or 'main' alias
    finishedStock.forEach(s => {
      if (s.branch_id === activeBranchId || (!s.branch_id && activeBranch?.is_main) || (s.branch_id === 'main' && activeBranch?.is_main)) {
        map[s.product_id] = Math.max(0, s.available_quantity || 0);
      }
    });

    // 2. Fallback for any product not yet registered under this branch
    finishedStock.forEach(s => {
      if (map[s.product_id] === undefined) {
        map[s.product_id] = Math.max(0, s.available_quantity || 0);
      }
    });

    return map;
  }, [finishedStock, activeBranchId, activeBranch]);

  const availableItems = products.filter(p => p.active && (selectedCategory === 'all' || p.category === selectedCategory)).map(p => {
    const qty = Math.max(0, stockMap[p.id] !== undefined ? stockMap[p.id] : 0);
    return {
      ...p,
      available_quantity: qty,
      is_sold_out: qty <= 0,
    };
  });

  // Auto-focus the quantity input in the basket when an item is selected
  useEffect(() => {
    if (selectedCartItemId && cartInputRefs.current[selectedCartItemId]) {
      cartInputRefs.current[selectedCartItemId].focus();
      cartInputRefs.current[selectedCartItemId].select();
    }
  }, [selectedCartItemId]);

  // When cashier taps/clicks an item: do NOT open any modal!
  // Add or increment it directly on the Current Customer Order section within available stock.
  function handleSelectItem(product) {
    const available = Math.max(0, product.available_quantity || 0);
    if (available <= 0) {
      setSaleNotice(t('pos.soldOutAlert', '⚠️ "{name}" is SOLD OUT! No stock available to sell.').replace('{name}', product.name));
      setTimeout(() => setSaleNotice(''), 3500);
      return;
    }

    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      if (existing.quantity >= available) {
        setSaleNotice(
          t('pos.allInCartAlert', '⚠️ Cannot add more: All {available} available pieces of "{name}" are in the order.')
            .replace('{available}', available)
            .replace('{name}', product.name)
        );
        setTimeout(() => setSaleNotice(''), 3500);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex] = { ...existing, quantity: Math.min(available, existing.quantity + 1), max_stock: available };
      setCart(newCart);
      setSelectedCartItemId(product.id);
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.selling_price,
          weight_grams: product.weight_grams,
          quantity: 1,
          max_stock: available,
        }
      ]);
      setSelectedCartItemId(product.id);
    }
  }

  // Update item quantity directly in the basket, strictly capped at available stock
  function updateQuantity(productId, newQty) {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const targetItem = cart.find(i => i.product_id === productId);
    const maxStock = targetItem?.max_stock || stockMap[productId] || 0;
    
    if (maxStock <= 0) {
      removeFromCart(productId);
      setSaleNotice(t('pos.soldOutRemoved', '⚠️ Product is SOLD OUT and removed from order.'));
      setTimeout(() => setSaleNotice(''), 3500);
      return;
    }

    if (newQty > maxStock) {
      setSaleNotice(
        t('pos.limitedStockNotice', '⚠️ Only {max} pcs of "{name}" available in shop.')
          .replace('{max}', maxStock)
          .replace('{name}', targetItem?.product_name || 'item')
      );
      setTimeout(() => setSaleNotice(''), 3500);
      newQty = maxStock;
    }

    setCart(cart.map(i => i.product_id === productId ? { ...i, quantity: newQty, max_stock: maxStock } : i));
  }

  function removeFromCart(productId) {
    setCart(cart.filter(item => item.product_id !== productId));
    if (selectedCartItemId === productId) {
      setSelectedCartItemId(null);
    }
  }

  function clearCart() {
    setCart([]);
    setSelectedCartItemId(null);
  }

  function applySuggestion(sug) {
    if (!sug.payload) return;
    const { product_name, quantity } = sug.payload;
    const match = availableItems.find(p => p.name.toLowerCase().includes(product_name.toLowerCase()));
    if (match) {
      const maxStock = match.available_quantity;
      if (maxStock <= 0) {
        setSaleNotice(t('pos.soldOutAlert', '⚠️ "{name}" is SOLD OUT! No stock available to sell.').replace('{name}', match.name));
        setTimeout(() => setSaleNotice(''), 3500);
        return;
      }
      const existing = cart.find(item => item.product_id === match.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= maxStock) {
        setSaleNotice(
          t('pos.allInCartAlert', '⚠️ Cannot add more: All {available} available pieces of "{name}" are in the order.')
            .replace('{available}', maxStock)
            .replace('{name}', match.name)
        );
        setTimeout(() => setSaleNotice(''), 3500);
        return;
      }
      const qtyToAdd = quantity || 1;
      const targetQty = Math.min(maxStock, currentQty + qtyToAdd);
      if (existing) {
        setCart(cart.map(i => i.product_id === match.id ? { ...i, quantity: targetQty, max_stock: maxStock } : i));
      } else {
        setCart([...cart, {
          product_id: match.id,
          product_name: match.name,
          unit_price: match.selling_price,
          weight_grams: match.weight_grams,
          quantity: targetQty,
          max_stock: maxStock,
        }]);
      }
      setSelectedCartItemId(match.id);
    }
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Process Sale (with optional receipt printing)
  async function handleProcessSale(shouldPrintReceipt = false) {
    if (cart.length === 0) return;

    // Check that no sold-out items are in cart and quantities are within stock
    for (const item of cart) {
      const currentStock = stockMap[item.product_id] !== undefined ? stockMap[item.product_id] : 0;
      if (currentStock <= 0) {
        setSaleNotice(t('pos.removeFromOrder', '⚠️ "{name}" is SOLD OUT! Please remove it from the order.').replace('{name}', item.product_name));
        return;
      }
      if (item.quantity > currentStock) {
        setSaleNotice(
          t('pos.insufficientNotice', '⚠️ Insufficient stock for "{name}". Only {max} pcs available.')
            .replace('{name}', item.product_name)
            .replace('{max}', currentStock)
        );
        return;
      }
    }

    const salePayload = {
      cashier_id: cashier.id || cashier._id || cashier.username || 'cashier',
      cashier_name: cashier.full_name || 'Tigist Haile (Cashier)',
      branch_id: activeBranchId,
      branch_name: activeBranchName,
      payment_method: paymentMethod,
      customer_name: customerName,
      remarks,
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      })),
    };

    const chargedTotal = totalAmount;

    try {
      await onCompleteSale(salePayload, shouldPrintReceipt);
      setCart([]);
      setSelectedCartItemId(null);
      setCustomerName('');
      setRemarks('');

      if (!shouldPrintReceipt) {
        const methodLabel = paymentMethod === 'cash' ? t('pos.cash', 'Cash') : paymentMethod === 'bank' ? t('pos.cbeBank', 'Bank') : t('pos.telebirr', 'Telebirr');
        setSaleNotice(
          t('pos.saleSuccess', '✅ Sale completed! Recorded {amount} ({method})')
            .replace('{amount}', formatETB(chargedTotal))
            .replace('{method}', methodLabel)
        );
        setTimeout(() => setSaleNotice(''), 4500);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      
      {/* Left 7 cols: Touch Product Cards */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Quick Combos if configured */}
        {cashierSuggestions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
            <span className="text-xs font-black text-amber-900 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t('pos.quickCombos', 'QUICK COMBOS:')}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {cashierSuggestions.map((sug) => (
                <button
                  key={sug.id || sug.title}
                  type="button"
                  onClick={() => applySuggestion(sug)}
                  className="bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs px-3 py-1 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {sug.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-700 text-white shadow-xs scale-102'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Product Touch Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {availableItems.map((prod) => {
            const isSoldOut = prod.is_sold_out || prod.available_quantity <= 0;
            const icon = prod.category === 'Cookies' ? '🍪' : prod.category === 'Cakes' ? '🎂' : prod.name.includes('Croissant') ? '🥐' : '🥖';
            const inCart = cart.find(c => c.product_id === prod.id);

            return (
              <button
                key={prod.id}
                type="button"
                disabled={isSoldOut}
                onClick={() => handleSelectItem(prod)}
                className={`p-4 rounded-3xl border-2 text-left transition-all duration-150 flex flex-col justify-between h-40 relative group ${
                  isSoldOut
                    ? 'bg-stone-100/90 border-stone-200 opacity-60 cursor-not-allowed select-none'
                    : inCart 
                    ? 'ring-3 ring-emerald-500/40 bg-emerald-50/20 border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 active:scale-98 cursor-pointer'
                    : 'bg-white border-stone-200 hover:border-emerald-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-98 cursor-pointer'
                }`}
                title={isSoldOut ? `${prod.name} - ${t('pos.soldOut', 'SOLD OUT')}` : `${prod.name}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl ${isSoldOut ? 'grayscale opacity-60' : ''}`}>{icon}</span>
                    {isSoldOut ? (
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        {t('pos.soldOut', 'SOLD OUT')}
                      </span>
                    ) : (
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                        prod.available_quantity > 50 
                          ? 'bg-emerald-100 text-emerald-900' 
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {prod.available_quantity} {t('pos.inShop', 'in shop')}
                      </span>
                    )}
                  </div>

                  <h3 className={`font-black text-sm mt-2 line-clamp-2 transition-colors ${
                    isSoldOut ? 'text-stone-400 line-through decoration-rose-400/50' : 'text-stone-900 group-hover:text-emerald-800'
                  }`}>
                    {prod.name}
                  </h3>
                  <div className="text-[11px] font-semibold text-stone-400">
                    {prod.weight_grams}{t('common.grams', 'g')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className={`text-base font-black ${isSoldOut ? 'text-stone-400' : 'text-emerald-800'}`}>
                    {formatETB(prod.selling_price)}
                  </span>
                  
                  {isSoldOut ? (
                    <span className="bg-rose-100/90 text-rose-800 border border-rose-200 font-black text-[10px] px-2 py-1 rounded-xl uppercase tracking-wider">
                      {t('pos.soldOut', 'SOLD OUT')}
                    </span>
                  ) : inCart ? (
                    <span className="bg-[#064e3b] text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs">
                      {inCart.quantity} {t('pos.inOrder', 'in order')}
                    </span>
                  ) : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm bg-emerald-100 text-emerald-900 group-hover:bg-[#064e3b] group-hover:text-white transition-colors shadow-2xs">
                      +
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Right 5 cols: Current Customer Order Section */}
      <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
        
        <div className="space-y-3">
          
          {/* Order Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-black text-stone-900 text-base">{t('pos.currentOrder', 'Current Customer Order')}</h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('pos.clear', 'Clear')}</span>
              </button>
            )}
          </div>

          {/* Quick Sale Success Banner */}
          {saleNotice && (
            <div className="bg-emerald-100 border border-emerald-500 text-emerald-950 font-black text-xs p-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{saleNotice}</span>
              </div>
              <button onClick={() => setSaleNotice('')} className="text-emerald-800 text-sm font-bold">✕</button>
            </div>
          )}

          {/* Cart Items List with Inline Manual Quantity Entry */}
          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <span className="text-4xl block mb-2">🛒</span>
                <p className="text-sm font-bold text-stone-600">{t('pos.orderEmpty', 'Order is empty')}</p>
                <p className="text-xs text-stone-400 mt-0.5">{t('pos.orderEmptyDesc', 'Click any product on the left to add it here')}</p>
              </div>
            ) : (
              cart.map((item) => {
                const isSelected = selectedCartItemId === item.product_id;
                return (
                  <div 
                    key={item.product_id} 
                    className={`py-3 transition-colors rounded-2xl px-2 ${
                      isSelected ? 'bg-emerald-50/50 ring-1 ring-emerald-300' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="font-black text-sm text-stone-900 truncate">{item.product_name}</div>
                        <div className="text-xs text-stone-500 font-semibold flex items-center space-x-2">
                          <span>{formatETB(item.unit_price)} {t('pos.each', 'each')}</span>
                          <span className="text-stone-300">•</span>
                          <span className="text-[11px] text-stone-400 font-medium">
                            {t('pos.inStoreMax', 'In store: {max} pcs').replace('{max}', item.max_stock)}
                          </span>
                        </div>
                      </div>

                      {/* Manual Editable Quantity Box right in the Order section */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-800 font-black text-base active:scale-95 cursor-pointer transition-transform"
                          title={t('pos.minus1', 'Minus 1')}
                        >
                          -
                        </button>
                        
                        {/* Direct Manual Input for Quantity (Enforced max_stock) */}
                        <div className="relative">
                          <input
                            ref={el => cartInputRefs.current[item.product_id] = el}
                            type="number"
                            min="1"
                            max={item.max_stock}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                updateQuantity(item.product_id, val);
                              }
                            }}
                            onFocus={(e) => {
                              e.target.select();
                              setSelectedCartItemId(item.product_id);
                            }}
                            className="w-16 text-center font-black text-base text-[#064e3b] bg-white border-2 border-emerald-400 focus:border-[#064e3b] focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-1 focus:outline-none transition-all shadow-2xs"
                            title={t('pos.inStoreMax', 'Max available stock: {max} pcs').replace('{max}', item.max_stock)}
                          />
                        </div>

                        <button
                          type="button"
                          disabled={item.quantity >= item.max_stock}
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-base active:scale-95 transition-transform ${
                            item.quantity >= item.max_stock
                              ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-800 cursor-pointer'
                          }`}
                          title={item.quantity >= item.max_stock ? t('pos.inStoreMax', 'Max available stock: {max} pcs').replace('{max}', item.max_stock) : t('pos.plus1', 'Plus 1')}
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product_id)}
                          className="w-7 h-7 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors ml-1"
                          title={t('pos.removeItem', 'Remove item')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="w-20 text-right font-black text-sm text-emerald-800 shrink-0">
                        {formatETB(item.quantity * item.unit_price)}
                      </div>
                    </div>

                    {/* Quick quantity chips right in the order row when active (capped at available stock) */}
                    {isSelected && (
                      <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-stone-500 text-[10px] uppercase">{t('pos.quickQty', 'Quick Quantity:')}</span>
                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                          {[5, 10, 20, 50, 100, 200, 500]
                            .filter(quick => quick <= item.max_stock)
                            .map((quick) => (
                              <button
                                key={quick}
                                type="button"
                                onClick={() => updateQuantity(item.product_id, quick)}
                                className={`px-2 py-0.5 rounded-lg font-black transition-colors cursor-pointer ${
                                  item.quantity === quick
                                    ? 'bg-[#064e3b] text-white shadow-2xs'
                                    : 'bg-white hover:bg-emerald-100 text-stone-700 border border-stone-200'
                                }`}
                              >
                                {quick}
                              </button>
                            ))}
                          {item.max_stock > 0 && ![5, 10, 20, 50, 100, 200, 500].includes(item.max_stock) && (
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product_id, item.max_stock)}
                              className={`px-2 py-0.5 rounded-lg font-black text-[10px] transition-colors cursor-pointer ${
                                item.quantity === item.max_stock
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                              title={t('pos.max', 'Max ({max})').replace('{max}', item.max_stock)}
                            >
                              {t('pos.max', 'Max ({max})').replace('{max}', item.max_stock)}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment & Checkout Section */}
        <div className="space-y-4 pt-3 border-t border-stone-200">
          
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase mb-2">
              {t('pos.paymentMethod', 'Payment Method')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-2xl border-2 flex items-center justify-center space-x-2 text-xs font-black transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs scale-102'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>{t('pos.cash', 'Cash')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`py-2 px-3 rounded-2xl border-2 flex items-center justify-center space-x-2 text-xs font-black transition-all cursor-pointer ${
                  paymentMethod === 'bank'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-xs scale-102'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>{t('pos.cbeBank', 'CBE / Bank')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('telebirr')}
                className={`py-2 px-3 rounded-2xl border-2 flex items-center justify-center space-x-2 text-xs font-black transition-all cursor-pointer ${
                  paymentMethod === 'telebirr'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs scale-102'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>{t('pos.telebirr', 'Telebirr')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={t('pos.customerName', 'Customer name (optional)')}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              placeholder={t('pos.remarks', 'Remarks / Note')}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Grand Total Card with Two Separate Buttons (Sell Only vs Sell & Print Receipt) */}
          <div className="bg-stone-900 text-white rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300">
                {totalItemsCount} {t('pos.piecesCount', 'pieces')}
              </span>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase font-bold">{t('pos.totalDue', 'TOTAL AMOUNT')}</span>
                <div className="text-3xl font-black text-amber-400">
                  {formatETB(totalAmount)}
                </div>
              </div>
            </div>

            {/* SEPARATE ACTION BUTTONS: SELL ONLY vs SELL & PRINT RECEIPT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Button 1: Sell Only (No receipt modal) */}
              <button
                type="button"
                onClick={() => handleProcessSale(false)}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-3.5 px-3 rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
                title={t('pos.sellOnly', 'Complete sale immediately without opening receipt')}
              >
                <CheckCircle className="w-4 h-4 text-emerald-200" />
                <span>
                  {isSubmitting 
                    ? t('pos.recording', 'Recording...') 
                    : `${t('pos.sellOnly', 'SELL ONLY ({amount})').replace('{amount}', formatETB(totalAmount))}`}
                </span>
              </button>

              {/* Button 2: Sell & Print Receipt (Optional) */}
              <button
                type="button"
                onClick={() => handleProcessSale(true)}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-3.5 px-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-white font-black text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
                title={t('pos.sellAndPrint', 'Complete sale and print customer receipt')}
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>{t('pos.sellAndPrint', 'SELL & PRINT RECEIPT')}</span>
              </button>

            </div>

            <div className="text-[10px] text-stone-400 text-center font-medium">
              {t('pos.printTip', '💡 Printing a receipt is optional. Click Sell Only for fast checkout.')}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
