import os
import re

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("  | 'payments'\n", "")
content = content.replace("    { id: 'payments', label: 'Payments & Accounts', icon: CreditCard },\n", "")
content = content.replace("shipping zones, payments, and admin access.", "shipping zones, and admin access.")

# Remove TAB 4
start = content.find("          {/* TAB 4: PAYMENTS & ACCOUNTS */}")
if start != -1:
    end = content.find("            {/* TAB 5: OPERATIONAL NOTIFICATIONS */}", start)
    if end != -1:
        content = content[:start] + content[end:]

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Removed payments tab")
