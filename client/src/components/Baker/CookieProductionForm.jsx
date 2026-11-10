import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, Cookie, Scale } from 'lucide-react';
import { useTranslation } from '../../i18n';

export default function CookieProductionForm({ 
  baker, 
  products, 
  suggestions, 
  onSubmit, 
  isSubmitting 
}) {
  const { t } = useTranslation();
  const cookieProducts = products.filter(p => p.category === 'Cookies' && p.active);

  const [selectedProduct, setSelectedProduct] = useState(cookieProducts[0] || null);
  const [piecesProduced, setPiecesProduced] = useState(200);
  const [flourKg, setFlourKg] = useState(25);
  const [sugarGrams, setSugarGrams] = useState(10000);
  const [majGrams, setMajGrams] = useState(250);
  const [yeastGrams, setYeastGrams] = useState(0);
  const [saltGrams, setSaltGrams] = useState(100);
  const [selitGrams, setSelitGrams] = useState(500);
  const [azmudGrams, setAzmudGrams] = useState(200);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!selectedProduct && cookieProducts.length > 0) {
      setSelectedProduct(cookieProducts[0]);
    }
  }, [cookieProducts, selectedProduct]);

  function applySuggestion(sug) {
    if (!sug.payload) return;
    const p = sug.payload;
    if (p.flour_kg) setFlourKg(p.flour_kg);
    if (p.sugar_g) setSugarGrams(p.sugar_g);
    if (p.maj_g) setMajGrams(p.maj_g);
    if (p.selit_g) setSelitGrams(p.selit_g);
    if (p.tekur_azmud_g) setAzmudGrams(p.tekur_azmud_g);
    if (p.pieces_produced) setPiecesProduced(p.pieces_produced);
    if (p.product_name) {
      const match = cookieProducts.find(prod => prod.name.toLowerCase().includes(p.product_name.toLowerCase()));
      if (match) setSelectedProduct(match);
    }
  }

  const unitPrice = selectedProduct?.selling_price || 0;
  const potentialSellingValue = piecesProduced * unitPrice;
  const pieceWeightGrams = selectedProduct?.weight_grams || 80;
  const totalWeightGrams = piecesProduced * pieceWeightGrams;

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProduct) return;

    const ingredientsConsumed = [
      { name: 'Flour', quantity: Number(flourKg), unit: 'kg' },
      { name: 'Sugar', quantity: Number(sugarGrams), unit: 'g' },
      { name: 'MAJ mix', quantity: Number(majGrams), unit: 'g' },
      { name: 'Salt', quantity: Number(saltGrams), unit: 'g' },
    ];

    if (yeastGrams > 0) {
      ingredientsConsumed.push({ name: 'Yeast', quantity: Number(yeastGrams), unit: 'g' });
    }
    if (selitGrams > 0) {
      ingredientsConsumed.push({ name: 'Selit', quantity: Number(selitGrams), unit: 'g' });
    }
    if (azmudGrams > 0) {
      ingredientsConsumed.push({ name: 'Tekur azmud', quantity: Number(azmudGrams), unit: 'g' });
    }

    const payload = {
      category: 'Cookies',
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
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-2 text-xs font-bold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{t('baker.cookiePresetsHeader', 'COOKIE RECIPE PRESETS:')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug.id || sug.title}
                type="button"
                onClick={() => applySuggestion(sug)}
                className="bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-950 font-semibold text-xs px-3 py-1.5 rounded-xl transition-all"
              >
                {sug.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cookie Product Selection */}
      <div>
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
          {t('baker.selectCookieSpec', 'Select Cookie Variety')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cookieProducts.map((prod) => {
            const isSelected = selectedProduct?.id === prod.id;
            return (
              <button
                type="button"
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className={`p-4 rounded-2xl border text-left transition-all relative ${
                  isSelected 
                    ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20' 
                    : 'border-stone-200 bg-white hover:bg-stone-50'
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

      {/* Ingredients Grid */}
      <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-5">
        <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>{t('baker.cookieIngredients', 'Cookies Ingredients Consumption')}</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Flour (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              required
              value={flourKg}
              onChange={(e) => setFlourKg(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Sugar (grams) *</label>
            <input
              type="number"
              min="0"
              required
              value={sugarGrams}
              onChange={(e) => setSugarGrams(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">MAJ mix (grams)</label>
            <input
              type="number"
              min="0"
              value={majGrams}
              onChange={(e) => setMajGrams(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Salt (grams)</label>
            <input
              type="number"
              min="0"
              value={saltGrams}
              onChange={(e) => setSaltGrams(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Selit / Sesame (grams)</label>
            <input
              type="number"
              min="0"
              value={selitGrams}
              onChange={(e) => setSelitGrams(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-amber-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Tekur azmud / Black Cumin (grams)</label>
            <input
              type="number"
              min="0"
              value={azmudGrams}
              onChange={(e) => setAzmudGrams(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2 text-amber-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Yeast (grams, if applicable)</label>
            <input
              type="number"
              min="0"
              value={yeastGrams}
              onChange={(e) => setYeastGrams(e.target.value)}
              className="w-full text-base font-bold bg-white border border-stone-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Pieces Produced *</label>
            <input
              type="number"
              min="1"
              required
              value={piecesProduced}
              onChange={(e) => setPiecesProduced(e.target.value)}
              className="w-full text-base font-black bg-white border border-amber-500 rounded-xl px-3 py-2 text-amber-800"
            />
          </div>
        </div>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3 py-2"
          />
        </div>
      </div>

      {/* Total Batch Pieces & Submit (No Money) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#0E7452] rounded-3xl text-white shadow-lg">
        <div>
          <span className="text-xs uppercase font-bold text-[#9FD8C7]">Total Batch Output</span>
          <div className="text-2xl font-black">{piecesProduced} <span className="text-base font-semibold text-white/80">pcs</span></div>
          <span className="text-xs text-[#9FD8C7]">{selectedProduct?.name || 'Cookies'} • {selectedProduct ? `${((piecesProduced * (selectedProduct.weight_grams || 20)) / 1000).toFixed(1)} kg` : ''}</span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-[#0E7452] font-black px-8 py-3.5 rounded-2xl shadow-md transition-all hover:scale-105 disabled:opacity-50"
        >
          {isSubmitting ? 'Recording...' : 'COMPLETE COOKIE PRODUCTION'}
        </button>
      </div>

    </form>
  );
}
