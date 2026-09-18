# State Management

The frontend uses **Zustand** for global state management. The main store is defined in `store.ts`.

## Store Structure (`shilp-sahayak-store`)

The store is persisted to the browser's `localStorage` under the key `shilp-sahayak-store`.

### State Properties
- `products`: List of catalog products (fetched from Firestore).
- `cart`: Array of `CartItem` objects (Persisted).
- `isCartOpen`: Boolean representing the UI state of the cart drawer.
- `orders`: Array of `Order` objects for the current user (fetched from Firestore).
- `quotes`: Array of `QuoteRequest` objects for custom prints (fetched from Firestore).
- `settings`: Application settings like global configurations (`Settings` type) (Persisted).

### Persistence
Only the `cart` and `settings` portions of the store are persisted to `localStorage`. Other collections (like `products`, `orders`, and `quotes`) are re-fetched from Firestore when the application loads to ensure the data is up-to-date and authoritative.

### Types
- `Product`: Catalog item definition.
- `CartItem`: Item in the user's shopping cart.
- `CustomPrintData`: Configuration for a custom 3D print job.
- `Order`: Completed order record.
- `QuoteRequest`: Request for a custom 3D print quote.
- `Settings`: Global app settings.
