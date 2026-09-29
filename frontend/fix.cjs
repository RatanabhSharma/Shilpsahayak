const fs = require('fs');
let store = fs.readFileSync('src/store.ts', 'utf8');

store = store.replace(
  'export type Settings = {',
  `export type PrivateSettings = {
  bankAccountDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  notifications?: {
    newOrderAlerts: boolean;
    quoteAlerts: boolean;
    lowStockAlerts: boolean;
    alertEmailRecipient: string;
  };
  adminUsers?: {
    email: string;
    role: string;
    addedAt: string;
  }[];
};

export type Settings = {`
);

// We don't remove them from Settings yet to avoid breaking other files if any (though there shouldn't be).
// Wait, if we keep them in Settings as optional, TS won't complain if we omit them!
// Let's just make them optional in Settings, or leave them. They are already optional?
// No, adminUsers is not in Settings. Oh wait, it isn't? Let's check `store.ts` again.

fs.writeFileSync('src/store.ts', store);
