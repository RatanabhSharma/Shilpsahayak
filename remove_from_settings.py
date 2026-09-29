import os
import re

with open("frontend/src/store.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r'  // Notifications\s*notifications\?: \{[\s\S]*?\};\s*', '', content)
content = re.sub(r'  // Admin Access\s*adminUsers\?: \{[\s\S]*?\};\s*', '', content)

with open("frontend/src/store.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("Removed notifications and adminUsers from Settings")
