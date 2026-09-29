import os

with open("frontend/src/hooks/useSettings.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "  Settings,\n  useStore\n} from '../store';",
    "  Settings,\n  PrivateSettings,\n  useStore\n} from '../store';"
)

with open("frontend/src/hooks/useSettings.ts", "w", encoding="utf-8") as f:
    f.write(content)

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    content2 = f.read()

content2 = content2.replace(
    "  Settings as SettingsType,\n  useStore,\n} from '../../store';",
    "  Settings as SettingsType,\n  PrivateSettings,\n  useStore,\n} from '../../store';"
)

content2 = content2.replace(
    "  useSettings,\n  useUpdateSettings,\n} from '../../hooks/useSettings';",
    "  useSettings,\n  useUpdateSettings,\n  usePrivateSettings,\n  useUpdatePrivateSettings\n} from '../../hooks/useSettings';"
)

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.write(content2)

print("Fixed imports")
