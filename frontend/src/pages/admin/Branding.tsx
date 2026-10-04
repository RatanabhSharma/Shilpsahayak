import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useBrandingConfig, useUpdateBrandingConfig } from '../../hooks/useBranding';
import { useNotification } from '../../components/NotificationContext';
import { Button, Input } from '../../components/ui';
import { uploadProductImage } from '../../utils/uploadFile';

export function Branding() {
  const notify = useNotification();
  const { data: config, isLoading, isError, refetch } = useBrandingConfig();
  const updateConfig = useUpdateBrandingConfig();

  const [form, setForm] = useState(config || {
    primaryLogoUrl: '',
    darkLogoUrl: '',
    faviconUrl: '',
    symbolIconUrl: '',
    primaryColorHex: '#6d28d9',
    accentColorHex: '#a855f7',
    brandTagline: '',
    socialLinks: { instagram: '', whatsapp: '', youtube: '', linkedin: '', twitter: '', github: '' },
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(prev => ({ ...prev, [field]: true }));
    try {
      const url = await uploadProductImage(file);
      setForm(prev => ({ ...prev, [field]: url }));
      notify({ type: 'success', title: 'Upload Successful', message: 'Asset uploaded successfully.' });
    } catch (error: any) {
      notify({ type: 'error', title: 'Upload Failed', message: error.message || 'Failed to upload asset.' });
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }));
      if (e.target) e.target.value = '';
    }
  };

  const handleRemove = (field: string) => {
    setForm(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig.mutateAsync(form as any);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      notify({ type: 'error', title: 'Save Failed', message: 'Failed to update branding settings.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading branding...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center justify-between">
        <span>Failed to load branding settings from Firestore.</span>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Storefront
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Branding & Assets
          </h1>
          <p className="mt-1 text-xs text-muted font-sans">
            Manage your brand identity, logos, colors, and social presence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Published
            </span>
          )}
          <Button type="submit" form="branding-form" isLoading={updateConfig.isPending} className="w-full sm:w-auto">
            Save & Publish
          </Button>
        </div>
      </div>

      <form id="branding-form" onSubmit={handleSubmit} className="space-y-8 font-sans pb-10">
        
        {/* Core Identity */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono mb-4">Core Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Primary Logo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">Primary Logo</label>
              <div className="flex flex-col gap-3">
                {form.primaryLogoUrl ? (
                  <div className="relative group rounded-xl border border-line bg-shell flex items-center justify-center p-4 min-h-[120px]">
                    <img src={form.primaryLogoUrl} alt="Primary Logo" className="max-h-20 object-contain" />
                    <button type="button" onClick={() => handleRemove('primaryLogoUrl')} className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow-sm border border-line opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-shell flex flex-col items-center justify-center p-6 min-h-[120px]">
                    <ImageIcon className="w-6 h-6 text-muted mb-2" />
                    <span className="text-xs text-muted">No primary logo set</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="https://..." 
                    value={form.primaryLogoUrl} 
                    onChange={e => setForm({...form, primaryLogoUrl: e.target.value})}
                    className="flex-1"
                  />
                  <div className="relative shrink-0">
                    <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'primaryLogoUrl')} className="absolute inset-0 opacity-0 cursor-pointer w-full" disabled={isUploading.primaryLogoUrl} />
                    <Button variant="secondary" type="button" isLoading={isUploading.primaryLogoUrl}>Upload</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark Logo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">Dark Logo (Optional)</label>
              <div className="flex flex-col gap-3">
                {form.darkLogoUrl ? (
                  <div className="relative group rounded-xl border border-zinc-700 bg-zinc-900 flex items-center justify-center p-4 min-h-[120px]">
                    <img src={form.darkLogoUrl} alt="Dark Logo" className="max-h-20 object-contain" />
                    <button type="button" onClick={() => handleRemove('darkLogoUrl')} className="absolute top-2 right-2 p-1.5 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-zinc-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-shell flex flex-col items-center justify-center p-6 min-h-[120px]">
                    <ImageIcon className="w-6 h-6 text-muted mb-2" />
                    <span className="text-xs text-muted">No dark logo set</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="https://..." 
                    value={form.darkLogoUrl} 
                    onChange={e => setForm({...form, darkLogoUrl: e.target.value})}
                    className="flex-1"
                  />
                  <div className="relative shrink-0">
                    <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'darkLogoUrl')} className="absolute inset-0 opacity-0 cursor-pointer w-full" disabled={isUploading.darkLogoUrl} />
                    <Button variant="secondary" type="button" isLoading={isUploading.darkLogoUrl}>Upload</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Favicon */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">Favicon (Browser Tab Icon)</label>
              <div className="flex flex-col gap-3">
                {form.faviconUrl ? (
                  <div className="relative group rounded-xl border border-line bg-shell flex items-center justify-center p-4 min-h-[120px]">
                    <img src={form.faviconUrl} alt="Favicon" className="h-10 w-10 object-contain rounded-md" />
                    <button type="button" onClick={() => handleRemove('faviconUrl')} className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow-sm border border-line opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-shell flex flex-col items-center justify-center p-6 min-h-[120px]">
                    <ImageIcon className="w-6 h-6 text-muted mb-2" />
                    <span className="text-xs text-muted">Default favicon (/images/logo.png)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="https://..." 
                    value={form.faviconUrl || ''} 
                    onChange={e => setForm({...form, faviconUrl: e.target.value})}
                    className="flex-1"
                  />
                  <div className="relative shrink-0">
                    <Input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg,image/webp,.ico" onChange={(e) => handleUpload(e, 'faviconUrl')} className="absolute inset-0 opacity-0 cursor-pointer w-full" disabled={isUploading.faviconUrl} />
                    <Button variant="secondary" type="button" isLoading={isUploading.faviconUrl}>Upload</Button>
                  </div>
                </div>
              </div>
            </div>

            <Input label="Brand Tagline" placeholder="If you can imagine it, we can print it." value={form.brandTagline || ''} onChange={e => setForm({...form, brandTagline: e.target.value})} className="sm:col-span-2" />
          </div>
        </section>

        {/* Social Links */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono mb-4">Social Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Instagram" placeholder="https://instagram.com/..." value={form.socialLinks?.instagram || ''} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, instagram: e.target.value}})} />
            <Input label="WhatsApp" placeholder="https://wa.me/..." value={form.socialLinks?.whatsapp || ''} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, whatsapp: e.target.value}})} />
            <Input label="YouTube" placeholder="https://youtube.com/..." value={form.socialLinks?.youtube || ''} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, youtube: e.target.value}})} />
            <Input label="LinkedIn" placeholder="https://linkedin.com/in/..." value={form.socialLinks?.linkedin || ''} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, linkedin: e.target.value}})} />
            <Input label="Twitter / X" placeholder="https://x.com/..." value={form.socialLinks?.twitter || ''} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, twitter: e.target.value}})} />
            <Input label="GitHub" placeholder="https://github.com/..." value={form.socialLinks?.github || ''} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, github: e.target.value}})} />
          </div>
        </section>

      </form>
    </div>
  );
}
