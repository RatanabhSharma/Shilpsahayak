import { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
  Mail,
  Phone,
  MessageCircle,
  ShoppingBag,
  FileBox,
  Eye,
} from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useQuotes } from '../../hooks/useQuotes';
import {
  useAllUsers,
  useUpdateCustomerAdminNotes,
} from '../../hooks/useUserProfile';
import { exportCustomersToCsv } from '../../utils/exportCsv';

// Phase 2 Shared Admin Components
import { PageHeader } from '../../components/admin/shared/PageHeader';
import { StatCard } from '../../components/admin/shared/StatCard';
import { SearchInput } from '../../components/admin/shared/SearchInput';
import { FilterBar } from '../../components/admin/shared/FilterBar';
import { Pagination } from '../../components/admin/shared/Pagination';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { LoadingState } from '../../components/admin/shared/LoadingState';
import { ErrorState } from '../../components/admin/shared/ErrorState';

// Phase 7 Customer Drawer
import {
  CustomerProfileDrawer,
  CustomerRecord,
} from '../../components/admin/customers/CustomerProfileDrawer';

const TYPE_FILTERS = [
  { label: 'All Customer Types', value: 'ALL' },
  { label: 'Retail Customers', value: 'Retail' },
  { label: 'Corporate / B2B', value: 'Corporate' },
  { label: 'Custom Printing Clients', value: 'Custom Printing' },
];

const ACTIVITY_FILTERS = [
  { label: 'All Activity', value: 'ALL' },
  { label: 'Active Buyers (With Orders)', value: 'WITH_ORDERS' },
  { label: 'Prospects (No Orders Yet)', value: 'NO_ORDERS' },
];

const SORT_OPTIONS = [
  { label: 'Lifetime Spend: High to Low', value: 'spend_desc' },
  { label: 'Total Orders: Most to Least', value: 'orders_desc' },
  { label: 'Customer Name: A to Z', value: 'name_asc' },
  { label: 'Recently Active', value: 'recent_active' },
];

const ITEMS_PER_PAGE = 10;

