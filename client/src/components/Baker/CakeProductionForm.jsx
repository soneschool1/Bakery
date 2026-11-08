import React, { useState, useEffect } from 'react';
import { Cake, CheckCircle, Scale } from 'lucide-react';

export default function CakeProductionForm({ 
  baker, 
  products, 
  category = 'Cakes',
  onSubmit, 
  isSubmitting 
}) {
  const filteredProducts = products.filter(p => p.category === category && p.active);

  const [selectedProduct, setSelectedProduct] = useState(filteredProducts[0] || null);
  const [piecesProduced, setPiecesProduced] = useState(10);
  const [flourKg, setFlourKg] = useState(2);
  const [sugarGrams, setSugarGrams] = useState(1500);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!selectedProduct && filteredProducts.length > 0) {
      setSelectedProduct(filteredProducts[0]);
    }
  }, [filteredProducts, selectedProduct]);

  const unitPrice = selectedProduct?.selling_price || 0;
  const potentialSellingValue = piecesProduced * unitPrice;
  const pieceWeightGrams = selectedProduct?.weight_grams || 250;
  const totalWeightGrams = piecesProduced * pieceWeightGrams;

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProduct) return;

    const ingredientsConsumed = [
      { name: 'Flour', quantity: Number(flourKg), unit: 'kg' },
      { name: 'Sugar', quantity: Number(sugarGrams), unit: 'g' },
    ];

    const payload = {
      category,
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
      
      {/* Product Selection */}
      <div>
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
          Select {category} Item
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((prod) => {
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
                  <span className="font-semibold text-stone-500">Standard Portion</span>
                  <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                    {prod.weight_grams}g
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ingredients & Output */}
      <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-5 space-y-4">
        <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider flex items-center space-x-2">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>Ingredients Consumption & Output</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Flour (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
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
            <label className="block text-xs font-bold text-stone-700 mb-1">Total Units Produced *</label>
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

        <div>
          <input
            type="text"
            placeholder="Remarks or Custom Recipe Notes (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3 py-2"
          />
        </div>
      </div>

      {/* Total Batch Units & Submit (No Money) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#0E7452] rounded-3xl text-white shadow-lg">
        <div>
          <span className="text-xs uppercase font-bold text-[#9FD8C7]">Total Batch Units</span>
          <div className="text-2xl font-black">{piecesProduced} <span className="text-base font-semibold text-white/80">units</span></div>
          <span className="text-xs text-[#9FD8C7]">{selectedProduct?.name || category}</span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-[#0E7452] font-black px-8 py-3.5 rounded-2xl shadow-md transition-all hover:scale-105 disabled:opacity-50"
        >
          {isSubmitting ? 'Recording...' : `COMPLETE ${category.toUpperCase()} PRODUCTION`}
        </button>
      </div>

    </form>
  );
}
