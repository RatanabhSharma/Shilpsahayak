import { useStore } from '../../store';
import { format } from 'date-fns';
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react';

export function Customers() {
  const orders = useStore((state) => state.orders);

  // Group orders by customer email to get unique customers
  const customersMap = orders.reduce(
    (acc, order) => {
      if (!acc[order.customerEmail]) {
        acc[order.customerEmail] = {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: order.date,
        };
      }
      acc[order.customerEmail].ordersCount += 1;
      acc[order.customerEmail].totalSpent += order.total;
      if (
        new Date(order.date) > new Date(acc[order.customerEmail].lastOrderDate)
      ) {
        acc[order.customerEmail].lastOrderDate = order.date;
      }
      return acc;
    },
    {} as Record<string, any>
  );

  const customers = Object.values(customersMap);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            CRM Directory
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Customer Directory
          </h1>
          <p className="mt-1 text-xs text-muted">
            Overview of customer profiles, purchase history, and lifetime spending value.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-line shadow-xs font-mono text-xs font-bold text-ink">
          <Users className="w-4 h-4 text-accent" />
          <span>{customers.length} Registered Customers</span>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl border border-line bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-shell/50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Customer Name</th>
                <th className="px-5 py-3">Contact Details</th>
                <th className="px-5 py-3">Total Orders</th>
                <th className="px-5 py-3">Lifetime Spent</th>
                <th className="px-5 py-3">Last Active Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-sans text-xs">
              {customers.map((customer, i) => (
                <tr key={i} className="hover:bg-shell/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center font-mono font-bold text-accent text-xs shrink-0">
                        {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <span className="font-semibold text-ink">{customer.name}</span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-ink">
                        <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span>{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                          <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-mono font-bold text-ink">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-muted" />
                      <span>{customer.ordersCount} orders</span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-mono font-bold text-accent text-sm">
                    ₹{Number(customer.totalSpent || 0).toLocaleString('en-IN')}
                  </td>

                  <td className="px-5 py-3.5 font-mono text-muted">
                    {format(new Date(customer.lastOrderDate), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}

              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs font-mono text-muted">
                    No customer records found yet. Customer profiles build automatically as orders arrive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Customers;
