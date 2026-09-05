import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Loader2,
  CheckCircle2,
  Cpu,
  Clock,
  Layers,
  Calculator,
} from 'lucide-react';
import { usePricingSettings, useUpdatePricingSettings } from '../../hooks/usePricingSettings';
import {
  MachinePricingConfig,
  MaterialConfig,
} from '../../services/pricing/pricingTypes';
import {
  calculateInternalCost,
  calculateCustomerQuote,
} from '../../services/pricing/calculateQuote';
import { formatINR } from '../../services/pricing/pricingUtils';

export function PricingSettingsTab() {
  const { data: storedData, isLoading, isError } = usePricingSettings();
  const updateMutation = useUpdatePricingSettings();

  const [pricingConfig, setPricingConfig] = useState<MachinePricingConfig>(
    storedData.pricingConfig
  );
  const [materials, setMaterials] = useState<MaterialConfig[]>(
    storedData.materials
  );
  const [showSaved, setShowSaved] = useState(false);

  // Live Simulator state
  const [simWeight, setSimWeight] = useState<number>(50);
  const [simHours, setSimHours] = useState<number>(4);
  const [simMaterialId, setSimMaterialId] = useState<string>('pla');
  const [simQuantity, setSimQuantity] = useState<number>(1);
  const [simPackaging, setSimPackaging] = useState<boolean>(false);

  useEffect(() => {
    if (storedData) {
      setPricingConfig(storedData.pricingConfig);
      setMaterials(storedData.materials);
    }
  }, [storedData]);

  const updateConfigField = <K extends keyof MachinePricingConfig>(
    field: K,
    val: MachinePricingConfig[K]
  ) => {
    setPricingConfig((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const updateMaterialField = (
    id: string,
    field: keyof MaterialConfig,
    val: any
  ) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        pricingConfig,
        materials,
        printProfiles: storedData.printProfiles,
        quantityDiscounts: storedData.quantityDiscounts,
        pricingVersion: storedData.pricingVersion,
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save pricing configuration:', err);
      alert('Failed to save pricing settings.');
    }
  };

  // Run live simulator using the same pure pricing engine
  const simMaterial = useMemo(() => {
    return materials.find((m) => m.id === simMaterialId) || materials[0];
  }, [materials, simMaterialId]);

  const simInternal = useMemo(() => {
    return calculateInternalCost(
      {
        materialWeightGrams: simWeight,
        printTimeHours: simHours,
        material: simMaterial,
        quantity: simQuantity,
        packagingIncluded: simPackaging,
      },
      pricingConfig
    );
  }, [simWeight, simHours, simMaterial, simQuantity, simPackaging, pricingConfig]);

  const simQuote = useMemo(() => {
    return calculateCustomerQuote(
      {
        materialWeightGrams: simWeight,
        printTimeHours: simHours,
        material: simMaterial,
        quantity: simQuantity,
        packagingIncluded: simPackaging,
      },
      pricingConfig,
      storedData.quantityDiscounts
    );
  }, [
    simWeight,
    simHours,
    simMaterial,
    simQuantity,
    simPackaging,
    pricingConfig,
    storedData.quantityDiscounts,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted">Loading pricing engine...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
        Failed to load pricing engine configuration.
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Manufacturing & Costing Logic
          </span>
          <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-ink">
            3D Printing Pricing Engine
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Configure machine amortization, power costs, material rates, and markups.
            Updates take effect immediately on customer estimates without redeploying code.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {showSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Firestore
            </span>
          )}
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Pricing Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Costing Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Machine & Depreciation Card */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <Cpu className="w-4 h-4 text-accent" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Machine & Power Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Printer Purchase Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={pricingConfig.printerCost}
                  onChange={(e) => updateConfigField('printerCost', Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
                <span className="text-[10px] text-muted font-mono mt-0.5 block">
                  e.g. ₹25,000 for standard CoreXY / Bedslinger
                </span>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Printer Lifespan (Hours)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={pricingConfig.printerLifespanHours}
                  onChange={(e) =>
                    updateConfigField('printerLifespanHours', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
                <span className="text-[10px] text-muted font-mono mt-0.5 block">
                  Machine wear = ₹
                  {Math.round(
                    (pricingConfig.printerCost / pricingConfig.printerLifespanHours) * 100
                  ) / 100}
                  /hr
                </span>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Printer Power (Watts)
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={pricingConfig.printerPowerWatts}
                  onChange={(e) =>
                    updateConfigField('printerPowerWatts', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
                <span className="text-[10px] text-muted font-mono mt-0.5 block">
                  Average hotend & bed load (100W = 0.1 kW)
                </span>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Electricity Rate (₹ per kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={pricingConfig.electricityRatePerKwh}
                  onChange={(e) =>
                    updateConfigField('electricityRatePerKwh', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
                <span className="text-[10px] text-muted font-mono mt-0.5 block">
                  Commercial electricity tariff per unit
                </span>
              </div>
            </div>
          </div>

          {/* Operations, Labor & Margins Card */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <Clock className="w-4 h-4 text-accent" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Labour, Overhead & Business Rules
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Operator Labour (₹/hr)
                </label>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={pricingConfig.labourRatePerHour}
                  onChange={(e) =>
                    updateConfigField('labourRatePerHour', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Finishing Time (Mins)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={pricingConfig.finishingMinutes}
                  onChange={(e) =>
                    updateConfigField('finishingMinutes', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Failure Buffer (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={pricingConfig.failureBufferPercent}
                  onChange={(e) =>
                    updateConfigField('failureBufferPercent', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Base Service Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={pricingConfig.baseServiceFee}
                  onChange={(e) => updateConfigField('baseServiceFee', Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Markup Multiplier (x)
                </label>
                <input
                  type="number"
                  min="1.0"
                  step="0.1"
                  value={pricingConfig.markupMultiplier}
                  onChange={(e) =>
                    updateConfigField('markupMultiplier', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Min. Order Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={pricingConfig.minimumOrderValue}
                  onChange={(e) =>
                    updateConfigField('minimumOrderValue', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Taxes & Packaging Row */}
            <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Packaging Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={pricingConfig.packagingPrice}
                  onChange={(e) => updateConfigField('packagingPrice', Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  GST Tax Status
                </label>
                <select
                  value={pricingConfig.gstEnabled ? 'enabled' : 'disabled'}
                  onChange={(e) =>
                    updateConfigField('gstEnabled', e.target.value === 'enabled')
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                >
                  <option value="disabled">Disabled (₹0 Tax)</option>
                  <option value="enabled">Enabled</option>
                </select>
              </div>

              {pricingConfig.gstEnabled && (
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    step="1"
                    value={pricingConfig.gstRate}
                    onChange={(e) => updateConfigField('gstRate', Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Material Pricing Table */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                  Material Pricing (₹/gram)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted">Config only · No inventory</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-line text-[10px] font-mono text-muted uppercase">
                    <th className="pb-2">Material</th>
                    <th className="pb-2">Price (₹/g)</th>
                    <th className="pb-2">Density (g/cm³)</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-shell/40">
                      <td className="py-2.5 font-bold font-display text-ink">{mat.name}</td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={mat.pricePerGram}
                          onChange={(e) =>
                            updateMaterialField(mat.id, 'pricePerGram', Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-xs font-mono border border-line rounded bg-white"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0.5"
                          value={mat.density}
                          onChange={(e) =>
                            updateMaterialField(mat.id, 'density', Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-xs font-mono border border-line rounded bg-white"
                        />
                      </td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => updateMaterialField(mat.id, 'enabled', !mat.enabled)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            mat.enabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {mat.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: SIAS 3D Inspired Cost Simulator Receipt */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border-2 border-line bg-[#FFFDF7] p-5 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-accent" />
                <h3 className="font-display font-bold text-base text-ink uppercase tracking-tight">
                  Real Cost & Profit Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-200 px-2 py-0.5 rounded text-ink">
                LIVE
              </span>
            </div>

            {/* Test Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-muted block mb-1">
                  Test Weight (g)
                </label>
                <input
                  type="number"
                  min="1"
                  value={simWeight}
                  onChange={(e) => setSimWeight(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-ink bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-muted block mb-1">
                  Print Time (hrs)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={simHours}
                  onChange={(e) => setSimHours(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-ink bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-muted block mb-1">
                  Material
                </label>
                <select
                  value={simMaterialId}
                  onChange={(e) => setSimMaterialId(e.target.value)}
                  className="w-full px-2 py-1.5 font-mono text-xs border border-ink bg-white"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.pricePerGram}/g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-muted block mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-ink bg-white"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="simPackaging"
                  checked={simPackaging}
                  onChange={(e) => setSimPackaging(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
                />
                <label htmlFor="simPackaging" className="text-xs text-ink font-mono cursor-pointer">
                  Include Packaging (+₹{pricingConfig.packagingPrice})
                </label>
              </div>
            </div>

            {/* Big Selling Price Callout */}
            <div className="bg-amber-100 border-2 border-ink p-4 text-center rounded-lg space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-900 block">
                Customer Selling Price
              </span>
              <div className="font-display text-4xl font-bold text-ink">
                {formatINR(simQuote.totalPrice)}
              </div>
              <p className="text-xs text-amber-900 font-sans">
                Real cost <b className="font-mono">{formatINR(simInternal.productionCost)}</b> · Profit{' '}
                <b className="font-mono">
                  {formatINR(simInternal.sellingPriceBeforeDiscount - simInternal.productionCost)}
                </b>{' '}
                per piece
              </p>
            </div>

            {/* SIAS 3D Styled Internal Cost Receipt */}
            <div className="border border-line bg-white p-4 rounded-lg space-y-2 text-xs font-mono">
              <h4 className="font-bold text-ink border-b border-dashed border-line pb-1.5 uppercase text-[11px]">
                Where the real cost comes from
              </h4>

              <div className="flex justify-between">
                <span className="text-muted">Plastic ({simWeight}g)</span>
                <span>{formatINR(simInternal.materialCost)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Electricity ({simHours}h)</span>
                <span>{formatINR(simInternal.electricityCost)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Machine wear</span>
                <span>{formatINR(simInternal.machineWearCost)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Failure buffer ({pricingConfig.failureBufferPercent}%)</span>
                <span>{formatINR(simInternal.failureBufferCost)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Finishing time</span>
                <span>{formatINR(simInternal.labourCost)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Base prep fee</span>
                <span>{formatINR(simInternal.baseServiceFee)}</span>
              </div>

              {simPackaging && (
                <div className="flex justify-between">
                  <span className="text-muted">Packaging</span>
                  <span>{formatINR(simInternal.packagingCost)}</span>
                </div>
              )}

              <div className="pt-2 border-t-2 border-ink flex justify-between font-bold text-ink text-sm">
                <span>Total Production Cost</span>
                <span>{formatINR(simInternal.productionCost)}</span>
              </div>
            </div>

            {/* Breakeven Analytics */}
            {simInternal.breakevenPieces && (
              <p className="text-[11px] font-sans text-muted text-center">
                Sell <b className="text-ink">{simInternal.breakevenPieces} pieces</b> at this price and
                the printer has completely paid for itself.
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
