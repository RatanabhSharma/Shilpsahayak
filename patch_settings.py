import os

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update useEffect
content = content.replace(
    "useEffect(() => {\n    if (firestoreSettings) {\n      setForm(firestoreSettings);\n    }\n  }, [firestoreSettings]);",
    "useEffect(() => {\n    if (firestoreSettings) {\n      setForm({ ...firestoreSettings, ...(currentPrivateSettings || {}) });\n    }\n  }, [firestoreSettings, currentPrivateSettings]);"
)

# 2. Add currentPrivateSettings
content = content.replace(
    "  const {\n    data: firestoreSettings,\n    isLoading,\n    isError,\n    refetch,\n  } = useSettings();\n\n  const updateSettings = useUpdateSettings();\n  const updatePrivateSettings = useUpdatePrivateSettings();",
    "  const { data: firestoreSettings, isLoading: isLoadingPub, isError: isErrorPub, refetch: refetchPub } = useSettings();\n  const { data: currentPrivateSettings, isLoading: isLoadingPriv, isError: isErrorPriv, refetch: refetchPriv } = usePrivateSettings(true);\n  const isLoading = isLoadingPub || isLoadingPriv;\n  const isError = isErrorPub || isErrorPriv;\n  const refetch = () => { refetchPub(); refetchPriv(); };\n  const updateSettings = useUpdateSettings();\n  const updatePrivateSettings = useUpdatePrivateSettings();"
)

# 3. Fix handleSubmit
submit_logic = """
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const { notifications, adminUsers, bankAccountDetails, ...publicFields } = form;

      await updateSettings.mutateAsync({
        ...publicFields,
        businessName: publicFields.businessName?.trim() || 'Shilp Sahayak',
        email: publicFields.email?.trim() || '',
        whatsappNumber: publicFields.whatsappNumber?.trim() || '',
        phone: publicFields.phone?.trim() || '',
        address: publicFields.address?.trim() || '',
        gstin: publicFields.gstin?.trim() || '',
        cin: publicFields.cin?.trim() || '',
        supportHours: publicFields.supportHours?.trim() || '',
        baseFee: Number(publicFields.baseFee) || 0,
        minimumOrderValue: Number(publicFields.minimumOrderValue) || 0,
        defaultGSTRate: Number(publicFields.defaultGSTRate) || 18,
        shippingFlatRate: Number(publicFields.shippingFlatRate) || 0,
        freeShippingThreshold: Number(publicFields.freeShippingThreshold) || 0,
        expressShippingRate: Number(publicFields.expressShippingRate) || 0,
        defaultCourierPartner: publicFields.defaultCourierPartner?.trim() || 'Delhivery',
        upiId: publicFields.upiId?.trim() || '',
        maxCodOrderValue: Number(publicFields.maxCodOrderValue) || 5000,
      });

      await updatePrivateSettings.mutateAsync({
        notifications,
        adminUsers,
        bankAccountDetails
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      notify('Failed to save settings. Please try again.', 'error');
    }
  };
"""

# Replace existing handleSubmit
start_idx = content.find("const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {")
end_idx = content.find("};", content.find("setShowSuccess(false), 3000);", start_idx)) + 2

content = content[:start_idx] + submit_logic.strip() + content[end_idx:]

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Settings.tsx logic successfully")
