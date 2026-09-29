import os

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# 1. Update useEffect
content = content.replace(
    "useEffect(() => {\n    if (firestoreSettings) {\n      setForm(firestoreSettings);\n    }\n  }, [firestoreSettings]);",
    "useEffect(() => {\n    if (firestoreSettings) {\n      setForm({ ...firestoreSettings, ...(currentPrivateSettings || {}) });\n    }\n  }, [firestoreSettings, currentPrivateSettings]);"
)

# 2. Add currentPrivateSettings
content = content.replace(
    "  const {\n    data: firestoreSettings,\n    isLoading,\n    isError,\n    refetch,\n  } = useSettings();",
    "  const { data: firestoreSettings, isLoading: isLoadingPub, isError: isErrorPub, refetch: refetchPub } = useSettings();\n  const { data: currentPrivateSettings, isLoading: isLoadingPriv, isError: isErrorPriv, refetch: refetchPriv } = usePrivateSettings(true);\n  const isLoading = isLoadingPub || isLoadingPriv;\n  const isError = isErrorPub || isErrorPriv;\n  const refetch = () => { refetchPub(); refetchPriv(); };"
)

# 3. Update handleSubmit
content = content.replace(
"""  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await updateSettings.mutateAsync({
        ...form,""",
"""  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const { notifications, adminUsers, ...publicFields } = form;

      await updateSettings.mutateAsync({
        ...publicFields,""")

content = content.replace(
"""        maxCodOrderValue: Number(form.maxCodOrderValue) || 5000,
      });

      setShowSuccess(true);""",
"""        maxCodOrderValue: Number(publicFields.maxCodOrderValue) || 5000,
      });

      await updatePrivateSettings.mutateAsync({
        notifications,
        adminUsers,
      });

      setShowSuccess(true);"""
)

# 4. updateSettings.mutateAsync -> .isPending
content = content.replace("disabled={updateSettings.isPending}", "disabled={updateSettings.isPending || updatePrivateSettings.isPending}")

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
