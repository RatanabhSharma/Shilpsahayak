import os

with open("frontend/src/pages/admin/Inquiries.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'from "../../components/admin";',
    'from "../../components/admin/shared";'
)

with open("frontend/src/pages/admin/Inquiries.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed imports in Inquiries.tsx")
