import os

with open("frontend/src/store.ts", "r", encoding="utf-8") as f:
    store = f.read()
import re
store = re.sub(r'  bankAccountDetails\?: \{[\s\S]*?\};\n', '', store)
with open("frontend/src/store.ts", "w", encoding="utf-8") as f:
    f.write(store)

with open("frontend/src/hooks/useSettings.ts", "r", encoding="utf-8") as f:
    hooks = f.read()
hooks = re.sub(r'  bankAccountDetails: \{[\s\S]*?\},\n', '', hooks)
with open("frontend/src/hooks/useSettings.ts", "w", encoding="utf-8") as f:
    f.write(hooks)

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    settings = f.read()

# Remove updateNestedBank
settings = re.sub(r'  const updateNestedBank = \([\s\S]*?\}\)\);\n  \};\n', '', settings)

# Remove the UI section safely
start = settings.find("{/* Bank Account Details for B2B Clients */}")
if start != -1:
    end = settings.find("</div>\n                  </div>\n                </div>\n              )}", start)
    if end != -1:
        # We need to preserve the `</div>\n                  </div>\n                </div>\n              )}`
        settings = settings[:start-17] + settings[end:]

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(settings)
print("Removed bank details safely")
