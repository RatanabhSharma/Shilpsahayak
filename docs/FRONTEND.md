# Frontend Architecture

The frontend is a React Single Page Application (SPA) built with Vite and TypeScript.

## Routing (`App.tsx`)

Routing is handled by `react-router-dom`.

### Storefront Routes (Wrapped in `StorefrontLayout`)
- `/` → Home
- `/shop` → Catalog
- `/product/:id` → ProductDetail
- `/cart` → Cart
- `/checkout` → Checkout
- `/shilp-studio` → CustomPrinting (3D print workflow)
- `/our-story` → About
- `/reach-us` → Contact
- `/login` → Login
- `/account` → Account (Wrapped in `CustomerRoute`)
- Legal pages: `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`, `/cookie-policy`
- Legacy Redirects: `/catalog` → `/shop`, `/about` → `/our-story`, `/contact` → `/reach-us`, `/custom-printing` → `/shilp-studio`

### Admin Routes (Wrapped in `ProtectedRoute` → `AdminLayout`)
- `/admin/login` → AdminLogin
- `/admin` → Redirects to `/admin/dashboard`
- `/admin/dashboard` → Dashboard overview
- `/admin/orders` & `/admin/orders/:id` → Order management
- `/admin/quotes` → Quote management
- `/admin/catalog` → Product management
- `/admin/inventory` → Inventory tracking
- `/admin/customers` → Customer directory
- `/admin/settings` → Global app settings

## Core Technologies
- **Styling**: TailwindCSS for utility-first styling.
- **State**: Zustand for global state management.
- **Data Fetching**: TanStack React Query for caching server data.
- **3D Rendering**: Three.js (likely via React Three Fiber) for visualizing 3D models in the Shilp Studio.
