import { useMemo, useState } from 'react';
import { Check, Copy, Edit3, Plus, Power, Save, Trash2, X } from 'lucide-react';
import { usePricingSettings, useUpdatePricingSettings } from '../../hooks/usePricingSettings';
import { DEFAULT_PRODUCTION_PRINTER_PROFILE } from '../../services/pricing/pricingConfig';
import type { ProductionPrinterProfile } from '../../services/pricing/pricingTypes';

const blankProfile = (): ProductionPrinterProfile => ({
  ...DEFAULT_PRODUCTION_PRINTER_PROFILE,
  id: `PRINTER-${Date.now()}`,
  displayName: '',
  manufacturer: '',
  model: '',
  printerProfileFile: '',
  enabled: false,
  defaultForProduction: false,
  materialProfileIds: [],
  machineParameters: {},
  updatedAt: new Date().toISOString(),
});

function validateProfile(profile: ProductionPrinterProfile, profiles: ProductionPrinterProfile[]) {
  const errors: string[] = [];
  if (!profile.id.trim() || !profile.manufacturer.trim() || !profile.model.trim() || !profile.displayName.trim()) errors.push('Identity is incomplete.');
  const duplicate = profiles.find((p) => p.id === profile.id && p !== profile);
  if (duplicate) errors.push(`Profile ID '${profile.id}' is already in use.`);
  if (!profile.printerProfileFile.trim() || !profile.slicerAdapter.trim() || !profile.slicerName.trim()) errors.push('Slicer configuration is incomplete.');
  if (profile.slicerAdapter === 'bambu_studio_cli' && (!profile.slicerSettingsId?.trim() || !profile.processSettingsId?.trim() || !profile.machineProfileFile.trim() || !profile.processProfileFile.trim())) errors.push('Bambu machine and process settings are required.');
  if (![profile.buildVolumeX, profile.buildVolumeY, profile.buildVolumeZ].every((value) => Number.isFinite(value) && value > 0)) errors.push('Build volume must be positive.');
  if (!Number.isFinite(profile.nozzleDiameter) || profile.nozzleDiameter <= 0) errors.push('Nozzle diameter must be positive.');
  if (!Number.isInteger(profile.extruderCount) || profile.extruderCount < 1) errors.push('Extruder count must be at least 1.');
  if (!Number.isFinite(profile.defaultLayerHeight) || profile.defaultLayerHeight <= 0) errors.push('Layer height must be positive.');
  if (!Number.isFinite(profile.defaultInfill) || profile.defaultInfill < 0 || profile.defaultInfill > 100) errors.push('Infill must be between 0 and 100.');
  if (!profile.profileVersion.trim()) errors.push('Profile version is required.');
  return errors;
}

