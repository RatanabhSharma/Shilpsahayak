const fs = require('fs');
let code = fs.readFileSync('frontend/src/hooks/useSettings.ts', 'utf8');

code = code.replace(
  /Settings,\n  useStore/g,
  `Settings,\n  PrivateSettings,\n  useStore`
);

code = code.replace(
  /  bankAccountDetails: \{([^]+?)  \],/s,
  ``
);

code = code.replace(
  /const SETTINGS_DOCUMENT_ID = 'business';/,
  `const SETTINGS_DOCUMENT_ID = 'business';\nconst PRIVATE_SETTINGS_DOCUMENT_ID = 'private';`
);

code = code.replace(
  /\};\n\n\/\*\*/,
  `};\n\nconst DEFAULT_PRIVATE_SETTINGS: PrivateSettings = {
  bankAccountDetails: {
    accountName: 'Shilp Sahayak 3D Technologies Pvt Ltd',
    accountNumber: '924020012345678',
    ifscCode: 'UTIB0000123',
    bankName: 'Axis Bank Ltd',
  },
  notifications: {
    newOrderAlerts: true,
    quoteAlerts: true,
    lowStockAlerts: true,
    alertEmailRecipient: 'info.shilpsahayak@gmail.com',
  },
  adminUsers: [
    { email: 'admin@shilpsahayak.in', role: 'Super Admin', addedAt: '2025-01-01' },
    { email: 'workshop@shilpsahayak.in', role: 'Workshop Manager', addedAt: '2025-02-15' },
  ],
};\n\n/**`
);

code += `

export function usePrivateSettings(isAdmin: boolean) {
  const localPrivateSettings = useStore(state => state.privateSettings);
  return useQuery({
    queryKey: ['settings', PRIVATE_SETTINGS_DOCUMENT_ID],
    queryFn: async (): Promise<PrivateSettings> => {
      const settingsRef = doc(db, 'settings', PRIVATE_SETTINGS_DOCUMENT_ID);
      const snapshot = await getDoc(settingsRef);
      if (!snapshot.exists()) {
        return { ...DEFAULT_PRIVATE_SETTINGS, ...localPrivateSettings };
      }
      return { ...DEFAULT_PRIVATE_SETTINGS, ...snapshot.data() } as PrivateSettings;
    },
    enabled: !!isAdmin,
    staleTime: 5 * 60 * 1000,
    initialData: localPrivateSettings
  });
}

export function useUpdatePrivateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: PrivateSettings) => {
      const settingsRef = doc(db, 'settings', PRIVATE_SETTINGS_DOCUMENT_ID);
      await setDoc(settingsRef, settings, { merge: true });
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['settings', PRIVATE_SETTINGS_DOCUMENT_ID], settings);
      useStore.getState().updatePrivateSettings(settings);
    }
  });
}
`;

fs.writeFileSync('frontend/src/hooks/useSettings.ts', code);
console.log("Updated useSettings.ts");
