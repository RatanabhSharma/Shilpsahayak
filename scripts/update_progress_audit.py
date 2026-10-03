import re

file_path = "docs/ADMIN_CMS_PROGRESS.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update the Phase Status Overview table
new_table = """| Phase | Title | Status | Completion Date | Verification Notes |
|:---:|:---|:---:|:---:|:---|
| **Phase 0** | Baseline Codebase & Architecture Audit | **COMPLETE** | 2026-10-01 | Governance files active. |
| **Phase 1** | Admin Information Architecture & Foundation | **PARTIAL/REVERTED** | — | 5 of 6 groups present. `Settings.tsx` URL query sync missing. Admin Security tab still present in code but unlinked. |
| **Phase 2** | Storefront CMS & Homepage Hero Manager | **PARTIAL/REVERTED** | — | `AdminHome.tsx` missing Hero editor. `useHomepage.ts` missing `StorefrontConfig` schema. Storefront UI (`Home.tsx`) expects data not being saved. |
| **Phase 2 (Audit)**| UI Regression Audit & Restoration | **COMPLETE** | 2026-10-01 | Storefront UI (`Home.tsx`) visually intact. |
| **Phase 3** | Branding & Media Library | **PARTIAL/REVERTED** | — | `MediaLibrary.tsx` exists locally but is disconnected from `App.tsx` and `AdminLayout.tsx`. |
| **Phase 4** | Navigation & Footer Management | **REMOVED** | 2026-10-02 | Intentionally frozen/removed per Entry 006. |
| **Phase A** | Operations & Settings Consolidation | **PARTIAL/REVERTED** | — | Inventory logs rules present. Shipping defaults standardized. HOWEVER, the critical Quotes bug (`'Quote Sent'` vs `'Quoted'`) was rolled back, risking the customer checkout flow. |
| **Phase 5-12** | Remaining Phases | **NOT STARTED** | — | — |"""

content = re.sub(
    r"\| Phase \| Title \| Status \| Completion Date \| Verification Notes \|.*?(?=\n\n---)",
    new_table,
    content,
    flags=re.DOTALL
)

# Append Entry 013
entry_013 = """

### Entry 013: Master Audit & Administrative Progress Reconciliation
- **Date:** 2026-10-02
- **Status:** Complete (Audit Only)
- **Objective:**
  - Audit the CURRENT LOCAL CODEBASE after manual file replacements from GitHub `main`.
  - Reconcile `docs/ADMIN_CMS_PROGRESS.md` with actual local implementation.
  - Verify protected system baselines (no regressions in customer workflows).
- **Current Local Baseline Status:**
  - **Branch:** `main` (ahead of origin by 2 commits, with multiple dirty working tree files).
  - **Build Status:** Clean / Successful (`npm run build` completed with 0 errors).
- **Admin Reconciliation Findings (What was Reverted/Lost):**
  1. *Phase 1:* `Settings.tsx` lost the `?tab=` URL sync. The "Admin Access & Security" tab was reintroduced into the code (though disconnected from the sidebar).
  2. *Phase 2:* `AdminHome.tsx` lost the "Hero Messaging" section. `useHomepage.ts` reverted to legacy `homepageSettings` and lost the `StorefrontConfig` types.
  3. *Phase 3:* `MediaLibrary.tsx` and `Navigation.tsx` exist in the file system but are completely disconnected from `App.tsx` routing and `AdminLayout.tsx` sidebar.
  4. *Phase A:* The critical `Quote Sent` vs `Quoted` status bug fix in `QuoteReviewDrawer.tsx` was lost. `QuoteReviewDrawer.tsx` reverted to pushing `'Quote Sent'`, which breaks the customer acceptance flow.
- **Protected System Status (Regressions):**
  - Shilp Studio 3D parsing, R2 file upload, UI, and payment flow appear intact (no build errors).
  - **High Risk Regression:** The quote acceptance flow is currently **BROKEN** in the local baseline because `QuoteReviewDrawer.tsx` applies `Quote Sent`, which customer-facing rules/UI do not fully support for the checkout transition.
- **Safe Next Steps / Recommendations:**
  - **DO NOT** attempt a massive multi-phase restoration at once.
  - **Recommended Next Step:** Execute a single, isolated task to fix the `'Quote Sent'` -> `'Quoted'` bug in `QuoteReviewDrawer.tsx` to secure the protected quote-to-order pipeline before resuming CMS work.
"""

content += entry_013

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated docs/ADMIN_CMS_PROGRESS.md")
