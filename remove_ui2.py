import os
import re

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# find {/\* Bank Account Details for B2B Clients \*/}
# remove until </div>\n                    </div>\n                  </div>\n                </div>\n              </div>\n            )}
content = re.sub(r'                \{\/\* Bank Account Details for B2B Clients \*\/\}[\s\S]*?focus:border-accent"\s*\/>\s*<\/div>\s*<\/div>\s*<\/div>\s*', '', content)

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Removed UI block")
