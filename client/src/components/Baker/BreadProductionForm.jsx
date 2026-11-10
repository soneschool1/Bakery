import React, { useState, useEffect } from 'react';
import { 
  Wheat, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  User, 
  Hash, 
  Scale, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '../../i18n';

export default function BreadProductionForm({ 
  baker, 
  products, 
  suggestions, 
  onSubmit, 
  isSubmitting 
}) {
  const { t } = useTranslation();
  const breadProducts = products.filter(p => p.category === 'Bread' && p.active);

  const [selectedProduct, setSelectedProduct] = useState(breadProducts[0] || null);
  const [piecesProduced, setPiecesProduced] = useState(500);
  const [flourKg, setFlourKg] = useState(50);
  const [majGrams, setMajGrams] = useState(500);
  const [yeastGrams, setYeastGrams] = useState(300);
  const [saltGrams, setSaltGrams] = useState(500);
  const [otherIngName, setOtherIngName] = useState('');
  const [otherIngQty, setOtherIngQty] = useState('');
  const [otherIngUnit, setOtherIngUnit] = useState('g');
  const [remarks, setRemarks] = useState('');

  // Update selected product if list changes
  useEffect(() => {
    if (!selectedProduct && breadProducts.length > 0) {
      setSelectedProduct(breadProducts[0]);
    }
  }, [breadProducts, selectedProduct]);

  // Apply suggestion
  function applySuggestion(sug) {
    if (!sug.payload) return;
    const p = sug.payload;
    if (p.flour_kg) setFlourKg(p.flour_kg);
    if (p.maj_g) setMajGrams(p.maj_g);
    if (p.yeast_g) setYeastGrams(p.yeast_g);
    if (p.salt_g) setSaltGrams(p.salt_g);
    if (p.pieces_produced) setPiecesProduced(p.pieces_produced);
    if (p.product_name) {
      const match = breadProducts.find(prod => prod.name.toLowerCase().includes(p.product_name.toLowerCase()));
      if (match) setSelectedProduct(match);
    }
  }

  const unitPrice = selectedProduct?.selling_price || 0;
  const potentialSellingValue = piecesProduced * unitPrice;
  const pieceWeightGrams = selectedProduct?.weight_grams || 100;
  const totalWeightGrams = piecesProduced * pieceWeightGrams;
  const totalWeightKg = (totalWeightGrams / 1000).toFixed(1);

  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProduct) return;

    const ingredientsConsumed = [
      { name: 'Flour', quantity: Number(flourKg), unit: 'kg' },
      { name: 'MAJ mix', quantity: Number(majGrams), unit: 'g' },
      { name: 'Yeast', quantity: Number(yeastGrams), unit: 'g' },
      { name: 'Salt', quantity: Number(saltGrams), unit: 'g' },
    ];

    if (otherIngName && otherIngQty) {
      ingredientsConsumed.push({
        name: otherIngName,
        quantity: Number(otherIngQty),
        unit: otherIngUnit,
      });
    }

    const payload = {
      category: 'Bread',
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      baker_id: baker.id || baker.username,
      baker_name: baker.full_name || 'Dawit Alemu',
      pieces_produced: Number(piecesProduced),
      total_weight_grams: totalWeightGrams,
      unit_selling_price: unitPrice,
      ingredients_consumed: ingredientsConsumed,
      remarks,
      branch_id: 'main',
    };

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Quick Suggestions Chips */}
      {suggestions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-2 text-xs font-bold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{t('baker.quickPresetsHeader', 'QUICK RECIPES & BATCH PRESETS:')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug.id || sug.title}
                type="button"
                onClick={() => applySuggestion(sug)}
                className="bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-950 font-semibold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all hover:scale-102 flex items-center space-x-1.5"
              >
                <span>{sug.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Production Info Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-xs">
        <div className="flex items-center space-x-2 text-stone-600">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="text-[10px] text-stone-400 font-medium">{t('common.dateAndTime', 'Date & Time')}</div>
            <div className="font-bold text-stone-800">{currentDate} {currentTime}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-stone-600">
          <User className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="text-[10px] text-stone-400 font-medium">{t('common.bakerName', 'Baker Name')}</div>
            <div className="font-bold text-stone-800 truncate">{baker.full_name?.split(' ')[0]}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-stone-600">
          <Hash className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="text-[10px] text-stone-400 font-medium">{t('common.batchNumber', 'Batch Number')}</div>
            <div className="font-bold text-amber-700 font-mono">{t('common.autoGenerated', 'AUTO-GENERATED')}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-stone-600">
          <Wheat className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="text-[10px] text-stone-400 font-medium">{t('common.department', 'Department')}</div>
            <div className="font-bold text-stone-800">{t('common.mainProduction', 'Main Production')}</div>
          </div>
        </div>
      </div>

      {/* 1. Bread Type Selection */}
      <div>
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
          {t('baker.selectBreadSpec', 'Select Bread Type & Specification')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {breadProducts.map((prod) => {
            const isSelected = selectedProduct?.id === prod.id;
            return (
              <button
                type="button"
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className={`p-4 rounded-2xl border text-left transition-all relative ${
                  isSelected 
                    ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20' 
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-amber-600 absolute top-3 right-3" />
                )}
                <div className="font-extrabold text-sm text-stone-900">{prod.name}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-500">{t('common.standardDough', 'Standard Dough')}</span>
                  <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                    {prod.weight_grams}g
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Ingredient Consumption */}
      <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-5">
        <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>{t('common.ingredientsConsumption', 'Ingredient Consumption (Enter Quantities Used)')}</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Flour (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              required
              value={flourKg}
              onChange={(e) => setFlourKg(e.target.value)}
              className="w-full text-lg font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            <span className="text-[10px] text-stone-400 font-medium">e.g. 50 kg or 100 kg</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              MAJ mix (grams)
            </label>
            <input
              type="number"
              min="0"
              value={majGrams}
              onChange={(e) => setMajGrams(e.target.value)}
              className="w-full text-lg font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            <span className="text-[10px] text-stone-400 font-medium">Standard: 500g</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Yeast (grams)
            </label>
            <input
              type="number"
              min="0"
              value={yeastGrams}
              onChange={(e) => setYeastGrams(e.target.value)}
              className="w-full text-lg font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            <span className="text-[10px] text-stone-400 font-medium">Standard: 300g</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Salt (grams)
            </label>
            <input
              type="number"
              min="0"
              value={saltGrams}
              onChange={(e) => setSaltGrams(e.target.value)}
              className="w-full text-lg font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            <span className="text-[10px] text-stone-400 font-medium">Standard: 500g</span>
          </div>
        </div>

        {/* Optional Other Ingredient */}
        <div className="mt-4 pt-4 border-t border-stone-200">
          <label className="block text-xs font-bold text-stone-600 mb-2">
            + Add Other Ingredient (Optional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Ingredient name (e.g. Bread Improver)"
              value={otherIngName}
              onChange={(e) => setOtherIngName(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={otherIngQty}
              onChange={(e) => setOtherIngQty(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800"
            />
            <select
              value={otherIngUnit}
              onChange={(e) => setOtherIngUnit(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800"
            >
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="pieces">Pieces</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Production Output & Auto Calculations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Pieces Produced */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
            Production Output
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Number of Pieces Produced <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={piecesProduced}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setPiecesProduced('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setPiecesProduced(isNaN(parsed) ? '' : Math.max(0, parsed));
                  }
                }}
                className="w-full text-2xl font-black bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-amber-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-stone-400 font-medium">Total finished bread ready for cashier sale</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Total Production Weight (Calculated)
              </label>
              <div className="w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 py-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-stone-800">{totalWeightKg}</span>
                <span className="text-xs font-bold text-stone-500">kg ({totalWeightGrams.toLocaleString()} g)</span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium">{piecesProduced} pcs × {pieceWeightGrams}g</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Production Remarks / Batch Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Standard morning bake, golden crust achieved"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:bg-white"
            />
          </div>
        </div>

        {/* Total Batch Weight KPI Card (No Money) */}
        <div className="bg-[#0E7452] rounded-3xl p-5 text-white flex flex-col justify-between shadow-lg shadow-emerald-950/20">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#9FD8C7]">
              Total Batch Dough Output
            </span>
            <div className="text-3xl font-black mt-1">
              {((piecesProduced * pieceWeightGrams) / 1000).toFixed(1)} <span className="text-xl font-bold text-white/80">kg</span>
            </div>
            <p className="text-xs text-[#9FD8C7] mt-2 font-medium">
              Formula: {piecesProduced} pcs × {pieceWeightGrams}g dough
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 space-y-1 text-xs text-white/80">
            <div className="flex justify-between">
              <span>Selected Bread:</span>
              <span className="font-bold text-white truncate max-w-[140px]">{selectedProduct?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Unit Weight:</span>
              <span className="font-bold text-white">{pieceWeightGrams}g</span>
            </div>
          </div>
        </div>

      </div>

      {/* Complete Production Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-black text-base py-4 px-6 rounded-2xl shadow-xl shadow-amber-600/30 flex items-center justify-center space-x-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          <CheckCircle className="w-6 h-6" />
          <span>
            {isSubmitting ? 'Recording Batch & Updating Stock...' : 'COMPLETE BREAD PRODUCTION'}
          </span>
        </button>
        <p className="text-center text-xs text-stone-400 mt-2">
          ✓ Deducts consumed raw materials • ✓ Adds finished pieces to cashier POS • ✓ Notifies administrator
        </p>
      </div>

    </form>
  );
}
