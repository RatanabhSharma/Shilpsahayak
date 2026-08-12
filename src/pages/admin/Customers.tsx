import { useStore } from '../../store';
import { Card } from '../../components/ui';
import { format } from 'date-fns';
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
          lastOrderDate: order.date
        };
      }
      acc[order.customerEmail].ordersCount += 1;
      acc[order.customerEmail].totalSpent += order.total;
      if (
      new Date(order.date) > new Date(acc[order.customerEmail].lastOrderDate))
      {
        acc[order.customerEmail].lastOrderDate = order.date;
      }
      return acc;
    },
    {} as Record<string, any>
  );
  const customers = Object.values(customersMap);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-charcoal">
          Customers
        </h1>
        <p className="text-charcoal-light text-sm mt-1">
          View customer history and details.
        </p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-xs uppercase tracking-wider text-charcoal-light border-b border-brand-100">
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Orders</th>
                <th className="px-6 py-4 font-medium">Total Spent</th>
                <th className="px-6 py-4 font-medium">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {customers.map((customer, i) =>
              <tr key={i} className="hover:bg-brand-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-charcoal">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-charcoal-light">
                    <div>{customer.email}</div>
                    <div className="text-xs mt-1">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-charcoal-light">
                    {customer.ordersCount}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-brand-600">
                    ₹{customer.totalSpent.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm text-charcoal-light">
                    {format(new Date(customer.lastOrderDate), 'MMM d, yyyy')}
                  </td>
                </tr>
              )}
              {customers.length === 0 &&
              <tr>
                  <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-charcoal-light">
                  
                    No customers found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>);

}