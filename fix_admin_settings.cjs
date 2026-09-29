const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/admin/Settings.tsx', 'utf8');

code = code.replace(
  /Settings as SettingsType,\n  useStore,/,
  `Settings as SettingsType,\n  PrivateSettings,\n  useStore,`
);

code = code.replace(
  /useSettings,\n  useUpdateSettings,\n\} from '\.\.\/\.\.\/hooks\/useSettings';/,
  `useSettings,\n  useUpdateSettings,\n  usePrivateSettings,\n  useUpdatePrivateSettings,\n} from '../../hooks/useSettings';`
);

code = code.replace(
  /const \[form, setForm\] = useState<SettingsType>\(/,
  `const [form, setForm] = useState<SettingsType & PrivateSettings>(`
);

code = code.replace(
  /const \{\n    data: currentSettings,\n    isLoading,\n    isError,\n    refetch,\n  \} = useSettings\(\);/,
  `const { user } = useAuth();\n  const { data: currentSettings, isLoading: isLoadingPublic, isError: isErrorPublic, refetch: refetchPublic } = useSettings();\n  const { data: currentPrivateSettings, isLoading: isLoadingPrivate, isError: isErrorPrivate, refetch: refetchPrivate } = usePrivateSettings(true);\n\n  const isLoading = isLoadingPublic || isLoadingPrivate;\n  const isError = isErrorPublic || isErrorPrivate;\n  const refetch = () => { refetchPublic(); refetchPrivate(); };`
);

code = code.replace(
  /const updateSettings = useUpdateSettings\(\);/,
  `const updateSettings = useUpdateSettings();\n  const updatePrivateSettings = useUpdatePrivateSettings();`
);

code = code.replace(
  /useEffect\(\(\) => \{\n    if \(currentSettings\) \{\n      setForm\(currentSettings\);\n    \}\n  \}, \[currentSettings\]\);/,
  `useEffect(() => {\n    if (currentSettings && currentPrivateSettings) {\n      setForm({ ...currentSettings, ...currentPrivateSettings });\n    }\n  }, [currentSettings, currentPrivateSettings]);`
);

// We need to modify the save function to split the form object
code = code.replace(
  /await updateSettings\.mutateAsync\(\{\n[\s\S]*?\}\);/,
  `const { bankAccountDetails, notifications, adminUsers, ...publicFields } = form;\n      await updateSettings.mutateAsync({\n        ...publicFields,\n        businessName: publicFields.businessName?.trim() || 'Shilp Sahayak',\n        email: publicFields.email?.trim() || '',\n        whatsappNumber: publicFields.whatsappNumber?.trim() || '',\n        phone: publicFields.phone?.trim() || '',\n        address: publicFields.address?.trim() || '',\n        gstin: publicFields.gstin?.trim() || '',\n        cin: publicFields.cin?.trim() || '',\n        supportHours: publicFields.supportHours?.trim() || '',\n        baseFee: Number(publicFields.baseFee) || 0,\n        minimumOrderValue: Number(publicFields.minimumOrderValue) || 0,\n        defaultGSTRate: Number(publicFields.defaultGSTRate) || 18,\n        shippingFlatRate: Number(publicFields.shippingFlatRate) || 0,\n        freeShippingThreshold: Number(publicFields.freeShippingThreshold) || 0,\n        expressShippingRate: Number(publicFields.expressShippingRate) || 0,\n      });\n\n      await updatePrivateSettings.mutateAsync({\n        bankAccountDetails,\n        notifications,\n        adminUsers,\n      });`
);

code = code.replace(
  /updateSettings\.isPending/,
  `(updateSettings.isPending || updatePrivateSettings.isPending)`
);

// We need to replace all `SettingsType` with `SettingsType & PrivateSettings` inside the update nested functions
code = code.replace(
  /key: keyof NonNullable<SettingsType\['bankAccountDetails'\]>,/g,
  `key: keyof NonNullable<PrivateSettings['bankAccountDetails']>,`
);

code = code.replace(
  /key: keyof NonNullable<SettingsType\['notifications'\]>,/g,
  `key: keyof NonNullable<PrivateSettings['notifications']>,`
);

fs.writeFileSync('frontend/src/pages/admin/Settings.tsx', code);
console.log("Updated Settings.tsx");
