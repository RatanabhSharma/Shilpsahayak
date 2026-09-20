# PRD: Shilp Sahayak

## 1. Product Vision
**Shilp Sahayak** is a professional, trustworthy, and easy-to-use 3D-printing e-commerce storefront and custom-printing service platform.
It serves two primary customer paths:
- **Shop**: Customers purchasing ready-made 3D printed products and accessories.
- **Shilp Studio (Custom Printing)**: Customers uploading their own 3D CAD models (STL, OBJ, 3MF, etc.) to request custom printing and engineering quotes.

The ultimate business goal is to provide a seamless, secure commerce experience alongside an expert manual quoting process, building trust in our Indian makerspace production pipeline.

## 2. Product Scope & Current V1 Behavior
The current active V1 product scope prioritizes core e-commerce stability, customer UX, and secure operations over fully automated engineering features.

### Active Scope (Production V1):
- **Storefront UI**: Clean, modern, responsive browsing experience.
- **Product Catalog & Detail Pages**: Displaying active catalog items with genuine customer reviews.
- **Customer Accounts & Order Management**: Viewing order history and status.
- **Cart & Direct Buy Now**: Maintaining separation between distinct checkout intentions.
- **Secure Checkout**: Architecture preparing for trusted server-side execution.
- **Admin Panel**: Unified management for storefront content, catalog, reviews, manual quotes, and platform settings.
- **Manual Engineer Quotes (Custom Printing)**: An asynchronous workflow where users upload a file, receive confirmation, and an engineer manually reviews and quotes the order via email/admin.
- **Email Notifications**: Centralized via Firebase Trigger Email extension.

### Disabled / Out of Scope (V1):
- **Automatic Slicer Quoting**: The previous automated slicer pipeline (Bambu Studio CLI integration, automatic cost estimation, filament estimation) has been archived and disabled due to inaccuracy discrepancies. 

## 3. Future Direction
Once core e-commerce and administrative workflows are completely stabilized (including Razorpay sandbox testing and production deployment, server-side order validation, and comprehensive order state management), the project may revisit automated quotation. 

Any future reactivation of the automated slicer pipeline requires rigorous benchmarking, testing, and independent validation against the intended production workflow (Bambu Studio Desktop) to ensure quotation accuracy and production safety.

