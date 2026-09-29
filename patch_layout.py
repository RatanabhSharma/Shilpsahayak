import os

with open("frontend/src/components/AdminLayout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import_lucide = "import {\n  LayoutDashboard,"
if "MessageSquare," not in content:
    content = content.replace("import {\n  LayoutDashboard,", "import {\n  LayoutDashboard,\n  MessageSquare,")

nav_item = """    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
    },
    {
      name: 'Inquiries',
      path: '/admin/inquiries',
      icon: MessageSquare,
    },"""

if "path: '/admin/inquiries'" not in content:
    content = content.replace("""    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
    },""", nav_item)

with open("frontend/src/components/AdminLayout.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AdminLayout.tsx")
