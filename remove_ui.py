import os

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

start = content.find("                {/* Bank Account Details for B2B Clients */}")
end = content.find("</div>\n                  </div>\n                </div>\n              )}", start)
if start != -1 and end != -1:
    content = content[:start] + content[end:]
    with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Removed UI block")
else:
    print("Could not find UI block")
