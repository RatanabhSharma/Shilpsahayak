import { Order } from '../hooks/useOrders';
import { Product } from '../hooks/useProducts';
import { Quote } from '../hooks/useQuotes';

/* -------------------------------------------------------------------------- */
/* Generic CSV Downloader with UTF-8 BOM for Microsoft Excel / Sheets        */
/* -------------------------------------------------------------------------- */

function escapeCsvCell(cell: unknown): string {
  if (cell == null) return '""';
  const str = String(cell);
  // If contains double quotes, commas, newlines, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  // \uFEFF is UTF-8 Byte Order Mark (BOM) to force Excel to render UTF-8 properly (₹ symbol, accents, etc.)
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* Domain Specific Exporters                                                  */
/* -------------------------------------------------------------------------- */

export function exportOrdersToCsv(orders: Order[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_orders_${dateStr}.csv`;

  const headers = [
    'Order ID',
    'Date Placed',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Order Items',
    'Total Items Count',
    'Total Amount (INR)',
    'Payment Status',
    'Payment Method',
    'Transaction Ref',
    'Order Status',
    'Shipping Status',
    'Courier Partner',
    'AWB Tracking Number',
    'Shipping Address',
    'Special Instructions / Notes',
  ];

  const rows = orders.map((order) => {
    const itemsSummary = (order.items || [])
      .map(
        (item) =>
          `${item.productName}${item.variantLabel ? ` [${item.variantLabel}]` : ''} (x${item.quantity})`
      )
      .join('; ');

    const totalItemCount = (order.items || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );

    return [
      order.id,
      order.date ? new Date(order.date).toLocaleDateString('en-IN') : '—',
      order.customerName || '—',
      order.customerEmail || '—',
      order.customerPhone || '—',
      itemsSummary || 'Custom Order',
      totalItemCount,
      order.total || 0,
      order.paymentStatus || 'Pending',
      order.paymentMethod || '—',
      order.transactionRef || '—',
      order.status || 'Pending',
      order.shippingStatus || 'Not shipped',
      order.courierPartner || '—',
      order.trackingNumber || '—',
      order.address || '—',
      order.notes || '—',
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportQuotesToCsv(quotes: Quote[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_custom_quotes_${dateStr}.csv`;

  const headers = [
    'Quote ID',
    'Date Submitted',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Request Type',
    'File Name',
    'Reference / 3D Model URL',
    'Customer Message & Notes',
    'Material',
    'Color',
    'Infill %',
    'Layer Height (mm)',
    'Quantity',
    'Dimensions (LxWxH)',
    'Quoted Price (INR)',
    'Status',
    'Expiry Date',
    'Admin Notes',
  ];

  const rows = quotes.map((q) => {
    const dims = q.dimensions
      ? `${q.dimensions.length || 0} x ${q.dimensions.width || 0} x ${q.dimensions.height || 0} ${q.dimensions.unit || 'mm'}`
      : '—';

    return [
      q.id,
      q.date ? new Date(q.date).toLocaleDateString('en-IN') : '—',
      q.customerName || '—',
      q.customerEmail || '—',
      q.customerPhone || '—',
      q.requestType || '3d-model',
      q.fileName || '—',
      q.fileUrl || '—',
      q.notes || q.description || '—',
      q.material || 'PLA',
      q.color || 'Default',
      q.infill ? `${q.infill}%` : '20%',
      q.layerHeight ? `${q.layerHeight}mm` : '0.2mm',
      q.quantity || 1,
      dims,
      q.adminPrice || 0,
      q.status || 'Pending',
      q.expiresAt ? new Date(q.expiresAt).toLocaleDateString('en-IN') : 'No Expiry',
      q.adminNotes || '—',
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportCatalogToCsv(products: Product[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_products_catalog_${dateStr}.csv`;

  const headers = [
    'Product ID',
    'SKU',
    'Product Name',
    'Slug',
    'Category',
    'Subcategory',
    'Material',
    'Selling Price (INR)',
    'Original MRP (INR)',
    'Cost Price (INR)',
    'Gross Margin (%)',
    'Stock Units',
    'Status',
    'Badge',
    'Weight (g)',
    'Dimensions (LxWxH)',
    'Customizable',
    'Featured',
    'Has Variants',
  ];

  const rows = products.map((p) => {
    const price = Number(p.price) || 0;
    const cost = Number(p.costPrice) || 0;
    const margin = price > 0 && cost > 0 ? Math.round(((price - cost) / price) * 100) : '—';
    const dims = p.dimensions
      ? `${p.dimensions.length || 0}x${p.dimensions.width || 0}x${p.dimensions.height || 0} ${p.dimensions.unit || 'mm'}`
      : '—';

    return [
      p.id,
      p.sku || '—',
      p.name,
      p.slug || '—',
      p.category || 'General',
      p.subcategory || '—',
      p.material || 'PLA',
      price,
      p.originalPrice || price,
      cost || '—',
      margin,
      p.stock || 0,
      p.status || (p.active !== false ? 'Active' : 'Draft'),
      p.badge || '—',
      p.weight ? `${p.weight}g` : '—',
      dims,
      p.isCustomizable ? 'Yes' : 'No',
      p.featured ? 'Yes' : 'No',
      p.hasVariants ? `Yes (${(p.variants || []).length})` : 'No',
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportInventoryToCsv(products: Product[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_inventory_${dateStr}.csv`;

  const headers = [
    'Product ID',
    'Product Name',
    'Category',
    'Material',
    'Base Price (INR)',
    'Original Price (INR)',
    'Stock Units',
    'Inventory Status',
    'Customizable',
    'Active in Storefront',
    'Variants Count',
  ];

  const rows = products.map((p) => {
    const stock = Number(p.stock) || 0;
    const status =
      stock === 0 ? 'Out of Stock' : stock <= 5 ? 'Low Stock Warning' : 'Healthy';

    return [
      p.id,
      p.name,
      p.category || 'General',
      p.material || 'PLA',
      p.price || 0,
      p.originalPrice || 0,
      stock,
      status,
      p.isCustomizable ? 'Yes' : 'No',
      p.active !== false ? 'Active' : 'Hidden',
      (p.variants || []).length,
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportRevenueSummaryToCsv(
  series: { label: string; key: string; value: number }[],
  currentMonthRevenue: number,
  totalRevenue: number,
  totalOrders: number
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_financial_summary_${dateStr}.csv`;

  const headers = ['Metric / Period', 'Amount (INR)', 'Notes'];

  const rows: (string | number)[][] = [
    ['Cumulative Gross Revenue', totalRevenue, 'All-time net completed and active orders'],
    ['Total Order Records', totalOrders, 'Total orders logged in database'],
    ['Current Month Turnover', currentMonthRevenue, 'Active monthly sales'],
    ['---', '---', '---'],
    ...series.map((item) => [`Monthly Turnover: ${item.label} (${item.key})`, item.value, '']),
  ];

  downloadCsv(filename, headers, rows);
}

export function exportCustomersToCsv(
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string;
    type: string;
    ordersCount: number;
    totalSpent: number;
    quotesCount: number;
    lastActiveDate?: string;
    city?: string;
    state?: string;
  }[]
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_customers_${dateStr}.csv`;

  const headers = [
    'Customer ID / UID',
    'Customer Name',
    'Email Address',
    'Phone Number',
    'Customer Segment',
    'Total Orders Placed',
    'Lifetime Spend (INR)',
    'Custom Quotes Count',
    'Last Active Date',
    'City',
    'State',
  ];

  const rows = customers.map((c) => [
    c.id,
    c.name || '—',
    c.email,
    c.phone || '—',
    c.type,
    c.ordersCount,
    c.totalSpent,
    c.quotesCount,
    c.lastActiveDate ? new Date(c.lastActiveDate).toLocaleDateString('en-IN') : '—',
    c.city || '—',
    c.state || '—',
  ]);

  downloadCsv(filename, headers, rows);
}

export function exportProductPerformanceToCsv(
  items: {
    productId: string;
    productName: string;
    sku?: string;
    category?: string;
    price: number;
    unitsSold: number;
    totalRevenue: number;
    currentStock: number;
  }[]
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_product_performance_${dateStr}.csv`;

  const headers = [
    'Product ID',
    'SKU',
    'Product Name',
    'Category',
    'Unit Price (INR)',
    'Units Sold',
    'Total Revenue (INR)',
    'Current Stock Units',
  ];

  const rows = items.map((item) => [
    item.productId,
    item.sku || '—',
    item.productName,
    item.category || 'General',
    item.price,
    item.unitsSold,
    item.totalRevenue,
    item.currentStock,
  ]);

  downloadCsv(filename, headers, rows);
}

export function exportCustomPrintingRevenueToCsv(
  quotes: Quote[],
  orders: Order[]
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `shilp_custom_printing_revenue_${dateStr}.csv`;

  const headers = [
    'Quote ID',
    'Date Requested',
    'Customer Name',
    'Customer Email',
    'Material',
    'Color',
    'Estimated Price (INR)',
    'Admin Quoted Price (INR)',
    'Quote Status',
    'Converted Order ID',
    'Order Status',
    'Order Total (INR)',
  ];

  const rows = quotes.map((q) => {
    const linkedOrder = q.orderId ? orders.find((o) => o.id === q.orderId) : null;
    return [
      q.id,
      q.date ? new Date(q.date).toLocaleDateString('en-IN') : '—',
      q.customerName || '—',
      q.customerEmail || '—',
      q.material || 'PLA',
      q.color || 'Default',
      q.estimatedPrice || 0,
      q.adminPrice ?? q.estimatedPrice ?? 0,
      q.status || 'Pending',
      q.orderId || '—',
      linkedOrder ? linkedOrder.status : '—',
      linkedOrder ? linkedOrder.total : 0,
    ];
  });

  downloadCsv(filename, headers, rows);
}


