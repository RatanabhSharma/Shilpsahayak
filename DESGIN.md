# Shilp Sahayak Design System

*NOTE: The current production UI is the visual source of truth; older UI implementations must not be reintroduced without explicit design approval.*

## 1. Brand Identity & Vibe
Shilp Sahayak employs a clean, modern 3D-printing brand aesthetic. It balances industrial engineering precision with approachable, premium e-commerce design.

- **Minimal Visual Clutter**: Use space intentionally. Avoid dense, cluttered layouts.
- **No Generic Themes**: Do not regress into generic "bootstrap" or plain white/gray legacy styling.

## 2. Core Colors
The primary aesthetic uses a silvery/off-white background layered with restrained dark ink and a vibrant accent.

- **Page Background**: `paper` (`#F0F4F8`) / silvery off-white.
- **Surfaces / Cards**: `card` (`#FFFFFF`) or `shell` (`#F0EFEA`).
- **Text / Ink**: `ink` (`#141414`) for primary text. `muted` (`#6B675E`) for secondary text.
- **Accent**: `accent` (`#FF4D00`) - a bold orange used for primary calls to action and active states. 

## 3. Typography
- **Families**: System fonts are prioritized (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, `sans-serif`) across `sans`, `display`, and `mono`.
- **Hierarchy**: Maintain clear distinction between section headers (Display), body text (Sans), and technical specifications or uppercase labels (Mono).

## 4. UI Components

### Radii & Borders
- **Standard**: Rounded controls are consistent. Use `12px` (`card`) for standard cards and containers.
- **Pills**: Use fully rounded `9999px` (`pill`) radii for badges or highly distinct buttons.
- **Borders**: Subdued borders using `line` (`#EAE7E1`).

### Shadows
- **Surfaces**: Restrained card shadows. Use `soft` or `card` box-shadows to gently lift elements off the page background.
- **Highlights**: `glow` shadows utilizing the orange accent (`rgba(255,77,0,0.28)`) for highly interactive elements or featured states.

### Buttons & Inputs
- Consistent rounded controls. 
- Primary buttons should utilize the `accent` color.
- Secondary buttons should utilize clean borders on white surfaces.

## 5. Layout & Spacing
- **Spacing**: Clean, breathable spacing between sections.
- **Responsive Behavior**: Ensure mobile-first principles are applied. The grid system must gracefully collapse on smaller devices without breaking component boundaries.
- **Navigation**: Clean, accessible, and unobtrusive headers and footers.

## 6. Domain-Specific UI Principles

- **Product Cards**: Display clean imagery, exact price, and genuine review aggregate. Hover states should be smooth and utilize spring animations where appropriate.
- **Checkout UI**: Must convey security and clarity. Order totals, items, and next steps must be unambiguous.
- **Admin UI**: Utilitarian but branded. Relies on clean tables, distinct action areas, and unambiguous form controls. Do not clutter the admin panel with obsolete legacy editors.

