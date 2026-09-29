import os

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "useEffect(() => {\n    if (currentSettings) {\n      setForm(currentSettings);\n    }\n  }, [currentSettings]);",
    "useEffect(() => {\n    if (currentSettings) {\n      setForm({ ...currentSettings, ...(currentPrivateSettings || {}) });\n    }\n  }, [currentSettings, currentPrivateSettings]);"
)

content = content.replace(
    "  const {\n    data: currentSettings,\n    isLoading,\n    isError,\n    refetch,\n  } = useSettings();\n\n  const updateSettings = useUpdateSettings();\n  const updatePrivateSettings = useUpdatePrivateSettings();",
    "  const { data: currentSettings, isLoading: isLoadingPub, isError: isErrorPub, refetch: refetchPub } = useSettings();\n  const { data: currentPrivateSettings, isLoading: isLoadingPriv, isError: isErrorPriv, refetch: refetchPriv } = usePrivateSettings(true);\n  const isLoading = isLoadingPub || isLoadingPriv;\n  const isError = isErrorPub || isErrorPriv;\n  const refetch = () => { refetchPub(); refetchPriv(); };\n  const updateSettings = useUpdateSettings();\n  const updatePrivateSettings = useUpdatePrivateSettings();"
)

old_submit = """
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await updateSettings.mutateAsync({
        ...form,
        businessName: form.businessName?.trim() || 'Shilp Sahayak',
        email: form.email?.trim() || '',
        whatsappNumber: form.whatsappNumber?.trim() || '',
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        gstin: form.gstin?.trim() || '',
        cin: form.cin?.trim() || '',
        supportHours: form.supportHours?.trim() || '',
        baseFee: Number(form.baseFee) || 0,
        minimumOrderValue: Number(form.minimumOrderValue) || 0,
        defaultGSTRate: Number(form.defaultGSTRate) || 18,
        shippingFlatRate: Number(form.shippingFlatRate) || 0,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        expressShippingRate: Number(form.expressShippingRate) || 0,
        defaultCourierPartner: form.defaultCourierPartner?.trim() || 'Delhivery',
        upiId: form.upiId?.trim() || '',
        maxCodOrderValue: Number(form.maxCodOrderValue) || 5000,
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      notify('Failed to save settings. Please try again.', 'error');
    }
  };
"""

new_submit = """
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const { notifications, adminUsers, ...publicFields } = form;

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
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      notify('Failed to save settings. Please try again.', 'error');
    }
  };
"""

if old_submit.strip() in content:
    content = content.replace(old_submit.strip(), new_submit.strip())
else:
    print("WARNING: Could not find old_submit!")

import re
content = re.sub(r'  const updateNestedBank = \([\s\S]*?\}\)\);\n  \};\n', '', content)

start = content.find("{/* Bank Account Details for B2B Clients */}")
if start != -1:
    end = content.find("</div>\n                  </div>\n                </div>\n              )}", start)
    if end != -1:
        content = content[:start-17] + content[end:]

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
