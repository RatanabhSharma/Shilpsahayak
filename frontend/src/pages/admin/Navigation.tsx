import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Loader2, Plus, Trash2, GripVertical,
  ChevronDown, ChevronRight, AlertTriangle, Globe, Lock
} from 'lucide-react';
import {
  useNavigationConfig,
  useUpdateNavigationConfig,
  DEFAULT_NAVIGATION_CONFIG,
} from '../../hooks/useNavigation';
import type { NavLinkItem } from '../../types/settingsConfig';
import { useNotification } from '../../components/NotificationContext';
import { Button, Input } from '../../components/ui';

// Routes that must not be deleted from header nav (system-critical)
const PROTECTED_HEADER_HREFS = new Set(['/', '/shop', '/shilp-studio']);

function emptyLink(): NavLinkItem {
  return { id: `link-${Date.now()}`, label: '', href: '' };
}

/* -------------------------------------------------------------------------- */
/* Inline editable link list                                                   */
/* -------------------------------------------------------------------------- */
interface LinkListProps {
  title: string;
  links: NavLinkItem[];
  onChange: (updated: NavLinkItem[]) => void;
  protectedHrefs?: Set<string>;
}

function LinkList({ title, links, onChange, protectedHrefs }: LinkListProps) {
  const add = () => onChange([...links, emptyLink()]);

  const update = (idx: number, field: keyof NavLinkItem, value: string | boolean) => {
    const next = links.map((l, i) => (i === idx ? { ...l, [field]: value } : l));
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(links.filter((_, i) => i !== idx));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...links];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === links.length - 1) return;
    const next = [...links];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">{title}</h2>
        <Button variant="secondary" size="sm" type="button" onClick={add} className="flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Link
        </Button>
      </div>

      <div className="space-y-2">
        {links.length === 0 && (
          <p className="text-xs text-muted font-sans italic py-3 text-center">No links configured. Click "Add Link" to start.</p>
        )}
        {links.map((link, idx) => {
          const isProtected = protectedHrefs?.has(link.href);
          return (
            <div
              key={link.id}
              className="flex items-center gap-2 rounded-xl border border-line bg-shell p-2.5"
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-0.5 text-muted hover:text-ink disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                </button>
                <button type="button" onClick={() => moveDown(idx)} disabled={idx === links.length - 1}
                  className="p-0.5 text-muted hover:text-ink disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </button>
              </div>

              <GripVertical className="w-4 h-4 text-muted/40 shrink-0 hidden sm:block" />

              {/* Label */}
              <input
                type="text"
                placeholder="Label"
                value={link.label}
                onChange={(e) => update(idx, 'label', e.target.value)}
                className="flex-1 min-w-0 bg-white border border-line rounded-lg px-3 py-1.5 text-xs font-sans text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />

              {/* Href */}
              <input
                type="text"
                placeholder="/path or https://..."
                value={link.href}
                onChange={(e) => update(idx, 'href', e.target.value)}
                className="flex-[2] min-w-0 bg-white border border-line rounded-lg px-3 py-1.5 text-xs font-mono text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />

              {/* Badge (optional) */}
              <input
                type="text"
                placeholder="Badge"
                value={link.badge || ''}
                onChange={(e) => update(idx, 'badge', e.target.value)}
                className="w-16 bg-white border border-line rounded-lg px-2 py-1.5 text-xs font-mono text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                title="Optional badge text (e.g. NEW, PRO)"
              />

              {/* External toggle */}
              <label title="Open in new tab" className="flex items-center gap-1 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!link.isExternal}
                  onChange={(e) => update(idx, 'isExternal', e.target.checked)}
                  className="rounded border-line accent-accent"
                />
                <Globe className="w-3.5 h-3.5 text-muted" />
              </label>

              {/* Delete */}
              {isProtected ? (
                <span title="Protected system route" className="shrink-0 p-1.5 text-amber-400">
                  <Lock className="w-4 h-4" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="shrink-0 p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Navigation CMS page                                                   */
/* -------------------------------------------------------------------------- */
export function Navigation() {
  const notify = useNotification();
  const { data: config, isLoading, isError, refetch } = useNavigationConfig();
  const updateConfig = useUpdateNavigationConfig();

  const [form, setForm] = useState(config ?? DEFAULT_NAVIGATION_CONFIG);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: protected header links must not have empty labels or be deleted
    for (const link of form.headerNav) {
      if (!link.label.trim()) {
        notify({ type: 'error', title: 'Validation Error', message: 'All header nav links must have a label.' });
        return;
      }
      if (!link.href.trim()) {
        notify({ type: 'error', title: 'Validation Error', message: 'All header nav links must have a path or URL.' });
        return;
      }
    }

    try {
      await updateConfig.mutateAsync(form);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      notify({ type: 'error', title: 'Save Failed', message: err?.message ?? 'Failed to save navigation settings.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading navigation…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center justify-between">
        <span>Failed to load navigation settings from Firestore.</span>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Storefront
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Navigation & Menus
          </h1>
          <p className="mt-1 text-xs text-muted font-sans">
            Manage header navigation and footer link columns. Changes go live on publish.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Published
            </span>
          )}
          <Button type="submit" form="navigation-form" isLoading={updateConfig.isPending}>
            Save & Publish
          </Button>
        </div>
      </div>

      {/* Protected routes advisory */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs font-sans text-amber-800 leading-relaxed">
          <strong>System-critical routes</strong> (<code>/</code>, <code>/shop</code>, <code>/shilp-studio</code>) are
          protected and cannot be deleted. They are marked with <Lock className="w-3 h-3 inline text-amber-500" />.
        </p>
      </div>

      <form id="navigation-form" onSubmit={handleSubmit} className="space-y-6 pb-10">
        <LinkList
          title="Header Navigation"
          links={form.headerNav}
          onChange={(updated) => setForm((f) => ({ ...f, headerNav: updated }))}
          protectedHrefs={PROTECTED_HEADER_HREFS}
        />

        <LinkList
          title="Footer — Collections"
          links={form.footerQuickLinks}
          onChange={(updated) => setForm((f) => ({ ...f, footerQuickLinks: updated }))}
        />

        <LinkList
          title="Footer — Studio"
          links={form.footerStudioLinks ?? []}
          onChange={(updated) => setForm((f) => ({ ...f, footerStudioLinks: updated }))}
        />

        <LinkList
          title="Footer — Support"
          links={form.footerSupportLinks}
          onChange={(updated) => setForm((f) => ({ ...f, footerSupportLinks: updated }))}
        />

        <LinkList
          title="Footer — Legal"
          links={form.footerLegalLinks}
          onChange={(updated) => setForm((f) => ({ ...f, footerLegalLinks: updated }))}
        />
      </form>
    </div>
  );
}