export function Customers() {
  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
    isRefetching: isRefetchingUsers,
  } = useAllUsers();

  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useOrders();

  const {
    data: quotes = [],
    isLoading: isQuotesLoading,
    refetch: refetchQuotes,
  } = useQuotes();

  const updateCustomerNotes = useUpdateCustomerAdminNotes();

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('spend_desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Active Customer Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // Combine registered users + guest order emails into a consolidated customer directory
  const unifiedCustomers = useMemo(() => {
    const map = new Map<string, CustomerRecord>();

    // 1. Ingest registered users from users collection
    users.forEach((u) => {
      const emailKey = (u.email || '').toLowerCase().trim();
      if (!emailKey) return;

      map.set(emailKey, {
        id: u.uid || emailKey,
        uid: u.uid,
        name: u.name || emailKey.split('@')[0],
        email: u.email,
        phone: u.phone || '',
        customerType: u.customerType || 'Retail',
        companyName: u.companyName,
        gstin: u.gstin,
        adminNotes: u.adminNotes,
        address: u.address,
        totalSpent: 0,
        ordersCount: 0,
        quotesCount: 0,
        orders: [],
        quotes: [],
        joinedDate: typeof u.createdAt === 'string' ? u.createdAt : undefined,
      });
    });

    // 2. Link orders by customerId or email
    orders.forEach((o) => {
      const emailKey = (o.customerEmail || '').toLowerCase().trim();
      if (!emailKey) return;

      let record = map.get(emailKey);
      if (!record) {
        // Guest customer from order
        record = {
          id: o.customerId || emailKey,
          uid: o.customerId || undefined,
          name: o.customerName || emailKey.split('@')[0],
          email: o.customerEmail,
          phone: o.customerPhone || '',
          customerType: 'Retail',
          totalSpent: 0,
          ordersCount: 0,
          quotesCount: 0,
          orders: [],
          quotes: [],
          joinedDate: o.date,
        };
        map.set(emailKey, record);
      }

      record.orders.push(o);
      record.ordersCount += 1;
      record.totalSpent += Number(o.total) || 0;

      if (!record.phone && o.customerPhone) {
        record.phone = o.customerPhone;
      }

      // Track last active date
      if (
        !record.lastActiveDate ||
        new Date(o.date).getTime() > new Date(record.lastActiveDate).getTime()
      ) {
        record.lastActiveDate = o.date;
      }
    });

    // 3. Link custom CAD quotes
    quotes.forEach((q) => {
      const emailKey = (q.customerEmail || '').toLowerCase().trim();
      if (!emailKey) return;

      let record = map.get(emailKey);
      if (!record) {
        record = {
          id: q.customerId || emailKey,
          uid: q.customerId || undefined,
          name: q.customerName || emailKey.split('@')[0],
          email: q.customerEmail,
          phone: q.customerPhone || '',
          customerType: 'Custom Printing',
          totalSpent: 0,
          ordersCount: 0,
          quotesCount: 0,
          orders: [],
          quotes: [],
          joinedDate: q.date,
        };
        map.set(emailKey, record);
      }

      record.quotes.push(q);
      record.quotesCount += 1;

      if (!record.phone && q.customerPhone) {
        record.phone = q.customerPhone;
      }

      if (
        !record.lastActiveDate ||
        new Date(q.date).getTime() > new Date(record.lastActiveDate).getTime()
      ) {
        record.lastActiveDate = q.date;
      }

      // If user submitted custom CAD quotes and customerType is default, mark as Custom Printing Client
      if (record.customerType === 'Retail' && record.quotesCount > 0) {
        record.customerType = 'Custom Printing';
      }
    });

    // 4. Auto-classify Corporate / B2B if criteria met
    const list = Array.from(map.values()).map((c) => {
      if (
        c.customerType === 'Retail' &&
        (c.companyName || c.gstin || c.totalSpent >= 25000)
      ) {
        c.customerType = 'Corporate';
      }
      return c;
    });

    return list;
  }, [users, orders, quotes]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = unifiedCustomers.length;
    const activeBuyers = unifiedCustomers.filter((c) => c.ordersCount > 0).length;
    const customPrintingClients = unifiedCustomers.filter(
      (c) => c.quotesCount > 0 || c.customerType === 'Custom Printing'
    ).length;

    const totalRevenue = unifiedCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
    const avgLtv = total > 0 ? Math.round(totalRevenue / total) : 0;

    return { total, activeBuyers, customPrintingClients, avgLtv };
  }, [unifiedCustomers]);

  // Filtered and Sorted Customers
  const filteredCustomers = useMemo(() => {
    return unifiedCustomers
      .filter((c) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            (c.companyName || '').toLowerCase().includes(q) ||
            (c.gstin || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Type Filter
        if (typeFilter !== 'ALL') {
          if (c.customerType !== typeFilter) return false;
        }

        // Activity Filter
        if (activityFilter === 'WITH_ORDERS' && c.ordersCount === 0) return false;
        if (activityFilter === 'NO_ORDERS' && c.ordersCount > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'spend_desc') return b.totalSpent - a.totalSpent;
        if (sortBy === 'orders_desc') return b.ordersCount - a.ordersCount;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'recent_active') {
          const dateA = a.lastActiveDate ? new Date(a.lastActiveDate).getTime() : 0;
          const dateB = b.lastActiveDate ? new Date(b.lastActiveDate).getTime() : 0;
          return dateB - dateA;
        }
        return 0;
      });
  }, [unifiedCustomers, search, typeFilter, activityFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const handleRefreshAll = () => {
    refetchUsers();
    refetchOrders();
    refetchQuotes();
  };

  // Save CRM Admin Data
  const handleSaveAdminData = async (
    id: string,
    data: {
      adminNotes?: string;
      customerType?: string;
      companyName?: string;
      gstin?: string;
    }
  ) => {
    const target = unifiedCustomers.find((c) => c.id === id);
    if (!target) return;

    if (target.uid) {
      await updateCustomerNotes.mutateAsync({
        uid: target.uid,
        ...data,
      });
    }

    // Update state in drawer
    setSelectedCustomer((prev) => (prev ? { ...prev, ...data } : null));
  };

  const isLoading = isUsersLoading || isOrdersLoading || isQuotesLoading;

  if (isLoading) {
    return <LoadingState message="Loading Shilp Sahayak Customer Directory & CRM..." />;
  }

  if (isUsersError) {
    return (
      <ErrorState
        title="Failed to Load Customer Directory"
        message="Unable to load customer records from Firestore. Please check connection and try again."
        onRetry={handleRefreshAll}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Customer Directory"
        description="Unified CRM intelligence tracking retail buyers, corporate B2B clients, custom CAD quotation inquiries, and customer lifetime value (LTV)."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Customer Directory' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefetchingUsers}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white hover:bg-shell text-xs font-mono font-bold text-ink transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh customer telemetry"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-muted ${isRefetchingUsers ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportCustomersToCsv(
                  filteredCustomers.map((c) => ({
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    type: c.customerType,
                    ordersCount: c.ordersCount,
                    totalSpent: c.totalSpent,
                    quotesCount: c.quotesCount,
                    lastActiveDate: c.lastActiveDate,
                    city: c.address?.city,
                    state: c.address?.state,
                  }))
                )
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-shell text-ink font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download customer directory as CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Clients"
          value={metrics.total}
          icon={Users}
        />
        <StatCard
          title="Active Buyers"
          value={metrics.activeBuyers}
          icon={UserCheck}
          description="Placed at least 1 order"
        />
        <StatCard
          title="Custom Printing Clients"
          value={metrics.customPrintingClients}
          icon={FileBox}
          description="Submitted 3D CAD quotes"
        />
        <StatCard
          title="Average Customer LTV"
          value={`₹${metrics.avgLtv.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          description="Mean lifetime revenue"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        isFiltered={Boolean(search.trim() || typeFilter !== 'ALL' || activityFilter !== 'ALL')}
        resultCount={filteredCustomers.length}
        onReset={() => {
          setSearch('');
          setTypeFilter('ALL');
          setActivityFilter('ALL');
          setSortBy('spend_desc');
          setCurrentPage(1);
        }}
      >
        <SearchInput
          placeholder="Search by customer name, email, phone, company, GSTIN..."
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          onClear={() => {
            setSearch('');
            setCurrentPage(1);
          }}
          className="w-full sm:w-80"
        />

        {/* Customer Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Activity Filter */}
        <select
          value={activityFilter}
          onChange={(e) => {
            setActivityFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {ACTIVITY_FILTERS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {/* Sort Filter */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {/* Customers Table */}
      {paginatedCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Customers Found"
          description="No customer records match your active search or filter selection."
          action={
            search || typeFilter !== 'ALL' || activityFilter !== 'ALL'
              ? {
                  label: 'Clear All Filters',
                  onClick: () => {
                    setSearch('');
                    setTypeFilter('ALL');
                    setActivityFilter('ALL');
                    setCurrentPage(1);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-shell/50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">Customer & Segment</th>
                  <th className="px-4 py-3.5">Contact Details</th>
                  <th className="px-4 py-3.5 text-center">Orders</th>
                  <th className="px-4 py-3.5 text-center">CAD Quotes</th>
                  <th className="px-4 py-3.5">Lifetime Spend</th>
                  <th className="px-4 py-3.5">Last Active</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedCustomers.map((customer) => {
                  const whatsappUrl = customer.phone
                    ? `https://wa.me/91${customer.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                        `Hello ${customer.name || 'valued customer'}, greetings from Shilp Sahayak!`
                      )}`
                    : null;

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-shell/40 transition-colors"
                    >
                      {/* Name & Segment Badge */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-mono font-bold text-accent text-xs shrink-0">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display font-bold text-xs text-ink truncate">
                              {customer.name}
                            </h4>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border mt-0.5 ${
                                customer.customerType === 'Corporate'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : customer.customerType === 'Custom Printing'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {customer.customerType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <div className="space-y-0.5">
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-1.5 text-ink hover:text-accent hover:underline truncate max-w-[200px]"
                          >
                            <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span>{customer.email}</span>
                          </a>

                          {customer.phone && (
                            <div className="flex items-center gap-1.5 text-muted text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-ink whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-slate-700">
                          <ShoppingBag className="w-3.5 h-3.5 text-muted" />
                          <span>{customer.ordersCount}</span>
                        </div>
                      </td>

                      {/* Quotes Count */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-blue-700">
                          <FileBox className="w-3.5 h-3.5 text-muted" />
                          <span>{customer.quotesCount}</span>
                        </div>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                        <span className="font-bold text-accent text-sm">
                          ₹{customer.totalSpent.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3.5 font-mono text-muted text-xs whitespace-nowrap">
                        {customer.lastActiveDate
                          ? new Date(customer.lastActiveDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Quick Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-shell text-ink font-mono text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                            title="View Full Customer CRM Profile"
                          >
                            <Eye className="w-3 h-3 text-accent" />
                            <span>View Profile</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalItems={filteredCustomers.length}
          pageSize={ITEMS_PER_PAGE}
        />
      )}

      {/* Customer Profile CRM Drawer */}
      <CustomerProfileDrawer
        isOpen={Boolean(selectedCustomer)}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSaveAdminData={handleSaveAdminData}
      />
    </div>
  );
}

export default Customers;
