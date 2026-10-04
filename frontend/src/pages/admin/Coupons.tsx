import { useState } from 'react';
import { Tag, Plus, Edit, Trash2, Power, Search } from 'lucide-react';
import { useCoupons, useAddCoupon, useUpdateCoupon, useDeleteCoupon, Coupon } from '../../hooks/useCoupons';
import { PageHeader } from '../../components/admin/shared/PageHeader';
import { LoadingState } from '../../components/admin/shared/LoadingState';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ConfirmationDialog } from '../../components/admin/shared/ConfirmationDialog';
import { toast } from 'react-hot-toast';
import { formatINR } from '../../services/pricing/pricingUtils';

export function Coupons() {
  const { data: coupons = [], isLoading, isError, refetch } = useCoupons();
  const addCoupon = useAddCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Coupon | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping',
    discountValue: 0,
    minimumOrderValue: 0,
    maximumDiscountAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalUsageLimit: 0,
    perCustomerLimit: 1,
    active: true,
  });

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) || 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        name: coupon.name,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumOrderValue: coupon.minimumOrderValue || 0,
        maximumDiscountAmount: coupon.maximumDiscountAmount || 0,
        startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
        endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
        totalUsageLimit: coupon.totalUsageLimit || 0,
        perCustomerLimit: coupon.perCustomerLimit || 1,
        active: coupon.active,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        minimumOrderValue: 0,
        maximumDiscountAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        totalUsageLimit: 0,
        perCustomerLimit: 1,
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || (formData.discountType !== 'free_shipping' && formData.discountValue <= 0)) {
      toast.error('Please fill required fields (Code, Name, Valid Discount Value)');
      return;
    }

    if (formData.discountType === 'percentage' && (formData.discountValue < 0 || formData.discountValue > 100)) {
      toast.error('Percentage discount must be between 0 and 100');
      return;
    }

    try {
      const payload: any = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
      };

      if (formData.endDate) {
        payload.endDate = new Date(formData.endDate).toISOString();
      } else {
        delete payload.endDate;
      }

      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, data: payload });
        toast.success('Coupon updated');
      } else {
        await addCoupon.mutateAsync(payload as any);
        toast.success('Coupon created');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon.mutateAsync({ id: coupon.id, data: { active: !coupon.active } });
      toast.success(coupon.active ? 'Coupon deactivated' : 'Coupon activated');
    } catch (err: any) {
      toast.error('Failed to toggle coupon');
    }
  };

  if (isLoading) return <LoadingState message="Loading Coupons..." />;
  if (isError) return <div className="text-rose-500">Failed to load coupons. <button onClick={() => refetch()}>Retry</button></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons & Discounts"
        description="Manage promotional codes, discounts, and usage limits."
        breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Coupons' }]}
        actions={
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-xs hover:bg-accent-dark"
          >
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        }
      />

      <div className="bg-white p-4 rounded-xl border border-line shadow-xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-lg outline-none focus:border-accent"
          />
        </div>
      </div>

      {filteredCoupons.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No Coupons Found"
          description="Create your first discount code to offer promotions to your customers."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => (
            <div key={coupon.id} className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col ${coupon.active ? 'border-line' : 'border-line bg-shell/50 opacity-80'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-mono font-bold text-lg text-ink uppercase">{coupon.code}</h3>
                  <p className="font-sans text-sm font-semibold text-ink">{coupon.name}</p>
                </div>
                <button
                  onClick={() => handleToggleActive(coupon)}
                  className={`p-1.5 rounded-lg border ${coupon.active ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-shell text-muted border-line hover:bg-line'}`}
                  title={coupon.active ? 'Deactivate' : 'Activate'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 mb-4 flex-1 font-sans text-xs text-muted">
                <p><span className="font-semibold text-ink">Type:</span> {coupon.discountType.replace('_', ' ')}</p>
                <p><span className="font-semibold text-ink">Value:</span> {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatINR(coupon.discountValue)}</p>
                {coupon.minimumOrderValue ? <p><span className="font-semibold text-ink">Min Order:</span> {formatINR(coupon.minimumOrderValue)}</p> : null}
                <p><span className="font-semibold text-ink">Uses:</span> {coupon.currentUsageCount} {coupon.totalUsageLimit ? `/ ${coupon.totalUsageLimit}` : ''}</p>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-3 mt-auto">
                <button onClick={() => handleOpenModal(coupon)} className="p-2 text-muted hover:text-accent hover:bg-shell rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteConfirm(coupon)} className="p-2 text-muted hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-line shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-line flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-ink">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink"><XIcon /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 font-sans text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Coupon Code *</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent font-mono uppercase" placeholder="e.g. SAVE20" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Internal Name *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" placeholder="Summer Sale" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Description (Internal)</label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Discount Type *</label>
                  <select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value as any })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                {formData.discountType !== 'free_shipping' && (
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Discount Value *</label>
                    <input type="number" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: Number(e.target.value) })} min={0} max={formData.discountType === 'percentage' ? 100 : undefined} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Min Order Value (₹)</label>
                  <input type="number" value={formData.minimumOrderValue} onChange={e => setFormData({ ...formData, minimumOrderValue: Number(e.target.value) })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" placeholder="0 for none" />
                </div>
                {formData.discountType === 'percentage' && (
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Max Discount (₹)</label>
                    <input type="number" value={formData.maximumDiscountAmount} onChange={e => setFormData({ ...formData, maximumDiscountAmount: Number(e.target.value) })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" placeholder="0 for none" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Start Date *</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">End Date</label>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Total Usage Limit</label>
                  <input type="number" value={formData.totalUsageLimit} onChange={e => setFormData({ ...formData, totalUsageLimit: Number(e.target.value) })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" placeholder="0 for unlimited" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Per Customer Limit</label>
                  <input type="number" value={formData.perCustomerLimit} onChange={e => setFormData({ ...formData, perCustomerLimit: Number(e.target.value) })} className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} className="w-4 h-4 rounded border-line text-accent focus:ring-accent" />
                <label htmlFor="active" className="text-sm font-semibold text-ink cursor-pointer">Coupon is Active</label>
              </div>
            </div>
            <div className="p-5 border-t border-line flex justify-end gap-3 bg-shell/30">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-muted hover:text-ink">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold shadow-xs hover:bg-accent-dark">Save Coupon</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmationDialog
          isOpen={true}
          title="Delete Coupon"
          description={`Are you sure you want to delete the coupon ${deleteConfirm.code}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={async () => {
            await deleteCoupon.mutateAsync(deleteConfirm.id);
            setDeleteConfirm(null);
            toast.success('Coupon deleted');
          }}
          onClose={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
