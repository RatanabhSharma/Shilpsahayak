import os

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """      await updatePrivateSettings.mutateAsync({
        notifications: notifications ?? {
          newOrderAlerts: true,
          quoteAlerts: true,
          lowStockAlerts: true,
          alertEmailRecipient: 'info.shilpsahayak@gmail.com',
        },
        adminUsers: adminUsers ?? [],
      });"""

content = content.replace("      await updatePrivateSettings.mutateAsync({\n        notifications,\n        adminUsers,\n      });", replacement)

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched mutateAsync")
