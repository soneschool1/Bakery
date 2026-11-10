import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Check,
  Package,
  Eye,
  Edit3,
  Calendar,
  Clock,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { formatETB } from '../../utils/formatters';

function isSameCategory(cat1, cat2) {
  if (!cat1 || !cat2) return false;
  const c1 = String(cat1).toLowerCase().trim();
  const c2 = String(cat2).toLowerCase().trim();
  if (c1 === c2) return true;
  if ((c1 === 'cake' && c2 === 'cakes') || (c1 === 'cakes' && c2 === 'cake')) return true;
  if ((c1 === 'cookie' && c2 === 'cookies') || (c1 === 'cookies' && c2 === 'cookie')) return true;
  return false;
}

export default function BakerDashboard({ 
  baker = {}, 
  products = [], 
  rawMaterials = [], 
  batches = [], 
  suggestions = [], 
  onCreateBatch, 
  onEditBatch, 
  onSubmitStockCheck,
  onApproveStockCheck,
  isSubmitting = false 
}) {
  const { t } = useTranslation();
  const [bakerTab, setBakerTab] = useState('baking'); // 'baking', 'history', 'stock'
  const [cookingCategory, setCookingCategory] = useState('Bread'); // 'Bread', 'Cookies', 'Cake', 'Other Products'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Workflow Stepper & View Mode
  const [activeStep, setActiveStep] = useState(1); // 1: Category, 2: Variety, 3: Ingredients, 4: Dough Weight, 5: Output & Bake
  const [viewMode, setViewMode] = useState('wizard'); // 'wizard' | 'scroll'
  const [highlightedStep, setHighlightedStep] = useState(null);
  const [animatingCategory, setAnimatingCategory] = useState(null);
  const [animatingProduct, setAnimatingProduct] = useState(null);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState('');

  // History Modals
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [editPieces, setEditPieces] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [historyFilter, setHistoryFilter] = useState('today'); // 'today' | 'all'

  // Refs for smooth auto-scrolling
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const step4Ref = useRef(null);

  // Active products in selected category
  const categoryProducts = useMemo(() => {
    return (products || []).filter(p => p.active && isSameCategory(p.category, cookingCategory));
  }, [products, cookingCategory]);

  // Multiple Selected Bread Varieties in Batch
  const [selectedBreads, setSelectedBreads] = useState(() => {
    const defaultP = (products || []).find(p => p.active && isSameCategory(p.category, 'Bread'));
    return [{
      productId: defaultP?.id || 'default-bread-1',
      name: defaultP?.name || 'Bread 1 (Special Table)',
      category: 'Bread',
      selling_price: defaultP?.selling_price || 10,
      standard_weight_grams: defaultP?.weight_grams || 100,
      weight_grams: defaultP?.weight_grams || 100,
      pieces: 250,
    }];
  });

  // Keep selectedBreads synced when products arrive from backend
  useEffect(() => {
    if (products && products.length > 0) {
      setSelectedBreads(prev => {
        const hasPlaceholder = prev.some(b => String(b.productId).startsWith('default-'));
        if (hasPlaceholder) {
          const matching = products.filter(p => p.active && isSameCategory(p.category, cookingCategory));
          if (matching.length > 0) {
            return [{
              productId: matching[0].id,
              name: matching[0].name,
              category: matching[0].category,
              selling_price: matching[0].selling_price || 10,
              standard_weight_grams: matching[0].weight_grams || 100,
              weight_grams: matching[0].weight_grams || 100,
              pieces: 250,
            }];
          }
        }
        return prev;
      });
    }
  }, [products, cookingCategory]);

  // Derived totals across all selected breads
  const totalPieces = useMemo(() => {
    return selectedBreads.reduce((sum, b) => sum + (Number(b.pieces) || 0), 0);
  }, [selectedBreads]);

  const totalDoughRequiredG = useMemo(() => {
    return selectedBreads.reduce((sum, b) => sum + ((Number(b.pieces) || 0) * (Number(b.weight_grams) || 100)), 0);
  }, [selectedBreads]);

  const totalDoughRequiredKg = useMemo(() => {
    return (totalDoughRequiredG / 1000).toFixed(1);
  }, [totalDoughRequiredG]);

  const totalPotentialValue = useMemo(() => {
    return selectedBreads.reduce((sum, b) => sum + ((Number(b.pieces) || 0) * (Number(b.selling_price) || 10)), 0);
  }, [selectedBreads]);

  // Backward compatibility alias for single-product references
  const activeProduct = useMemo(() => {
    if (selectedBreads.length > 0) {
      return {
        id: selectedBreads[0].productId,
        name: selectedBreads.map(b => b.name).join(' + '),
        category: selectedBreads[0].category || cookingCategory,
        weight_grams: selectedBreads[0].weight_grams,
        selling_price: selectedBreads[0].selling_price,
      };
    }
    return {
      id: 'default',
      name: 'Bread 1 (Special Table)',
      category: cookingCategory,
      weight_grams: 100,
      selling_price: 10,
    };
  }, [selectedBreads, cookingCategory]);

  // Setters for backward compatibility
  function setPiecesProduced(val) {
    if (selectedBreads.length === 1) {
      handleUpdateBreadPieces(selectedBreads[0].productId, val);
    } else if (selectedBreads.length > 1) {
      // Proportionally update or evenly distribute
      const count = selectedBreads.length;
      const numVal = parseInt(val, 10) || 0;
      const perBread = Math.floor(numVal / count);
      setSelectedBreads(prev => prev.map((b, idx) => ({
        ...b,
        pieces: idx === 0 ? perBread + (numVal % count) : perBread,
      })));
    }
  }

  function setDoughGramsPerPiece(val) {
    if (selectedBreads.length > 0) {
      setSelectedBreads(prev => prev.map(b => ({ ...b, weight_grams: Number(val) || 100 })));
    }
  }

  const piecesProduced = totalPieces;
  const doughGramsPerPiece = selectedBreads[0]?.weight_grams || 100;

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

  // Values for backend API payload
  const unitPrice = totalPieces > 0 ? Math.round((totalPotentialValue / totalPieces) * 100) / 100 : 10;
  const unitWeight = selectedBreads[0]?.weight_grams || 100;
  const totalWeightGrams = totalDoughRequiredG;
  const totalWeightKg = totalDoughRequiredKg;

  // Batch dough estimation (flour + water ~60% hydration + dry ingredients)
  const flourGrams = (Number(flourKg) || 0) * 1000;
  const estimatedDoughTotalG = Math.round(
    flourGrams * 1.6 + 
    (Number(majMixGrams) || 0) + 
    (Number(yeastGrams) || 0) + 
    (Number(saltGrams) || 0) + 
    (isSameCategory(cookingCategory, 'Cookies') || isSameCategory(cookingCategory, 'Cake') 
      ? (Number(sugarGrams) || 0) + (Number(selitGrams) || 0) + (Number(tekurAzmudGrams) || 0)
      : 0)
  );
  const estimatedDoughTotalKg = (estimatedDoughTotalG / 1000).toFixed(1);
  const doughDifferenceG = estimatedDoughTotalG - totalDoughRequiredG;
  const doughDifferenceKg = (doughDifferenceG / 1000).toFixed(1);

  // Raw material low-stock checks
  const lowStockMaterials = useMemo(() => {
    return (rawMaterials || []).filter(m => m.current_quantity <= m.minimum_stock);
  }, [rawMaterials]);

  // Baker suggestions / presets
  const bakerSuggestions = useMemo(() => {
    return (suggestions || []).filter(s => s.role_target === 'baker');
  }, [suggestions]);

  // Standard presets built into system
  const defaultPresets = [
    {
      label: '🥖 Standard Table Bread (500 pcs)',
      cat: 'Bread',
      flour: '35',
      maj: '500',
      yeast: '250',
      salt: '500',
      weight: '100',
      pieces: 500
    },
    {
      label: '🥖 Family Medium Loaf (300 pcs)',
      cat: 'Bread',
      flour: '30',
      maj: '400',
      yeast: '200',
      salt: '400',
      weight: '150',
      pieces: 300
    },
    {
      label: '🍪 Selit Tea Cookies (200 pcs)',
      cat: 'Cookies',
      flour: '20',
      maj: '250',
      yeast: '0',
      salt: '100',
      sugar: '8000',
      selit: '1000',
      azmud: '200',
      weight: '40',
      pieces: 200
    },
    {
      label: '🎂 Celebration Sponge Cake (20 pcs)',
      cat: 'Cake',
      flour: '10',
      maj: '0',
      yeast: '0',
      salt: '50',
      sugar: '5000',
      weight: '250',
      pieces: 20
    }
  ];

  // Apply a 1-tap preset
  function handleApplyPreset(preset) {
    setCookingCategory(preset.cat);
    setFlourKg(preset.flour || '35');
    setMajMixGrams(preset.maj || '500');
    setYeastGrams(preset.yeast || '250');
    setSaltGrams(preset.salt || '500');
    if (preset.sugar) setSugarGrams(preset.sugar);
    if (preset.selit) setSelitGrams(preset.selit);
    if (preset.azmud) setTekurAzmudGrams(preset.azmud);

    // Find product for preset or use default
    const matchingProds = (products || []).filter(p => p.active && isSameCategory(p.category, preset.cat));
    const p = matchingProds.length > 0 ? matchingProds[0] : {
      id: 'default',
      name: preset.label.replace(/^[^\w]+/, '').replace(/\([^)]*\)/, '').trim(),
      category: preset.cat,
      selling_price: 10,
      weight_grams: Number(preset.weight || 100),
    };

    setSelectedBreads([{
      productId: p.id,
      name: p.name,
      category: preset.cat,
      selling_price: p.selling_price || 10,
      standard_weight_grams: p.weight_grams || Number(preset.weight || 100),
      weight_grams: Number(preset.weight || 100),
      pieces: preset.pieces || 500,
    }]);

    setSuccessMsg(`✨ Preset loaded: ${preset.label}! Moving to Step 3 (Varieties & Weights)...`);
    setTimeout(() => {
      setSuccessMsg('');
      setActiveStep(3);
      setHighlightedStep(3);
    }, 600);
  }

  // 1. SELECT BAKING CATEGORY (WITH OPTIONAL AUTO-ADVANCE)
  function handleCategorySelect(catId) {
    setCookingCategory(catId);
    setAnimatingCategory(catId);
    setAutoAdvanceNotice(`✨ ${catId} chosen! Moving to Step 2 (Mixer Ingredients)...`);

    // Smart default presets per category
    if (catId === 'Bread') {
      setFlourKg('35');
      setMajMixGrams('500');
      setYeastGrams('250');
      setSaltGrams('500');
    } else if (catId === 'Cookies') {
      setFlourKg('20');
      setMajMixGrams('250');
      setYeastGrams('0');
      setSaltGrams('100');
      setSugarGrams('6000');
      setSelitGrams('1000');
      setTekurAzmudGrams('300');
    } else if (catId === 'Cake') {
      setFlourKg('10');
      setMajMixGrams('0');
      setYeastGrams('0');
      setSaltGrams('50');
      setSugarGrams('5000');
    } else {
      setFlourKg('15');
      setMajMixGrams('300');
      setYeastGrams('150');
      setSaltGrams('200');
    }

    // Default first product in category
    const prods = (products || []).filter(p => p.active && isSameCategory(p.category, catId));
    if (prods.length > 0) {
      const p = prods[0];
      const defaultPieces = catId === 'Bread' ? 250 : catId === 'Cookies' ? 100 : 20;
      const defaultWeight = p.weight_grams || (catId === 'Bread' ? 100 : catId === 'Cookies' ? 40 : 80);
      setSelectedBreads([{
        productId: p.id,
        name: p.name,
        category: p.category,
        selling_price: p.selling_price || 10,
        standard_weight_grams: p.weight_grams || defaultWeight,
        weight_grams: defaultWeight,
        pieces: defaultPieces,
      }]);
    }

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

  // 2. TOGGLE / SELECT PRODUCT VARIETY IN BATCH (MULTI-SELECT)
  function handleToggleBread(p) {
    setSelectedBreads(prev => {
      const exists = prev.some(b => b.productId === p.id);
      if (exists) {
        if (prev.length === 1) {
          setAutoAdvanceNotice(`ℹ️ "${p.name}" is the only variety selected. Select another bread first before removing.`);
          setTimeout(() => setAutoAdvanceNotice(''), 3000);
          return prev;
        }
        return prev.filter(b => b.productId !== p.id);
      } else {
        const defaultPieces = cookingCategory === 'Bread' ? 200 : cookingCategory === 'Cookies' ? 100 : 15;
        const defaultWeight = p.weight_grams || (cookingCategory === 'Bread' ? 100 : cookingCategory === 'Cookies' ? 40 : 80);
        return [
          ...prev,
          {
            productId: p.id,
            name: p.name,
            category: p.category,
            selling_price: p.selling_price || 10,
            standard_weight_grams: p.weight_grams || defaultWeight,
            weight_grams: defaultWeight,
            pieces: defaultPieces,
          }
        ];
      }
    });
  }

  function handleSelectAllBreads() {
    if (categoryProducts.length === 0) return;
    const all = categoryProducts.map(p => {
      const existing = selectedBreads.find(b => b.productId === p.id);
      if (existing) return existing;
      const defaultPieces = cookingCategory === 'Bread' ? 200 : cookingCategory === 'Cookies' ? 80 : 10;
      const defaultWeight = p.weight_grams || 100;
      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        selling_price: p.selling_price || 10,
        standard_weight_grams: p.weight_grams || defaultWeight,
        weight_grams: defaultWeight,
        pieces: defaultPieces,
      };
    });
    setSelectedBreads(all);
  }

  function handleRemoveBread(productId) {
    if (selectedBreads.length <= 1) {
      setAutoAdvanceNotice('ℹ️ Batch must contain at least one bread variety.');
      setTimeout(() => setAutoAdvanceNotice(''), 3000);
      return;
    }
    setSelectedBreads(prev => prev.filter(b => b.productId !== productId));
  }

  function handleUpdateBreadWeight(productId, weight) {
    const num = Math.max(1, Number(weight) || 0);
    setSelectedBreads(prev => prev.map(b => b.productId === productId ? { ...b, weight_grams: num } : b));
  }

  function handleUpdateBreadPieces(productId, pieces) {
    const num = pieces === '' ? '' : Math.max(0, parseInt(pieces, 10) || 0);
    setSelectedBreads(prev => prev.map(b => b.productId === productId ? { ...b, pieces: num } : b));
  }

  // Direct step navigation
  function jumpToStep(stepNum) {
    setActiveStep(stepNum);
    setHighlightedStep(stepNum);
    if (viewMode === 'scroll') {
      const stepRefs = { 1: step1Ref, 2: step2Ref, 3: step3Ref, 4: step4Ref };
      stepRefs[stepNum]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedStep(null), 1400);
  }

  // Handle baking submission
  async function handleFinishBaking(e) {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (selectedBreads.length === 0) {
      setErrorMessage('Please select at least one bread variety to bake.');
      return;
    }

    if (totalPieces <= 0) {
      setErrorMessage('Please enter a valid number of pieces produced (greater than 0).');
      return;
    }

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
    if (isSameCategory(cookingCategory, 'Cookies') || isSameCategory(cookingCategory, 'Cake')) {
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

    // Optional custom other ingredient
    if (otherIngName && otherIngQty && Number(otherIngQty) > 0) {
      ingredientsConsumed.push({ name: otherIngName, quantity: Number(otherIngQty), unit: 'g' });
    }

    // Fallback if no ingredients recorded
    if (ingredientsConsumed.length === 0) {
      ingredientsConsumed.push({ name: 'Flour', quantity: Number(flourKg) || 10, unit: 'kg' });
    }

    const itemsPayload = selectedBreads.map(b => ({
      product_id: b.productId,
      product_name: b.name,
      category: b.category,
      pieces_produced: Number(b.pieces) || 0,
      dough_weight_grams: Number(b.weight_grams) || 100,
      total_weight_grams: (Number(b.pieces) || 0) * (Number(b.weight_grams) || 100),
      unit_selling_price: Number(b.selling_price) || 10,
    }));

    const payload = {
      category: cookingCategory,
      product_id: selectedBreads[0].productId,
      product_name: selectedBreads.map(b => b.name).join(' + '),
      baker_id: baker?.id || baker?.username || 'baker',
      baker_name: baker?.full_name || 'Dawit Alemu (Head Baker)',
      pieces_produced: totalPieces,
      total_weight_grams: totalDoughRequiredG,
      unit_selling_price: totalPieces > 0 ? Math.round((totalPotentialValue / totalPieces) * 100) / 100 : 10,
      ingredients_consumed: ingredientsConsumed,
      items: itemsPayload,
      remarks: `Combined batch of ${selectedBreads.length} varieties: ${selectedBreads.map(b => `${b.pieces} pcs ${b.name} (${b.weight_grams}g)`).join(', ')}`,
      branch_id: baker?.branch_id || 'main',
    };

    try {
      if (onCreateBatch) {
        await onCreateBatch(payload);
      }
      setSuccessMsg(`🎉 SUCCESS! ${totalPieces} total pieces across ${selectedBreads.length} bread varieties recorded! Finished stock is now available for cashiers.`);
      setTimeout(() => setSuccessMsg(''), 8000);
      setOtherIngName('');
      setOtherIngQty('');
      // Reset back to Step 1 for next batch
      setActiveStep(1);
      if (viewMode === 'scroll') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record baking batch. Please try again.');
    }
  }

  // Handle batch edit submit
  async function handleSaveEditBatch(e) {
    if (e) e.preventDefault();
    if (!editingBatch || !editReason) return;

    try {
      if (onEditBatch) {
        await onEditBatch(editingBatch.id, {
          pieces_produced: Number(editPieces),
          reason: editReason,
          editor_name: baker?.full_name || 'Dawit Alemu',
          remarks: editingBatch.remarks,
        });
      }
      setSuccessMsg(`✅ Batch #${editingBatch.batch_number} updated to ${editPieces} pieces.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setEditingBatch(null);
      setEditReason('');
    } catch (err) {
      alert(`Edit error: ${err.message}`);
    }
  }

  // Today's batches
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayBatches = useMemo(() => {
    return (batches || []).filter(b => {
      if (historyFilter === 'today') {
        return b.production_date === todayStr;
      }
      return true;
    });
  }, [batches, historyFilter, todayStr]);

  const stepTitles = [
    { num: 1, title: 'Category', subtitle: cookingCategory, icon: Wheat },
    { num: 2, title: 'Ingredients', subtitle: `${flourKg}kg flour (~${estimatedDoughTotalKg}kg dough)`, icon: Scale },
    { num: 3, title: 'Varieties & Weights', subtitle: `${selectedBreads.length} varieties (${totalPieces} pcs)`, icon: Layers },
    { num: 4, title: 'Bake & Send', subtitle: `${totalPieces} pcs (${totalDoughRequiredKg} kg)`, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Baker Main Header Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-2.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setBakerTab('baking')}
            className={`shrink-0 flex-none px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              bakerTab === 'baking'
                ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/20 scale-[1.02]'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Wheat className="w-4 h-4 text-emerald-300" />
            <span>🥖 Start Baking</span>
          </button>

          <button
            type="button"
            onClick={() => setBakerTab('history')}
            className={`shrink-0 flex-none px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              bakerTab === 'history'
                ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/20 scale-[1.02]'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <History className="w-4 h-4 text-emerald-300" />
            <span>📜 History ({todayBatches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setBakerTab('stock')}
            className={`shrink-0 flex-none px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              bakerTab === 'stock'
                ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/20 scale-[1.02]'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-300" />
            <span>📦 Store Stock ({rawMaterials.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-stone-600 pr-2">
          <span>Head Baker: <strong className="text-stone-900">{baker?.full_name || 'Dawit Alemu'}</strong></span>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-black text-xs sm:text-sm">⚠️ LOW STOCK ALERT IN BAKERY STORE:</p>
              <p className="text-xs font-semibold text-rose-800 break-words">
                {lowStockMaterials.map(m => `${m.name} (${m.current_quantity} ${m.unit} left, min: ${m.minimum_stock})`).join(' • ')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setBakerTab('stock')}
            className="text-xs font-black bg-rose-600 text-white px-3.5 py-2 rounded-xl hover:bg-rose-700 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            View Stock
          </button>
        </div>
      )}

      {/* Auto-Advance Notification */}
      {autoAdvanceNotice && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-950 px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>{autoAdvanceNotice}</span>
        </div>
      )}

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-md text-sm font-black">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎉</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-800 text-lg hover:text-emerald-950 cursor-pointer">✕</button>
        </div>
      )}

      {/* Error Notification Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-600 text-rose-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black">
          <div className="flex items-center space-x-3">
            <span className="text-xl">⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-800 text-lg hover:text-rose-950 cursor-pointer">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: 5-STEP BAKING WORKFLOW */}
      {/* ======================================================== */}
      {bakerTab === 'baking' && (
        <div className="space-y-6">

          {/* Stepper Header Bar with Clickable Pills & View Mode Switcher */}
          <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-black">
                  {activeStep}
                </span>
                <span className="text-sm font-extrabold text-stone-900">
                  Step {activeStep} of 4: {stepTitles[activeStep - 1]?.title}
                </span>
                <span className="text-xs font-bold text-stone-500">
                  ({stepTitles[activeStep - 1]?.subtitle})
                </span>
              </div>

              {/* View Mode Toggle: Wizard vs All Steps */}
              <div className="flex items-center p-1 bg-stone-100 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setViewMode('wizard')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'wizard' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Step-by-Step (Wizard)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('scroll')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'scroll' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  All Steps (Single Page)
                </button>
              </div>
            </div>

            {/* Clickable 4-Step Progress Pills (Horizontal swipeable on mobile) */}
            <div className="overflow-x-auto flex sm:grid sm:grid-cols-4 gap-2 scrollbar-none pb-1 sm:pb-0">
              {stepTitles.map((step) => {
                const isActive = activeStep === step.num;
                const isCompleted = activeStep > step.num;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => jumpToStep(step.num)}
                    className={`shrink-0 w-36 sm:w-auto p-2.5 sm:p-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex items-center space-x-2.5 ${
                      isActive
                        ? 'border-[#064e3b] bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                        : isCompleted
                        ? 'border-emerald-200 bg-white hover:border-emerald-400'
                        : 'border-stone-200 bg-stone-50/50 hover:bg-white text-stone-400'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isActive 
                        ? 'bg-[#064e3b] text-white' 
                        : isCompleted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-stone-200 text-stone-600'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : step.num}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-black truncate ${isActive ? 'text-[#064e3b]' : 'text-stone-800'}`}>
                        {step.title}
                      </div>
                      <div className="text-[10px] font-bold text-stone-500 truncate">
                        {step.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Smooth Progress Line */}
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#064e3b] via-[#0E7452] to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(activeStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: CHOOSE BAKING CATEGORY */}
          {(viewMode === 'scroll' || activeStep === 1) && (
            <div 
              ref={step1Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 transition-all duration-300 ${
                highlightedStep === 1 ? 'ring-4 ring-emerald-500/40' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#064e3b] text-white inline-flex items-center justify-center text-sm font-black shadow-xs">
                      1
                    </span>
                    <span>Choose What You Are Cooking:</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    Select product family — automatically advances to Step 2
                  </p>
                </div>
                <span className="hidden sm:inline-block text-xs font-bold bg-emerald-50 text-[#064e3b] px-3 py-1 rounded-full border border-emerald-200">
                  ⚡ 1-Click Auto-Advance
                </span>
              </div>

              {/* Big Category Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: 'Bread', label: 'Bread', icon: '🥖', desc: 'Table bread, special, family loaf' },
                  { id: 'Cookies', label: 'Tea Cookies', icon: '🍪', desc: 'Selit, Tekur azmud cookies' },
                  { id: 'Cake', label: 'Cake', icon: '🎂', desc: 'Celebration cakes & slices' },
                  { id: 'Other Products', label: 'Other Products', icon: '🥐', desc: 'Croissants & pastries' },
                ].map((cat) => {
                  const isSelected = isSameCategory(cookingCategory, cat.id);
                  const isAnimating = animatingCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`group p-6 rounded-3xl border-3 text-left transition-all duration-200 flex flex-col justify-between h-40 relative cursor-pointer overflow-hidden ${
                        isAnimating
                          ? 'scale-105 border-[#064e3b] bg-emerald-100 ring-8 ring-emerald-500/40 shadow-xl'
                          : isSelected
                          ? 'border-[#064e3b] bg-gradient-to-br from-emerald-50 via-emerald-100/60 to-emerald-50 shadow-xl ring-4 ring-emerald-600/30 scale-102'
                          : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-4xl transition-transform duration-300 group-hover:scale-120 group-hover:rotate-6">
                          {cat.icon}
                        </span>
                        {isSelected && (
                          <div className="w-7 h-7 rounded-full bg-[#064e3b] text-white flex items-center justify-center shadow-xs">
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

                      {isAnimating && (
                        <div className="absolute inset-x-0 bottom-0 bg-[#064e3b] text-white text-[11px] font-black py-1 px-2 text-center flex items-center justify-center space-x-1.5 animate-pulse">
                          <Sparkles className="w-3 h-3 text-emerald-300 animate-spin" />
                          <span>Advancing to Step 2...</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step 1 Footer Action */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="text-xs font-bold text-stone-500">
                  Selected Category: <strong className="text-stone-900">{cookingCategory}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="bg-[#064e3b] hover:bg-[#043729] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>Next: Enter Mixer Ingredients</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ENTER INGREDIENTS CONSUMPTION */}
          {(viewMode === 'scroll' || activeStep === 2) && (
            <div 
              ref={step2Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4 transition-all duration-300 ${
                highlightedStep === 2 ? 'ring-4 ring-emerald-500/40' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#064e3b] text-white inline-flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                      2
                    </span>
                    <span>Enter Ingredients Used for This Batch:</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    Measure and enter exact ingredient weights used in the mixer for this batch
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-bold bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
                  <Package className="w-4 h-4 text-[#064e3b]" />
                  <span>Category: <strong>{cookingCategory}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                {/* Flour (kg) */}
                {(() => {
                  const flourMat = rawMaterials.find(m => m.name && m.name.toLowerCase().includes('flour'));
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
                  const majMat = rawMaterials.find(m => m.name && m.name.toLowerCase().includes('maj'));
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
                        <span className="text-stone-900 font-extrabold">{majStock} {majMat?.unit || 'g'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Yeast (grams) */}
                {(() => {
                  const yeastMat = rawMaterials.find(m => m.name && m.name.toLowerCase().includes('yeast'));
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
                        <span className="text-stone-900 font-extrabold">{yeastStock} {yeastMat?.unit || 'g'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Salt (grams) */}
                {(() => {
                  const saltMat = rawMaterials.find(m => m.name && m.name.toLowerCase().includes('salt'));
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
                        <span className="text-stone-900 font-extrabold">{saltStock} {saltMat?.unit || 'g'}</span>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Extra fields if Cookies or Cake */}
              {(isSameCategory(cookingCategory, 'Cookies') || isSameCategory(cookingCategory, 'Cake')) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
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

              {/* Combined Dough Estimation & Batch Yield Planning Card */}
              <div className="bg-gradient-to-r from-emerald-50 via-stone-50 to-emerald-50/80 border-2 border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-5 h-5 text-[#064e3b]" />
                    <span className="text-sm font-black text-emerald-950">
                      Combined Dough Estimation & Batch Yield Balance
                    </span>
                  </div>
                  <div className="text-xs font-bold text-stone-500">
                    Based on {flourKg || 0} kg flour + ~60% mixer hydration & dry mix
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-stone-500 font-bold block">Estimated Mixer Dough Yield:</span>
                    <span className="text-2xl font-black text-[#064e3b] block mt-0.5">
                      ~{estimatedDoughTotalKg} kg
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">
                      Total raw dough in mixing bowl
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-stone-500 font-bold block">Planned Bread Dough Needed:</span>
                    <span className="text-2xl font-black text-stone-900 block mt-0.5">
                      {totalDoughRequiredKg} kg
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">
                      {totalPieces} pcs across {selectedBreads.length} varieties
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-stone-500 font-bold block">Batch Balance Status:</span>
                      <span className={`inline-flex items-center space-x-1 font-black text-xs px-2.5 py-1 rounded-lg mt-1 ${
                        Number(doughDifferenceKg) >= 0 
                          ? 'bg-emerald-100 text-emerald-900' 
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        <span>{Number(doughDifferenceKg) >= 0 ? '✓ Balanced' : '⚠️ Deficit'}</span>
                        <span>({Number(doughDifferenceKg) >= 0 ? `+${doughDifferenceKg} kg buffer` : `${doughDifferenceKg} kg needed`})</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 font-medium">
                      {Number(doughDifferenceKg) >= 0 
                        ? 'Mixer dough is sufficient for all planned bread varieties.' 
                        : 'Increase flour or adjust pieces in Step 3.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 Footer Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => jumpToStep(1)}
                  className="text-stone-600 hover:text-stone-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Categories</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(3)}
                  className="bg-[#064e3b] hover:bg-[#043729] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                >
                  <span>Next: Select Varieties & Set Dough Weights</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT VARIETIES & SET DOUGH WEIGHT / QUANTITIES (SINGLE STEP) */}
          {(viewMode === 'scroll' || activeStep === 3) && (
            <div 
              ref={step3Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6 transition-all duration-300 ${
                highlightedStep === 3 ? 'ring-4 ring-emerald-500/40' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#0E7452] text-white inline-flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                      3
                    </span>
                    <span>Select Varieties & Set Dough Weight / Quantities:</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    Select bread varieties to bake together and adjust portion weights and quantities for each variety
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSelectAllBreads}
                    className="text-xs font-black text-[#0E7452] hover:text-[#064e3b] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-xs font-black text-[#0E7452] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
                    <Package className="w-4 h-4" />
                    <span>{selectedBreads.length} {selectedBreads.length === 1 ? 'Variety' : 'Varieties'}</span>
                  </span>
                </div>
              </div>

              {/* 1. Variety Selection Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Wheat className="w-4 h-4 text-[#0E7452]" />
                    <span>1. Choose Varieties of {cookingCategory}:</span>
                  </span>
                  <span className="text-[11px] font-bold text-stone-500">
                    Tap to add or remove varieties from batch
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryProducts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-stone-400 font-bold text-xs bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                      No active products found in category "{cookingCategory}". Please select another category.
                    </div>
                  ) : (
                    categoryProducts.map((p) => {
                      const isSelected = selectedBreads.some(b => b.productId === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleBread(p)}
                          className={`group p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between min-h-[5.5rem] relative cursor-pointer select-none ${
                            isSelected
                              ? 'border-[#0E7452] bg-emerald-50/90 shadow-sm ring-2 ring-emerald-500/20'
                              : 'border-stone-200 bg-stone-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-black text-sm sm:text-base text-stone-900 group-hover:text-[#0E7452] block transition-colors truncate">
                                {p.name}
                              </span>
                              <div className="flex items-center space-x-2 text-xs font-bold text-stone-500 mt-0.5">
                                <span>Standard: {p.weight_grams || 100}g</span>
                              </div>
                            </div>

                            {/* Checkbox badge */}
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                              isSelected
                                ? 'bg-[#0E7452] text-white shadow-xs'
                                : 'border-2 border-stone-300 bg-white group-hover:border-[#0E7452] text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Dough Weight & Quantities Controls for Each Selected Variety */}
              <div className="space-y-4 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-[#0E7452]" />
                    <span>2. Dough Weight & Pieces for Each Variety ({selectedBreads.length}):</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#0E7452]">
                    Total Output: {totalPieces} pcs (~{totalDoughRequiredKg} kg)
                  </span>
                </div>

                <div className="space-y-4">
                  {selectedBreads.map((bread, index) => {
                    const breadPieces = Number(bread.pieces) || 0;
                    const breadWeight = Number(bread.weight_grams) || 100;
                    const breadTotalKg = ((breadPieces * breadWeight) / 1000).toFixed(1);

                    return (
                      <div 
                        key={bread.productId} 
                        className="bg-stone-50/70 border-2 border-stone-200 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 space-y-4 transition-all"
                      >
                        {/* Variety Card Top Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
                          <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-lg bg-[#0E7452] text-white inline-flex items-center justify-center text-xs font-black shrink-0">
                              #{index + 1}
                            </span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-base font-black text-stone-900">
                                  {bread.name}
                                </h3>
                                <span className="text-[11px] font-bold bg-white text-stone-600 px-2 py-0.5 rounded-md border border-stone-200">
                                  {bread.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs font-semibold text-stone-500 mt-0.5">
                                <span>Standard: <strong className="text-stone-700">{bread.standard_weight_grams || 100}g</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-auto">
                            {/* Variety subtotal preview badge */}
                            <div className="text-right text-xs bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                              <span className="text-stone-400 font-bold block text-[10px] uppercase">Batch Dough</span>
                              <span className="font-black text-[#0E7452]">
                                {breadTotalKg} kg
                              </span>
                            </div>

                            {selectedBreads.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBread(bread.productId)}
                                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                title={`Remove ${bread.name} from batch`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Weight and Pieces Controls Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          
                          {/* 1. Portion Weight Control */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-stone-800 uppercase flex items-center space-x-1.5">
                                <Scale className="w-3.5 h-3.5 text-[#0E7452]" />
                                <span>Portion Weight (Grams):</span>
                              </label>
                              <span className="text-[11px] font-bold text-stone-500">
                                Target per piece
                              </span>
                            </div>

                            {/* Quick Weight Presets */}
                            <div className="flex flex-wrap gap-1.5">
                              {[40, 60, 80, 100, 120, 150, 200].map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => handleUpdateBreadWeight(bread.productId, g)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    breadWeight === g
                                      ? 'bg-[#0E7452] text-white shadow-xs'
                                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                                  }`}
                                >
                                  {g}g
                                </button>
                              ))}
                            </div>

                            {/* Numeric input with +/- step */}
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateBreadWeight(bread.productId, Math.max(10, breadWeight - 10))}
                                className="w-10 h-10 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 font-black text-lg text-stone-700 flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs"
                              >
                                -
                              </button>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={bread.weight_grams}
                                  onChange={(e) => handleUpdateBreadWeight(bread.productId, e.target.value)}
                                  className="w-full bg-white border-2 border-stone-300 focus:border-[#0E7452] rounded-xl px-3 py-2 text-lg font-black text-stone-900 text-center focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">g</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateBreadWeight(bread.productId, breadWeight + 10)}
                                className="w-10 h-10 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 font-black text-lg text-stone-700 flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 2. Pieces Baked Control */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-stone-800 uppercase flex items-center space-x-1.5">
                                <Package className="w-3.5 h-3.5 text-[#0E7452]" />
                                <span>Pieces Baked for {bread.name}:</span>
                              </label>
                              <span className="text-[11px] font-bold text-stone-500">
                                Units produced
                              </span>
                            </div>

                            {/* Quick Pieces Presets */}
                            <div className="flex flex-wrap gap-1.5">
                              {[50, 100, 150, 200, 250, 300, 500].map((pQty) => (
                                <button
                                  key={pQty}
                                  type="button"
                                  onClick={() => handleUpdateBreadPieces(bread.productId, pQty)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    breadPieces === pQty
                                      ? 'bg-[#0E7452] text-white shadow-xs'
                                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                                  }`}
                                >
                                  {pQty} pcs
                                </button>
                              ))}
                            </div>

                            {/* Numeric input with +/- step */}
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateBreadPieces(bread.productId, Math.max(0, breadPieces - 25))}
                                className="w-10 h-10 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 font-black text-lg text-stone-700 flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs"
                              >
                                -
                              </button>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={bread.pieces}
                                  onChange={(e) => handleUpdateBreadPieces(bread.productId, e.target.value)}
                                  className="w-full bg-white border-2 border-stone-300 focus:border-[#0E7452] rounded-xl px-3 py-2 text-lg font-black text-[#0E7452] text-center focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">pcs</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateBreadPieces(bread.productId, breadPieces + 25)}
                                className="w-10 h-10 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 font-black text-lg text-stone-700 flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Batch Consolidated Summary Card */}
              <div className="bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-stone-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-emerald-950 uppercase tracking-wider">
                  <span className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#0E7452]" />
                    <span>Combined Batch Totals ({selectedBreads.length} Varieties)</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Live Combined Output
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold text-stone-400 block uppercase">Total Pieces</span>
                    <span className="text-2xl font-black text-[#0E7452] block mt-0.5">{totalPieces} pcs</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold text-stone-400 block uppercase">Total Dough Needed</span>
                    <span className="text-2xl font-black text-stone-900 block mt-0.5">{totalDoughRequiredKg} kg</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold text-stone-400 block uppercase">Mixer Dough Yield</span>
                    <span className="text-2xl font-black text-emerald-800 block mt-0.5">~{estimatedDoughTotalKg} kg</span>
                  </div>
                </div>

                {/* Dough buffer indicator */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <span className="text-stone-500 font-medium">
                    Mixer Dough vs Total Bread Portions:
                  </span>
                  <span className={`font-black px-2.5 py-0.5 rounded-lg ${
                    Number(doughDifferenceKg) >= 0 
                      ? 'bg-emerald-200/80 text-emerald-950' 
                      : 'bg-amber-200/80 text-amber-950'
                  }`}>
                    {Number(doughDifferenceKg) >= 0 
                      ? `✓ Well Balanced (+${doughDifferenceKg} kg buffer)` 
                      : `⚠️ ${doughDifferenceKg} kg dough variance`}
                  </span>
                </div>
              </div>

              {/* Step 3 Footer Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="text-stone-600 hover:text-stone-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Ingredients</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(4)}
                  className="bg-[#0E7452] hover:bg-[#0A573D] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                >
                  <span>Next: Review & Complete Baking ({totalPieces} pcs)</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PRODUCTION OUTPUT & ITEMIZE TRANSFER TO CASHIER */}
          {(viewMode === 'scroll' || activeStep === 4) && (
            <div 
              ref={step4Ref}
              className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6 transition-all duration-300 ${
                highlightedStep === 4 ? 'ring-4 ring-emerald-500/40' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#0E7452] text-white inline-flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                      4
                    </span>
                    <span>Review & Transfer Finished Stock to Cashier:</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold ml-10">
                    Verify all varieties in this batch. Stock will be immediately credited to cashiers upon completion.
                  </p>
                </div>
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="text-xs font-black text-[#064e3b] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    {totalPieces} Pieces Total
                  </span>
                </div>
              </div>

              {/* Itemized Batch Manifest Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-stone-700 uppercase">
                  <span>Itemized Batch Output Manifest ({selectedBreads.length} Varieties)</span>
                  <span className="text-emerald-700 font-bold">Auto-Deposited to Cashier</span>
                </div>

                <div className="overflow-x-auto border border-stone-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Bread Variety</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Portion</th>
                        <th className="py-3 px-4 text-center">Pieces Baked</th>
                        <th className="py-3 px-4 text-right">Batch Dough Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {selectedBreads.map((b, idx) => {
                        const pieces = Number(b.pieces) || 0;
                        const weight = Number(b.weight_grams) || 100;
                        const weightKg = ((pieces * weight) / 1000).toFixed(1);
                        return (
                          <tr key={b.productId} className="hover:bg-emerald-50/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-stone-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-black text-stone-900">{b.name}</td>
                            <td className="py-3 px-4 text-stone-500">{b.category}</td>
                            <td className="py-3 px-4 text-center font-bold text-stone-700">{weight}g</td>
                            <td className="py-3 px-4 text-center font-black text-[#0E7452] text-sm">{pieces} pcs</td>
                            <td className="py-3 px-4 text-right font-black text-stone-800">{weightKg} kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-emerald-50/70 border-t-2 border-emerald-200 font-black text-xs text-stone-900">
                      <tr>
                        <td colSpan="4" className="py-3 px-4 uppercase text-[#064e3b]">Grand Batch Totals</td>
                        <td className="py-3 px-4 text-center text-[#0E7452] text-base">{totalPieces} pcs</td>
                        <td className="py-3 px-4 text-right text-stone-900 text-sm">{totalDoughRequiredKg} kg</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Consumed Ingredients Recap Pill Box */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider block">
                  Mixer Ingredients Consumed in This Batch:
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-stone-800">
                  <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">
                    🌾 Flour: <strong className="text-emerald-900 font-black">{flourKg} kg</strong>
                  </span>
                  <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">
                    🧪 Maj mix: <strong className="text-stone-900 font-black">{majMixGrams} g</strong>
                  </span>
                  <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">
                    🍞 Yeast: <strong className="text-stone-900 font-black">{yeastGrams} g</strong>
                  </span>
                  <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">
                    🧂 Salt: <strong className="text-stone-900 font-black">{saltGrams} g</strong>
                  </span>
                  {(isSameCategory(cookingCategory, 'Cookies') || isSameCategory(cookingCategory, 'Cake')) && (
                    <>
                      {sugarGrams && <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">🍬 Sugar: <strong>{sugarGrams} g</strong></span>}
                      {selitGrams && <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">🌱 Selit: <strong>{selitGrams} g</strong></span>}
                      {tekurAzmudGrams && <span className="bg-white border border-stone-200 px-3 py-1 rounded-xl shadow-2xs">🌿 Tekur azmud: <strong>{tekurAzmudGrams} g</strong></span>}
                    </>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleFinishBaking}
                disabled={isSubmitting || totalPieces <= 0}
                className="w-full py-5 rounded-3xl bg-[#0E7452] hover:bg-[#0A573D] text-white font-black text-lg sm:text-xl shadow-xl shadow-[#0E7452]/20 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-200 shrink-0" />
                <span className="truncate">
                  {isSubmitting 
                    ? 'Recording Batch & Stock...' 
                    : `🥖 COMPLETE BAKING & TRANSFER ${totalPieces} PCS TO CASHIER`}
                </span>
              </button>

              {/* Back to Step 3 */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => jumpToStep(3)}
                  className="text-stone-500 hover:text-stone-900 text-xs font-black inline-flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Varieties & Weights</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick 1-Tap Recipe Presets Row (Moved to Bottom) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-4 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-extrabold text-amber-950">
                  ⚡ 1-Tap Quick Recipe Presets (Autofill Entire Batch):
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-800">Tap to load preset</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {defaultPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-white hover:bg-amber-100/60 border border-amber-300 text-stone-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <span>{preset.label}</span>
                </button>
              ))}

              {/* Admin custom suggestions */}
              {bakerSuggestions.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => {
                    if (sug.payload) {
                      handleApplyPreset({
                        label: sug.title || sug.label,
                        cat: sug.payload.category || 'Bread',
                        flour: String(sug.payload.flour_kg || 35),
                        maj: String(sug.payload.maj_g || 500),
                        yeast: String(sug.payload.yeast_g || 250),
                        salt: String(sug.payload.salt_g || 500),
                        weight: String(sug.payload.dough_weight_g || 100),
                        pieces: sug.payload.pieces_produced || 500
                      });
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{sug.title || sug.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PRODUCTION BATCH RECORDS & HISTORY */}
      {/* ======================================================== */}
      {bakerTab === 'history' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#064e3b]" />
              <h2 className="text-base font-black text-stone-900">
                Production Batch Records ({todayBatches.length})
              </h2>
            </div>
            
            {/* Filter: Today vs All */}
            <div className="flex items-center p-1 bg-stone-100 rounded-2xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setHistoryFilter('today')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  historyFilter === 'today' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Today Only
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  historyFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                All Records
              </button>
            </div>
          </div>

          {todayBatches.length === 0 ? (
            <div className="text-center py-16 text-stone-400 font-bold text-sm bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              No production batches recorded yet {historyFilter === 'today' ? 'today' : 'in system'}.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Batch #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Pieces</th>
                    <th className="py-3 px-4 text-right">Total Weight</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {todayBatches.map((b) => (
                    <tr key={b.id || b.batch_number} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-900">{b.batch_number}</td>
                      <td className="py-3 px-4 text-stone-600">
                        {b.production_date} <span className="text-stone-400">{b.production_time}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-stone-900">
                        {b.items && b.items.length > 0 ? (
                          <div className="space-y-1">
                            <div className="font-black text-stone-900 flex flex-wrap gap-1 items-center">
                              {b.items.map((it, idx) => (
                                <span key={idx} className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                  {it.pieces_produced}x {it.product_name}
                                </span>
                              ))}
                            </div>
                            <div className="text-[10px] text-stone-400 font-semibold">
                              {b.items.length} varieties combined
                            </div>
                          </div>
                        ) : (
                          b.product_name
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-[#0E7452] text-sm">{b.pieces_produced}</td>
                      <td className="py-3 px-4 text-right font-black text-stone-800">
                        {b.total_weight_grams ? (b.total_weight_grams / 1000).toFixed(1) + ' kg' : `${((b.pieces_produced * 100) / 1000).toFixed(1)} kg`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          b.status === 'edited' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedBatchDetails(b)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="View Batch Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {b.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBatch(b);
                              setEditPieces(b.pieces_produced);
                              setEditReason('');
                            }}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Edit Pieces Produced"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STORE INGREDIENTS STOCK */}
      {/* ======================================================== */}
      {bakerTab === 'stock' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-[#064e3b]" />
              <h2 className="text-base font-black text-stone-900">
                Live Store Ingredients Availability ({rawMaterials.length} Items)
              </h2>
            </div>
            <span className="text-xs font-bold text-stone-400">
              Deducted automatically by baking batches
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {rawMaterials.map((mat) => {
              const isLow = mat.current_quantity <= mat.minimum_stock;
              return (
                <div 
                  key={mat.id || mat.name}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isLow 
                      ? 'bg-rose-50/60 border-rose-300 text-rose-950' 
                      : 'bg-stone-50 border-stone-200 text-stone-900 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black truncate">{mat.name}</span>
                    {isLow ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline space-x-1">
                    <span className={`text-2xl font-black ${isLow ? 'text-rose-700' : 'text-[#064e3b]'}`}>
                      {mat.current_quantity}
                    </span>
                    <span className="text-xs font-bold text-stone-500">{mat.unit}</span>
                  </div>
                  <div className="text-[11px] font-bold text-stone-500 mt-1 flex items-center justify-between border-t border-stone-200/60 pt-1">
                    <span>Min Threshold:</span>
                    <span className={isLow ? 'text-rose-700 font-black' : 'text-stone-700'}>
                      {mat.minimum_stock} {mat.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW BATCH DETAILS */}
      {/* ======================================================== */}
      {selectedBatchDetails && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-xs font-mono font-bold text-[#064e3b]">{selectedBatchDetails.batch_number}</span>
                <h3 className="text-lg font-black text-stone-900">{selectedBatchDetails.product_name}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBatchDetails(null)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl">
              <div>
                <span className="text-stone-500">Baker:</span> <strong className="text-stone-900 block">{selectedBatchDetails.baker_name}</strong>
              </div>
              <div>
                <span className="text-stone-500">Recorded:</span> <strong className="text-stone-900 block">{selectedBatchDetails.production_date} {selectedBatchDetails.production_time}</strong>
              </div>
              <div>
                <span className="text-stone-500">Pieces Produced:</span> <strong className="text-[#0E7452] text-sm block">{selectedBatchDetails.pieces_produced} pcs</strong>
              </div>
              <div>
                <span className="text-stone-500">Batch Output Weight:</span> <strong className="text-stone-900 block">{selectedBatchDetails.total_weight_grams ? (selectedBatchDetails.total_weight_grams / 1000).toFixed(1) + ' kg' : 'N/A'}</strong>
              </div>
            </div>

            {/* Itemized Varieties Breakdown if Multi-bread batch */}
            {selectedBatchDetails.items && selectedBatchDetails.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black text-stone-700 uppercase">
                  Itemized Varieties in Batch ({selectedBatchDetails.items.length}):
                </span>
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 divide-y divide-stone-200 text-xs">
                  {selectedBatchDetails.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-black text-stone-900">{item.product_name}</div>
                        <div className="text-[11px] text-stone-500 font-medium">
                          {item.dough_weight_grams}g portion
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-[#0E7452] text-sm">{item.pieces_produced} pcs</div>
                        <div className="text-[11px] text-stone-500 font-semibold">
                          {(item.total_weight_grams / 1000).toFixed(1)} kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-black text-stone-700 uppercase">Ingredients Consumed:</span>
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3 divide-y divide-emerald-100 text-xs">
                {selectedBatchDetails.ingredients_consumed?.map((ing, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <span className="font-bold text-stone-800">{ing.name}</span>
                    <span className="font-black text-[#064e3b]">{ing.quantity} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBatchDetails(null)}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT BATCH PIECES PRODUCED */}
      {/* ======================================================== */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditBatch} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-xs font-mono font-bold text-blue-700">Correct Batch #{editingBatch.batch_number}</span>
                <h3 className="text-base font-black text-stone-900">{editingBatch.product_name}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setEditingBatch(null)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                  Corrected Pieces Produced:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPieces}
                  onChange={(e) => setEditPieces(e.target.value)}
                  className="w-full text-2xl font-black text-[#064e3b] border-2 border-stone-300 rounded-xl p-3 focus:border-[#064e3b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                  Reason for Correction (Required for Audit):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Typo during entry, recount confirmed"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full text-xs font-bold text-stone-900 border border-stone-300 rounded-xl p-3 focus:border-[#064e3b] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editReason || Number(editPieces) <= 0}
                className="flex-1 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#043729] text-white font-black text-xs cursor-pointer disabled:opacity-50"
              >
                Save Correction
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
