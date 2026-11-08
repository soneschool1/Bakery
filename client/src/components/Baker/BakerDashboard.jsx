import React, { useState, useRef, useEffect } from 'react';
import { 
  Wheat, 
  Cookie, 
  Cake, 
  Croissant, 
  CheckCircle2, 
  Plus, 
  Minus, 
  History, 
  AlertTriangle,
  Scale,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Layers,
  Check
} from 'lucide-react';
import { useTranslation } from '../../i18n';

export default function BakerDashboard({ 
  baker, 
  products, 
  rawMaterials, 
  batches, 
  suggestions, 
  onCreateBatch, 
  onEditBatch, 
  onSubmitStockCheck,
  onApproveStockCheck,
  isSubmitting 
}) {
  const { t } = useTranslation();
  const [bakerTab, setBakerTab] = useState('baking'); // 'baking', 'history'
  const [cookingCategory, setCookingCategory] = useState('Bread'); // 'Bread', 'Cookies', 'Cake', 'Other Products'
  const [successMsg, setSuccessMsg] = useState('');

  // Workflow Stepper & Animation States
  const [activeStep, setActiveStep] = useState(1); // 1: Category, 2: Variety, 3: Ingredients, 4: Dough Weight, 5: Output & Bake
  const [viewMode, setViewMode] = useState('wizard'); // 'wizard' (Step-by-Step with auto-advance) | 'scroll' (All Steps continuous with auto-scroll)
  const [highlightedStep, setHighlightedStep] = useState(null);
  const [animatingCategory, setAnimatingCategory] = useState(null);
  const [animatingProduct, setAnimatingProduct] = useState(null);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState('');

  // Refs for smooth auto-scrolling
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const step4Ref = useRef(null);
  const step5Ref = useRef(null);

  // Active products in selected category
  const categoryProducts = products.filter(p => p.active && (p.category === cookingCategory || (cookingCategory === 'Cake' && p.category === 'Cakes')));
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fallback selected product
  const activeProduct = selectedProduct && selectedProduct.category === cookingCategory 
    ? selectedProduct 
    : (categoryProducts[0] || {
        id: 'default',
        name: cookingCategory === 'Bread' ? 'Bread 1 (Special Table)' : cookingCategory === 'Cookies' ? 'Selit Tea Cookies' : 'Cake Slice',
        weight_grams: cookingCategory === 'Bread' ? 100 : 80,
        selling_price: cookingCategory === 'Bread' ? 10 : 15,
        category: cookingCategory
      });

  // Pieces produced
  const [piecesProduced, setPiecesProduced] = useState(500);

  // Dough weight in grams used to bake 1 bread (Step 4)
  const [doughGramsPerPiece, setDoughGramsPerPiece] = useState('100');

  // Ingredients for Bread
  const [flourKg, setFlourKg] = useState('35');
  const [majMixGrams, setMajMixGrams] = useState('500');
  const [yeastGrams, setYeastGrams] = useState('250');
  const [saltGrams, setSaltGrams] = useState('500');
  const [otherIngName, setOtherIngName] = useState('');
  const [otherIngQty, setOtherIngQty] = useState('');

  // Extra Ingredients for Cookies / Cake
  const [sugarGrams, setSugarGrams] = useState('5000');
  const [selitGrams, setSelitGrams] = useState('1000');
  const [tekurAzmudGrams, setTekurAzmudGrams] = useState('500');

  // Background values for backend API payload (NEVER shown to baker)
  const unitPrice = activeProduct.selling_price || 10;
  const unitWeight = Number(doughGramsPerPiece) || activeProduct.weight_grams || 100;
  const totalWeightGrams = (Number(piecesProduced) || 0) * unitWeight;
  const totalWeightKg = (totalWeightGrams / 1000).toFixed(1);

  // Batch dough estimation (flour + water ~60% hydration + dry ingredients)
  const flourGrams = (Number(flourKg) || 0) * 1000;
  const estimatedDoughTotalG = Math.round(
    flourGrams * 1.6 + 
    (Number(majMixGrams) || 0) + 
    (Number(yeastGrams) || 0) + 
    (Number(saltGrams) || 0) +
    (cookingCategory === 'Cookies' || cookingCategory === 'Cake' 
      ? (Number(sugarGrams) || 0) + (Number(selitGrams) || 0) + (Number(tekurAzmudGrams) || 0)
      : 0)
  );

  // Raw material low-stock checks
  const lowStockMaterials = rawMaterials.filter(m => m.current_quantity <= m.minimum_stock);

  // 1. SELECT BAKING CATEGORY (WITH AUTOMATIC ADVANCE & ANIMATION)
  function handleCategorySelect(catId) {
    setCookingCategory(catId);
    setSelectedProduct(null);
    setAnimatingCategory(catId);
    setAutoAdvanceNotice(`✨ ${catId} chosen! Automatically moving to Step 2...`);

    // Smart default presets per category
    if (catId === 'Bread') {
      setPiecesProduced(500);
      setDoughGramsPerPiece('100');
      setFlourKg('35');
    } else if (catId === 'Cookies') {
      setPiecesProduced(200);
      setDoughGramsPerPiece('40');
      setFlourKg('20');
    } else if (catId === 'Cake') {
      setPiecesProduced(20);
      setDoughGramsPerPiece('80');
      setFlourKg('10');
    } else {
      setPiecesProduced(100);
      setDoughGramsPerPiece('70');
      setFlourKg('15');
    }

    // Smooth animation timer before advancing to step 2
    setTimeout(() => {
      setAnimatingCategory(null);
      setAutoAdvanceNotice('');
      setActiveStep(2);
      setHighlightedStep(2);

      if (viewMode === 'scroll') {
        step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setHighlightedStep(null), 1400);
    }, 320);
  }

  // 2. SELECT PRODUCT VARIETY (WITH AUTOMATIC ADVANCE TO STEP 3)
  function handleProductSelect(p) {
    setSelectedProduct(p);
    if (p.weight_grams) {
      setDoughGramsPerPiece(String(p.weight_grams));
    }
    setAnimatingProduct(p.id);
    setAutoAdvanceNotice(`✨ ${p.name} selected! Moving to Step 3 (Ingredients)...`);

    setTimeout(() => {
      setAnimatingProduct(null);
      setAutoAdvanceNotice('');
      setActiveStep(3);
      setHighlightedStep(3);

      if (viewMode === 'scroll') {
        step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setHighlightedStep(null), 1400);
    }, 280);
  }

  // Navigate directly to any step
  function jumpToStep(stepNum) {
    setActiveStep(stepNum);
    setHighlightedStep(stepNum);
    if (viewMode === 'scroll') {
      const stepRefs = { 1: step1Ref, 2: step2Ref, 3: step3Ref, 4: step4Ref, 5: step5Ref };
      stepRefs[stepNum]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedStep(null), 1400);
  }

  // Handle baking submission
  async function handleFinishBaking(e) {
    if (e) e.preventDefault();
    if (!activeProduct || Number(piecesProduced) <= 0) return;

    const ingredientsConsumed = [];

    // Flour
    if (flourKg && Number(flourKg) > 0) {
      ingredientsConsumed.push({ name: 'Flour', quantity: Number(flourKg), unit: 'kg' });
    }
    // MAJ Mix
    if (majMixGrams && Number(majMixGrams) > 0) {
      ingredientsConsumed.push({ name: 'MAJ mix', quantity: Number(majMixGrams), unit: 'g' });
    }
    // Yeast
    if (yeastGrams && Number(yeastGrams) > 0) {
      ingredientsConsumed.push({ name: 'Yeast', quantity: Number(yeastGrams), unit: 'g' });
    }
    // Salt
    if (saltGrams && Number(saltGrams) > 0) {
      ingredientsConsumed.push({ name: 'Salt', quantity: Number(saltGrams), unit: 'g' });
    }

    // Cookies / Cake extra ingredients
    if (cookingCategory === 'Cookies' || cookingCategory === 'Cake') {
      if (sugarGrams && Number(sugarGrams) > 0) {
        ingredientsConsumed.push({ name: 'Sugar', quantity: Number(sugarGrams), unit: 'g' });
      }
      if (selitGrams && Number(selitGrams) > 0) {
        ingredientsConsumed.push({ name: 'Selit', quantity: Number(selitGrams), unit: 'g' });
      }
      if (tekurAzmudGrams && Number(tekurAzmudGrams) > 0) {
        ingredientsConsumed.push({ name: 'Tekur azmud', quantity: Number(tekurAzmudGrams), unit: 'g' });
      }
    }

    // Optional other
    if (otherIngName && otherIngQty && Number(otherIngQty) > 0) {
      ingredientsConsumed.push({ name: otherIngName, quantity: Number(otherIngQty), unit: 'g' });
    }

    const payload = {
      category: cookingCategory,
      product_id: activeProduct.id,
      product_name: activeProduct.name,
      baker_id: baker.id || baker.username || 'baker',
      baker_name: baker.full_name || 'Dawit Alemu (Head Baker)',
      pieces_produced: Number(piecesProduced),
      total_weight_grams: Number(piecesProduced) * unitWeight,
      unit_selling_price: unitPrice,
      ingredients_consumed: ingredientsConsumed,
      remarks: `Baked by ${baker.full_name || 'Head Baker'}: ${piecesProduced} pcs`,
      branch_id: 'main',
    };

    try {
      await onCreateBatch(payload);
      setSuccessMsg(`🎉 SUCCESS! ${piecesProduced} pieces of ${activeProduct.name} baked! Finished stock sent to Cashier screen.`);
      setTimeout(() => setSuccessMsg(''), 7000);
      setOtherIngName('');
      setOtherIngQty('');
      // Reset flow to step 1 for the next baking run
      setActiveStep(1);
      if (viewMode === 'scroll') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // Today's batches
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBatches = batches.filter(b => b.production_date === todayStr);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Baker Navigation Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-2 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setBakerTab('baking')}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center space-x-2 cursor-pointer ${
              bakerTab === 'baking'
                ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/20 scale-101'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Wheat className="w-5 h-5 text-emerald-300" />
            <span>{t('baker.bakingTab', '🥖 Start Baking')}</span>
          </button>

          <button
            type="button"
            onClick={() => setBakerTab('history')}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center space-x-2 cursor-pointer ${
              bakerTab === 'history'
                ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/20 scale-101'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <History className="w-5 h-5 text-emerald-300" />
            <span>{t('baker.historyTab', "📜 Today's Bakes")} ({todayBatches.length})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2 pr-3 text-xs font-bold text-stone-500">
          <span>Baker: <strong className="text-stone-900">{baker.full_name || 'Dawit Alemu'}</strong></span>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-pop-in">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="font-black text-sm">⚠️ LOW STOCK WARNING IN BAKERY STORE:</p>
              <p className="text-xs font-semibold text-rose-800">
                {lowStockMaterials.map(m => `${m.name} (${m.current_quantity} ${m.unit} left, min: ${m.minimum_stock})`).join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-5 flex items-center justify-between shadow-md text-base font-black animate-pop-in">
          <div className="flex items-center space-x-3">
            <span className="text-2xl animate-bounce-soft">🎉</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-800 text-lg hover:text-emerald-950 cursor-pointer">✕</button>
        </div>
      )}

      {/* TAB 1: START BAKING WORKFLOW */}
      {bakerTab === 'baking' && (
        <form onSubmit={handleFinishBaking} className="space-y-6">

          {/* Progress Line */}
          <div className="w-full bg-stone-200/80 h-2.5 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-linear-to-r from-[#064e3b] via-[#0E7452] to-emerald-400 h-full transition-all duration-500 ease-out rounded-full shadow-xs"
              style={{ width: `${(activeStep / 5) * 100}%` }}
            />
          </div>

          {/* STEP 1: CHOOSE BAKING CATEGORY (ANIMATED & AUTO-ADVANCING) */}
          {(viewMode === 'scroll' || activeStep === 1) && (
            <div 
              ref={step1Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 transition-all duration-300 ${
                highlightedStep === 1 ? 'animate-step-highlight ring-4 ring-emerald-500/40' : ''
              } ${viewMode === 'wizard' ? 'animate-slide-right' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#064e3b] text-white inline-flex items-center justify-center text-sm font-black shadow-xs">
                      1
                    </span>
                    <span>{t('baker.step1Title', 'Choose What You Are Cooking:')}</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    {t('baker.step1Desc', 'Select product family — automatically animates and moves to Step 2')}
                  </p>
                </div>
                <span className="hidden sm:inline-block text-xs font-bold bg-emerald-50 text-[#064e3b] px-3 py-1 rounded-full border border-emerald-200">
                  ⚡ 1-Click Auto-Advance
                </span>
              </div>

              {/* Big Animated Category Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: 'Bread', label: t('baker.breadCat', 'Bread'), icon: '🥖', desc: 'Table bread, special, family loaf' },
                  { id: 'Cookies', label: t('baker.cookiesCat', 'Tea Cookies'), icon: '🍪', desc: 'Selit, Tekur azmud cookies' },
                  { id: 'Cake', label: t('baker.cakeCat', 'Cake'), icon: '🎂', desc: 'Celebration cakes & slices' },
                  { id: 'Other Products', label: t('baker.otherCat', 'Other Products'), icon: '🥐', desc: 'Croissants & pastries' },
                ].map((cat) => {
                  const isSelected = cookingCategory === cat.id;
                  const isAnimating = animatingCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`group p-6 rounded-3xl border-3 text-left transition-all duration-200 flex flex-col justify-between h-40 relative cursor-pointer overflow-hidden ${
                        isAnimating
                          ? 'scale-105 border-[#064e3b] bg-emerald-100 ring-8 ring-emerald-500/40 shadow-2xl animate-pulse'
                          : isSelected
                          ? 'border-[#064e3b] bg-linear-to-br from-emerald-50 via-emerald-100/60 to-emerald-50 shadow-xl ring-4 ring-emerald-600/30 scale-102'
                          : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-4xl transition-transform duration-300 group-hover:scale-120 group-hover:rotate-6">
                          {cat.icon}
                        </span>
                        {isSelected && (
                          <div className="w-7 h-7 rounded-full bg-[#064e3b] text-white flex items-center justify-center shadow-xs animate-pop-in">
                            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-lg font-black text-stone-900 group-hover:text-[#064e3b] transition-colors">
                          {cat.label}
                        </div>
                        <div className="text-xs text-stone-500 font-medium truncate mt-0.5">{cat.desc}</div>
                      </div>

                      {/* Live animation banner on clicked card */}
                      {isAnimating && (
                        <div className="absolute inset-x-0 bottom-0 bg-[#064e3b] text-white text-[11px] font-black py-1 px-2 text-center flex items-center justify-center space-x-1.5 animate-slide-right">
                          <Sparkles className="w-3 h-3 text-emerald-300 animate-spin" />
                          <span>Advancing to Step 2...</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step 1 Footer Action for manual progression */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="text-xs font-bold text-stone-400">
                  {t('baker.selectedCatLabel', 'Selected Category:')} <strong className="text-stone-900">{cookingCategory}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="bg-[#064e3b] hover:bg-[#043729] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>{t('baker.nextProductVariety', 'Next: Choose Product Variety')}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE THE TYPE OF BREAD / PRODUCT */}
          {(viewMode === 'scroll' || activeStep === 2) && (
            <div 
              ref={step2Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 transition-all duration-300 ${
                highlightedStep === 2 ? 'animate-step-highlight ring-4 ring-emerald-500/40' : ''
              } ${viewMode === 'wizard' ? 'animate-slide-right' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#0E7452] text-white inline-flex items-center justify-center text-sm font-black shadow-xs">
                      2
                    </span>
                    <span>{t('baker.step2Title', 'Select Type of {category}:').replace('{category}', cookingCategory)}</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    {t('baker.step2Desc', 'Choose the baked variety — automatically sets standard dough weight & advances')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => jumpToStep(1)}
                    className="text-xs font-bold text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('common.back', 'Change Category')}</span>
                  </button>
                </div>
              </div>

              {/* Product variety cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {categoryProducts.map((p, idx) => {
                  const isSelected = (selectedProduct?.id === p.id) || (!selectedProduct && p.id === activeProduct.id);
                  const isAnimating = animatingProduct === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProductSelect(p)}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className={`group p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between h-36 relative cursor-pointer overflow-hidden animate-pop-in ${
                        isAnimating
                          ? 'scale-104 border-[#0E7452] bg-emerald-100 ring-6 ring-emerald-500/40 shadow-xl'
                          : isSelected
                          ? 'border-[#0E7452] bg-emerald-50/90 shadow-lg ring-3 ring-emerald-500/30 scale-102'
                          : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-black text-base text-stone-900 group-hover:text-[#0E7452] block transition-colors">{p.name}</span>
                          <span className="text-xs font-bold text-stone-500">
                            {cookingCategory}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#0E7452] text-white flex items-center justify-center shadow-xs animate-pop-in">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-500">{t('baker.standardDough', 'Standard Dough')}:</span>
                        <span className="text-sm font-black text-[#0E7452] bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs group-hover:bg-emerald-50 transition-colors">
                          {p.weight_grams} {t('common.grams', 'g')}
                        </span>
                      </div>

                      {isAnimating && (
                        <div className="absolute inset-x-0 bottom-0 bg-[#0E7452] text-white text-[10px] font-black py-0.5 px-2 text-center flex items-center justify-center space-x-1 animate-slide-right">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-200" />
                          <span>Advancing to Ingredients...</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step 2 Footer Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => jumpToStep(1)}
                  className="text-stone-600 hover:text-stone-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('common.back', 'Back to Categories')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(3)}
                  className="bg-[#0E7452] hover:bg-[#0A573D] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>{t('baker.nextIngredientsBtn', 'Next: Check Ingredients')}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ENTER INGREDIENTS CONSUMPTION */}
          {(viewMode === 'scroll' || activeStep === 3) && (
            <div 
              ref={step3Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 transition-all duration-300 ${
                highlightedStep === 3 ? 'animate-step-highlight ring-4 ring-emerald-500/40' : ''
              } ${viewMode === 'wizard' ? 'animate-slide-right' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#064e3b] text-white inline-flex items-center justify-center text-sm font-black shadow-xs">
                      3
                    </span>
                    <span>Enter Ingredients Used for This Batch:</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    Enter Flour in kg, and MAJ mix, Yeast, Salt, Sugar in grams
                  </p>
                </div>
                <div className="hidden sm:flex items-center space-x-1 text-xs font-bold bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span>Selected: <strong>{activeProduct.name}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                {/* Flour (kg) */}
                {(() => {
                  const flourMat = rawMaterials.find(m => m.name.toLowerCase().includes('flour'));
                  const flourStock = flourMat ? flourMat.current_quantity : 0;
                  const isLow = flourMat && flourStock <= flourMat.minimum_stock;
                  return (
                    <div className={`p-4 rounded-2xl border transition-all ${isLow ? 'bg-rose-50/70 border-rose-300' : 'bg-emerald-50/50 border-emerald-200'}`}>
                      <label className="block text-xs font-black text-emerald-950 uppercase mb-1 flex items-center justify-between">
                        <span>🌾 Flour (kilo) *</span>
                        {isLow && <span className="text-[9px] bg-rose-200 text-rose-800 px-1 rounded-sm animate-pulse">Low</span>}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={flourKg}
                        onChange={(e) => setFlourKg(e.target.value)}
                        className="w-full bg-white border-2 border-emerald-300 rounded-xl p-3 text-2xl font-black text-emerald-950 focus:border-[#064e3b] focus:outline-none transition-all"
                        placeholder="e.g. 35"
                      />
                      <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-500">In store:</span>
                        <span className={isLow ? 'text-rose-700 font-black' : 'text-emerald-900 font-extrabold'}>
                          {flourStock} kg
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Maj mix (grams) */}
                {(() => {
                  const majMat = rawMaterials.find(m => m.name.toLowerCase().includes('maj'));
                  const majStock = majMat ? majMat.current_quantity : 0;
                  return (
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                        🧪 Maj mix (grams)
                      </label>
                      <input
                        type="number"
                        value={majMixGrams}
                        onChange={(e) => setMajMixGrams(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-3 text-2xl font-black text-stone-900 focus:border-[#064e3b] focus:outline-none transition-all"
                        placeholder="e.g. 500"
                      />
                      <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-500">In store:</span>
                        <span className="text-stone-900 font-extrabold">{majStock} {majMat?.unit || 'kg'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Yeast (grams) */}
                {(() => {
                  const yeastMat = rawMaterials.find(m => m.name.toLowerCase().includes('yeast'));
                  const yeastStock = yeastMat ? yeastMat.current_quantity : 0;
                  return (
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                        🍞 Yeast (grams)
                      </label>
                      <input
                        type="number"
                        value={yeastGrams}
                        onChange={(e) => setYeastGrams(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-3 text-2xl font-black text-stone-900 focus:border-[#064e3b] focus:outline-none transition-all"
                        placeholder="e.g. 250"
                      />
                      <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-500">In store:</span>
                        <span className="text-stone-900 font-extrabold">{yeastStock} {yeastMat?.unit || 'kg'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Salt (grams) */}
                {(() => {
                  const saltMat = rawMaterials.find(m => m.name.toLowerCase().includes('salt'));
                  const saltStock = saltMat ? saltMat.current_quantity : 0;
                  return (
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                        🧂 Salt (grams)
                      </label>
                      <input
                        type="number"
                        value={saltGrams}
                        onChange={(e) => setSaltGrams(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-3 text-2xl font-black text-stone-900 focus:border-[#064e3b] focus:outline-none transition-all"
                        placeholder="e.g. 500"
                      />
                      <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-500">In store:</span>
                        <span className="text-stone-900 font-extrabold">{saltStock} {saltMat?.unit || 'kg'}</span>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Extra fields if Cookies or Cake */}
              {(cookingCategory === 'Cookies' || cookingCategory === 'Cake') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100 animate-pop-in">
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                      🍬 Sugar (grams)
                    </label>
                    <input
                      type="number"
                      value={sugarGrams}
                      onChange={(e) => setSugarGrams(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xl font-black text-stone-900"
                      placeholder="e.g. 5000"
                    />
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                      🌱 Selit (grams)
                    </label>
                    <input
                      type="number"
                      value={selitGrams}
                      onChange={(e) => setSelitGrams(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xl font-black text-stone-900"
                      placeholder="e.g. 1000"
                    />
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <label className="block text-xs font-black text-stone-800 uppercase mb-1">
                      🌿 Tekur azmud (grams)
                    </label>
                    <input
                      type="number"
                      value={tekurAzmudGrams}
                      onChange={(e) => setTekurAzmudGrams(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xl font-black text-stone-900"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
              )}

              {/* Step 3 Footer Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="text-stone-600 hover:text-stone-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Product Variety</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(4)}
                  className="bg-[#064e3b] hover:bg-[#043729] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>Next: Set Dough Weight</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ENTER DOUGH WEIGHT PER 1 BREAD */}
          {(viewMode === 'scroll' || activeStep === 4) && (
            <div 
              ref={step4Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 transition-all duration-300 ${
                highlightedStep === 4 ? 'animate-step-highlight ring-4 ring-emerald-500/40' : ''
              } ${viewMode === 'wizard' ? 'animate-slide-right' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#0E7452] text-white inline-flex items-center justify-center text-sm font-black shadow-xs">
                      4
                    </span>
                    <span>{t('baker.doughWeightLabel', `Dough Weight Used for 1 ${cookingCategory} (Grams):`)}</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    {t('baker.step4Desc', `Enter how many grams of raw dough you portioned for 1 piece before baking`)}
                  </p>
                </div>
                <div className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-stone-500">
                  <Scale className="w-4 h-4 text-[#0E7452]" />
                  <span>Portion Consistency</span>
                </div>
              </div>

              {/* Quick Dough Weight Presets with bouncy active scale */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[60, 80, 100, 120, 150, 200].map((grams) => (
                  <button
                    key={grams}
                    type="button"
                    onClick={() => setDoughGramsPerPiece(String(grams))}
                    className={`py-2.5 rounded-2xl font-black text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                      Number(doughGramsPerPiece) === grams
                        ? 'bg-[#0E7452] text-white shadow-md scale-102 ring-2 ring-[#0E7452]/40'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:-translate-y-0.5'
                    }`}
                  >
                    {grams}g
                  </button>
                ))}
              </div>

              {/* Manual Dough Weight Numeric Input */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex-1 max-w-sm w-full">
                  <label className="block text-xs font-black text-stone-700 uppercase mb-1.5">
                    {t('baker.doughWeightLabel', 'Dough Weight per Piece (Grams)')} *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={doughGramsPerPiece}
                      onChange={(e) => setDoughGramsPerPiece(e.target.value)}
                      className="w-full text-2xl font-black text-[#0E7452] bg-white border-2 border-emerald-300 focus:border-[#0E7452] rounded-xl px-4 py-3 focus:outline-none transition-all shadow-xs"
                      placeholder="e.g. 100"
                    />
                    <span className="absolute right-4 text-sm font-black text-stone-500 uppercase">
                      {t('common.grams', 'grams')}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-stone-500 mt-1 block">
                    Type exact portion weight in grams used before baking
                  </span>
                </div>

                {/* Live Dough Yield Estimate helper */}
                <div className="text-right bg-white p-4 rounded-xl border border-emerald-200 text-xs shadow-2xs shrink-0 sm:min-w-[200px]">
                  <span className="text-stone-400 font-bold block">
                    {t('baker.doughFormulaInfo', 'Estimated Batch Yield:')}
                  </span>
                  <span className="text-base font-black text-[#0E7452] block mt-0.5">
                    ~{estimatedDoughTotalG > 0 ? Math.round(estimatedDoughTotalG / (Number(doughGramsPerPiece) || 100)) : 0} {t('common.pieces', 'pieces')}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    from ~{((estimatedDoughTotalG) / 1000).toFixed(1)} kg mixed batch dough
                  </span>
                </div>
              </div>

              {/* Step 4 Footer Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => jumpToStep(3)}
                  className="text-stone-600 hover:text-stone-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Ingredients</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(5)}
                  className="bg-[#0E7452] hover:bg-[#0A573D] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>Next: Output Pieces & Complete</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: PRODUCTION OUTPUT & TOTAL WEIGHT (WHEN FINISHED) */}
          {(viewMode === 'scroll' || activeStep === 5) && (
            <div 
              ref={step5Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6 transition-all duration-300 ${
                highlightedStep === 5 ? 'animate-step-highlight ring-4 ring-emerald-500/40' : ''
              } ${viewMode === 'wizard' ? 'animate-slide-right' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#0E7452] text-white inline-flex items-center justify-center text-sm font-black shadow-xs">
                      5
                    </span>
                    <span>{t('baker.step5Title', 'When Finished: How Many Pieces Baked?')}</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    {t('baker.step5Desc', 'Enter pieces baked and send finished goods directly to cashier sales stock')}
                  </p>
                </div>
                <div className="hidden sm:flex items-center space-x-1.5 text-xs font-black text-[#064e3b] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span>{activeProduct.name}</span>
                </div>
              </div>

              {/* Quick pieces buttons with bouncy tap */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[50, 100, 200, 300, 500, 1000].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setPiecesProduced(qty)}
                    className={`py-3 rounded-2xl font-black text-base transition-all duration-150 cursor-pointer active:scale-95 ${
                      Number(piecesProduced) === qty
                        ? 'bg-[#0E7452] text-white shadow-md scale-103'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:-translate-y-0.5'
                    }`}
                  >
                    {qty} {t('common.pieces', 'pcs')}
                  </button>
                ))}
              </div>

              <div className="bg-emerald-50/40 border-2 border-emerald-800/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Stepper */}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setPiecesProduced(Math.max(0, (Number(piecesProduced) || 0) - 50))}
                    className="w-14 h-14 rounded-2xl bg-white border border-stone-300 font-black text-3xl text-stone-800 hover:bg-stone-100 flex items-center justify-center active:scale-90 shadow-xs cursor-pointer transition-transform"
                  >
                    -
                  </button>
                  <div className="text-center min-w-[140px]">
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
                      className="w-full text-center text-4xl font-black text-[#0E7452] bg-transparent border-b-2 border-[#0E7452] focus:outline-none transition-all"
                    />
                    <span className="text-xs font-black text-stone-500 uppercase tracking-wider block mt-1">
                      {t('baker.piecesToBake', 'Pieces Baked')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPiecesProduced((Number(piecesProduced) || 0) + 50)}
                    className="w-14 h-14 rounded-2xl bg-white border border-stone-300 font-black text-3xl text-stone-800 hover:bg-stone-100 flex items-center justify-center active:scale-90 shadow-xs cursor-pointer transition-transform"
                  >
                    +
                  </button>
                </div>

                {/* TOTAL BAKED OUTPUT & DOUGH WEIGHT DISPLAY */}
                <div className="text-right bg-white p-5 rounded-2xl border border-emerald-300 shadow-xs min-w-[240px]">
                  <div className="text-xs font-extrabold text-stone-400 uppercase tracking-wider">
                    {t('baker.totalBatchWeight', 'Total Batch Output Weight')}
                  </div>
                  <div className="text-3xl font-black text-[#0E7452] mt-1">
                    {totalWeightKg} {t('common.kg', 'kg')}
                  </div>
                  <div className="text-xs font-bold text-emerald-800 mt-1">
                    {piecesProduced || 0} {t('common.pieces', 'pcs')} × {doughGramsPerPiece || unitWeight}g {t('baker.standardDough', 'dough')}
                  </div>
                </div>

              </div>

              {/* GIANT DARK GREEN ACTION BUTTON (NO MONEY SHOWN) */}
              <button
                type="submit"
                disabled={isSubmitting || piecesProduced <= 0}
                className="w-full py-5 rounded-3xl bg-[#0E7452] hover:bg-[#0A573D] text-white font-black text-xl shadow-xl shadow-[#0E7452]/20 transition-all hover:scale-101 active:scale-98 cursor-pointer flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-200" />
                <span>
                  {isSubmitting 
                    ? t('baker.recording', 'Recording Production...') 
                    : `${t('baker.completeBaking', '🥖 COMPLETE BAKING & SEND TO CASHIER')} (${piecesProduced} pcs • ${totalWeightKg} kg)`}
                </span>
              </button>

              {/* Step 5 Back Button */}
              {viewMode === 'wizard' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => jumpToStep(4)}
                    className="text-stone-500 hover:text-stone-900 text-xs font-black inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('common.back', 'Back to Dough Weight')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </form>
      )}

      {/* TODAY'S PRODUCTION HISTORY */}
      {bakerTab === 'history' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#064e3b]" />
              <h2 className="text-base font-black text-stone-900">
                {t('baker.historyTitle', "Today's Production Batches")} ({todayBatches.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-stone-400">
              {t('baker.historySubtitle', 'Batches recorded today by baking staff')}
            </span>
          </div>

          {todayBatches.length === 0 ? (
            <div className="text-center py-12 text-stone-400 font-bold text-sm">
              {t('baker.noBatches', 'No production batches recorded yet today.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayBatches.map((b) => (
                <div 
                  key={b.id || b.batch_number}
                  className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#064e3b]">{b.batch_number}</span>
                    <span className="text-xs text-stone-500 font-bold">{b.production_time}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-stone-900">{b.product_name}</h3>
                    <p className="text-sm font-black text-[#0E7452]">
                      {b.pieces_produced} {t('common.pieces', 'pcs')} • {t('baker.totalBatchWeight', 'Total Weight')}: {b.total_weight_grams ? (b.total_weight_grams / 1000).toFixed(1) + ' kg' : `${((b.pieces_produced * 100) / 1000).toFixed(1)} kg`}
                    </p>
                  </div>
                  <div className="text-xs text-stone-600 border-t border-emerald-200/60 pt-2 flex items-center justify-between">
                    <span>{t('admin.colBaker', 'Baker')}: {b.baker_name}</span>
                    <span className="bg-emerald-200 text-emerald-900 font-bold uppercase text-[10px] px-2 py-0.5 rounded-full">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