export function PrinterProfilesTab() {
  const { data, isLoading } = usePricingSettings();
  const updateMutation = useUpdatePricingSettings();
  const [editing, setEditing] = useState<ProductionPrinterProfile | null>(null);
  const profiles = data?.productionPrinterProfiles || [];
  const errors = useMemo(() => editing ? validateProfile(editing, profiles) : [], [editing, profiles]);

  const saveProfiles = async (nextProfiles: ProductionPrinterProfile[]) => {
    const selected = nextProfiles.find((profile) => profile.enabled && profile.defaultForProduction) || nextProfiles.find((profile) => profile.enabled);
      nextProfiles = nextProfiles.map((profile) => ({ ...profile, defaultForProduction: Boolean(selected && profile.id === selected.id) }));
    await updateMutation.mutateAsync({
      productionPrinterProfiles: nextProfiles.map((profile) => ({ ...profile, updatedAt: new Date().toISOString() })),
      productionPrinterProfile: selected,
    });
  };

  const submitEditing = async () => {
    if (!editing || errors.length > 0 || (editing.enabled && (!editing.machineProfileFile || !editing.processProfileFile) && editing.slicerAdapter === 'bambu_studio_cli')) return;
    const existingIndex = profiles.findIndex((profile) => profile.id === editing.id);
    if (profiles.some((profile, index) => profile.id === editing.id && index !== existingIndex)) return;
    const exists = existingIndex >= 0;
    const nextProfiles = exists ? profiles.map((profile) => profile.id === editing.id ? editing : profile) : [...profiles, editing];
    await saveProfiles(nextProfiles);
    setEditing(null);
  };

  const toggleEnabled = async (profile: ProductionPrinterProfile) => {
    if (profile.enabled) {
      await saveProfiles(profiles.map((item) => item.id === profile.id ? { ...item, enabled: false, defaultForProduction: false } : item));
      return;
    }
    const profileErrors = validateProfile({ ...profile, enabled: true }, profiles);
    if (profileErrors.length > 0 || (profile.slicerAdapter === 'bambu_studio_cli' && (!profile.machineProfileFile || !profile.processProfileFile))) return;
    await saveProfiles(profiles.map((item) => item.id === profile.id ? { ...item, enabled: true } : item));
  };

  const setDefault = async (profile: ProductionPrinterProfile) => {
    if (!profile.enabled) return;
    await saveProfiles(profiles.map((item) => ({ ...item, defaultForProduction: item.id === profile.id })));
  };

  if (isLoading) return <div className="p-6 text-xs font-mono text-muted">Loading printer profiles...</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">Production configuration</span>
          <h2 className="mt-1 font-display text-xl font-bold text-ink">Printers & Production Profiles</h2>
          <p className="mt-1 text-xs text-muted">The enabled default profile is authoritative for production slicing and quoting.</p>
        </div>
        <button type="button" onClick={() => setEditing(blankProfile())} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">
          <Plus className="h-3.5 w-3.5" /> Add Printer
        </button>
      </div>

      <div className="space-y-3">
        {profiles.map((profile) => (
          <div key={profile.id} className={`border rounded-xl p-4 bg-white ${profile.defaultForProduction ? 'border-accent shadow-sm' : 'border-line'}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-ink">{profile.displayName}</h3>
                  {profile.defaultForProduction && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-mono font-bold text-accent">DEFAULT PRODUCTION</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${profile.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-shell text-muted'}`}>{profile.enabled ? 'ENABLED' : 'DISABLED'}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{profile.manufacturer} {profile.model} · {profile.nozzleDiameter} mm nozzle · {profile.buildVolumeX} × {profile.buildVolumeY} × {profile.buildVolumeZ} mm</p>
                <p className="mt-1 text-[10px] font-mono text-muted">{profile.id} · {profile.slicerAdapter} · {profile.printerSettingsId || profile.slicerSettingsId || 'settings ID missing'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button type="button" onClick={() => setDefault(profile)} disabled={!profile.enabled || profile.defaultForProduction} title="Mark default production printer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"><Check className="h-3.5 w-3.5" /> Default</button>
                <button type="button" onClick={() => toggleEnabled(profile)} title={profile.enabled ? 'Disable printer' : 'Enable printer'} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold"><Power className="h-3.5 w-3.5" /> {profile.enabled ? 'Disable' : 'Enable'}</button>
                <button type="button" onClick={() => setEditing(profile)} title="Edit printer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                <button type="button" onClick={() => setEditing({ ...profile, id: `${profile.id}-COPY`, displayName: `${profile.displayName} Copy`, defaultForProduction: false, enabled: false })} title="Duplicate printer profile" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
                <button type="button" onClick={() => { if (!profile.defaultForProduction && window.confirm(`Delete ${profile.displayName}?`)) void saveProfiles(profiles.filter((item) => item.id !== profile.id)); }} disabled={profile.defaultForProduction} title="Delete printer" className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  <button type="button" onClick={() => { if (profile.defaultForProduction && !profiles.some((item) => item.id !== profile.id && item.enabled)) return; if (window.confirm(`Delete ${profile.displayName}?`)) void saveProfiles(profiles.filter((item) => item.id !== profile.id)); }} disabled={profile.defaultForProduction && !profiles.some((item) => item.id !== profile.id && item.enabled)} title="Delete printer" className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="border border-accent/30 rounded-xl bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3"><h3 className="font-display font-bold text-ink">{profiles.some((profile) => profile.id === editing.id) ? 'Edit Printer Profile' : 'New Printer Profile'}</h3><button type="button" onClick={() => setEditing(null)} title="Close editor"><X className="h-4 w-4" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {(['id', 'manufacturer', 'model', 'displayName', 'slicerAdapter', 'slicerName', 'slicerVersion', 'printerSettingsId', 'processSettingsId', 'machineProfileFile', 'processProfileFile', 'printerProfileFile', 'profileVersion'] as const).map((field) => (
              <label key={field} className="space-y-1"><span className="block text-[10px] font-mono font-bold uppercase text-muted">{field}</span><input value={(editing[field] as string | undefined) || ''} onChange={(event) => setEditing({ ...editing, [field]: event.target.value })} className="w-full rounded-lg border border-line px-2.5 py-2 font-mono text-xs" /></label>
            ))}
            {(['buildVolumeX', 'buildVolumeY', 'buildVolumeZ', 'nozzleDiameter', 'extruderCount', 'defaultLayerHeight', 'defaultInfill'] as const).map((field) => (
              <label key={field} className="space-y-1"><span className="block text-[10px] font-mono font-bold uppercase text-muted">{field}</span><input type="number" value={editing[field]} onChange={(event) => setEditing({ ...editing, [field]: Number(event.target.value) })} className="w-full rounded-lg border border-line px-2.5 py-2 font-mono text-xs" /></label>
            ))}
            <label className="space-y-1"><span className="block text-[10px] font-mono font-bold uppercase text-muted">defaultSupportMode</span><select value={editing.defaultSupportMode} onChange={(event) => setEditing({ ...editing, defaultSupportMode: event.target.value })} className="w-full rounded-lg border border-line px-2.5 py-2 font-mono text-xs"><option value="auto">auto</option><option value="none">none</option><option value="required">required</option></select></label>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-semibold"><label className="flex items-center gap-2"><input type="checkbox" checked={editing.enabled} onChange={(event) => setEditing({ ...editing, enabled: event.target.checked })} /> Enabled</label><label className="flex items-center gap-2"><input type="checkbox" checked={editing.defaultForProduction} onChange={(event) => setEditing({ ...editing, defaultForProduction: event.target.checked })} /> Default for production</label><label className="flex items-center gap-2"><input type="checkbox" checked={editing.supportsMulticolor} onChange={(event) => setEditing({ ...editing, supportsMulticolor: event.target.checked })} /> Supports multicolor</label></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1"><span className="block text-[10px] font-mono font-bold uppercase text-muted">materialProfileIds (comma separated)</span><input value={editing.materialProfileIds.join(', ')} onChange={(event) => setEditing({ ...editing, materialProfileIds: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} className="w-full rounded-lg border border-line px-2.5 py-2 font-mono text-xs" /></label>
            <label className="space-y-1 md:col-span-2"><span className="block text-[10px] font-mono font-bold uppercase text-muted">machineParameters (JSON)</span><textarea rows={2} value={JSON.stringify(editing.machineParameters)} onChange={(event) => { try { setEditing({ ...editing, machineParameters: JSON.parse(event.target.value) }); } catch {} }} className="w-full rounded-lg border border-line px-2.5 py-2 font-mono text-xs" /></label>
          </div>
          {errors.length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errors.join(' ')}</div>}
          {editing.enabled && (!editing.machineProfileFile || !editing.processProfileFile) && editing.slicerAdapter === 'bambu_studio_cli' && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">A Bambu production profile requires machine and process profile files.</div>}
          <button type="button" onClick={() => void submitEditing()} disabled={updateMutation.isPending || errors.length > 0} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save Profile</button>
        </div>
      )}
    </div>
  );
}
