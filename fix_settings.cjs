const fs = require('fs');
let store = fs.readFileSync('frontend/src/store.ts', 'utf8');

store = store.replace(
  /export type Settings = \{([^]+?)const INITIAL_SETTINGS: Settings = \{/s,
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

export type Settings = {
  businessName: string;
  logoUrl?: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  gstin?: string;
  cin?: string;
  supportHours?: string;
  baseFee?: number;
  minimumOrderValue?: number;
  defaultGSTRate?: number;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  expressShippingRate?: number;
  defaultCourierPartner?: string;
  deliveryZones?: string[];
  upiId?: string;
  codEnabled?: boolean;
  maxCodOrderValue?: number;
};

const INITIAL_SETTINGS: Settings = {`
);

store = store.replace(
  /settings: Settings;/g,
  `settings: Settings;\n  privateSettings?: PrivateSettings;`
);

store = store.replace(
  /updateSettings: \([\s\S]*?\) => void;/g,
  `updateSettings: (partial: Partial<Settings>) => void;\n  updatePrivateSettings: (partial: Partial<PrivateSettings>) => void;`
);

store = store.replace(
  /settings: INITIAL_SETTINGS,/g,
  `settings: INITIAL_SETTINGS,\n        privateSettings: undefined,`
);

store = store.replace(
  /updateSettings: \([\s\S]*?\}\)\)/g,
  `updateSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),\n        updatePrivateSettings: (partial) => set((state) => ({ privateSettings: { ...(state.privateSettings || {}), ...partial } }))`
);

store = store.replace(
  /settings: state\.settings,/g,
  `settings: state.settings,\n            privateSettings: state.privateSettings,`
);

fs.writeFileSync('frontend/src/store.ts', store);
console.log("Updated store.ts");
