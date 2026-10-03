# Shilp Sahayak — Project Governance & Engineering Rules

This repository contains the production code for **Shilp Sahayak**, an India-based 3D printing and precision fabrication business.

All AI coding assistants and developers working on this codebase must strictly adhere to the rules in this document.

---

## 1. Prime Directive: Persistent Project Memory

1. **Never rely on conversation context or LLM session memory.**
   Conversations are ephemeral; the repository itself is the single persistent source of truth.
2. **Always read the primary governance files before starting work:**
   - [`/ANTIGRAVITY.md`](file:///d:/Shilp%20buss/Supabase/New%20folder/Shilpsahayak/ANTIGRAVITY.md) (This file)
   - [`/docs/ADMIN_CMS_MASTER_PLAN.md`](file:///d:/Shilp%20buss/Supabase/New%20folder/Shilpsahayak/docs/ADMIN_CMS_MASTER_PLAN.md) (Architectural specification & schemas)
   - [`/docs/ADMIN_CMS_PROGRESS.md`](file:///d:/Shilp%20buss/Supabase/New%20folder/Shilpsahayak/docs/ADMIN_CMS_PROGRESS.md) (Current implementation state & history)
3. **Never invent or assume existing functionality.**
   Always inspect actual repository files before making assumptions about what exists or works.
4. **If your conversation instructions or memory conflict with the repository documentation, the repository documentation and actual source code take precedence.**

---

## 2. Standard Engineering Workflow (7-Step Cycle)

For every task or implementation phase:

```
┌────────┐     ┌─────────┐     ┌──────┐     ┌───────────┐     ┌────────┐     ┌──────────┐     ┌──────┐
│ 1. READ │ ──► │ 2.INSPECT│ ──► │3.PLAN│ ──► │4.IMPLEMENT│ ──► │5.VERIFY│ ──► │6.DOCUMENT│ ──► │7.STOP│
└────────┘     └─────────┘     └──────┘     └───────────┘     └────────┘     └──────────┘     └──────┘
```

1. **STEP 1 — READ:** Check `ANTIGRAVITY.md`, `ADMIN_CMS_MASTER_PLAN.md`, and `ADMIN_CMS_PROGRESS.md`.
2. **STEP 2 — INSPECT:** Read the actual source code, Firestore rules, hooks, and types involved.
3. **STEP 3 — PLAN:** Clearly explain the files to modify, data model changes, security impact, and backward compatibility plan.
4. **STEP 4 — IMPLEMENT:** Make the minimal, clean, robust change necessary for the current phase.
5. **STEP 5 — VERIFY:** Run build checks (`cmd /c "cd frontend && npm run build"`), type checks, and tests.
6. **STEP 6 — DOCUMENT:** Update `ADMIN_CMS_PROGRESS.md` with what changed, why, files modified, tests run, and next step.
7. **STEP 7 — STOP:** Stop execution and report progress to the user. Do not automatically chain into subsequent phases without confirmation.

---

## 3. Decision Rule on Discrepancies

If you discover that the existing codebase differs from any plan, prompt, or expectation:

1. **DO NOT hallucinate or assume.**
2. **Report immediately:**
   - What the plan expected
   - What the code actually contains
   - Why the difference matters
   - Recommended resolution
3. **Wait for confirmation** before executing destructive or architectural modifications.

---

## 4. Protected Systems & Core Boundaries

### 4.1 Shilp Studio Protection (CRITICAL)
- The existing Shilp Studio / Custom 3D Printing workflow is a **protected, manual-quotation pipeline**:
  $$\text{Customer Upload} \longrightarrow \text{Cloudflare R2} \longrightarrow \text{Firestore } \texttt{/quotes} \longrightarrow \text{Admin 3D Review \& Pricing} \longrightarrow \text{Customer Acceptance} \longrightarrow \text{Authoritative Checkout}$$
- **DO NOT** replace or convert this manual quotation workflow into an instant automated quotation system.
- **DO NOT** modify 3D parsers, file upload logic, quote statuses, or quotation records during CMS work.
- Slicer implementation and CAD geometry analysis remain strictly separate from the Storefront CMS.

### 4.2 Security & Credential Isolation
- **NEVER** expose backend secrets in frontend code or client-accessible Firestore documents:
  - Razorpay Key Secret (`RAZORPAY_KEY_SECRET`) & Webhook Secret (`RAZORPAY_WEBHOOK_SECRET`)
  - Google Service Account Private Key (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`)
  - HMAC SHA-256 signing keys
  - Cloudflare Worker privileged tokens
- **NEVER** trust client-side financial calculations. Authoritative order total and coupon discount validation must be performed server-side by the trusted Cloudflare Worker.
- **NEVER** rely on UI-level button hiding as an authorization mechanism. All data access must be governed by `firestore.rules` and Worker token verification.

### 4.3 Content vs Code Boundaries
- **The Admin Panel should control:** Business details, branding assets, storefront content, hero slides, navigation menus, product catalog metadata, pricing parameters, shipping rates, coupons/promotions, SEO metadata, legal content, and notification emails.
- **The Admin Panel must NOT control:** React application source code, TypeScript logic, Firestore security rules, authentication implementation, core pricing mathematics, 3D slicing algorithms, or arbitrary HTML/JavaScript/CSS injection.

---

## 5. Development & Code Quality Standards

1. **Preserve existing functionality:** Never rewrite working modules from scratch. Extend existing patterns cleanly.
2. **Reuse existing utilities & shared components:** Use components from `frontend/src/components/admin/shared/` (`PageHeader`, `DataTable`, `StatusBadge`, `StatCard`, `ConfirmationDialog`, etc.) and existing hooks (`useAuth`, `useSettings`, `useProducts`, etc.).
3. **Data safety:** Prefer disable / archive (`active: false` or `status: 'Archived'`) over destructive deletes whenever historical orders, quotes, or transactions may reference the entity.
4. **Defensive fallback values:** Never allow missing or malformed Firestore configuration to break the public storefront. Always supply sensible defaults in hooks.
5. **No duplicate configuration:** Do not store the same setting in two different Firestore locations. Identify the single source of truth.
6. **Build verification command:**
   On Windows PowerShell:
   ```cmd
   cmd /c "cd frontend && npm run build"
   ```
   Always verify zero build errors after modifying frontend files.
