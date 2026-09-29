import os

with open("frontend/src/pages/storefront/CustomPrinting.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "import { SlicingSuccessResult, ColorAnalysis, UniversalModelAnalysis } from '../../services/slicing/slicingClient';",
    "import { SlicingSuccessResult, ColorAnalysis, UniversalModelAnalysis } from '../../services/model/slicingTypes';"
)

with open("frontend/src/pages/storefront/CustomPrinting.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CustomPrinting.tsx imports")
