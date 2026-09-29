import os

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "import { Inquiries }" not in content:
    content = content.replace("import { Settings } from './pages/admin/Settings';", "import { Settings } from './pages/admin/Settings';\nimport { Inquiries } from './pages/admin/Inquiries';")

if "<Route path=\"inquiries\" element={<Inquiries />} />" not in content:
    content = content.replace("<Route path=\"customers\" element={<Customers />} />", "<Route path=\"customers\" element={<Customers />} />\n          <Route path=\"inquiries\" element={<Inquiries />} />")

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated App.tsx")
