const fs = require('fs');
let code = fs.readFileSync('src/utils/exportCsv.ts', 'utf8');

const indiaPostCode = \
export function exportIndiaPostCsv(orders: Order[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = \\\shilp_india_post_export_\\\.csv\\\;

  // Standard India Post Bulk Upload Format
  const headers = [
    'Recipient Name',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Pincode',
    'Mobile Number',
    'Email Address',
    'Item Type',
    'Weight (Gms)',
    'Value of Goods (INR)',
    'Order ID'
  ];

  const rows = orders.map((o) => {
    // Attempt to extract Pincode from address (usually 6 digits)
    const address = o.shippingAddress || '';
    const pinMatch = address.match(/\\b\\d{6}\\b/);
    const pincode = pinMatch ? pinMatch[0] : '';
    
    // Attempt to extract State (basic heuristics if not explicitly structured)
    const stateMatch = address.match(/(Punjab|Delhi|Maharashtra|Haryana|Karnataka|Tamil Nadu|Gujarat|Rajasthan|Uttar Pradesh)/i);
    const state = stateMatch ? stateMatch[0] : '';
    
    // For Weight, we estimate 500g if not specified, since mostly 3D prints
    const weightGms = 500; 

    return [
      o.customerName || 'Customer',
      address.replace(/,/g, ' '),
      '', // Address line 2 (optional)
      '', // City (can be manually filled or parsed if strict format)
      state,
      pincode,
      (o.customerPhone || '').replace(/\\D/g, '').slice(-10),
      o.customerEmail || '',
      'Parcel',
      weightGms,
      o.total || 0,
      o.id
    ];
  });

  downloadCsv(filename, headers, rows);
}
\;

fs.appendFileSync('src/utils/exportCsv.ts', "\\n" + indiaPostCode);
console.log('Appended to exportCsv.ts');
